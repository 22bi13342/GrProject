const express = require('express');
var path = require('path');
const db = require('./db'); 
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const redis = require('redis');
const redisClient = redis.createClient();
const { Server } = require("socket.io");
const cron = require("node-cron");
const crypto = require("crypto");
const router = express.Router();
const moment = require("moment");

redisClient.connect().catch(console.error);

cron.schedule("0 0 * * *", async () => {
    console.log("Running cleanup task...");
    const connection = await db.getConnection();

    try {
        // Start a transaction
        await connection.beginTransaction();

        // Find all expired bookings with status = 'pending'
        const [expiredBookings] = await connection.execute(
            `SELECT booking_id, room_id, check_in, check_out 
             FROM bookings 
             WHERE status = 'pending' AND TIMESTAMPDIFF(DAY, created_at, NOW()) > 1`
        );

        // If there are expired bookings, process them
        for (const booking of expiredBookings) {
            const { room_id, check_in, check_out } = booking;

            // Generate dates between check_in and check_out
            const dates = getDatesBetween(check_in, check_out);

            // Increment available_quantity for each date
            for (const date of dates) {
                await connection.execute(
                    `UPDATE available_rooms 
                     SET available_quantity = available_quantity + 1 
                     WHERE room_id = ? AND date = ?`,
                    [room_id, date]
                );
            }

            // Delete the expired booking
            await connection.execute(`DELETE FROM bookings WHERE id = ?`, [booking.id]);
        }

        // Commit the transaction
        await connection.commit();
        console.log("Expired pending bookings removed and availability restored.");
    } catch (error) {
        // Rollback on error
        await connection.rollback();
        console.error("Error during cleanup task:", error);
    } finally {
        connection.release();
    }
});

const app = express();
const server = require("http").createServer(app)
// app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));
const io = new Server(server)
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
  });

app.use(express.urlencoded({ extended: true }));  
app.use(express.json());  

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for message events from clients
    socket.on('sendMessage', async ({ senderId, receiverId, message, senderType }) => {
        try {
            const chatKey = `chat:${senderId}:${receiverId}`;
            const messageData = {
                senderId,
                receiverId,
                message,
                senderType,
                timestamp: Date.now(),
            };

            // Store message in Redis with a TTL of 1 hour
            await redisClient.rPush(chatKey, JSON.stringify(messageData));
            await redisClient.expire(chatKey, 3600);

            // Broadcast message to the recipient
            io.emit('receiveMessage', messageData);
        } catch (err) {
            console.error('Error handling sendMessage event:', err);
        }
    });
});

// Lấy tin nhắn từ Redis và MySQL
app.get('/get-messages', async (req, res) => {
    const { userId, adminId } = req.query;
    const chatKey = `chat:${userId}:${adminId}`;

    try {
        // Fetch messages from Redis
        const start = Date.now();
        const redisMessages = await redisClient.lRange(chatKey, 0, -1);
        const end = Date.now();
        console.log(`Redis Read Time: ${end - start}ms`);
        const parsedRedisMessages = redisMessages.map((msg) => {
            try {
                return JSON.parse(msg);
            } catch (err) {
                console.error('Error parsing message:', msg, err);
                return null; // Skip invalid messages
            }
        }).filter(Boolean); // Remove null entries

        if (parsedRedisMessages.length > 0) {
            // If Redis has messages, return them
            return res.json(parsedRedisMessages);
        }
        
        // Fetch messages from MySQL
        const sql = `
            SELECT user_id, admin_id, user_message, admin_message, sent_at
            FROM messages
            WHERE (user_id = ? AND admin_id = ?) OR (user_id = ? AND admin_id = ?)
            ORDER BY sent_at ASC
        `;
        const [mysqlMessages] = await db.query(sql, [userId, adminId, adminId, userId]);

        // Combine and sort messages by sent_at
        const allMessages = [...parsedRedisMessages, ...mysqlMessages];
        allMessages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

        // Format messages for client
        const formattedMessages = allMessages.map(msg => {
            if (msg.user_message) {
                return { senderId: msg.user_id, receiverId: msg.admin_id, message: msg.user_message, sent_at: msg.sent_at };
            } else if (msg.admin_message) {
                return { senderId: msg.admin_id, receiverId: msg.user_id, message: msg.admin_message, sent_at: msg.sent_at };
            }
        }).filter(Boolean);

        res.json(formattedMessages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to fetch messages' });
    }
});

const syncRedisToMySQL = async () => {
    try {
        // Fetch all chat keys from Redis
        const keys = await redisClient.keys('chat:*');

        for (const key of keys) {
            // Fetch all messages for the given key
            const messages = await redisClient.lRange(key, 0, -1);

            if (messages.length > 0) {
                // Process all messages for the current key
                const savePromises = messages.map(async (msg) => {
                    const messageObj = JSON.parse(msg);

                    let user_id = null;
                    let admin_id = null;
                    let user_message = null;
                    let admin_message = null;

                    // Directly assign message based on sender type
                    if (messageObj.senderType === 'user') {
                        user_id = messageObj.senderId;
                        admin_id = messageObj.receiverId;
                        user_message = messageObj.message;
                    } else if (messageObj.senderType === 'admin') {
                        admin_id = messageObj.senderId;
                        user_id = messageObj.receiverId;
                        admin_message = messageObj.message;
                    }

                    // Ensure receiver exists (this can be adjusted based on your needs)
                    const [receiverResult] = await db.query('SELECT id FROM users WHERE id = ?', [messageObj.receiverId]);
                    if (receiverResult.length === 0) {
                        const [adminResult] = await db.query('SELECT admin_id FROM admin WHERE admin_id = ?', [messageObj.receiverId]);
                        if (adminResult.length === 0) {
                            console.error(`Receiver ID ${messageObj.receiverId} does not exist as a user or admin.`);
                            return;
                        }
                    }

                    // SQL to insert message into MySQL
                    const sql = `
                        INSERT INTO messages 
                        (user_id, admin_id, user_message, admin_message, sent_at)
                        VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))
                    `;
                    await db.query(sql, [
                        user_id,
                        admin_id,
                        user_message,
                        admin_message,
                        Math.floor(messageObj.timestamp / 1000) // Convert timestamp to seconds
                    ]);
                });

                // Wait for all messages to be saved
                await Promise.all(savePromises);
            }

            // Delete the Redis key after syncing
            await redisClient.del(key);
        }
    } catch (err) {
        console.error('Error syncing Redis to MySQL:', err);
    }
};

// Run the worker every 1 minute
setInterval(syncRedisToMySQL, 1 * 60 * 1000); 



// Serve static files
app.use(express.static(path.join(__dirname, 'admin')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'html'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'homepage.html'));
});

app.get('/api/hotels', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT hotel_id, name, location, location_filter, phone, FORMAT(price_per_night, 0) AS price_per_night, currency, image FROM hotels');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ error: 'Server error' });

    }
});

app.get("/api/rooms", async (req, res) => {
    const { hotelId, checkInDate, checkOutDate } = req.query;

    if (!hotelId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ error: "Hotel ID, check-in, and check-out dates are required." });
    }

    try {
        const query = `
            SELECT 
                r.RoomID, r.RoomName, r.PricePerNight, r.MaxOccupancy,
                COALESCE(
                    (SELECT MIN(ar.available_quantity) 
                     FROM available_rooms ar 
                     WHERE ar.room_id = r.RoomID 
                     AND ar.date BETWEEN ? AND ?), 
                10) AS AvailableRooms
            FROM 
                rooms r
            WHERE 
                r.HotelID = ?`;

        const [rooms] = await db.query(query, [checkInDate, checkOutDate, hotelId]);

        // Fetch images for each room
        for (const room of rooms) {
            const [images] = await db.query("SELECT image_url FROM room_images WHERE room_id = ?", [room.RoomID]);
            room.Images = images.map(img => img.image_url);
        }

        res.json(rooms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch rooms." });
    }
});

app.get("/api/room_details", async (req, res) => {
    const { roomId } = req.query;

    if (!roomId) {
        return res.status(400).json({ error: "Room ID is required." });
    }

    try {
        const roomQuery = `
            SELECT RoomID, RoomName, description 
            FROM rooms WHERE RoomID = ?`;

        const facilityQuery = `
            SELECT facility_name FROM room_facilities WHERE room_id = ?`;

        const imageQuery = `
            SELECT image_url FROM room_images WHERE room_id = ?`;

        const [room] = await db.query(roomQuery, [roomId]);
        if (!room.length) {
            return res.status(404).json({ error: "Room not found." });
        }

        const [facilities] = await db.query(facilityQuery, [roomId]);
        const [images] = await db.query(imageQuery, [roomId]);

        res.json({
            RoomName: room[0].RoomName,
            description: room[0].description,
            facilities: facilities.map(fac => fac.facility_name),
            Images: images.map(img => img.image_url),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch room details." });
    }
});


async function ensureRoomAvailability(roomId, startDate, endDate) {
    const dates = getDatesBetween(startDate, endDate);
    const connection = await db.getConnection();

    try {
        for (const date of dates) {
            const [rows] = await connection.execute(
                `SELECT * FROM available_rooms WHERE room_id = ? AND date = ?`,
                [roomId, date]
            );

            if (rows.length === 0) {
                await connection.execute(
                    `INSERT INTO available_rooms (room_id, date, available_quantity) VALUES (?, ?, ?)`,
                    [roomId, date, 10]
                );
            }
        }
    } finally {
        connection.release();
    }
}

function getDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

app.post("/review", async (req, res) => {
    const { booking_id, rating, review } = req.body;

    // Validate the input
    if (!booking_id || typeof rating === "undefined" || !review) {
        return res.status(400).json({ message: "booking_id, rating, and review are required." });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    try {
        // Business logic (e.g., check booking exists, status is 'success', etc.)
        const booking = await db.query("SELECT * FROM bookings WHERE booking_id = ?", [booking_id]);

        if (!booking.length) {
            return res.status(404).json({ message: "Booking not found." });
        }

        if (booking[0].status !== "success") {
            return res.status(400).json({ message: "Only completed bookings can be reviewed." });
        }

        // Update review in database
        const reviewQuery = `
            UPDATE bookings 
            SET rating = ?, review = ? 
            WHERE booking_id = ?
        `;
        await db.query(reviewQuery, [rating, review, booking_id]);

        res.status(200).json({ message: "Review submitted successfully!" });
    } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// Booking endpoint
app.post("/api/bookings", async (req, res) => {
    const { userId, roomId, checkInDate, checkOutDate, totalPrice } = req.body;

    if (!userId || !roomId || !checkInDate || !checkOutDate || !totalPrice) {
        return res.status(400).json({ error: "Missing required booking data." });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Ensure availability exists for the given date range
        await ensureRoomAvailability(roomId, checkInDate, checkOutDate);

        const dates = getDatesBetween(checkInDate, checkOutDate);

        // Check and decrement available_quantity for each date
        for (const date of dates) {
            const [result] = await connection.execute(
                `SELECT available_quantity FROM available_rooms WHERE room_id = ? AND date = ?`,
                [roomId, date]
            );

            if (result.length === 0 || result[0].available_quantity <= 0) {
                throw new Error(`No availability for room ${roomId} on date ${date}`);
            }

            await connection.execute(
                `UPDATE available_rooms SET available_quantity = available_quantity - 1 WHERE room_id = ? AND date = ?`,
                [roomId, date]
            );
        }

        // Insert the booking record
        await connection.execute(
            `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, roomId, checkInDate, checkOutDate, totalPrice, "pending"]
        );

        await connection.commit();
        res.json({ success: true, message: "Booking created successfully." });
    } catch (error) {
        await connection.rollback();
        console.error("Error creating booking:", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/add-hotel', async (req, res) => {
    const { name, location, location_filter, phone, price_per_night, currency, imageUrl } = req.body;

    if (!name || !location || !phone || !price_per_night || !currency || !imageUrl) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const query = `
            INSERT INTO hotels (name, location, location_filter, phone, price_per_night, currency, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, location, location_filter, phone, price_per_night, currency, imageUrl];
        
        await db.query(query, values);
        res.status(200).json({ success: true, message: 'Hotel added successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error inserting data into the database.' });
    }
});

app.get('/get-bookings', async (req, res) => {
    const userId = req.query.user_id;
    console.log("Received User ID:", userId); 

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    try {
        const query = `
            SELECT 
                bookings.booking_id,
                DATE_FORMAT(bookings.check_in, '%d/%m/%Y') AS check_in,  
                DATE_FORMAT(bookings.check_out, '%d/%m/%Y') AS check_out,
                FORMAT(bookings.total_price, 0) AS total_price,
                bookings.status,
                rooms.RoomName AS room_name,
                rooms.image_url AS room_image
            FROM bookings
            JOIN rooms ON bookings.room_id = rooms.RoomID
            WHERE bookings.user_id = ?;
        `;

        console.log("Executing query:", query);

        const [results] = await db.query(query, [userId]);

        if (results.length > 0) {
            console.log("Query Results:", results); 
            res.json(results);
        } else {
            res.json({ message: "No bookings found for this user." });
        }
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Database query failed" });
    }
});
app.post('/api/bookings/cancel', (req, res) => {
    const { booking_id } = req.body;

    if (!booking_id) {
        return res.status(400).json({ error: "Booking ID is required" });
    }

    const query = "UPDATE bookings SET status = 'cancel' WHERE booking_id = ?";
    db.query(query, [booking_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database update failed" });
        }

        res.json({ message: "Booking canceled successfully" });
    });
});



app.get('/get-users', async (req, res) => {
    try {
        const sql = 'SELECT id, first_name, last_name FROM users';
        const [results] = await db.query(sql);
        console.log('Fetched users:', results); // Debugging line
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to fetch users' });
    }
});

async function updateBookingStatus(bookingId, status) {
    // Update the booking status in your database
    await db.query("UPDATE bookings SET status = ? WHERE booking_id = ?", [status, bookingId]);
}
function sortObject(obj) {
    return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
            result[key] = obj[key];
            return result;
        }, {});
}
app.post("/api/vnpay/create-payment", async (req, res) => {
    const { booking_id } = req.body;

    // VNPay configuration
    const vnp_TmnCode = "HNWZVBYT";
    const vnp_HashSecret = "DQ1OUR25C7K1KYSA4GE4VV65RGOA8YRH";
    const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const vnp_ReturnUrl = "http://localhost:3000/api/vnpay/return";

    // Fetch booking details from your DB
    const booking = await getBookingDetails(booking_id);
    const amount = booking.total_price * 100;  // Convert VND to the amount VNPay expects in "dong" (1 VND = 1 dong)

    // Current date for CreateDate
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');  // Format CreateDate in VNPay style

    // Construct payment parameters
    let params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode,
        vnp_Amount: amount,
        vnp_CurrCode: "VND",
        vnp_TxnRef: `${booking_id}`, // Unique transaction ID (can be the booking ID)
        vnp_OrderInfo: `Payment for booking ${booking_id}`,
        vnp_Locale: "vn",  // Locale is Vietnamese by default
        vnp_ReturnUrl,
        vnp_OrderType: 'other',
        vnp_IpAddr: req.ip,  // IP address of the requestor
        vnp_CreateDate: createDate,
        vnp_ExpireDate: getExpireDate() 
    };

    // Sort the parameters alphabetically (required by VNPay)
    params = sortObject(params);

    // Build the query string for signing
    const querystring = new URLSearchParams(params);
    const signData = querystring.toString();

    // Generate secure hash
    const secureHash = crypto
        .createHmac("sha512", vnp_HashSecret)
        .update(signData)
        .digest("hex");

    // Append secure hash to the parameters
    params["vnp_SecureHash"] = secureHash;

    // Construct the payment URL
    const paymentUrl = `${vnp_Url}?${new URLSearchParams(params).toString()}`;

    // Send back the payment URL as a response
    res.json({ paymentUrl });
});

app.get("/api/vnpay/return", async (req, res) => {
    const vnp_HashSecret = "DQ1OUR25C7K1KYSA4GE4VV65RGOA8YRH";
    const queryParams = req.query;
    const vnp_SecureHash = queryParams["vnp_SecureHash"];
    delete queryParams["vnp_SecureHash"];

    const sortedParams = sortObject(queryParams);
    const signData = new URLSearchParams(sortedParams).toString();
    const generatedHash = crypto
        .createHmac("sha512", vnp_HashSecret)
        .update(signData)
        .digest("hex");

    if (generatedHash === vnp_SecureHash) {
        if (queryParams["vnp_ResponseCode"] === "00") {
            const bookingId = queryParams["vnp_TxnRef"];
            await updateBookingStatus(bookingId, "success"); 
            res.redirect(`/payment-success?booking_id=${bookingId}`);
        } else {
            res.redirect(`/payment-failure?responseCode=${queryParams["vnp_ResponseCode"]}`);
        }
    } else {
        console.log("Secure hash mismatch");
        res.redirect(`/payment-failure`);
    }
});


async function getBookingDetails(bookingId) {
    try {
        const query = "SELECT * FROM bookings WHERE booking_id = ?";
        const [results] = await db.execute(query, [bookingId]); 
        return results[0]; 
    } catch (error) {
        console.error("Error fetching booking details:", error);
        throw error;
    }
}

function getExpireDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2); // Add 2 minutes to the current time for expiration
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}



app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
