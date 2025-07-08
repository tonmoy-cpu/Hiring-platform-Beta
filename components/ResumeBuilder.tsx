"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { skillOptions, domainOptions, fetchResumeFeedback } from "@/lib/utils";

interface ResumeBuilderProps {
  onClose: () => void;
}

export default function ResumeBuilder({ onClose }: ResumeBuilderProps) {
  const [resumeData, setResumeData] = useState({
    contact: { name: "", email: "", phone: "" },
    skills: [],
    experience: [{ title: "", company: "", years: "" }],
    education: [{ degree: "", school: "", year: "" }],
  });
  const [feedback, setFeedback] = useState({ score: 0, matchedSkills: [], missingSkills: [], feedback: [] });
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobs, setJobs] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchJobs = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/jobs?all=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(data);
      } catch (err) {
        toast.error(`Failed to load jobs: ${err.message}`);
      }
    };
    fetchJobs();
  }, [router]);

  const handleChange = (section, index, field, value) => {
    const newData = { ...resumeData };
    if (section === "experience" || section === "education") {
      newData[section][index][field] = value;
    } else if (section === "skills") {
      const skills = value.split(/[,\s]+/).map(s => s.trim()).filter(s => s);
      newData[section] = [...new Set([...resumeData.skills, ...skills])];
    } else {
      newData[section][field] = value;
    }
    setResumeData(newData);
  };

  const addSection = (section) => {
    const newData = { ...resumeData };
    newData[section].push(section === "experience" ? { title: "", company: "", years: "" } : { degree: "", school: "", year: "" });
    setResumeData(newData);
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/resume/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resumeData: resumeData }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Resume draft saved successfully!");
      onClose();
    } catch (err) {
      toast.error(`Error saving draft: ${err.message}`);
    }
  };

  const handleAnalyze = async () => {
    const token = localStorage.getItem("token");
    if (!token || !selectedJobId) {
      toast.error("Please select a job and fill in the details.");
      return;
    }
    const resumeText = JSON.stringify(resumeData);
    try {
      const result = await fetchResumeFeedback(token, selectedJobId, resumeText);
      setFeedback(result);
    } catch (err) {
      console.error("Analysis error:", err.message);
      setFeedback({
        score: 0,
        matchedSkills: [],
        missingSkills: [{ skill: "N/A", suggestion: "API limit reached, try again later" }],
        feedback: ["Unable to fetch feedback due to API limits. Save your draft and retry."],
      });
    }
  };

  return (
    <div className="bg-[#d9d9d9] p-6 rounded-lg shadow-lg w-full max-w-2xl relative h-[90vh] flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-[#313131] hover:text-[#4a4a4a] font-bold"
      >
        X
      </button>
      <h2 className="text-2xl font-bold text-[#313131] mb-4">Resume Builder</h2>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <div>
          <label className="block text-[#313131] font-semibold">Select Job</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
          >
            <option value="">Select a job</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>{job.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[#313131] font-semibold">Name</label>
          <input
            value={resumeData.contact.name}
            onChange={(e) => handleChange("contact", 0, "name", e.target.value)}
            className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
          />
        </div>
        <div>
          <label className="block text-[#313131] font-semibold">Email</label>
          <input
            value={resumeData.contact.email}
            onChange={(e) => handleChange("contact", 0, "email", e.target.value)}
            className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
          />
        </div>
        <div>
          <label className="block text-[#313131] font-semibold">Phone</label>
          <input
            value={resumeData.contact.phone}
            onChange={(e) => handleChange("contact", 0, "phone", e.target.value)}
            className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
          />
        </div>
        <div>
          <label className="block text-[#313131] font-semibold">Skills (comma or space-separated, or select multiple)</label>
          <input
            value={resumeData.skills.join(", ")}
            onChange={(e) => handleChange("skills", 0, "skills", e.target.value)}
            className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131] mb-2"
            placeholder="e.g., JavaScript, React.js (type and press comma or space)"
          />
          <select
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleChange("skills", 0, "skills", [...resumeData.skills, ...selected].join(", "));
            }}
            className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131] h-24 overflow-y-auto"
          >
            {skillOptions.map((skill) => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[#313131] font-semibold">Experience</label>
          {resumeData.experience.map((exp, index) => (
            <div key={index} className="space-y-2 mb-2">
              <input
                value={exp.title}
                onChange={(e) => handleChange("experience", index, "title", e.target.value)}
                placeholder="Title"
                className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
              />
              <input
                value={exp.company}
                onChange={(e) => handleChange("experience", index, "company", e.target.value)}
                placeholder="Company"
                className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
              />
              <input
                value={exp.years}
                onChange={(e) => handleChange("experience", index, "years", e.target.value)}
                placeholder="Years (e.g., 2024-Present)"
                className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
              />
            </div>
          ))}
          <button
            onClick={() => addSection("experience")}
            className="bg-[#4a4a4a] text-white p-2 rounded mt-2"
          >
            Add Experience
          </button>
        </div>
        <div>
          <label className="block text-[#313131] font-semibold">Education</label>
          {resumeData.education.map((edu, index) => (
            <div key={index} className="space-y-2 mb-2">
              <input
                value={edu.degree}
                onChange={(e) => handleChange("education", index, "degree", e.target.value)}
                placeholder="Degree"
                className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
              />
              <input
                value={edu.school}
                onChange={(e) => handleChange("education", index, "school", e.target.value)}
                placeholder="School"
                className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
              />
              <input
                value={edu.year}
                onChange={(e) => handleChange("education", index, "year", e.target.value)}
                placeholder="Year (e.g., 2026)"
                className="w-full p-2 rounded-lg border border-[#4f4d4d] text-[#313131]"
              />
            </div>
          ))}
          <button
            onClick={() => addSection("education")}
            className="bg-[#4a4a4a] text-white p-2 rounded mt-2"
          >
            Add Education
          </button>
        </div>
        <div>
          <button
            onClick={handleAnalyze}
            className="bg-[#313131] text-white px-4 py-2 rounded hover:bg-[#4a4a4a]"
          >
            Analyze Resume
          </button>
          <h3 className="text-[#313131] font-semibold mt-4">Feedback</h3>
          <p>Score: {feedback.score}%</p>
          <p>Matched Skills: {feedback.matchedSkills.join(", ") || "None"}</p>
          <ul className="list-disc pl-5">
            {feedback.missingSkills.map((skill, i) => (
              <li key={i}>{skill.skill} - {skill.suggestion}</li>
            ))}
          </ul>
          <ul className="list-disc pl-5">
            {feedback.feedback.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="bg-[#313131] text-white px-4 py-2 rounded hover:bg-[#4a4a4a]"
        >
          Save
        </button>
      </div>
    </div>
  );
}