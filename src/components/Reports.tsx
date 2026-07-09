import { useState, useEffect } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp, Users, CalendarCheck, CreditCard, Activity, Award } from "lucide-react"
import { getPatients } from "../lib/api/patients"
import { getSessions } from "../lib/api/sessions"
import { getPayments } from "../lib/api/payments"
import { getTherapists } from "../lib/api/therapists"
import { getAllAttendance } from "../lib/api/attendance"
import type { Patient, Session, Payment, Therapist, AttendanceRecord } from "../types"

const ORANGE = "#E8481E"
const NAVY = "#2B3A5C"
const GREEN = "#059669"
const AMBER = "#D97706"
const BLUE = "#2563EB"

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function last6MonthsData(sessions: Session[], payments: Payment[]) {
  const months: { key: string; month: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, month: MONTH_NAMES[d.getMonth()] })
  }
  return months.map(({ key, month }) => ({
    month,
    ingresos: payments.filter(p => p.status === "Pagado" && p.date.startsWith(key)).reduce((a, p) => a + p.amount, 0),
    sesiones: sessions.filter(s => s.status === "Realizada" && s.date.startsWith(key)).length,
  }))
}

export default function Reports() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [patientsData, sessionsData, paymentsData, therapistsData, attendanceData] = await Promise.all([
          getPatients(), getSessions(), getPayments(), getTherapists(), getAllAttendance(),
        ])
        setPatients(patientsData)
        setSessions(sessionsData)
        setPayments(paymentsData)
        setTherapists(therapistsData)
        setAttendanceRecords(attendanceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar reportes")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando reportes...</div>
  }

  const monthlyIncome = last6MonthsData(sessions, payments)

  const activePatients = patients.filter(p => p.status === "Activo").length
  const inactivePatients = patients.filter(p => p.status === "Inactivo" || p.status === "Alta").length
  const waitingPatients = patients.filter(p => p.status === "En espera").length

  const totalSessions = sessions.length
  const completedSessions = sessions.filter(s => s.status === "Realizada").length
  const cancelledSessions = sessions.filter(s => s.status === "Cancelada").length
  const attendanceRate = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

  const totalIncome = payments.filter(p => p.status === "Pagado").reduce((a, p) => a + p.amount, 0)
  const pending = payments.filter(p => p.status !== "Pagado").reduce((a, p) => a + p.amount, 0)

  const patientByStatus = [
    { name: "Activos", value: activePatients, color: GREEN },
    { name: "Inactivos/Alta", value: inactivePatients, color: "#94A3B8" },
    { name: "En espera", value: waitingPatients, color: AMBER },
  ]

  const sessionsByTherapist = therapists.map(t => ({
    name: `${t.firstName.split(" ")[0]} ${t.lastName.split(" ")[0]}`,
    sesiones: sessions.filter(s => s.therapistId === t.id && s.status === "Realizada").length,
    color: t.color,
  }))

  const paymentByMethod = Object.entries(
    payments.filter(p => p.status === "Pagado").reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const methodColors: Record<string, string> = {
    Transferencia: BLUE,
    Efectivo: NAVY,
    Yape: "#7C3AED",
    Plin: "#0D9488",
    Tarjeta: "#BE185D",
  }

  const presenteRate = Math.round(
    (attendanceRecords.filter(r => r.entityType === "patient" && r.status === "Presente").length /
      Math.max(1, attendanceRecords.filter(r => r.entityType === "patient").length)) * 100
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-auto h-full">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Reportes e Indicadores
        </h1>
        <p className="text-sm text-[#6B7A94] mt-0.5">Sumar Centro de Atención Familiar</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Pacientes activos", value: activePatients, icon: Users, color: NAVY, bg: "#EEF1F8", sub: `${waitingPatients} en espera` },
          { label: "Sesiones realizadas", value: completedSessions, icon: CalendarCheck, color: ORANGE, bg: "#FDF0EC", sub: `${attendanceRate}% asistencia` },
          { label: "Ingresos totales", value: `S/ ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: GREEN, bg: "#ECFDF5", sub: `S/ ${pending} por cobrar` },
          { label: "Tasa asistencia", value: `${presenteRate}%`, icon: Activity, color: BLUE, bg: "#EFF6FF", sub: `${cancelledSessions} cancelaciones` },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div style={{ background: bg }} className="w-9 h-9 rounded-lg flex items-center justify-center">
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1A2332]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-xs font-medium text-[#6B7A94] mt-0.5">{label}</p>
            <p className="text-[10px] text-[#9AA5BE] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Monthly income area chart */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
          <h3 className="font-semibold text-[#2B3A5C] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ingresos mensuales (S/)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyIncome} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ORANGE} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7A94" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7A94" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: "1px solid #E2E7EF", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`S/ ${v.toLocaleString()}`, "Ingresos"]}
              />
              <Area type="monotone" dataKey="ingresos" stroke={ORANGE} strokeWidth={2} fill="url(#incomeGrad)" dot={{ fill: ORANGE, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sessions per month bar chart */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
          <h3 className="font-semibold text-[#2B3A5C] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sesiones por mes
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyIncome} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7A94" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7A94" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: "1px solid #E2E7EF", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sesiones" fill={NAVY} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Patient status pie */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
          <h3 className="font-semibold text-[#2B3A5C] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Estado de pacientes
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={patientByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {patientByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #E2E7EF", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {patientByStatus.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-[#6B7A94]">{name}</span>
                </div>
                <span className="text-xs font-bold text-[#1A2332]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions by therapist */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
          <h3 className="font-semibold text-[#2B3A5C] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sesiones por terapeuta
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sessionsByTherapist} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7A94" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6B7A94" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ border: "1px solid #E2E7EF", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sesiones" radius={[0,4,4,0]}>
                {sessionsByTherapist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {sessionsByTherapist.map(({ name, sesiones, color }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-[#6B7A94]">{name}</span>
                </div>
                <span className="text-xs font-bold text-[#1A2332]">{sesiones} ses.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
          <h3 className="font-semibold text-[#2B3A5C] text-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ingresos por método de pago
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={paymentByMethod} cx="50%" cy="50%" outerRadius={70} paddingAngle={2} dataKey="value">
                {paymentByMethod.map((entry, i) => (
                  <Cell key={i} fill={methodColors[entry.name] || "#94A3B8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #E2E7EF", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`S/ ${v}`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {paymentByMethod.map(({ name, value }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: methodColors[name] || "#94A3B8" }} />
                  <span className="text-xs text-[#6B7A94]">{name}</span>
                </div>
                <span className="text-xs font-bold text-[#1A2332]">S/ {value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top patients table */}
      <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-[#E8481E]" />
          <h3 className="font-semibold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Resumen por paciente
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E7EF]">
              {["Paciente", "Estado", "Sesiones realizadas", "Terapeuta", "Diagnóstico"].map(h => (
                <th key={h} className="text-left pb-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F8]">
            {patients.filter(p => p.status === "Activo").map(p => {
              const t = therapists.find(th => th.id === p.therapistId)
              const sesCount = sessions.filter(s => s.patientId === p.id && s.status === "Realizada").length
              return (
                <tr key={p.id} className="hover:bg-[#F8F9FC] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: t?.color || ORANGE }}>
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <span className="font-semibold text-[#1A2332]">{p.firstName} {p.lastName}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{p.status}</span>
                  </td>
                  <td className="py-3 font-bold text-[#2B3A5C]">{sesCount}</td>
                  <td className="py-3 text-xs text-[#6B7A94]">{t?.firstName} {t?.lastName}</td>
                  <td className="py-3 text-xs text-[#6B7A94] max-w-[220px] truncate">{p.diagnosis || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}