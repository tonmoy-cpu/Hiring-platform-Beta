const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  details: { type: String, required: true },
  skills: [{ type: String }],
  salary: { type: String }, // New field for salary
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isClosed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Job", jobSchema);