import mongoose from "mongoose";
import notificationSchema from "./notificationModel.js";
import timelineSchema from "./timelineModel.js";

const caseModel = new mongoose.Schema(
  {
    // Personal Information
    fullName: {
      type: String,
    },
    age: {
      type: String,
    },
    gender: { 
      type: String, 
      enum: ["male", "female", "other"]
    },
    contactNumber: {
      type: String,
      required: true,
    },
    height: {
      type: String,
    },
    complexion: {
      type: String,
    },
    identificationMark: {
      type: String,
    },
    dateMissingFound: { 
      type: Date, 
      required: true 
    },
    city: { 
      type: String,
    },
    state: { 
      type: String,
    },
    // Preferred: postalCode (use this going forward)
    postalCode: {
      type: String,
      required: true,
    },
    country: { 
      type: String,
      required: true,
    },
    description: { 
      type: String 
    },
    aiDescription: {
      type: String,
      default: "Generating description... it will be available shortly."
    },
    addedBy: {
      type: String,
      required: true
    },
    caseOwner: {
      type: String,
      required: true
    },
    landMark: {
      type: String,
    },
    FIRNumber:{
      type: String
    },
    policeStationState: {
      type: String,
    },
    policeStationCity: {
      type: String,
    },
    policeStationName: {
      type: String,
    },
    policeStationCountry: {
      type: String,
    },
    policeStationPostalCode: {
      type: String,
    },
    caseRegisterDate: {
      type: Date,
    },
    isAssigned: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["missing", "found", "closed"],
      default: "missing"
    },
    caseClosingDate: {
      type: Date
    },
    originalStatus: {
      type: String,
      enum: ["missing", "found"],
      default: "missing"
    },
    reportedBy: {
        type: String,
        enum: ["general_user", "police", "NGO", "volunteer"]
    },
    reward: String,
    lastSearchedTime: {
      type: Date,
      default: function() {
        return this.createdAt || new Date();
      }
    },
    timelines: {
        type: [timelineSchema],
        default: []
    },
    similarCaseIds: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    },
    verificationBypassed: {
        type: Boolean,
        default: true
    },
    showCase: {
        type: Boolean,
        default: true
    },
    flags: {
        type: [{
            userId: {
                type: String,
                default: null
            },
            userRole: {
                type: String,
                enum: ["general_user", "police", "NGO", "volunteer"],
                default: "general_user"
            },
            reason: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            ipAddress: {
                type: String,
                required: true
            }
        }],
        default: []
    },
    isFlagged: {
        type: Boolean,
        default: false
    }
  },
  { timestamps: true }
);

// Ensure FIRNumber is unique per policeStationCountry only when a non-empty FIRNumber is present
caseModel.index(
  { FIRNumber: 1, policeStationCountry: 1 },
  { unique: true, partialFilterExpression: { FIRNumber: { $exists: true, $ne: "" } } }
);

const Case = mongoose.model("Case", caseModel);
export default Case;
