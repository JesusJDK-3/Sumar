import { useState } from "react"
import Sidebar, { type Page } from "./components/Sidebar"
import Dashboard from "./components/Dashboard"
import Patients from "./components/Patients"
import ClinicalRecords from "./components/ClinicalRecords"
import Sessions from "./components/Sessions"
import Payments from "./components/Payments"
import Agenda from "./components/Agenda"
import Attendance from "./components/Attendance"
import Reports from "./components/Reports"
import Login from "./components/Login"
import Users from "./components/Users"
import { AuthProvider, useAuth } from "./lib/auth/AuthContext"


function AppContent() {
  const { session, profile, loading, signOut } = useAuth()
  const [page, setPage] = useState<Page>("dashboard")
  const [collapsed, setCollapsed] = useState(false)

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-[#6B7A94] text-sm">Cargando...</div>
  }

  if (!session) {
    return <Login />
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />
      case "patients": return <Patients />
      case "clinical": return <ClinicalRecords />
      case "sessions": return <Sessions />
      case "payments": return <Payments />
      case "agenda": return <Agenda />
      case "attendance": return <Attendance />
      case "reports": return <Reports />
      case "users": return <Users />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F4F8]">
      <Sidebar
        current={page}
        onChange={setPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        userName={profile?.fullName}
        userRole={profile?.role}
        onSignOut={signOut}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}