import { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { AIAssistant } from '@/components/ai/ai-assistant'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>

      {/* AI Assistant - Floating Chatbot */}
      <AIAssistant />
    </div>
  )
}
