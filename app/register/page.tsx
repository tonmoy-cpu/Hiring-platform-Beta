"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

export default function Register() {
  const [userType, setUserType] = useState("candidate");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    profilePic: null,
    resume: null,
  });
  const router = useRouter();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.files[0] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const form = new FormData();
    form.append("username", formData.username);
    form.append("email", formData.email);
    form.append("password", formData.password);
    form.append("userType", userType);
    if (formData.profilePic) form.append("profilePic", formData.profilePic);
    if (userType === "candidate" && formData.resume) form.append("resume", formData.resume);

    console.log("FormData contents:");
    for (let [key, value] of form.entries()) {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Registration failed");
      if (data.token) {
        localStorage.setItem("token", data.token);
        const decoded = jwtDecode(data.token); // Decode token to get user ID
        localStorage.setItem("userId", decoded.user.id); // Store userId
        localStorage.setItem("userType", decoded.user.userType); // Store userType
        const redirectPath = userType === "recruiter" ? "/recruiter/dashboard" : "/dashboard";
        console.log("Redirecting to:", redirectPath);
        router.push(redirectPath);
      } else {
        toast.error(data.msg);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Registration failed: " + err.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#373737]">
      <div className="w-full max-w-md p-8 form-card rounded-md shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">Register</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block uppercase text-sm text-white">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block uppercase text-sm text-white">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block uppercase text-sm text-white">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block uppercase text-sm text-white">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="profilePic" className="block uppercase text-sm text-white">Profile Picture</label>
            <input
              type="file"
              id="profilePic"
              name="profilePic"
              onChange={handleFileChange}
              className="text-white"
            />
          </div>
          {userType === "candidate" && (
            <div>
              <label htmlFor="resume" className="block uppercase text-sm text-white">Resume (PDF)</label>
              <input
                type="file"
                id="resume"
                name="resume"
                accept=".pdf"
                onChange={handleFileChange}
                className="text-white"
              />
            </div>
          )}
          <div className="mt-4">
            <p className="uppercase text-sm text-white mb-2">Register As</p>
            <div className="flex justify-center space-x-6">
              <label className="flex items-center text-white">
                <input
                  type="radio"
                  name="userType"
                  value="candidate"
                  checked={userType === "candidate"}
                  onChange={() => setUserType("candidate")}
                  className="mr-2 accent-[#313131]"
                />
                Candidate
              </label>
              <label className="flex items-center text-white">
                <input
                  type="radio"
                  name="userType"
                  value="recruiter"
                  checked={userType === "recruiter"}
                  onChange={() => setUserType("recruiter")}
                  className="mr-2 accent-[#313131]"
                />
                Recruiter
              </label>
            </div>
          </div>
          <div className="text-center text-sm mt-4">
            <Link href="/" className="text-white hover:underline">Already a user? Login</Link>
          </div>
          <div className="flex justify-center mt-8">
            <button type="submit" className="submit-button">Register</button>
          </div>
        </form>
      </div>
    </main>
  );
}