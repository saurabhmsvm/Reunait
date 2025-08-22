import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true
         },
         isRead: {
            type: Boolean,
            default: false
         },
         time: {
            type: Date,
            default: Date.now
        },
        ipAddress: {
            type: String
        }
    }
);

export default notificationSchema;