const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Chat = require("../models/Chat");
const Application = require("../models/Application");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

const uploadDir = path.join(__dirname, "../../uploads/chats");
fs.mkdir(uploadDir, { recursive: true })
  .then(() => console.log("Uploads/chats directory ready"))
  .catch((err) => console.error("Failed to create uploads/chats directory:", err));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only PDF, JPG, and PNG files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/:applicationId", auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId).populate("job candidate");
    if (!application) return res.status(404).json({ msg: "Application not found" });

    const isCandidate = req.user.id === application.candidate._id.toString();
    const isRecruiter = req.user.id === application.job.recruiter.toString();
    if (!isCandidate && !isRecruiter) return res.status(403).json({ msg: "Not authorized" });

    let chat = await Chat.findOne({ application: req.params.applicationId });
    if (!chat) {
      chat = new Chat({ application: req.params.applicationId, messages: [] });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    console.error("Error in /chat/:applicationId:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/:chatId", auth, upload.single("attachment"), async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    const application = await Application.findById(chat.application).populate("job candidate");
    const isCandidate = req.user.id === application.candidate._id.toString();
    const isRecruiter = req.user.id === application.job.recruiter.toString();
    if (!isCandidate && !isRecruiter) return res.status(403).json({ msg: "Not authorized" });

    const message = {
      sender: req.user.id,
      content: req.body.content,
      attachment: req.file ? `/uploads/chats/${req.file.filename}` : null,
      attachmentType: req.file ? path.extname(req.file.originalname).slice(1) : req.body.link ? "link" : null,
    };

    chat.messages.push(message);
    await chat.save();

    res.json(message);
  } catch (err) {
    console.error("Error in /chat/:chatId:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/:chatId/read", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    const application = await Application.findById(chat.application).populate("job candidate");
    const isCandidate = req.user.id === application.candidate._id.toString();
    const isRecruiter = req.user.id === application.job.recruiter.toString();
    if (!isCandidate && !isRecruiter) return res.status(403).json({ msg: "Not authorized" });

    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== req.user.id) msg.read = true;
    });
    await chat.save();

    res.json({ msg: "Messages marked as read" });
  } catch (err) {
    console.error("Error in /chat/:chatId/read:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;