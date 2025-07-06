// /app/resume-extraction/page.tsx
"use client";

import Navbar from "@/components/navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResumeExtraction() {
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const router = useRouter();

  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0]);
    setError(null); // Reset error on new file selection
  };

  const handleExtract = async () => {
    if (!resumeFile) {
      showToast("Please upload a resume file");
      return;
    }

    setIsLoading(true); // Set loading state
    setError(null); // Reset error
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
      if (!res.ok) throw new Error(data.error || data.msg || "Extraction failed");
      setParsedData(data.parsedData); // Set only parsedData
      showToast("Resume parsed and added to your profile!");
      setTimeout(() => router.push("/profile"), 2000);
    } catch (err) {
      console.error("Error extracting resume:", err.message);
      setError(err.message);
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false); // Reset loading state
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
            disabled={isLoading} // Disable input during loading
          />
          <button
            onClick={handleExtract}
            className="submit-button mt-4"
            disabled={isLoading} // Disable button during loading
          >
            {isLoading ? "Extracting..." : "Extract"}
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
        {parsedData && (
          <div className="mt-8 bg-[#d9d9d9] p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-[#313131] mb-4">Parsed Resume</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-bold">Contact</h3>
                <p>
                  {parsedData.contact?.name || "N/A"}<br />
                  {parsedData.contact?.email || "N/A"}<br />
                  {parsedData.contact?.phone || "N/A"}
                </p>
              </div>
              <div>
                <h3 className="font-bold">Skills</h3>
                <ul className="list-disc pl-4">
                  {parsedData.skills?.length > 0 ? parsedData.skills.map((s, i) => <li key={i}>{s || "N/A"}</li>) : <li>N/A</li>}
                </ul>
              </div>
              <div>
                <h3 className="font-bold">Experience</h3>
                {parsedData.experience?.length > 0 ? (
                  parsedData.experience.map((e, i) => (
                    <p key={i}>
                      {e.title || "N/A"} at {e.company || "N/A"} ({e.years || "N/A"})
                    </p>
                  ))
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div>
                <h3 className="font-bold">Education</h3>
                {parsedData.education?.length > 0 ? (
                  parsedData.education.map((e, i) => (
                    <p key={i}>
                      {e.degree || "N/A"}, {e.school || "N/A"} ({e.year || "N/A"})
                    </p>
                  ))
                ) : (
                  <p>N/A</p>
                )}
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