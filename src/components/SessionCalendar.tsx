import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Session, SessionStatus, Patient, Therapist } from "../types"

const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]
const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const statusColor: Record<SessionStatus, string> = {
  Pendiente: "bg-yellow-100 text-yellow-700",
  Realizada: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-700",
  Reprogramada: "bg-blue-100 text-blue-700",
}

function getWeekDates(base: Date): Date[] {
  const day = base.getDay()
  const monday = new Date(base)
  monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0]
}

interface Props {
  sessions: Session[]           // ya filtradas por búsqueda/estado/servicio
  patients: Patient[]
  therapists: Therapist[]
  onStatusChange: (id: string, status: SessionStatus) => Promise<void>
}

export default function SessionCalendar({ sessions, patients, therapists, onStatusChange }: Props) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  // Mantener el panel lateral sincronizado si `sessions` cambia (ej. tras un cambio de estado)
  useEffect(() => {
    if (selectedSession) {
      const updated = sessions.find(s => s.id === selectedSession.id)
      setSelectedSession(updated || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions])

  const week = getWeekDates(currentWeek)

  const getPatient = (id: string) => patients.find(p => p.id === id)
  const getTherapist = (id: string) => therapists.find(t => t.id === id)

  const prevWeek = () => {
    const d = new Date(currentWeek)
    d.setDate(d.getDate() - 7)
    setCurrentWeek(d)
  }
  const nextWeek = () => {
    const d = new Date(currentWeek)
    d.setDate(d.getDate() + 7)
    setCurrentWeek(d)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header semanal */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="text-sm font-semibold text-[#2B3A5C]">
            {MONTHS[currentWeek.getMonth()]} {currentWeek.getFullYear()}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-2 border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] transition-colors">
              <ChevronLeft size={16} className="text-[#6B7A94]" />
            </button>
            <button onClick={nextWeek} className="p-2 border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] transition-colors">
              <ChevronRight size={16} className="text-[#6B7A94]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 pb-5">
          <div className="min-w-[700px] bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
            {/* Day headers */}
            <div className="grid bg-white border-b border-[#E2E7EF] sticky top-0 z-10" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <div className="border-r border-[#E2E7EF]" />
              {week.map(d => {
                const isToday = dateStr(d) === dateStr(new Date())
                return (
                  <div key={d.getDay()} className={`px-2 py-3 text-center border-r border-[#E2E7EF] ${isToday ? "bg-[#FDF0EC]" : ""}`}>
                    <p className="text-xs font-medium text-[#6B7A94]">{DAYS[d.getDay()]}</p>
                    <p className={`text-sm font-bold ${isToday ? "text-[#E8481E]" : "text-[#1A2332]"}`}>{d.getDate()}</p>
                  </div>
                )
              })}
            </div>

            {/* Time slots */}
            {HOURS.map(hour => (
              <div key={hour} className="grid border-b border-[#F2F4F8]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="border-r border-[#E2E7EF] px-2 py-3 text-xs font-medium text-[#9AA5BE] text-right">
                  {hour}
                </div>
                {week.map(d => {
                  const dayStr = dateStr(d)
                  const daySessions = sessions.filter(s => s.date === dayStr && s.startTime?.startsWith(hour))
                  return (
                    <div key={d.getDay() + hour} className="border-r border-[#E2E7EF] p-1 min-h-[64px] relative">
                      {daySessions.map(s => {
                        const p = getPatient(s.patientId)
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSession(s)}
                            className={`w-full text-left px-2 py-1.5 rounded-md mb-1 text-xs font-medium transition-colors border border-transparent hover:opacity-80 ${statusColor[s.status]}`}
                          >
                            <p className="font-semibold truncate">{p?.firstName}</p>
                            <p className="text-[10px] opacity-75">{s.startTime}</p>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side panel - detalle de sesión */}
      {selectedSession && (
        <div className="w-80 border-l border-[#E2E7EF] bg-white p-5 overflow-auto shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#2B3A5C] text-sm">Detalle de sesión</h3>
            <button onClick={() => setSelectedSession(null)}><X size={16} className="text-[#6B7A94]" /></button>
          </div>
          <div className="space-y-3">
            <Row label="Paciente" value={`${getPatient(selectedSession.patientId)?.firstName || ""} ${getPatient(selectedSession.patientId)?.lastName || ""}`} />
            <Row label="Terapeuta" value={`${getTherapist(selectedSession.therapistId)?.firstName || ""} ${getTherapist(selectedSession.therapistId)?.lastName || ""}`} />
            <Row label="Fecha" value={selectedSession.date} />
            <Row label="Hora" value={`${selectedSession.startTime} - ${selectedSession.endTime}`} />
            <Row label="Tipo" value={selectedSession.type || ""} />
            <Row label="N° Servicio" value={selectedSession.service ? `${selectedSession.service.number}. ${selectedSession.service.name}` : "—"} />
            <Row label="Estado" value={selectedSession.status} />
            <Row label="Notas" value={selectedSession.notes || "—"} />
          </div>

          <div className="mt-5">
            <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Cambiar estado</label>
            <select
              value={selectedSession.status}
              onChange={e => onStatusChange(selectedSession.id, e.target.value as SessionStatus)}
              className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
            >
              {["Pendiente", "Realizada", "Cancelada", "Reprogramada"].map(st => <option key={st}>{st}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#6B7A94] text-xs font-medium shrink-0">{label}</span>
      <span className="text-[#1A2332] text-xs text-right">{value}</span>
    </div>
  )
}