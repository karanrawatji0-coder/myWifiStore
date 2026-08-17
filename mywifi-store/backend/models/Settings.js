const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "payment"
    },
    razorpayKeyId: {
      type: String,
      default: ""
    },
    razorpayKeySecret: {
      type: String,
      default: ""
    },
    onlinePaymentEnabled: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
