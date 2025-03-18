"use client";

import Navbar from "@/components/navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { skillOptions, domainOptions } from "@/lib/utils";

export default function PostJob() {
  const [formData, setFormData] = useState({
    jobName: "",
    details: "",
    skills: [],
    salary: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSkillChange = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleDetailChange = (domain) => {
    setFormData((prev) => ({
      ...prev,
      details: domain,
    }));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.jobName,
          details: formData.details,
          skills: formData.skills,
          salary: formData.salary,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || "Failed to post job");
      }

      toast.success("Job posted successfully!");
      setFormData({ jobName: "", details: "", skills: [], salary: "" });
      setTimeout(() => router.push("/recruiter/dashboard"), 1000);
    } catch (err) {
      console.error("Error posting job:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#373737]">
      <Navbar userType="recruiter" />
      <main className="flex-1 p-6">
        <div className="bg-[#313131] p-6 rounded-lg mb-8 shadow-md">
          <h1 className="text-3xl font-semibold text-center uppercase text-white tracking-wide">
            Post a Job
          </h1>
        </div>

        <div className="bg-[#d9d9d9] p-8 rounded-lg shadow-md">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[#313131] font-semibold mb-2">Job Name</label>
              <input
                type="text"
                name="jobName"
                value={formData.jobName}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg bg-transparent border border-[#313131] focus:outline-none focus:ring-2 focus:ring-[#313131]"
                required
              />
            </div>
            <div>
              <label className="block text-[#313131] font-semibold mb-2">Domain</label>
              <select
                name="details"
                value={formData.details}
                onChange={(e) => handleDetailChange(e.target.value)}
                className="w-full p-2 rounded-lg bg-transparent border border-[#313131] focus:outline-none focus:ring-2 focus:ring-[#313131]"
                required
              >
                <option value="">Select a domain</option>
                {domainOptions.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#313131] font-semibold mb-2">Skills</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {skillOptions.map((skill) => (
                  <label key={skill} className="flex items-center text-[#313131]">
                    <input
                      type="checkbox"
                      checked={formData.skills.includes(skill)}
                      onChange={() => handleSkillChange(skill)}
                      className="mr-2"
                    />
                    {skill}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[#313131] font-semibold mb-2">Salary</label>
              <input
                type="text"
                name="salary"
                value={formData.salary}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg bg-transparent border border-[#313131] focus:outline-none focus:ring-2 focus:ring-[#313131]"
                placeholder="e.g., $60,000 - $80,000"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-sm px-6 py-2 rounded-lg transition duration-200 ${
                  isSubmitting
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-[#313131] text-white hover:bg-[#4a4a4a]"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}