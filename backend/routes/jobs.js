const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const auth = require("../middleware/auth");
const Application = require("../models/Application");
const User = require("../models/User");

router.post("/", auth, async (req, res) => {
  if (req.user.userType !== "recruiter")
    return res.status(403).json({ msg: "Not authorized" });

  const { title, details, skills, salary } = req.body;
  if (!title || !details || !skills)
    return res.status(400).json({ msg: "Missing required fields" });

  try {
    const job = new Job({
      title,
      details,
      skills,
      salary,
      recruiter: req.user.id,
    });
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    console.error("Error in POST /jobs:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    console.log("GET /api/jobs - Query:", req.query);
    let jobs;
    if (req.user.userType === "candidate") {
      const user = await User.findById(req.user.id);
      const appliedJobs = await Application.find({ candidate: req.user.id }).select("job");
      const appliedJobIds = appliedJobs.map((app) => app.job.toString());

      const includeClosed = req.query.includeClosed === "true";
      if (req.query.all === "true") {
        console.log(`Fetching all jobs for candidate (all=true, includeClosed=${includeClosed})`);
        jobs = await Job.find(includeClosed ? {} : { isClosed: false }).populate("recruiter", "username");
      } else {
        console.log("Fetching preference-matched jobs for candidate");
        const preferredSkills = (user.preferredSkills || []).map((s) => s.toLowerCase());
        const preferredDomains = (user.preferredDomains || []).map((d) => d.toLowerCase());

        jobs = await Job.find({
          isClosed: false,
          $or: [
            {
              skills: {
                $in: preferredSkills.map((s) => new RegExp(s, "i")),
              },
            },
            {
              details: {
                $in: preferredDomains.map((d) => new RegExp(d, "i")),
              },
            },
          ],
        }).populate("recruiter", "username");
      }

      jobs = jobs.map((job) => ({
        ...job._doc,
        isApplied: appliedJobIds.includes(job._id.toString()),
      }));
    } else {
      console.log("Fetching all jobs for recruiter");
      jobs = await Job.find({ isClosed: false }).populate("recruiter", "username");
    }
    console.log("Returning jobs:", jobs.length, "Job titles:", jobs.map(j => j.title));
    res.json(jobs);
  } catch (err) {
    console.error("Error in GET /jobs:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/recruiter", auth, async (req, res) => {
  if (req.user.userType !== "recruiter")
    return res.status(403).json({ msg: "Not authorized" });

  try {
    const jobs = await Job.find({ recruiter: req.user.id }).lean();

    // Calculate or populate applicant counts
    for (let job of jobs) {
      const applications = await Application.find({ job: job._id, status: { $ne: "Not Selected" } });
      job.applicantsCount = job.applicantsCount || applications.length; // Use stored or calculate
      job.newApplicantsCount = job.newApplicantsCount || applications.filter(app => app.status === "Applied").length; // Use stored or calculate based on "Applied" status
    }

    res.json(jobs);
  } catch (err) {
    console.error("Error in GET /jobs/recruiter:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/:id", auth, async (req, res) => {
  if (req.user.userType !== "recruiter")
    return res.status(403).json({ msg: "Not authorized" });

  const { title, details, skills, salary } = req.body;
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: "Job not found" });
    if (job.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized to edit this job" });
    }

    job.title = title || job.title;
    job.details = details || job.details;
    job.skills = skills || job.skills;
    job.salary = salary || job.salary;
    await job.save();
    res.json(job);
  } catch (err) {
    console.error("Error in PUT /jobs/:id:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/:id/close", auth, async (req, res) => {
  if (req.user.userType !== "recruiter")
    return res.status(403).json({ msg: "Not authorized" });

  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: "Job not found" });
    if (job.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized to close this job" });
    }

    job.isClosed = true;
    await job.save();
    res.json(job);
  } catch (err) {
    console.error("Error in PUT /jobs/:id/close:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;