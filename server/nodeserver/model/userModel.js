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
            required: false,
        },
        phoneNumber: {
            type: String,
            required: false,
            maxlength: 20,
        },
        email: {
            type: String,
            required: true,
            maxlength: 50,
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
            enum: ["general_user", "police", "NGO", "volunteer", "police_denied"],
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
        isVerified: {
            type: Boolean,
            default: null // null = not applicable, false = pending verification, true = verified
        },
    
    },
    {timestamps: true}
);

// Index for efficient verification queries
userModel.index({ role: 1, isVerified: 1, country: 1 });
userModel.index({ role: 1, isVerified: 1 }); // For country: "all" queries

const User = mongoose.model("User", userModel);
export default User;