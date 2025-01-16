const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); 
const nodemailer = require('nodemailer');
const redis = require('redis');
const router = express.Router();

const redisClient = redis.createClient(); 

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Redis connected.'));

// Connect the client
redisClient.connect();

router.use(express.json());

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nguyen23062004@gmail.com',
        pass: 'utfd juev kkrc kunk',
    },
});

// Generate OTP (6 digits)
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Signup
router.post('/signup', async (req, res) => {
    const { email, firstName, lastName, password, confirmPassword } = req.body;

    if (!email || !firstName || !lastName || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    try {
        // Check if email already exists
        const [existingUser] = await db.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP and send it via email
        const otp = generateOTP();
        await redisClient.setEx(`signup:${email}`, 300, otp); // OTP expires in 5 minutes

        // Send OTP email
        await transporter.sendMail({
            from: '"Your App" <your-email@gmail.com>',
            to: email,
            subject: 'Signup OTP Verification',
            text: `Your OTP code is: ${otp}. It is valid for 5 minutes.`,
        });

        // Store user data temporarily in Redis
        await redisClient.setEx(`signup:user:${email}`, 300, JSON.stringify({ email, firstName, lastName, password: hashedPassword }));

        res.status(200).json({ message: 'OTP sent. Please verify to complete signup.', otpRequired: true });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Verify Signup OTP
router.post('/verify-signup', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    try {
        const storedOtp = await redisClient.get(`signup:${email}`);
        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const userData = await redisClient.get(`signup:user:${email}`);
        if (!userData) {
            return res.status(400).json({ message: 'User data expired. Please try signing up again.' });
        }

        const { firstName, lastName, password } = JSON.parse(userData);

        // Insert user into database
        const sql = 'INSERT INTO users (email, first_name, last_name, password) VALUES (?, ?, ?, ?)';
        await db.execute(sql, [email, firstName, lastName, password]);

        // Clean up Redis
        await redisClient.del(`signup:${email}`);
        await redisClient.del(`signup:user:${email}`);

        res.status(200).json({ message: 'Signup successful.' });
    } catch (error) {
        console.error('Error during OTP verification:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Email not found.' });
        }

        // Generate OTP and send it via email
        const otp = generateOTP();
        await redisClient.setEx(`login:${email}`, 300, otp); // OTP expires in 5 minutes

        // Send OTP email
        await transporter.sendMail({
            from: '"Your App" <your-email@gmail.com>',
            to: email,
            subject: 'Login OTP Verification',
            text: `Your OTP code is: ${otp}. It is valid for 5 minutes.`,
        });

        res.status(200).json({ message: 'OTP sent. Please verify to complete login.', otpRequired: true });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Verify Login OTP
router.post('/verify-login', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    try {
        const storedOtp = await redisClient.get(`login:${email}`);
        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];


        // Clean up Redis
        await redisClient.del(`login:${email}`);

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Error during OTP verification:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
