import mongoose from "mongoose"
import notificationSchema from "./notificationModel.js"

const userModel = new mongoose.Schema(
    {
        clerkUserId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        fullName: {
            type: String,
            required: false,
            minlength:2,
            maxlength: 50,
        },
        governmentIdNumber: {
            type: String,
            maxlength: 50,
            unique: true,
            sparse: true,
            required: false,
        },
        phoneNumber: {
            type: String,
            required: false,
            maxlength: 20,
            unique: true,
            sparse: true,
        },
        email: {
            type: String,
            required: true,
            maxlength: 50,
            unique: true,
        },
        address: {
            type: String,
            default: ""
        },
        dateOfBirth: {
            type: Date,
            default: null
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: false
        },
        city: {
            type: String,
            default: ""
        },
        state: {
            type: String,
            default: ""
        },
        country: {
            type: String,
            default: ""
        },
        pincode: {
            type: String,
            default: ""
        },
        cases: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        role: {
            type: String,
            enum: ["general_user", "police", "NGO"],
            default: "general_user"
        },
        ipAddress: {
            type: String,
            default: ""
        },
        notifications: {
            type: [notificationSchema],
            default: []
        },
        onboardingCompleted: {
            type: Boolean,
            default: false
        },
    
    },
    {timestamps: true}
);

const User = mongoose.model("User", userModel);
export default User;