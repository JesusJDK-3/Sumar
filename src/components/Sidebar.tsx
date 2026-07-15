import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  CreditCard,
  ClipboardList,
  UserCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "../lib/auth/AuthContext"
import type { UserPermissions } from "../lib/auth/AuthContext"

export type Page =
  | "dashboard"
  | "patients"
  | "clinical"
  | "sessions"
  | "payments"
  | "agenda"
  | "attendance"
  | "reports"
  | "users"

const allNavItems: {
  id: Page
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  permKey: keyof UserPermissions
}[] = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard, permKey: "dashboard" },
  { id: "patients", label: "Pacientes", icon: Users, permKey: "patients" },
  { id: "clinical", label: "Historia Clínica", icon: FileText, permKey: "clinical" },
  { id: "sessions", label: "Sesiones", icon: ClipboardList, permKey: "sessions" },
  { id: "payments", label: "Pagos", icon: CreditCard, permKey: "payments" },
  { id: "agenda", label: "Agenda", icon: CalendarDays, permKey: "agenda" },
  { id: "attendance", label: "Asistencia", icon: UserCheck, permKey: "attendance" },
  { id: "reports", label: "Reportes", icon: BarChart3, permKey: "reports" },
  { id: "users", label: "Usuarios", icon: Settings, permKey: "users" },
]

interface Props {
  current: Page
  onChange: (page: Page) => void
  collapsed: boolean
  onToggle: () => void
  userName?: string
  userRole?: string
  onSignOut?: () => void
}

export default function Sidebar({ current, onChange, collapsed, onToggle, userName, userRole, onSignOut }: Props) {
  const { profile } = useAuth()

  const visibleNavItems = allNavItems.filter(item =>
    profile?.permissions?.[item.permKey] ?? false
  )

  return (
    <aside
      style={{ width: collapsed ? 72 : 240, transition: "width 0.2s ease" }}
      className="flex flex-col h-screen bg-[#2B3A5C] shrink-0 relative"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <img
          src="/src/imports/sumar_icon.png"
          alt="Sumar"
          className="h-8 w-8 object-contain shrink-0 rounded"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              sumar
            </p>
            <p className="text-white/50 text-[10px] uppercase tracking-widest leading-tight">
              Centro Familiar
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleNavItems.map(({ id, label, icon: Icon }) => {
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 relative group ${
                active
                  ? "bg-[#E8481E] text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/60 rounded-r" />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#1A2440] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 bg-[#2B3A5C] border border-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#E8481E] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userName?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{userName || "Usuario"}</p>
              <p className="text-white/40 text-[10px] truncate capitalize">{userRole || ""}</p>
            </div>
            {onSignOut && (
              <button onClick={onSignOut} title="Cerrar sesión" className="text-white/40 hover:text-white text-[10px] shrink-0">
                Salir
              </button>
            )}
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-7 h-7 rounded-full bg-[#E8481E] flex items-center justify-center text-white text-xs font-bold">
              {userName?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}