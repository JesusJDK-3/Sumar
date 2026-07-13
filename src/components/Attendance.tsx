import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown } from "lucide-react"
import { getAttendanceByDate, markAttendance } from "../lib/api/attendance"
import { getPatients } from "../lib/api/patients"
import { getTherapists } from "../lib/api/therapists"
import type { AttendanceRecord, AttendanceStatus, Patient, Therapist } from "../types"

const statusConfig: Record<AttendanceStatus, { color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  Presente: { color: "text-emerald-600 bg-emerald-100", icon: CheckCircle2 },
  Ausente: { color: "text-red-600 bg-red-100", icon: XCircle },
  Tardanza: { color: "text-amber-600 bg-amber-100", icon: Clock },
  Justificado: { color: "text-blue-600 bg-blue-100", icon: AlertCircle },
}

function last7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split("T")[0]
  })
}

export default function Attendance() {
  const DATES = last7Dates()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(DATES[0])
  const [tab, setTab] = useState<"patient" | "therapist">("patient")

  useEffect(() => {
    async function loadBase() {
      try {
        const [patientsData, therapistsData] = await Promise.all([getPatients(), getTherapists()])
        setPatients(patientsData)
        setTherapists(therapistsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      }
    }
    loadBase()
  }, [])

  useEffect(() => {
    async function loadAttendance() {
      try {
        setLoading(true)
        const data = await getAttendanceByDate(selectedDate)
        setRecords(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar asistencia")
      } finally {
        setLoading(false)
      }
    }
    loadAttendance()
  }, [selectedDate])

  const dayRecords = records.filter(r => r.date === selectedDate && r.entityType === tab)

  const getEntity = (id: string, type: "patient" | "therapist") => {
    if (type === "patient") {
      const p = patients.find(x => x.id === id)
      return p ? { name: `${p.firstName} ${p.lastName}`, sub: p.code, color: therapists.find(t => t.id === p.therapistId)?.color || "#E8481E" } : null
    }
    const t = therapists.find(x => x.id === id)
    return t ? { name: `${t.firstName} ${t.lastName}`, sub: t.specialty, color: t.color } : null
  }

  const getRecord = (entityId: string) => dayRecords.find(r => r.entityId === entityId)

  const toggleStatus = async (entityId: string, entityType: "patient" | "therapist", status: AttendanceStatus) => {
    try {
      const updated = await markAttendance(entityId, entityType, selectedDate, status)
      setRecords(prev => {
        const exists = prev.some(r => r.id === updated.id)
        return exists ? prev.map(r => r.id === updated.id ? updated : r) : [...prev, updated]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al marcar asistencia")
    }
  }

  const entities = tab === "patient" ? patients : therapists
  const entityList = entities.map(e => {
    const id = e.id
    const entity = getEntity(id, tab)
    const record = getRecord(id)
    return { id, entity, record }
  })

  // Summary
  const presente = dayRecords.filter(r => r.status === "Presente").length
  const ausente = dayRecords.filter(r => r.status === "Ausente").length
  const tardanza = dayRecords.filter(r => r.status === "Tardanza").length
  const justificado = dayRecords.filter(r => r.status === "Justificado").length

  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00")
    return dt.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-[#E2E7EF] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Control de Asistencia</h1>
          <p className="text-xs text-[#6B7A94] mt-0.5 capitalize">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-[#F2F4F8]">
              {DATES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7A94] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 p-5 pb-0">
        {[
          { label: "Presentes", value: presente, color: "#059669", bg: "#ECFDF5" },
          { label: "Tardanzas", value: tardanza, color: "#D97706", bg: "#FFFBEB" },
          { label: "Justificados", value: justificado, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Ausentes", value: ausente, color: "#DC2626", bg: "#FEF2F2" },
        ].map(({ label, value, color}) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E7EF] p-4 shadow-sm">
            <p className="text-2xl font-bold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-xs text-[#6B7A94] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-4">
        {(["patient", "therapist"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === t ? "bg-[#2B3A5C] text-white" : "bg-white text-[#6B7A94] border border-[#E2E7EF] hover:bg-[#F2F4F8]"
            }`}>
            {t === "patient" ? "Pacientes" : "Psicología"}
          </button>
        ))}
      </div>

      {/* Attendance list */}
      <div className="flex-1 overflow-auto p-5 pt-3">
        <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E7EF]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">
                  {tab === "patient" ? "Paciente" : "Psicología"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">Hora llegada</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">Marcar asistencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F8]">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6B7A94] text-sm">Cargando...</td></tr>
              )}
              {!loading && entityList.map(({ id, entity, record }) => {
                if (!entity) return null
                const StatusIcon = record ? statusConfig[record.status].icon : null
                return (
                  <tr key={id} className="hover:bg-[#F8F9FC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: entity.color }}>
                          {entity.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A2332]">{entity.name}</p>
                          <p className="text-[10px] text-[#6B7A94]">{entity.sub}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7A94] font-mono text-sm">
                      {record?.checkinTime || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {record ? (
                        <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full w-fit ${statusConfig[record.status].color}`}>
                          {StatusIcon && <StatusIcon size={11} />}
                          {record.status}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9AA5BE]">Sin marcar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(["Presente","Tardanza","Ausente","Justificado"] as AttendanceStatus[]).map(s => {
                          const cfg = statusConfig[s]
                          const Icon = cfg.icon
                          return (
                            <button key={s} title={s}
                              onClick={() => toggleStatus(id, tab, s)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                                record?.status === s
                                  ? `${cfg.color} border-current`
                                  : "border-[#E2E7EF] text-[#C8D0DF] hover:border-[#6B7A94] hover:text-[#6B7A94]"
                              }`}>
                              <Icon size={14} />
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7A94]">
                      {record?.notes || "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}