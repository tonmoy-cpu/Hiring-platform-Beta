const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "http://localhost:3000" } });

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/Uploads", express.static(path.join(__dirname, "Uploads")));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Ensure routes are loaded before catch-all
app.use("/api/auth", require("./routes/auth"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/resume", require("./routes/resume"));
app.use("/api/chat", require("./routes/chat"));

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded.user;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "User ID:", socket.user.id);

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  socket.on("sendMessage", async ({ chatId, message }) => {
    try {
      const Chat = require("./models/Chat");
      const Application = require("./models/Application");
      const chat = await Chat.findById(chatId);
      if (!chat) throw new Error("Chat not found");

      const application = await Application.findById(chat.application).populate("job candidate");
      const recipientId =
        socket.user.id === application.candidate._id.toString()
          ? application.job.recruiter.toString()
          : application.candidate._id.toString();

      chat.messages.push(message);
      await chat.save();
      io.to(chatId).emit("message", message);
      io.to(recipientId).emit("notification", { chatId, message });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Move catch-all to the end to avoid intercepting valid routes
app.use((req, res) => {
  console.log("Catch-all triggered for:", req.path);
  res.status(404).json({ msg: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ msg: "Server error", error: err.message });
});

// Validate environment variables
const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "NANONETS_API_KEY", "NANONETS_MODEL_ID", "HF_API_KEY", "GEMINI_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing environment variable: ${envVar}`);
    process.exit(1);
  }
}

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));