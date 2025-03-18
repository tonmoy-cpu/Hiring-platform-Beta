"use client";

import Navbar from "@/components/navbar";
import { CircleUser, FileText } from "lucide-react";
import { useState, useEffect } from "react";

export default function TrackApplications() {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("http://localhost:5000/api/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch applications");
        const data = await res.json();
        setApplications(data);
      } catch (err) {
        console.error("Error fetching applications:", err);
      }
    };
    fetchApplications();
  }, []);

  const getMissingSkills = (jobSkills, candidateSkills) => {
    return jobSkills.filter((skill) => !candidateSkills.includes(skill));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#373737]">
      <Navbar userType="candidate" />
      <main className="flex-1 p-6">
        <div className="bg-[#313131] p-6 rounded-lg mb-8 shadow-md">
          <h1 className="text-3xl font-semibold text-center uppercase text-white">Track Applications</h1>
        </div>
        <div className="space-y-6">
          {applications.length > 0 ? (
            applications.map((app) => {
              const missingSkills = getMissingSkills(
                app.job.skills || [],
                app.candidate.resumeParsed?.skills || []
              );
              return (
                <div key={app._id} className="bg-[#d9d9d9] p-4 rounded-lg shadow-md">
                  <div className="flex items-center">
                    <CircleUser className="h-10 w-10 text-[#313131] mr-4" />
                    <div className="flex-1 text-[#313131]">
                      <p className="font-bold text-lg">{app.job.title}</p>
                      <p className="text-sm">Domain: {app.job.details}</p>
                      <p className="text-xs mt-1">Status: {app.status}</p>
                    </div>
                    <button className="p-2 rounded-full bg-[#313131] hover:bg-[#4a4a4a] transition">
                      <FileText className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-[#313131] font-semibold">Missing Skills:</p>
                    {missingSkills.length > 0 ? (
                      <ul className="list-disc pl-4 text-[#313131]">
                        {missingSkills.map((skill) => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#313131]">None</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-white">No applications found.</p>
          )}
        </div>
      </main>
    </div>
  );
}