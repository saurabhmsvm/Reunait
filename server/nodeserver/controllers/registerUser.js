import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../model/userModel.js"
// import { config } from '../config/config.js';

export const registerUser = async (req, res) => {
    try {
        const {
             fullName,
             governmentIdNumber,
             mobileNumber,
             email,
             password,
             role,
        } = req.body;

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            governmentIdNumber,
            mobileNumber,
            email,
            password: passwordHash,
            role,
            ipAddress: req.ip
        });
        const savedUser = (await newUser.save()).toObject();
        delete savedUser.password;
        delete savedUser.ipAddress;
        // const token = jwt.sign(
        //     { 
        //         userId: savedUser._id,
        //         role: savedUser.role
        //     },
        //     config.jwtSecret,
        //     { expiresIn: config.jwtExpiresIn }
        // );

        // Return success response with token
        return res.status(201).json({
            message: 'User registered successfully',
            savedUser,
            // token
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            message: 'Error registering user',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}