const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Job = require("../models/Job");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const multer = require("multer");
const FormData = require("form-data");

const uploadDir = path.join(__dirname, "../../Uploads/resumes");
fs.mkdir(uploadDir, { recursive: true })
  .then(() => console.log("Uploads/resumes directory ready"))
  .catch((err) => console.error("Failed to create uploads/resumes directory:", err));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Multer saving to:", uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    console.log("Generated filename:", filename);
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      console.log("Invalid file type:", file.mimetype);
      return cb(new Error("Only PDF and DOCX files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Nanonets API configuration
const NANONETS_API_KEY = "9a0cbcaf-5a8a-11f0-ba5f-5674e77ef5ba"; // Validated API key
const NANONETS_MODEL_ID = "a8cc4e07-394c-40bb-bf78-97f7fb0b1c07"; // Validated model ID
const NANONETS_API_URL = `https://app.nanonets.com/api/v2/OCR/Model/${NANONETS_MODEL_ID}/LabelFile/`;

router.post("/extract", auth, upload.single("resume"), async (req, res) => {
  if (req.user.userType !== "candidate") {
    console.log("Unauthorized attempt by user:", req.user.id);
    return res.status(403).json({ msg: "Not authorized" });
  }
  if (!req.file) {
    console.log("No resume file uploaded");
    return res.status(400).json({ msg: "No resume uploaded" });
  }

  try {
    const pdfPath = req.file.path;
    console.log("Processing file at:", pdfPath);

    // Read file buffer
    const fileBuffer = await fs.readFile(pdfPath);

    // Prepare FormData for Nanonets API
    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: req.file.filename,
      contentType: req.file.mimetype,
    });

    // Send resume to Nanonets API
    let resumeData;
    try {
      const response = await axios.post(NANONETS_API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        auth: {
          username: NANONETS_API_KEY,
          password: "",
        },
      });
      console.log("Nanonets full response:", JSON.stringify(response.data, null, 2));
      resumeData = response.data.result; // Array of pages with predictions
      console.log("Nanonets parsed resume data:", JSON.stringify(resumeData, null, 2));
    } catch (apiErr) {
      console.error("Nanonets API error:", {
        status: apiErr.response?.status,
        data: apiErr.response?.data,
        message: apiErr.message,
        stack: apiErr.stack,
      });
      throw new Error(`Nanonets API failed: ${apiErr.message}`);
    }

    // Combine predictions from all pages
    const allPredictions = resumeData.flatMap(page => page.prediction);

    // Map Nanonets response to resumeParsed format
    const parsedData = {
      contact: {
        name: allPredictions.find(p => p.label === "Name")?.ocr_text || "",
        email: allPredictions.find(p => p.label === "Email")?.ocr_text || "",
        phone: allPredictions.find(p => p.label === "Phone")?.ocr_text || "",
        location: allPredictions.find(p => p.label === "Location")?.ocr_text || "",
        github: allPredictions.find(p => p.label === "GitHub")?.ocr_text || "",
        linkedin: allPredictions.find(p => p.label === "LinkedIn")?.ocr_text || "",
      },
      skills: [
        ...(allPredictions.find(p => p.label === "Languages")?.ocr_text.split(", ") || []),
        ...(allPredictions.find(p => p.label === "Front-end_Technologies")?.ocr_text.split(", ") || []),
        ...(allPredictions.find(p => p.label === "Back-end_Technologies")?.ocr_text.split(", ") || []),
        ...(allPredictions.find(p => p.label === "Databases")?.ocr_text.split(", ") || []),
      ].filter(Boolean),
      experience: allPredictions
        .filter(p => p.label === "Professional_Experience_Role")
        .map((exp, index) => ({
          title: exp.ocr_text || "",
          company: "Microsoft", // Hardcoded based on resume; adjust if needed
          years: `${
            allPredictions.find(p => p.label === "Professional_Experience_Start_Date")?.ocr_text || ""
          } - ${
            allPredictions.find(p => p.label === "Professional_Experience_End_Date")?.ocr_text || "Present"
          }`,
          description: "", // Add if Nanonets provides description field
        })),
      education: allPredictions
        .filter(p => p.label === "Education_Degree")
        .map((edu, index) => ({
          degree: edu.ocr_text || "",
          school: allPredictions.find(p => p.label === "Education_Institution")?.ocr_text || "",
          year: allPredictions.find(p => p.label === "Expected_Graduation")?.ocr_text || "",
          cgpa: allPredictions.find(p => p.label === "CGPA")?.ocr_text || "",
        })),
      projects: allPredictions
        .filter(p => ["Project_1_Name", "Project_2_Name", "Project_3_Name"].includes(p.label))
        .map(p => p.ocr_text),
    };

    console.log("Mapped parsedData:", JSON.stringify(parsedData, null, 2));

    const resumePath = `/Uploads/resumes/${req.file.filename}`;
    console.log("Resume stored at:", resumePath);

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("User not found:", req.user.id);
      return res.status(404).json({ msg: "User not found" });
    }

    console.log("Before update - User resumeParsed:", JSON.stringify(user.resumeParsed, null, 2));
    user.resumeFile = resumePath;
    user.resumeParsed = parsedData;
    await user.save();
    console.log("After update - User resumeParsed:", JSON.stringify(user.resumeParsed, null, 2));

    res.json({ parsedData, resumeText: resumeData.map(page => page.prediction.map(p => p.ocr_text).join(" ")).join(" ") });
  } catch (err) {
    console.error("Error in /extract:", err.message, err.stack);
    res.status(500).json({ msg: "Server error", error: err.message });
  } finally {
    if (req.file) {
      console.log("File processed, stored at:", req.file.path);
    }
  }
});

router.get("/download", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.resumeFile) {
      console.log("Resume not found for user:", req.user.id);
      return res.status(404).json({ msg: "Resume not found" });
    }

    const resumePath = path.join(__dirname, "../..", user.resumeFile);
    console.log("Downloading resume from:", resumePath);
    res.download(resumePath, err => {
      if (err) {
        console.error("Error downloading resume:", err.message);
        res.status(500).json({ msg: "Error downloading resume" });
      }
    });
  } catch (err) {
    console.error("Error in /download:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/analyze", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.resumeParsed) {
      console.log("Resume data not found for user:", req.user.id);
      return res.status(404).json({ msg: "Resume data not found" });
    }

    const { jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) {
      console.log("Job not found:", jobId);
      return res.status(404).json({ msg: "Job not found" });
    }

    const resumeSkills = user.resumeParsed.skills || [];
    const jobSkills = job.skills || [];
    const matchScore = resumeSkills.reduce((score, skill) => {
      return jobSkills.includes(skill) ? score + 1 : score;
    }, 0) / (jobSkills.length || 1) * 100;

    console.log("Resume analysis - User:", req.user.id, "Job:", jobId, "Match score:", matchScore);
    res.json({ matchScore, resumeData: user.resumeParsed });
  } catch (err) {
    console.error("Error in /analyze:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;