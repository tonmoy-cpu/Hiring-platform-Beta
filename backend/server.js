const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

/*
====================================================
CORS FIX
====================================================
Allowed frontend origins:
- Local development
- Deployed Vercel frontend
====================================================
*/

const allowedOrigins = [
  "http://localhost:3000",
  "https://hire-on-three.vercel.app",
];

// Socket.IO CORS
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Make io accessible to routes
app.set("io", io);

/*
====================================================
Socket.IO Connection Handling
====================================================
*/

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

/*
====================================================
Middleware
====================================================
*/

// Express CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
====================================================
Ensure uploads directory exists
====================================================
*/

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Uploads directory created");
}

const resumesDir = path.join(uploadsDir, "resumes");

if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir);
  console.log("Uploads/resumes directory ready");
}

/*
====================================================
Static Files
====================================================
*/

app.use("/uploads", express.static(uploadsDir));

/*
====================================================
MongoDB Connection
====================================================
*/

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

/*
====================================================
Import Routes
====================================================
*/

const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const applicationRoutes = require("./routes/applications");
const resumeRoutes = require("./routes/resume");
const chatRoutes = require("./routes/chat");

/*
====================================================
Use Routes
====================================================
*/

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/chat", chatRoutes);

/*
====================================================
Server Start
====================================================
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});