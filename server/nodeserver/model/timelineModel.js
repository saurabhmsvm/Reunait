import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['report_info', 'case_registration', 'case_closed', 'case_unflagged', 'case_hidden', 'case_assigned'],
    },
    message: {
      type: String,
      required: true
    },
    time: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String
    },
    phoneNumber: {
      type: String
    },
    flagData: {
      type: {
        userId: String,
        userRole: String,
        reason: String,
        timestamp: Date,
        ipAddress: String
      }
    }
  }
);

export default timelineSchema;


