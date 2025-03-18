import Navbar from "@/components/navbar"
import { BarChart, PieChart } from "lucide-react"

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
            <div className="flex justify-center items-center h-48">
              <BarChart className="h-32 w-32 text-[#313131]" />
            </div>
          </div>

          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">Candidate Demographics</h2>
            <div className="flex justify-center items-center h-48">
              <PieChart className="h-32 w-32 text-[#313131]" />
            </div>
          </div>

          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">Job Performance</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#313131]">Software Engineer</span>
                <span className="text-[#313131]">78%</span>
              </div>
              <div className="w-full bg-[#313131] h-2 rounded-full">
                <div className="bg-[#4a4a4a] h-2 rounded-full w-[78%]"></div>
              </div>

              <div className="flex justify-between">
                <span className="text-[#313131]">Product Manager</span>
                <span className="text-[#313131]">65%</span>
              </div>
              <div className="w-full bg-[#313131] h-2 rounded-full">
                <div className="bg-[#4a4a4a] h-2 rounded-full w-[65%]"></div>
              </div>

              <div className="flex justify-between">
                <span className="text-[#313131]">UX Designer</span>
                <span className="text-[#313131]">92%</span>
              </div>
              <div className="w-full bg-[#313131] h-2 rounded-full">
                <div className="bg-[#4a4a4a] h-2 rounded-full w-[92%]"></div>
              </div>
            </div>
          </div>

          <div className="bg-[#d9d9d9] p-6 rounded-md">
            <h2 className="text-[#313131] font-bold mb-4">AI Recommendations</h2>
            <ul className="space-y-2 text-[#313131]">
              <li>• Improve job descriptions for higher quality applicants</li>
              <li>• Consider expanding remote work options</li>
              <li>• Increase salary range for senior positions</li>
              <li>• Add more technical assessment options</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

