"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const router = useRouter();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Login form data:", formData);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      console.log("Login response:", data);

      if (!res.ok) throw new Error(data.msg || "Login failed");
      if (data.token) {
        localStorage.setItem("token", data.token);
        // Fetch user profile to get userType
        const profileRes = await fetch("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        const user = await profileRes.json();
        console.log("User profile after login:", user);
        const redirectPath = user.userType === "recruiter" ? "/recruiter/dashboard" : "/dashboard";
        console.log("Redirecting to:", redirectPath);
        router.push(redirectPath);
      } else {
        alert(data.msg);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed: " + err.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#373737]">
      <div className="w-full max-w-md p-8 form-card rounded-md shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">Login</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block uppercase text-sm text-white">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
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
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div className="text-center text-sm mt-4">
            <Link href="/register" className="text-white hover:underline">Not a user? Register</Link>
          </div>
          <div className="flex justify-center mt-8">
            <button type="submit" className="submit-button">Login</button>
          </div>
        </form>
      </div>
    </main>
  );
}