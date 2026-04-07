import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from './ChatPanel'
import { useUiStore } from '../../stores/uiStore'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { chatPanelOpen } = useUiStore()

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 min-w-0">
        {children}
      </main>
      {chatPanelOpen && <ChatPanel />}
    </div>
  )
}
