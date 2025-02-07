const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

router.use(express.json());

// Admin Signup
router.post('/signup', async (req, res) => {
    const { admin_name, admin_pass, confirm_pass } = req.body;

    // Validate input
    if (!admin_name || !admin_pass || !confirm_pass) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (admin_pass !== confirm_pass) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        // Check if admin already exists
        const [existingAdmin] = await db.execute('SELECT admin_name FROM admin WHERE admin_name = ?', [admin_name]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ message: 'Admin username already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(admin_pass, 10);

        // Insert admin into the database
        const sql = 'INSERT INTO admin (admin_name, admin_pass) VALUES (?, ?)';
        const [result] = await db.execute(sql, [admin_name, hashedPassword]);

        res.status(200).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error('Error during admin signup:', error);

        // Handle specific database errors
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Admin username already registered' });
        }

        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Login
router.post('/login', async (req, res) => {
    const { admin_name, admin_pass } = req.body;

    // Validate input
    if (!admin_name || !admin_pass) {
        return res.status(400).json({ message: 'Admin name and password are required' });
    }

    try {
        // Query the database for the admin
        const [rows] = await db.execute('SELECT * FROM admin WHERE admin_name = ?', [admin_name]);

        // Check if admin exists
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Admin not found' });
        }

        const admin = rows[0];

        // Compare password
        const isPasswordValid = await bcrypt.compare(admin_pass, admin.admin_pass);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Generate JWT
        const token = jwt.sign({ id: admin.admin_id }, 'your_jwt_secret', { expiresIn: '1h' });

        // Set cookie options
        const cookieOptions = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            httpOnly: true,
        };

        // Send the token in the cookie
        res.cookie('authToken', token, cookieOptions);

        // Respond with success
        res.status(200).json({
            message: 'Admin login successful',
            admin: {
                id: admin.admin_id,
                name: admin.admin_name,
            },
        });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get("/analytics", async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30; 
      
      // Construct filter date separately to avoid issues with INTERVAL
      const [filterDateResult] = await db.query(`SELECT NOW() - INTERVAL ? DAY AS filter_date`, [days]);
      const filterDate = filterDateResult[0].filter_date;
  
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM bookings) AS total_bookings,
          (SELECT COUNT(*) FROM bookings WHERE created_at >= ?) AS recent_bookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'cancel') AS canceled_bookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'success') AS success_bookings,
          (SELECT 
            COALESCE(SUM(CASE WHEN status = 'success' THEN total_price ELSE 0 END), 0) 
            + COALESCE(SUM(CASE WHEN status = 'cancel' THEN total_price ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN status = 'refund' THEN total_price ELSE 0 END), 0)
          FROM bookings WHERE status IN ('success', 'cancel', 'refund')) AS total_revenue,
          (SELECT COUNT(*) FROM users) AS total_users,
          (SELECT COUNT(*) FROM users WHERE created_at >= ?) AS new_users,
          (SELECT COUNT(*) FROM bookings WHERE review IS NOT NULL) AS total_reviews
      `;
  
      const [rows] = await db.query(query, [filterDate, filterDate]); 
      if (rows.length > 0) {
        // Format total revenue with commas 
        rows[0].total_revenue = new Intl.NumberFormat('en-US').format(rows[0].total_revenue) + " VND";
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  router.put('/update_hotels/:hotel_id', async (req, res) => {
    const { hotel_id } = req.params;
    const { name, location, location_filter, phone, price_per_night, currency, image } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE hotels SET 
                name = ?, 
                location = ?, 
                location_filter = ?, 
                phone = ?, 
                price_per_night = ?, 
                currency = ?, 
                image = ? 
            WHERE hotel_id = ?`,
            [name, location, location_filter, phone, price_per_night, currency, image, hotel_id]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: "Hotel updated successfully." });
        } else {
            res.status(404).json({ success: false, message: "Hotel not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error updating hotel." });
    }
});


router.delete('/remove_hotels/:hotel_id', async (req, res) => {
    const { hotel_id } = req.params;

    try {
        const [result] = await db.execute("DELETE FROM hotels WHERE hotel_id = ?", [hotel_id]);

        if (result.affectedRows > 0) {
            res.json({ success: true, message: "Hotel deleted successfully." });
        } else {
            res.status(404).json({ success: false, message: "Hotel not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error deleting hotel." });
    }
});
router.delete("/delete-user/:id", (req, res) => {
    const userId = req.params.id;
    const query = `DELETE FROM users WHERE id = ?`;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database deletion failed" });
        }
        res.json({ message: "User deleted successfully!" });
    });
});

router.get("/users", async (req, res) => {
    const query = `
        SELECT 
            u.id, 
            u.first_name, 
            u.last_name, 
            u.email, 
            COUNT(b.booking_id) AS total_bookings, 
            SUM(CASE WHEN b.status = 'canceled' THEN 1 ELSE 0 END) AS canceled_bookings
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id
        GROUP BY u.id
    `;

    try {
        const [results] = await db.query(query); 
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database query failed" });
    }
});

router.get("/bookings", async (req, res) => {
    const query = `
        SELECT 
            b.booking_id,
            b.user_id,
            b.room_id,
            r.RoomName AS room_name,
            r.image_url AS room_image,
            b.total_price,
            b.status
        FROM bookings b
        JOIN rooms r ON b.room_id = r.RoomID
    `;

    try {
        const [results] = await db.query(query);  
        res.json(results); 
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Database query failed" });
    }
});

router.put("/refund-booking/:bookingId", async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        await db.query("UPDATE bookings SET status = 'refund' WHERE booking_id = ?", [bookingId]);
        res.json({ message: "Booking marked as refunded!" });
    } catch (error) {
        console.error("Error updating refund status:", error);
        res.status(500).json({ error: "Failed to update refund status" });
    }
});

router.get("/rooms", async (req, res) => {
    try {
        const query = `
            SELECT 
                r.RoomID, r.RoomName, r.PricePerNight, r.MaxOccupancy, h.name AS HotelName,
                COALESCE(
                    (SELECT MIN(ar.available_quantity) 
                     FROM available_rooms ar 
                     WHERE ar.room_id = r.RoomID), 
                10) AS AvailableRooms
            FROM rooms r
            JOIN hotels h ON r.HotelID = h.hotel_id`;

        const [rooms] = await db.query(query);

        // Fetch images for each room
        for (const room of rooms) {
            const [images] = await db.query("SELECT image_url FROM room_images WHERE room_id = ?", [room.RoomID]);
            room.Images = images.map(img => img.image_url);
        }

        res.json(rooms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch admin rooms." });
    }
});
  

module.exports = router;
