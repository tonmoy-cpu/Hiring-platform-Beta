const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String },
  attachment: { type: String },
  attachmentType: { type: String },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const chatSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
  messages: [messageSchema],
});

module.exports = mongoose.model("Chat", chatSchema);