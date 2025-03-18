"use client";

import Navbar from "@/components/navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResumeExtraction() {
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const router = useRouter();

  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0]);
  };

  const handleExtract = async () => {
    if (!resumeFile) return alert("Please upload a resume file");

    const formData = new FormData();
    formData.append("resume", resumeFile);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/resume/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Extraction failed");
      setParsedData(data);
      showToast("Resume parsed and added to your profile!");
      setTimeout(() => router.push("/profile"), 2000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#373737]">
      <Navbar />
      <main className="flex-1 p-6">
        <div className="bg-[#313131] p-6 rounded-lg mb-8 shadow-md">
          <h1 className="text-3xl font-semibold text-center uppercase text-white">Resume Extraction</h1>
        </div>
        <div className="bg-[#d9d9d9] p-8 rounded-lg shadow-md">
          <label htmlFor="resume" className="block text-[#313131] font-semibold mb-2">Upload Resume (PDF)</label>
          <input
            type="file"
            id="resume"
            accept=".pdf"
            onChange={handleFileChange}
            className="w-full p-2 rounded-lg border border-[#313131] text-[#313131]"
          />
          <button onClick={handleExtract} className="submit-button mt-4">Extract</button>
        </div>
        {parsedData && (
          <div className="mt-8 bg-[#d9d9d9] p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-[#313131] mb-4">Parsed Resume</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-bold">Contact</h3>
                <p>{parsedData.contact.name}<br/>{parsedData.contact.email}<br/>{parsedData.contact.phone}</p>
              </div>
              <div>
                <h3 className="font-bold">Skills</h3>
                <ul className="list-disc pl-4">{parsedData.skills.map(s => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-bold">Experience</h3>
                {parsedData.experience.map((e, i) => <p key={i}>{e.title} at {e.company} ({e.years})</p>)}
              </div>
              <div>
                <h3 className="font-bold">Education</h3>
                {parsedData.education.map((e, i) => <p key={i}>{e.degree}, {e.school} ({e.year})</p>)}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function showToast(message) {
  window.dispatchEvent(new CustomEvent("show-toast", { detail: message }));
}