const { HfInference } = require("@huggingface/inference");
const User = require("../models/User");
const axios = require("axios");

const hf = new HfInference(process.env.HF_API_KEY);
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// Common skills list (expanded as needed)
const commonSkills = [
  "javascript", "python", "java", "react", "node.js", "sql", "aws", "docker", "git", "html", "css",
  "project management", "agile", "ux design", "figma", "typescript", "mongodb", "graphql",
  "next.js", "react native", "django", "flask", "spring", "c#", ".net", "c++", "go", "ruby",
  "rails", "php", "laravel", "angular", "vue.js", "svelte", "tailwind css", "bootstrap",
  "postgresql", "mysql", "redis", "rest api", "azure", "google cloud", "kubernetes", "jenkins",
  "ci/cd", "machine learning", "tensorflow", "pytorch", "data analysis", "pandas", "numpy",
  "ui/ux design", "adobe xd", "sketch", "blockchain", "solidity", "cybersecurity",
];

// Helper to clean and split text into lines
function cleanText(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
}

// Existing extractResumeDetails function (unchanged)
async function extractResumeDetails(resumeText) {
  try {
    const lines = cleanText(resumeText);

    // Contact Info Extraction using AI and Heuristics
    const contactResult = await hf.tokenClassification({
      model: "dslim/bert-base-NER",
      inputs: resumeText,
      parameters: { aggregation_strategy: "simple" },
    });

    const contact = {
      name: "Unknown",
      email: resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "N/A",
      phone: resumeText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "N/A",
    };

    const nameEntity = contactResult.find((e) => e.entity_group === "PER");
    if (nameEntity) {
      contact.name = nameEntity.word;
    } else {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        if (
          lines[i].length > 2 &&
          !lines[i].includes("@") &&
          !/\d{3}/.test(lines[i])
        ) {
          contact.name = lines[i];
          break;
        }
      }
    }

    const skillsFromAI = await hf
      .tokenClassification({
        model: "dslim/bert-base-NER",
        inputs: resumeText,
      })
      .then((res) =>
        res
          .filter((e) => e.entity_group === "SKILL" || e.score > 0.8)
          .map((e) => e.word.toLowerCase())
      );

    const skillsFromText = lines
      .flatMap((line) => line.toLowerCase().split(/[,;]/))
      .map((skill) => skill.trim())
      .filter((skill) => commonSkills.includes(skill) || skill.length > 2);

    const skills = [...new Set([...skillsFromAI, ...skillsFromText])];

    const experience = [];
    const expKeywords = [
      "experience",
      "work history",
      "employment",
      "professional experience",
    ];
    let expSection = false;
    let currentExp = null;

    for (const line of lines) {
      if (expKeywords.some((k) => line.toLowerCase().includes(k))) {
        expSection = true;
        continue;
      }
      if (
        expSection &&
        (line.toLowerCase().includes("education") || line.toLowerCase().includes("skills"))
      ) {
        expSection = false;
        continue;
      }
      if (expSection) {
        const dateMatch = line.match(/(\d{4}\s*[-–—]\s*\d{4}|\d{4}\s*-\s*present)/i);
        if (dateMatch) {
          if (currentExp) experience.push(currentExp);
          currentExp = { title: "", company: "", years: dateMatch[0] };
        } else if (currentExp && !currentExp.title) {
          const parts = line.split(/ at |, | - /i);
          currentExp.title = parts[0].trim();
          currentExp.company = parts[1]?.trim() || "Unknown";
        }
      }
    }
    if (currentExp) experience.push(currentExp);

    const education = [];
    const eduKeywords = ["education", "academic", "degree"];
    let eduSection = false;

    for (const line of lines) {
      if (eduKeywords.some((k) => line.toLowerCase().includes(k))) {
        eduSection = true;
        continue;
      }
      if (
        eduSection &&
        (line.toLowerCase().includes("experience") || line.toLowerCase().includes("skills"))
      ) {
        eduSection = false;
        continue;
      }
      if (eduSection) {
        const degreeMatch = line.match(/(b\.s\.|m\.s\.|ph\.d\.|bachelor|master|diploma)/i);
        const yearMatch = line.match(/\d{4}/);
        if (degreeMatch || yearMatch) {
          const parts = line.split(/,| - /i);
          education.push({
            degree: degreeMatch ? parts[0].trim() : parts[0].trim(),
            school: parts[1]?.trim() || "Unknown",
            year: yearMatch ? yearMatch[0] : "N/A",
          });
        }
      }
    }

    return { contact, skills, experience, education };
  } catch (err) {
    console.error("Error in extractResumeDetails:", err);
    return {
      contact: { name: "Unknown", email: "N/A", phone: "N/A" },
      skills: [],
      experience: [],
      education: [],
    };
  }
}

// Updated function to analyze resume using Gemini API with refined prompt
async function analyzeResumeWithGemini(resumeText, job) {
  try {
    const jobDescription = `
      Title: ${job.title}
      Details: ${job.details}
      Skills: ${job.skills.join(", ")}
      Salary: ${job.salary || "Not specified"}
    `;

    const prompt = `
      You are an AI-powered resume analyzer for a hiring platform. Your task is to evaluate the provided resume against the job description to determine the candidate's eligibility. Ensure the response is a valid JSON object with the following fields:
      - score: A numerical score (0-100) representing the candidate's eligibility for the job, based on skills match (50%), relevant experience (30%), and education/qualifications (20%).
      - matchedSkills: An array of skills from the resume that match the job's required skills (case-insensitive). If no matches, return an empty array.
      - missingSkills: An array of objects, each containing:
        - skill: A job-required skill missing from the resume.
        - suggestion: A brief suggestion on how to acquire the skill (e.g., "Take an online course on Coursera", "Build a project using this skill").
        If no missing skills, return an empty array.
      - feedback: An array of at least 3 detailed, actionable feedback points to improve the candidate's resume or application for this job. Each point should address specific gaps in skills, experience, or presentation (e.g., "Add quantifiable achievements to your experience section", "Include a project demonstrating [skill]"). If analysis fails, provide generic improvement suggestions.

      Resume Text:
      ${resumeText}

      Job Description:
      ${jobDescription}

      Return the response in JSON format, wrapped in \`\`\`json\n and \n\`\`\`.
    `;

    console.log("Sending prompt to Gemini API:", prompt);

    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    const geminiResult = response.data.candidates[0].content.parts[0].text;
    console.log("Raw Gemini response:", geminiResult);

    let parsedResult;
    try {
      parsedResult = JSON.parse(geminiResult.replace(/```json\n|\n```/g, ""));
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", parseErr.message);
      throw new Error("Invalid JSON response from Gemini");
    }

    console.log("Parsed Gemini result:", parsedResult);

    // Validate and normalize response
    return {
      score: parsedResult.score || 0,
      matchedSkills: Array.isArray(parsedResult.matchedSkills) ? parsedResult.matchedSkills : [],
      missingSkills: Array.isArray(parsedResult.missingSkills) ? parsedResult.missingSkills : [],
      feedback: Array.isArray(parsedResult.feedback) ? parsedResult.feedback : [
        "Ensure your resume includes specific projects related to the job's required skills.",
        "Add quantifiable achievements to your experience section.",
        "Consider tailoring your resume to highlight relevant qualifications."
      ],
    };
  } catch (err) {
    console.error("Error in analyzeResumeWithGemini:", err.message, err.stack);
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: job.skills.map(skill => ({
        skill,
        suggestion: "Consider taking an online course or building a project to gain this skill."
      })),
      feedback: [
        "Unable to analyze resume due to an error. Ensure your resume is detailed and try again.",
        "Include specific projects or experiences relevant to the job description.",
        "Consider adding certifications or coursework to strengthen your application."
      ],
    };
  }
}

// Modified analyzeResumeAgainstJob to use Gemini for analysis
async function analyzeResumeAgainstJob(resumeText, job, candidateId) {
  try {
    // Use Gemini for analysis
    const geminiResult = await analyzeResumeWithGemini(resumeText, job);

    // If candidateId is provided, fetch skills for logging purposes
    let normalizedSkills = [];
    if (candidateId) {
      const user = await User.findById(candidateId).select("resumeParsed.skills");
      if (!user) throw new Error("Candidate not found");
      console.log("Using resumeParsed.skills for logging:", user.resumeParsed?.skills);
      normalizedSkills = (user.resumeParsed?.skills || []).map((s) => s.toLowerCase());
    } else {
      console.log("No candidateId provided, extracting skills from resumeText");
      const { skills } = await extractResumeDetails(resumeText);
      normalizedSkills = skills.map((s) => s.toLowerCase());
    }

    console.log("Gemini analysis result:", geminiResult);

    return geminiResult;
  } catch (err) {
    console.error("Error in analyzeResumeAgainstJob:", err.message, err.stack);
    return {
      score: 0,
      feedback: ["Error analyzing resume. Please ensure the resume is valid."],
      matchedSkills: [],
      missingSkills: job.skills.map(skill => ({
        skill,
        suggestion: "Consider taking an online course or building a project to gain this skill."
      })),
    };
  }
}

module.exports = { extractResumeDetails, analyzeResumeAgainstJob };