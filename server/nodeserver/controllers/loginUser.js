import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../model/userModel.js";
import { config } from '../config/config.js';

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastlogin = new Date();
        await user.save();

        // Create user object without sensitive data
        const userObject = user.toObject();
        delete userObject.lastlogin;
        delete userObject.password;
        delete userObject.ipAddress;

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                role: user.role
            },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        // Return success response
        return res.status(200).json({
            message: 'Login successful',
            user: userObject,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            message: 'Error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 