import { useState, useEffect } from "react"
import { Users, CalendarCheck, CreditCard, TrendingUp, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import { getPatients } from "../lib/api/patients"
import { getSessions } from "../lib/api/sessions"
import { getPayments } from "../lib/api/payments"
import { getAppointments } from "../lib/api/appointments"
import { getTherapists } from "../lib/api/therapists"
import { useAuth } from "../lib/auth/AuthContext"
import type { Patient, Session, Payment, Appointment, Therapist } from "../types"
import { type Page } from "./Sidebar"

interface Props {
  onNavigate: (page: Page) => void
}

export default function Dashboard({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [patientsData, sessionsData, paymentsData, appointmentsData, therapistsData] = await Promise.all([
          getPatients(), getSessions(), getPayments(), getAppointments(), getTherapists(),
        ])
        setPatients(patientsData)
        setSessions(sessionsData)
        setPayments(paymentsData)
        setAppointments(appointmentsData)
        setTherapists(therapistsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando...</div>
  }

  const today = new Date().toISOString().split("T")[0]
  const currentMonth = new Date().toISOString().slice(0, 7)
  const todayFormatted = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const activePatients = patients.filter(p => p.status === "Activo").length
  const todaySessions = sessions.filter(s => s.date === today).length
  const pendingAmount = sessions
  .filter(s => s.status === "Realizada")
  .reduce((sum, s) => {
    const paid = payments
      .filter(p => p.sessionId === s.id)
      .reduce((a, p) => a + p.amount, 0)
    return sum + Math.max(0, s.fee - paid)
  }, 0)
  const monthIncome = payments.filter(p => (p.status === "Pagado" || p.status === "Parcial") && p.date.startsWith(currentMonth)).reduce((a, p) => a + p.amount, 0)

  const recentSessions = sessions.filter(s => s.status === "Realizada").slice(0, 5)
  const todayApts = appointments.filter(a => a.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const getPatient = (id: string) => patients.find(p => p.id === id)
  const getTherapist = (id: string) => therapists.find(t => t.id === id)

  const stats = [
    { label: "Pacientes activos", value: activePatients, icon: Users, color: "#2B3A5C", bg: "#EEF1F8", page: "patients" as Page },
    { label: "Sesiones hoy", value: todaySessions, icon: CalendarCheck, color: "#f09731", bg: "#FDF0EC", page: "sessions" as Page },
    { label: "Ingresos del mes", value: `S/ ${monthIncome.toLocaleString()}`, icon: TrendingUp, color: "#059669", bg: "#ECFDF5", page: "payments" as Page },
    { label: "Cuentas por cobrar", value: `S/ ${pendingAmount}`, icon: CreditCard, color: "#ee1e1e", bg: "#f7d6d5", page: "payments" as Page },
  ]

  const statusColor: Record<string, string> = {
    Realizada: "bg-emerald-100 text-emerald-700",
    Pendiente: "bg-yellow-100 text-yellow-700",
    Cancelada: "bg-red-100 text-red-700",
    Reprogramada: "bg-blue-100 text-blue-700",
  }

  const aptStatusIcon = (s: string) => {
    if (s === "Confirmada") return <CheckCircle2 size={14} className="text-emerald-500" />
    if (s === "Pendiente") return <Clock size={14} className="text-yellow-500" />
    return <AlertCircle size={14} className="text-red-500" />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Buenos días, {profile?.fullName || "Administrador"}
        </h1>
        <p className="text-sm text-[#6B7A94] mt-0.5 capitalize">{todayFormatted}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg, page }) => (
          <button
            key={label}
            onClick={() => onNavigate(page)}
            className="bg-white rounded-xl p-5 text-left shadow-sm border border-[#E2E7EF] hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div style={{ background: bg }} className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1A2332]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {value}
            </p>
            <p className="text-xs text-[#6B7A94] mt-0.5 font-medium">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Today's agenda */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E7EF]">
            <h2 className="font-semibold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Agenda de hoy
            </h2>
            <button onClick={() => onNavigate("agenda")} className="text-xs text-[#E8481E] hover:underline font-medium">
              Ver agenda →
            </button>
          </div>
          <div className="divide-y divide-[#F2F4F8]">
            {todayApts.length === 0 && (
              <p className="text-sm text-[#6B7A94] p-5">No hay citas para hoy.</p>
            )}
            {todayApts.map(apt => {
              const patient = getPatient(apt.patientId)
              const therapist = getTherapist(apt.therapistId)
              return (
                <div key={apt.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="text-center w-14 shrink-0">
                    <p className="text-xs font-bold text-[#2B3A5C]">{apt.startTime}</p>
                    <p className="text-[10px] text-[#6B7A94]">{apt.endTime}</p>
                  </div>
                  <div
                    className="w-0.5 h-8 rounded-full shrink-0"
                    style={{ background: therapist?.color || "#E8481E" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A2332] truncate">
                      {patient?.firstName} {patient?.lastName}
                    </p>
                    <p className="text-xs text-[#6B7A94]">{therapist?.firstName} {therapist?.lastName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {aptStatusIcon(apt.status)}
                    <span className="text-xs text-[#6B7A94]">{apt.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E7EF]">
            <h2 className="font-semibold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Sesiones recientes
            </h2>
            <button onClick={() => onNavigate("sessions")} className="text-xs text-[#E8481E] hover:underline font-medium">
              Ver todas →
            </button>
          </div>
          <div className="divide-y divide-[#F2F4F8]">
            {recentSessions.map(s => {
              const patient = getPatient(s.patientId)
              const therapist = getTherapist(s.therapistId)
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                    style={{ background: therapist?.color || "#E8481E" }}
                  >
                    {patient?.firstName[0]}{patient?.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A2332] truncate">
                      {patient?.firstName} {patient?.lastName}
                    </p>
                    <p className="text-xs text-[#6B7A94]">{s.date} · {s.startTime}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[s.status]}`}>
                    {s.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending payments */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-sm overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E7EF]">
            <h2 className="font-semibold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Cuentas por cobrar
            </h2>
            <button onClick={() => onNavigate("payments")} className="text-xs text-[#E8481E] hover:underline font-medium">
              Ver pagos →
            </button>
          </div>
          <div className="divide-y divide-[#F2F4F8]">
            {sessions
              .filter(s => s.status === "Realizada")
              .map(s => {
                const patient = getPatient(s.patientId)
                const paid = payments.filter(p => p.sessionId === s.id).reduce((a, p) => a + p.amount, 0)
                const debt = s.fee - paid
                if (debt <= 0) return null
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A2332] truncate">
                        {patient?.firstName} {patient?.lastName}
                      </p>
                      <p className="text-xs text-[#6B7A94]">
                        {s.date} · {s.type} · Pagado: S/ {paid} / S/ {s.fee}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-amber-600">S/ {debt}</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}