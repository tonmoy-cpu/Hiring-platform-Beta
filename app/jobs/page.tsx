"use client";

import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import io from "socket.io-client";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [showApplyModal, setShowApplyModal] = useState(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(null);
  const [showChatModal, setShowChatModal] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const socketInstance = io("http://localhost:5000", { auth: { token } });
    setSocket(socketInstance);

    const fetchData = async () => {
      try {
        const jobsUrl =
          statusFilter === "all"
            ? "http://localhost:5000/api/jobs?all=true&includeClosed=true"
            : "http://localhost:5000/api/jobs?all=true";

        const [jobsRes, appsRes] = await Promise.all([
          fetch(jobsUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("http://localhost:5000/api/applications", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!jobsRes.ok) throw new Error(`Jobs fetch failed: ${jobsRes.status}`);
        if (!appsRes.ok) throw new Error(`Applications fetch failed: ${appsRes.status}`);

        const jobsData = await jobsRes.json();
        const appsData = await appsRes.json();

        setJobs(jobsData);
        setAppliedJobs(appsData.map((app) => app.job._id));
        setApplications(appsData);
      } catch (err) {
        toast.error(`Failed to load jobs: ${err.message}`);
        if (err.message.includes("401")) {
          localStorage.removeItem("token");
          router.push("/");
        }
      }
    };
    fetchData();

    socketInstance.on("connect", () => console.log("Socket connected"));
    socketInstance.on("connect_error", (err) => console.error("Socket error:", err));
    socketInstance.on("message", (message) => {
      if (showChatModal) setChatMessages((prev) => [...prev, message]);
    });
    socketInstance.on("notification", ({ chatId, message }) => {
      if (message.sender !== localStorage.getItem("userId")) {
        setNotifications((prev) => [...prev, { chatId, message }]);
        setTimeout(() => setNotifications((prev) => prev.slice(1)), 5000);
      }
    });

    return () => {
      socketInstance.off("message");
      socketInstance.off("notification");
      socketInstance.off("connect");
      socketInstance.off("connect_error");
      socketInstance.disconnect();
    };
  }, [router, statusFilter, showChatModal]);

  const handleApply = async (jobId) => {
    if (!resumeFile || !coverLetter) {
      toast.error("Please upload a resume and write a cover letter.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      const extractRes = await fetch("http://localhost:5000/api/resume/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!extractRes.ok) throw new Error(`Resume extraction failed: ${extractRes.status}`);
      const { resumeText } = await extractRes.json();

      const applyRes = await fetch("http://localhost:5000/api/applications/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, resumeText, coverLetter }),
      });
      if (!applyRes.ok) throw new Error(`Application submission failed: ${applyRes.status}`);
      const newApplication = await applyRes.json();
      setAppliedJobs((prev) => [...prev, jobId]);
      setApplications((prev) => [...prev, newApplication]);
      setShowApplyModal(null);
      setResumeFile(null);
      setCoverLetter("");
      toast.success("Application submitted successfully!");
    } catch (err) {
      toast.error(`Error applying: ${err.message}`);
      if (err.message.includes("401")) {
        localStorage.removeItem("token");
        router.push("/");
      }
    }
  };

  const handleAnalyze = async (jobId) => {
    if (!resumeFile) {
      toast.error("Please upload a resume to analyze.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Resume = reader.result.split(",")[1];
        const analyzeRes = await fetch("http://localhost:5000/api/resume/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ jobId, resume: base64Resume }),
        });

        if (!analyzeRes.ok) throw new Error(`Analysis failed: ${analyzeRes.status}`);
        const result = await analyzeRes.json();
        setAnalysisResult(result);
      };
      reader.readAsDataURL(resumeFile);
    } catch (err) {
      toast.error(`Error analyzing resume: ${err.message}`);
      if (err.message.includes("401")) {
        localStorage.removeItem("token");
        router.push("/");
      }
    }
  };

  const openChat = async (applicationId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/api/chat/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load chat");
      const chat = await res.json();
      setShowChatModal(chat);
      setChatMessages(chat.messages);
      socket.emit("joinChat", chat._id);

      await fetch(`http://localhost:5000/api/chat/${chat._id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      toast.error(`Error loading chat: ${err.message}`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage && !attachment) return;
    const token = localStorage.getItem("token");
    const formData = new FormData();
    if (newMessage) formData.append("content", newMessage);
    if (attachment) formData.append("attachment", attachment);

    try {
      const res = await fetch(`http://localhost:5000/api/chat/${showChatModal._id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to send message");
      const message = await res.json();
      socket.emit("sendMessage", { chatId: showChatModal._id, message });
      setNewMessage("");
      setAttachment(null);
    } catch (err) {
      toast.error(`Error sending message: ${err.message}`);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const textMatch =
      job.title.toLowerCase().includes(filter.toLowerCase()) ||
      job.details.toLowerCase().includes(filter.toLowerCase());
    const skillMatch = skillFilter
      ? job.skills.some((skill) => skill.toLowerCase().includes(skillFilter.toLowerCase()))
      : true;
    const salaryMatch = () => {
      if (!job.salary) return !minSalary && !maxSalary;
      const salaryNum = parseInt(job.salary.replace(/[^0-9]/g, ""), 10) || 0;
      const min = minSalary ? parseInt(minSalary, 10) : -Infinity;
      const max = maxSalary ? parseInt(maxSalary, 10) : Infinity;
      return salaryNum >= min && salaryNum <= max;
    };
    return textMatch && skillMatch && salaryMatch();
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#373737]">
      <Navbar userType="candidate" />
      <main className="flex-1 p-6">
        <div className="bg-[#313131] p-6 rounded-lg mb-8 shadow-md">
          <h1 className="text-3xl font-semibold text-center uppercase text-white tracking-wide">All Jobs</h1>
        </div>

        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Search jobs by title or domain..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#d9d9d9] text-[#313131] border border-[#4f4d4d] focus:outline-none focus:ring-2 focus:ring-[#313131]"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white mb-1">Filter by Skill</label>
              <input
                type="text"
                placeholder="e.g., React.js"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#d9d9d9] text-[#313131] border border-[#4f4d4d] focus:outline-none focus:ring-2 focus:ring-[#313131]"
              />
            </div>
            <div>
              <label className="block text-white mb-1">Min Salary</label>
              <input
                type="number"
                placeholder="e.g., 30000"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#d9d9d9] text-[#313131] border border-[#4f4d4d] focus:outline-none focus:ring-2 focus:ring-[#313131]"
              />
            </div>
            <div>
              <label className="block text-white mb-1">Max Salary</label>
              <input
                type="number"
                placeholder="e.g., 80000"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#d9d9d9] text-[#313131] border border-[#4f4d4d] focus:outline-none focus:ring-2 focus:ring-[#313131]"
              />
            </div>
          </div>
          <div>
            <label className="block text-white mb-1">Job Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 rounded-lg bg-[#d9d9d9] text-[#313131] border border-[#4f4d4d] focus:outline-none focus:ring-2 focus:ring-[#313131]"
            >
              <option value="open">Open Jobs</option>
              <option value="all">All Jobs (Open + Closed)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div key={job._id} className="job-card p-6 rounded-lg shadow-md bg-[#d9d9d9]">
              <h3 className="font-semibold text-lg mb-2 text-[#313131]">{job.title}</h3>
              <p className="text-sm text-[#313131]">{job.details}</p>
              <p className="text-xs text-gray-600 mt-1">Skills: {job.skills.join(", ")}</p>
              <p className="text-xs text-gray-600 mt-1">Salary: {job.salary || "Not specified"}</p>
              <p className="text-xs text-gray-600 mt-1">Status: {job.isClosed ? "Closed" : "Open"}</p>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setShowAnalyzeModal(job)}
                  className="text-sm px-4 py-2 rounded-lg bg-[#4a4a4a] text-white hover:bg-[#313131]"
                >
                  Analyze Resume
                </button>
                {appliedJobs.includes(job._id) && (
                  <button
                    onClick={() => openChat(applications.find((app) => app.job._id === job._id)._id)}
                    className="text-sm px-4 py-2 rounded-lg bg-[#4a4a4a] text-white hover:bg-[#313131]"
                  >
                    Chat
                  </button>
                )}
                <button
                  onClick={() => (appliedJobs.includes(job._id) ? null : setShowApplyModal(job))}
                  disabled={appliedJobs.includes(job._id) || job.isClosed}
                  className={`text-sm px-4 py-2 rounded-lg ${
                    appliedJobs.includes(job._id) || job.isClosed
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-[#313131] text-white hover:bg-[#4a4a4a]"
                  }`}
                >
                  {appliedJobs.includes(job._id) ? "Applied" : job.isClosed ? "Closed" : "Apply"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#d9d9d9] p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold text-[#313131] mb-4">Apply to {showApplyModal.title}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[#313131] font-semibold mb-2">Upload Resume (PDF)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full p-2 rounded-lg border border-[#313131] text-[#313131]"
                  />
                </div>
                <div>
                  <label className="block text-[#313131] font-semibold mb-2">Cover Letter</label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#313131] text-[#313131]"
                    rows={5}
                    placeholder="Write your cover letter here..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowApplyModal(null)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApply(showApplyModal._id)}
                    className="bg-[#313131] text-white px-4 py-2 rounded hover:bg-[#4a4a4a]"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAnalyzeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#d9d9d9] p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold text-[#313131] mb-4">
                Analyze Resume for {showAnalyzeModal.title}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[#313131] font-semibold mb-2">Upload Resume (PDF)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full p-2 rounded-lg border border-[#313131] text-[#313131]"
                  />
                </div>
                {analysisResult && (
                  <div className="text-[#313131]">
                    <p><strong>Match Score:</strong> {analysisResult.matchScore}%</p>
                    <p><strong>Missing Keywords:</strong> {analysisResult.missingKeywords.join(", ") || "None"}</p>
                    <p><strong>Missing Skills:</strong> {analysisResult.missingSkills.join(", ") || "None"}</p>
                    <p><strong>Feedback:</strong></p>
                    <ul className="list-disc pl-5">
                      {analysisResult.feedback.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowAnalyzeModal(null);
                      setAnalysisResult(null);
                      setResumeFile(null);
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleAnalyze(showAnalyzeModal._id)}
                    className="bg-[#313131] text-white px-4 py-2 rounded hover:bg-[#4a4a4a]"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#d9d9d9] p-6 rounded-lg shadow-lg w-full max-w-lg">
              <h2 className="text-xl font-bold text-[#313131] mb-4">Chat</h2>
              <div className="h-64 overflow-y-auto mb-4 bg-white p-2 rounded">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-2 ${msg.sender === localStorage.getItem("userId") ? "text-right" : "text-left"}`}
                  >
                    <p className="text-[#313131]">{msg.content}</p>
                    {msg.attachment && (
                      <a href={`http://localhost:5000${msg.attachment}`} target="_blank" className="text-blue-500">
                        {msg.attachmentType === "link" ? msg.content : `Attachment (${msg.attachmentType})`}
                      </a>
                    )}
                    <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-2 rounded-lg border border-[#313131] text-[#313131]"
                placeholder="Type a message..."
              />
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                className="mt-2"
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => setShowChatModal(null)}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={sendMessage}
                  className="bg-[#313131] text-white px-4 py-2 rounded hover:bg-[#4a4a4a]"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {notifications.map((notif, index) => (
          <div
            key={index}
            className="fixed top-4 right-4 bg-[#313131] text-white p-4 rounded-lg shadow-lg z-50"
          >
            New message in chat {notif.chatId}
          </div>
        ))}
      </main>
    </div>
  );
}