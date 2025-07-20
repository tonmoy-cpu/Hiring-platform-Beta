"use client";

import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ApplicationStatisticsChart() {
  const [chartData, setChartData] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token") || "");
    }

    const fetchData = async () => {
      if (!token) {
        console.log("No token available, skipping fetch");
        return;
      }
      try {
        const response = await fetch("/api/applications/analytics/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Raw Application Statistics Data:", data);
        const statusCounts = data.statusCounts || {};
        const values = Object.values(statusCounts);
        if (values.every((v) => v === 0)) {
          setChartData({
            labels: ["No Applications"],
            datasets: [{ label: "Applications", data: [1], backgroundColor: "#4a4a4a" }],
          });
        } else {
          setChartData({
            labels: Object.keys(statusCounts),
            datasets: [
              {
                label: "Applications",
                data: values,
                backgroundColor: "#4a4a4a",
              },
            ],
          });
        }
      } catch (error) {
        console.error("Error fetching application statistics:", error);
        setChartData({
          labels: ["No Data"],
          datasets: [{ label: "Error", data: [1], backgroundColor: "#4a4a4a" }],
        });
      }
    };
    if (token) fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (!chartData) return <div className="text-[#313131] text-center">Loading...</div>;

  return (
    <div style={{ height: "300px" }}>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: { position: "top" },
            title: { display: true, text: "Application Statistics" },
          },
          scales: {
            y: {
              beginAtZero: true,
              min: 0,
              max: 10,
              ticks: { stepSize: 1, precision: 0 },
            },
          },
        }}
      />
    </div>
  );
}

function JobPerformance() {
  const [performanceData, setPerformanceData] = useState([]);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token") || "");
    }

    const fetchData = async () => {
      if (!token) {
        console.log("No token available, skipping fetch");
        return;
      }
      try {
        const response = await fetch("/api/jobs/analytics/job-performance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Job Performance Data:", data);
        setPerformanceData(data);
      } catch (error) {
        console.error("Error fetching job performance data:", error);
        setPerformanceData([{ role: "Error", performance: 0, avgScore: 0, applicantsCount: 0 }]);
      }
    };
    if (token) fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (!performanceData.length) return <div className="text-[#313131] text-center">Loading...</div>;

  return (
    <div className="space-y-2">
      {performanceData.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between">
            <span className="text-[#313131]">{item.role || "Unknown"}</span>
            <span className="text-[#313131]">
              {item.performance || 0}% (Avg Score: {item.avgScore || 0})
            </span>
          </div>
          <div className="w-full bg-[#313131] h-2 rounded-full">
            <div
              className="bg-[#4a4a4a] h-2 rounded-full"
              style={{ width: `${Math.min(item.performance || 0, 100)}%` }}
            ></div>
          </div>
          <div className="text-[#313131] text-sm">Applicants: {item.applicantsCount || 0}</div>
        </div>
      ))}
    </div>
  );
}

function CandidateDemographicsChart() {
  const [chartData, setChartData] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token") || "");
    }

    const fetchData = async () => {
      if (!token) {
        console.log("No token available, skipping fetch");
        return;
      }
      try {
        const response = await fetch("/api/jobs/analytics/demographics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Candidate Demographics Data:", data);
        setChartData({
          labels: Object.keys(data.demographics || {}),
          datasets: [
            {
              label: "Candidates",
              data: Object.values(data.demographics || {}),
              backgroundColor: "#4a4a4a",
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching candidate demographics:", error);
        setChartData({
          labels: ["No Data"],
          datasets: [{ label: "Error", data: [1], backgroundColor: "#4a4a4a" }],
        });
      }
    };
    if (token) fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (!chartData) return <div className="text-[#313131] text-center">Loading...</div>;

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Candidate Demographics" },
        },
      }}
    />
  );
}

function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token") || "");
    }

    const fetchData = async () => {
      if (!token) {
        console.log("No token available, skipping fetch");
        return;
      }
      try {
        const response = await fetch("/api/jobs/analytics/recommendations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("AI Recommendations Data:", data);
        setRecommendations(data.recommendations || []);
      } catch (error) {
        console.error("Error fetching AI recommendations:", error);
        setRecommendations(["Error fetching recommendations. Please try again later."]);
      }
    };
    if (token) fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (!recommendations.length) return <div className="text-[#313131] text-center">Loading...</div>;

  return (
    <ul className="space-y-2 text-[#313131]">
      {recommendations.map((rec, index) => (
        <li key={index}>• {rec}</li>
      ))}
    </ul>
  );
}

export default function Analytics() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userType="recruiter" />
      <main className="flex-1 p-4">
        <div className="bg-[#313131] p-6 rounded-md mb-8">
          <h1 className="text-2xl font-bold text-center uppercase">AI ANALYTICS</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">Application Statistics</h2>
            <ApplicationStatisticsChart />
          </div>

          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">Candidate Demographics</h2>
            <CandidateDemographicsChart />
          </div>

          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">Job Performance</h2>
            <JobPerformance />
          </div>

          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">AI Recommendations</h2>
            <AIRecommendations />
          </div>
        </div>
      </main>
    </div>
  );
}