import mongoose from "mongoose"
import notificationSchema from "./notificationModel.js"

const userModel = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            minlength:2,
            maxlength: 50,
        },
        aadharNumber: {
            type: String,
            maxlength: 12,
            unique: true,
        },
        mobileNumber: {
            type: String,
            required: true,
            maxlength: 10,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            maxlength: 50,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        cases: {
            type: [mongoose.Schema.Types.ObjectId],
            default: []
        },
        role: {
            type: String,
            enum: ["individual", "police", "NGO"],
            default: "individual"
        },
        ipAddress: {
            type: String
        },
        notifications: {
            type: [notificationSchema],
            default: []
        },
        lastlogin: {
            type: Date,
            default: null
        },
        lastSearched: {
            type: String,
            default: ""
        },
        resetPassword: {
            type: String,
            default: ""
        },
        resetPasswordCreatedAt: {
            type: String,
            default: ""
        }
    },
    {timestamps: true}
);

const User = mongoose.model("User", userModel);
export default User;