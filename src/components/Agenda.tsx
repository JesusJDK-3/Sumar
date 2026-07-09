import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { getAppointments, createAppointment, updateAppointmentStatus } from "../lib/api/appointments"
import { getPatients } from "../lib/api/patients"
import { getTherapists } from "../lib/api/therapists"
import type { Appointment, AppointmentStatus, Patient, Therapist } from "../types"

const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]
const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

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

const statusColor: Record<AppointmentStatus, string> = {
  Confirmada: "bg-emerald-500",
  Pendiente: "bg-amber-400",
  Cancelada: "bg-red-400",
  Reprogramada: "bg-blue-400",
}

export default function Agenda() {
  const [apts, setApts] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [base, setBase] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [filterTherapist, setFilterTherapist] = useState("all")
  const [form, setForm] = useState<Partial<Appointment>>({
    date: dateStr(new Date()),
    startTime: "09:00",
    endTime: "10:00",
    type: "Individual",
    status: "Confirmada",
    notes: "",
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [aptsData, patientsData, therapistsData] = await Promise.all([
          getAppointments(),
          getPatients(),
          getTherapists(),
        ])
        setApts(aptsData)
        setPatients(patientsData)
        setTherapists(therapistsData)
        setForm(f => ({ ...f, patientId: patientsData[0]?.id, therapistId: therapistsData[0]?.id }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando agenda...</div>
  }

  const week = getWeekDates(base)

  const prevWeek = () => { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d) }
  const nextWeek = () => { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d) }

  const getPatient = (id: string) => patients.find(p => p.id === id)
  const getTherapist = (id: string) => therapists.find(t => t.id === id)

  const visibleApts = apts.filter(a =>
    filterTherapist === "all" || a.therapistId === filterTherapist
  )

  const aptsForSlot = (date: string, hour: string) =>
    visibleApts.filter(a => a.date === date && a.startTime === hour)

  const handleSave = async () => {
    try {
      const created = await createAppointment({
        patientId: form.patientId!,
        therapistId: form.therapistId!,
        date: form.date!,
        startTime: form.startTime!,
        endTime: form.endTime!,
        type: form.type!,
        status: form.status as AppointmentStatus,
        notes: form.notes || "",
      })
      setApts(prev => [...prev, created])
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agendar cita")
    }
  }

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const updated = await updateAppointmentStatus(id, status)
      setApts(prev => prev.map(a => a.id === id ? updated : a))
      if (selectedApt?.id === id) setSelectedApt(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estado")
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F2F4F8]">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50 max-w-sm">
          {error}
        </div>
      )}
      {/* Toolbar */}
      <div className="bg-white border-b border-[#E2E7EF] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Agenda</h1>
          <p className="text-xs text-[#6B7A94] mt-0.5">
            {DAYS[week[0].getDay()]} {week[0].getDate()} – {DAYS[week[6].getDay()]} {week[6].getDate()} de {MONTHS[week[0].getMonth()]} {week[0].getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterTherapist} onChange={e => setFilterTherapist(e.target.value)}
            className="appearance-none px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-[#F2F4F8]">
            <option value="all">Todos los terapeutas</option>
            {therapists.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
          </select>
          <button onClick={prevWeek} className="p-2 border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] transition-colors">
            <ChevronLeft size={16} className="text-[#6B7A94]" />
          </button>
          <button onClick={() => setBase(new Date())}
            className="px-3 py-2 text-sm font-medium border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] text-[#6B7A94] transition-colors">
            Hoy
          </button>
          <button onClick={nextWeek} className="p-2 border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] transition-colors">
            <ChevronRight size={16} className="text-[#6B7A94]" />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14] transition-colors">
            <Plus size={14} /> Nueva cita
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid bg-white border-b border-[#E2E7EF] sticky top-0 z-10" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <div className="border-r border-[#E2E7EF]" />
              {week.map(d => {
                const isToday = dateStr(d) === dateStr(new Date())
                return (
                  <div key={d.toISOString()} className={`text-center py-3 border-r border-[#E2E7EF] ${isToday ? "bg-[#FDF0EC]" : ""}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-[#E8481E]" : "text-[#6B7A94]"}`}>
                      {DAYS[d.getDay()]}
                    </p>
                    <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-[#E8481E]" : "text-[#2B3A5C]"}`}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {d.getDate()}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Time slots */}
            {HOURS.map(hour => (
              <div key={hour} className="grid border-b border-[#E2E7EF]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minHeight: 72 }}>
                <div className="text-[10px] text-[#6B7A94] px-2 pt-1.5 border-r border-[#E2E7EF] font-medium shrink-0">
                  {hour}
                </div>
                {week.map(d => {
                  const ds = dateStr(d)
                  const dayApts = aptsForSlot(ds, hour)
                  const isToday = ds === dateStr(new Date())
                  return (
                    <div key={ds} className={`border-r border-[#E2E7EF] p-1 ${isToday ? "bg-[#FDF8F6]" : "bg-white hover:bg-[#F8F9FC]"} transition-colors`}>
                      {dayApts.map(apt => {
                        const patient = getPatient(apt.patientId)
                        const therapist = getTherapist(apt.therapistId)
                        return (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedApt(apt)}
                            className="w-full text-left rounded-lg p-1.5 mb-1 text-white text-[10px] font-semibold truncate transition-opacity hover:opacity-90"
                            style={{ background: therapist?.color || "#E8481E" }}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor[apt.status]}`} />
                              <span className="truncate">{patient?.firstName} {patient?.lastName?.[0]}.</span>
                            </div>
                            <p className="opacity-75 mt-0.5">{apt.startTime}–{apt.endTime}</p>
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

        {/* Appointment detail */}
        {selectedApt && (
          <div className="w-72 bg-white border-l border-[#E2E7EF] flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E7EF]">
              <h3 className="font-semibold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Detalle de cita</h3>
              <button onClick={() => setSelectedApt(null)}><X size={15} className="text-[#6B7A94]" /></button>
            </div>
            <div className="p-5 flex-1 space-y-4">
              {(() => {
                const p = getPatient(selectedApt.patientId)
                const t = getTherapist(selectedApt.therapistId)
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: t?.color || "#E8481E" }}>
                        {p?.firstName[0]}{p?.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A2332] text-sm">{p?.firstName} {p?.lastName}</p>
                        <p className="text-xs text-[#6B7A94]">{p?.code}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <Row label="Fecha" value={selectedApt.date} />
                      <Row label="Horario" value={`${selectedApt.startTime} – ${selectedApt.endTime}`} />
                      <Row label="Tipo" value={selectedApt.type} />
                      <Row label="Terapeuta" value={`${t?.firstName} ${t?.lastName}`} />
                      <Row label="Especialidad" value={t?.specialty || "—"} />
                      {selectedApt.notes && <Row label="Notas" value={selectedApt.notes} />}
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7A94] font-semibold mb-2">Estado de la cita</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["Confirmada", "Cancelada", "Reprogramada", "Pendiente"] as AppointmentStatus[]).map(s => (
                          <button key={s} onClick={() => updateStatus(selectedApt.id, s)}
                            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              selectedApt.status === s
                                ? "bg-[#E8481E] text-white border-[#E8481E]"
                                : "text-[#6B7A94] border-[#E2E7EF] hover:border-[#E8481E] hover:text-[#E8481E]"
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E7EF]">
              <h2 className="font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nueva cita</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Paciente</label>
                <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Terapeuta</label>
                <select value={form.therapistId} onChange={e => setForm(f => ({ ...f, therapistId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                  {therapists.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} · {t.specialty}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Fecha</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Inicio</label>
                  <input type="time" value={form.startTime || ""} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Fin</label>
                  <input type="time" value={form.endTime || ""} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Tipo</label>
                  <select value={form.type || "Individual"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                    {["Individual","Grupal","Familiar","Evaluación inicial"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Notas</label>
                <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors">Agendar cita</button>
            </div>
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