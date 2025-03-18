const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Job = require("../models/Job");
const { extractResumeDetails } = require("../utils/ai");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const path = require("path");
const multer = require("multer"); // Added multer import

const uploadDir = path.join(__dirname, "../../uploads/resumes");
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
const upload = multer({ storage });

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

    const dataBuffer = await fs.readFile(pdfPath);
    console.log("PDF read successfully, parsing...");
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    const parsedData = await extractResumeDetails(resumeText);
    console.log("Resume parsed:", parsedData);

    const resumePath = `/uploads/resumes/${req.file.filename}`;
    console.log("Resume stored at:", resumePath);

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("User not found:", req.user.id);
      return res.status(404).json({ msg: "User not found" });
    }

    console.log("Before update - User resumeParsed:", user.resumeParsed);
    user.resumeFile = resumePath;
    await user.save();
    console.log("After update - User resumeParsed (unchanged):", user.resumeParsed);

    res.json({ parsedData, resumeText });
  } catch (err) {
    console.error("Error in /extract:", err.message, err.stack);
    res.status(500).json({ msg: "Server error", error: err.message });
  } finally {
    if (req.file) {
      console.log("File processed, stored at:", req.file.path);
    }
  }
});

router.get("/download/:userId", auth, async (req, res) => {
  if (req.user.userType !== "recruiter") {
    console.log("Unauthorized download attempt by user:", req.user.id);
    return res.status(403).json({ msg: "Not authorized" });
  }

  try {
    const user = await User.findById(req.params.userId).select("resumeFile");
    if (!user || !user.resumeFile) {
      console.log("No resume found for user:", req.params.userId);
      return res.status(404).json({ msg: "Resume not found" });
    }

    const filePath = path.join(__dirname, "../..", user.resumeFile);
    console.log("Serving resume from:", filePath);

    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      console.log("File not found on disk:", filePath);
      return res.status(404).json({ msg: "Resume file not found on server" });
    }

    res.download(filePath, path.basename(user.resumeFile), (err) => {
      if (err) {
        console.error("Error serving file:", err.message);
        res.status(500).json({ msg: "Error downloading file" });
      } else {
        console.log("Resume downloaded successfully for user:", req.params.userId);
      }
    });
  } catch (err) {
    console.error("Error in /download:", err.message, err.stack);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

router.post("/analyze", auth, async (req, res) => {
  if (req.user.userType !== "candidate") {
    return res.status(403).json({ msg: "Not authorized" });
  }

  const { jobId, resume } = req.body;
  if (!jobId || !resume) {
    return res.status(400).json({ msg: "Missing jobId or resume data" });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    const pdfBuffer = Buffer.from(resume, "base64");
    const pdfData = await pdfParse(pdfBuffer);
    const resumeText = pdfData.text.toLowerCase();

    const jobText = `${job.title} ${job.details} ${job.skills.join(" ")}`.toLowerCase();
    const jobKeywords = new Set(jobText.split(/\s+/).filter((word) => word.length > 2));

    const resumeKeywords = new Set(resumeText.split(/\s+/).filter((word) => word.length > 2));

    const missingKeywords = [...jobKeywords].filter((keyword) => !resumeKeywords.has(keyword));
    const matchedKeywords = [...jobKeywords].filter((keyword) => resumeKeywords.has(keyword));

    const feedback = [];
    if (missingKeywords.length > 0) {
      feedback.push(
        `Your resume is missing key terms from the job description: ${missingKeywords.slice(0, 5).join(", ")}${
          missingKeywords.length > 5 ? " (and more)" : ""
        }. Consider adding these to align better with the job requirements.`
      );
    } else {
      feedback.push("Great job! Your resume includes all key terms from the job description.");
    }

    const missingSkills = job.skills.filter((skill) => !resumeText.includes(skill.toLowerCase()));
    if (missingSkills.length > 0) {
      feedback.push(
        `The job requires these skills not found in your resume: ${missingSkills.join(
          ", "
        )}. If you have experience with these, add them explicitly.`
      );
    }

    const matchScore = Math.round((matchedKeywords.length / jobKeywords.size) * 100);

    res.json({
      missingKeywords,
      matchedKeywords,
      missingSkills,
      feedback,
      matchScore,
    });
  } catch (err) {
    console.error("Error in /resume/analyze:", err.message, err.stack);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;