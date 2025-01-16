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

module.exports = router;
