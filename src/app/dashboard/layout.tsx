import { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { AIAssistant } from '@/components/ai/ai-assistant'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-background">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-8 lg:px-12 xl:px-16 lg:py-10 w-full">
          {children}
        </div>
      </main>

      {/* AI Assistant - Floating Chatbot */}
      <AIAssistant />
    </div>
  )
}
