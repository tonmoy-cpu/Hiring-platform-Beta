"use client";

import Navbar from "@/components/navbar";
import { useState, useEffect, ReactElement } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import { Briefcase, FileText, BarChart, MessageSquare, ChevronRight, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import Link from "next/link";

// Type definitions
interface Job {
  _id: string;
  title: string;
  details: string;
  skills: string[];
  salary?: string;
  isClosed?: boolean;
}

interface Application {
  _id: string;
  job: Job;
  status: 'Applied' | 'Under Review' | 'Selected' | 'Not Selected';
  createdAt: string;
}

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: string;
  attachment?: string;
  attachmentType?: string;
}

interface Chat {
  _id: string;
  application: string;
  messages: ChatMessage[];
}

interface Notification {
  chatId: string;
  message: ChatMessage;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [preferredDomains, setPreferredDomains] = useState<string[]>([]);
  const [hoveredJob, setHoveredJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState<Job | null>(null);
  const [, setShowPreferencesPopup] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [, setHasPreferences] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  const [showChatModal, setShowChatModal] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const socketInstance = io(
  "https://hiring-platform-beta.onrender.com",
  {
    auth: { token }
  }
);

setSocket(socketInstance);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, jobsRes, appsRes] = await Promise.all([
          fetch("https://hiring-platform-beta.onrender.com/api/auth/profile", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://hiring-platform-beta.onrender.com/api/jobs", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://hiring-platform-beta.onrender.com/api/applications", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!profileRes.ok) throw new Error(`Profile fetch failed with status: ${profileRes.status}`);
        if (!jobsRes.ok) throw new Error(`Jobs fetch failed with status: ${jobsRes.status}`);
        if (!appsRes.ok) throw new Error(`Applications fetch failed with status: ${appsRes.status}`);

        const profile = await profileRes.json();
        const jobsData = await jobsRes.json();
        const appsData = await appsRes.json();

        setUserSkills(profile.resumeParsed?.skills || []);
        setPreferredSkills(profile.preferredSkills || []);
        setPreferredDomains(profile.preferredDomains || []);
        setHasPreferences(profile.preferredSkills?.length > 0 || profile.preferredDomains?.length > 0);
        setJobs(jobsData);
        setAppliedJobs(
         appsData.map((app: { job: { _id: string } }) => app.job._id)
         );
        setApplications(appsData); // Set applications

        if (!profile.preferredSkills?.length && !profile.preferredDomains?.length && !toastShown) {
          toast.custom(
            (t) => (
              <div
                className="bg-accent text-white p-4 rounded-lg shadow-lg flex items-center justify-between max-w-md"
                style={{ borderRadius: "8px" }}
              >
                <span>Please add your preferred skills and domains to see relevant jobs!</span>
                <button
                  onClick={() => {
                    setShowPreferencesPopup(true);
                    toast.dismiss(t.id);
                  }}
                  className="btn-primary ml-4"
                >
                  Add Now
                </button>
              </div>
            ),
            {
              duration: 5000,
              position: "top-right",
            }
          );
          setToastShown(true);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        toast.error("Failed to load dashboard data: " + errorMessage);
        if (errorMessage.includes("401")) {
          localStorage.removeItem("token");
          router.push("/");
        }
      } finally {
        setIsLoading(false);
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
  }, [router, toastShown, showChatModal]);

  // Rest of the component remains the same...

  const getMissingSkills = (job: Job): string[] => {
    return job.skills.filter((skill: string) => !userSkills.includes(skill));
  };

  const handleSkillChange = (skill: string): void => {
    setPreferredSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleDomainChange = (domain: string): void => {
    setPreferredDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const savePreferences = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    try {
      const res = await fetch("https://hiring-platform-beta.onrender.com/api/auth/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferredSkills, preferredDomains }),
      });
      if (!res.ok) throw new Error(`Failed to save preferences with status: ${res.status}`);
      setHasPreferences(true);
      setShowPreferencesPopup(false);
      const jobsRes = await fetch("https://hiring-platform-beta.onrender.com/api/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!jobsRes.ok) throw new Error(`Jobs refresh failed with status: ${jobsRes.status}`);
      setJobs(await jobsRes.json());
      toast.success("Preferences saved successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Error saving preferences: " + errorMessage);
      if (errorMessage.includes("401")) {
        localStorage.removeItem("token");
        router.push("/");
      }
    }
  };

  const handleApply = async (jobId: string): Promise<void> => {
    if (!resumeFile || !coverLetter) {
      toast.error("Please upload a resume and write a cover letter.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      const extractRes = await fetch("https://hiring-platform-beta.onrender.com/api/resume/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!extractRes.ok) throw new Error(`Resume extraction failed with status: ${extractRes.status}`);
      const { resumeText } = await extractRes.json();

      const applyRes = await fetch("https://hiring-platform-beta.onrender.com/api/applications/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId, resumeText, coverLetter }),
      });
      if (!applyRes.ok) throw new Error(`Application submission failed with status: ${applyRes.status}`);
      const newApplication = await applyRes.json();
      setAppliedJobs((prev) => [...prev, jobId]);
      setApplications((prev) => [...prev, newApplication]);
      setShowApplyModal(null);
      setResumeFile(null);
      setCoverLetter("");
      toast.success("Application submitted successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Error applying: " + errorMessage);
      if (errorMessage.includes("401")) {
        localStorage.removeItem("token");
        router.push("/");
      }
    }
  };

  const handleChat = async (application: Application): Promise<void> => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      // Use application._id for fetching chat history
      const res = await fetch(`https://hiring-platform-beta.onrender.com/api/chat/${application._id}`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to load chat");
      const chat = await res.json();
      setShowChatModal(chat);
      setChatMessages(chat.messages);
      socket?.emit("joinChat", chat._id);

      await fetch(`https://hiring-platform-beta.onrender.com/api/chat/${chat._id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Error loading chat: ${errorMessage}`);
    }
  };

  const sendMessage = async (): Promise<void> => {
    if (!newMessage && !attachment) return;
    if (!showChatModal) {
      toast.error("Chat not loaded");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const formData = new FormData();
    if (newMessage) formData.append("content", newMessage);
    if (attachment) formData.append("attachment", attachment);

    try {
      const res = await fetch(`https://hiring-platform-beta.onrender.com/api/chat/${showChatModal.application}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to send message");
      const sentMessage: ChatMessage = await res.json();

      setChatMessages((prev) => [...prev, sentMessage]);
      socket?.emit("sendMessage", { chatId: showChatModal._id, message: sentMessage });
      setNewMessage("");
      setAttachment(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Error sending message: ${errorMessage}`);
    }
  };

  const getStatusBadgeClass = (status: Application['status']): string => {
    switch (status) {
      case 'Applied': return 'status-badge status-applied';
      case 'Under Review': return 'status-badge status-review';
      case 'Selected': return 'status-badge status-selected';
      case 'Not Selected': return 'status-badge status-rejected';
      default: return 'status-badge status-applied';
    }
  };

  const getStatusIcon = (status: Application['status']): ReactElement => {
    switch (status) {
      case 'Applied': return <Clock className="h-4 w-4" />;
      case 'Under Review': return <AlertCircle className="h-4 w-4" />;
      case 'Selected': return <CheckCircle className="h-4 w-4" />;
      case 'Not Selected': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar userType="candidate" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading your personalized dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userType="candidate" />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-accent p-8 rounded-lg mb-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-10 rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
          <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Welcome to HireON</h1>
          <p className="text-gray-300 max-w-2xl relative z-10">
            Your smart hiring platform. Find the perfect job match with AI-powered recommendations and skill analysis.
          </p>
        </div>

        {/* Recommended Jobs Section */}
        <section className="mb-12 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">Recommended Jobs</h2>
            <Link href="/jobs" className="text-primary hover:underline flex items-center gap-1 text-sm">
              View all jobs <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.slice(0, 6).map((job, index) => (
              <div
                key={job._id}
                className="card job-card group"
                onMouseEnter={() => setHoveredJob(job)}
                onMouseLeave={() => setHoveredJob(null)}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary bg-opacity-20">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  {job.isClosed && (
                    <span className="px-2 py-1 bg-danger bg-opacity-20 text-danger text-xs rounded-full">
                      Closed
                    </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg mb-2 text-white group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-300">{job.details}</p>
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 3).map(skill => (
                      <span key={skill} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 3 && (
                      <span className="skill-tag">+{job.skills.length - 3}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-primary">Salary:</span> {job.salary || "Not specified"}
                  </p>
                </div>
                
                <div className="mt-auto pt-3 border-t border-border flex justify-end">
                  <button
                    onClick={() => (appliedJobs.includes(job._id) ? null : setShowApplyModal(job))}
                    disabled={appliedJobs.includes(job._id)}
                    className={`px-4 py-2 rounded-lg transition duration-200 ${
                      appliedJobs.includes(job._id)
                        ? "bg-accent text-gray-400 cursor-not-allowed"
                        : "btn-primary"
                    }`}
                  >
                    {appliedJobs.includes(job._id) ? "Applied" : "Apply Now"}
                  </button>
                </div>
                
                {hoveredJob === job && (
                  <div className="absolute top-0 left-0 w-full h-full bg-accent bg-opacity-95 p-4 rounded-lg shadow-lg z-10 animate-fade-in flex flex-col">
                    <h4 className="text-primary font-semibold mb-2">Skills Match Analysis</h4>
                    <div className="flex-1 overflow-y-auto">
                      <h5 className="text-white font-medium mb-1">Missing Skills:</h5>
                      <ul className="list-disc pl-5 text-gray-300 mb-4">
                        {getMissingSkills(job).length ? (
                          getMissingSkills(job).map((skill) => <li key={skill}>{skill}</li>)
                        ) : (
                          <li>None - Perfect match!</li>
                        )}
                      </ul>
                      
                      <h5 className="text-white font-medium mb-1">Your Matching Skills:</h5>
                      <ul className="list-disc pl-5 text-gray-300">
                        {job.skills.filter(skill => userSkills.includes(skill)).map((skill) => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    </div>
                    <button 
                      className="mt-4 btn-primary w-full"
                      onClick={() => setHoveredJob(null)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* My Applications Section */}
        <section className="mb-12 animate-fade-in" style={{animationDelay: "0.2s"}}>
          <h2 className="text-2xl font-semibold text-white mb-6">My Applications</h2>
          {applications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.map((app) => (
                <div key={app._id} className="card group hover:border-primary transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg text-white group-hover:text-primary transition-colors">
                      {app.job.title}
                    </h3>
                    <div className={getStatusBadgeClass(app.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(app.status)}
                        <span>{app.status}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Applied on: {new Date(app.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleChat(app)} // Pass the application object directly
                      className="btn-primary flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat with Recruiter</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <div className="mb-4 text-primary">
                <FileText className="h-12 w-12 mx-auto opacity-50" />
              </div>
              <p className="text-white mb-4">No applications yet. Apply to jobs above!</p>
              <Link href="/jobs" className="btn-primary inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Browse All Jobs</span>
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-12 animate-fade-in" style={{animationDelay: "0.3s"}}>
          <h2 className="text-2xl font-semibold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Link href="/resume-extraction" className="card hover:border-primary group">
              <div className="p-3 rounded-full bg-primary bg-opacity-20 inline-block mb-4 group-hover:bg-primary group-hover:bg-opacity-30 transition-all">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors mb-2">
                Resume Extraction
              </h3>
              <p className="text-sm text-gray-300">
                Upload your resume and let our AI extract your skills and experience.
              </p>
            </Link>
            
            <Link href="/track-applications" className="card hover:border-primary group">
              <div className="p-3 rounded-full bg-primary bg-opacity-20 inline-block mb-4 group-hover:bg-primary group-hover:bg-opacity-30 transition-all">
                <BarChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors mb-2">
                Track Applications
              </h3>
              <p className="text-sm text-gray-300">
                Monitor the status of all your job applications in one place.
              </p>
            </Link>
            
            <div className="card hover:border-primary group cursor-pointer" onClick={() => setShowPreferencesPopup(true)}>
              <div className="p-3 rounded-full bg-primary bg-opacity-20 inline-block mb-4 group-hover:bg-primary group-hover:bg-opacity-30 transition-all">
                {/* <Settings className="h-6 w-6 text-primary" /> */}
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors mb-2">
                Update Preferences
              </h3>
              <p className="text-sm text-gray-300">
                Set your preferred skills and domains to get better job recommendations.
              </p>
            </div>
          </div>
        </section>

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 modal">
            <div className="bg-accent p-6 rounded-lg shadow-lg w-full max-w-md modal-content">
              <h2 className="text-xl font-bold text-primary mb-6">Apply to {showApplyModal.title}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Upload Resume (PDF)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full p-3 rounded-lg border border-border text-white bg-background"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Cover Letter</label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border text-white bg-background"
                    rows={5}
                    placeholder="Write your cover letter here..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowApplyModal(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApply(showApplyModal._id)}
                    className="btn-primary"
                  >
                    Submit Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 modal">
            <div className="bg-accent p-6 rounded-lg shadow-lg w-full max-w-lg modal-content">
              <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>
                  Chat for {applications.find((app) => app._id === showChatModal.application)?.job.title}
                </span>
              </h2>
              <div className="h-64 overflow-y-auto mb-4 bg-background p-4 rounded-lg">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`mb-3 ${
                        msg.sender === localStorage.getItem("userId") 
                          ? "text-right" 
                          : "text-left"
                      }`}
                    >
                      <div 
                        className={`inline-block p-3 rounded-lg max-w-[80%] ${
                          msg.sender === localStorage.getItem("userId")
                            ? "bg-primary text-background"
                            : "bg-accent text-white"
                        }`}
                      >
                        <p>{msg.content}</p>
                        {msg.attachment && (
                          <a 
                            href={`https://hiring-platform-beta.onrender.com${msg.attachment}`} 
                            target="_blank" 
                            className="text-blue-300 underline text-sm mt-1 inline-block"
                          >
                            {msg.attachmentType === "link" ? msg.content : `Attachment (${msg.attachmentType})`}
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 block mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border text-white bg-background"
                  placeholder="Type a message..."
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                    className="text-sm text-gray-300"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowChatModal(null)}
                      className="btn-secondary"
                    >
                      Close
                    </button>
                    <button
                      onClick={sendMessage}
                      className="btn-primary"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.map((notif, index) => (
          <div
            key={index}
            className="fixed top-20 right-4 bg-accent text-white p-4 rounded-lg shadow-lg z-50 notification max-w-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary bg-opacity-20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">New Message</p>
                <p className="text-sm text-gray-300 truncate">{notif.message.content}</p>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}