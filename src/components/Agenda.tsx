import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { getAppointments, createAppointment, updateAppointmentStatus } from "../lib/api/appointments"
import { getPatients, createPatient } from "../lib/api/patients"
import { getTherapists } from "../lib/api/therapists"
import { getServices } from "../lib/api/services"
import { supabase } from "../lib/supabaseClient"
import type { Appointment, AppointmentStatus, Patient, Therapist, Service, Gender } from "../types"

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

function generatePatientCode() {
  return "P" + Math.floor(Math.random() * 90000 + 10000).toString()
}

export default function Agenda() {
  const [today] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [apts, setApts] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [form, setForm] = useState<Partial<Appointment>>({
    patientId: "",
    therapistId: "",
    serviceId: "",
    date: dateStr(today),
    startTime: "09:00",
    endTime: "10:00",
    type: "Individual",
    status: "Pendiente",
    notes: "",
  })

  // Mini-formulario de paciente rápido
  const [showQuickPatient, setShowQuickPatient] = useState(false)
  const [quickPatient, setQuickPatient] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    phone: "",
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [aptsData, patientsData, therapistsData, servicesData] = await Promise.all([
          getAppointments(),
          getPatients(),
          getTherapists(),
          getServices(),
        ])
        setApts(aptsData)
        setPatients(patientsData)
        setTherapists(therapistsData)
        setServices(servicesData)
        setForm(f => ({
          ...f,
          therapistId: therapistsData[0]?.id,
          serviceId: servicesData[0]?.id,
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const week = getWeekDates(currentWeek)

  const handleQuickPatient = async () => {
    try {
      const code = generatePatientCode()
      const newPatient = await createPatient({
        code,
        firstName: quickPatient.firstName,
        lastName: quickPatient.lastName,
        age: 0,
        gender: "Otro" as Gender,
        dni: quickPatient.dni || "",
        phone: quickPatient.phone || "",
        email: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        insurance: "",
        therapistId: form.therapistId || therapists[0]?.id,
        status: "Activo",
        diagnosis: "",
        notes: "",
      })

      const updatedPatients = await getPatients()
      setPatients(updatedPatients)
      setForm(f => ({ ...f, patientId: newPatient.id }))
      setShowQuickPatient(false)
      setQuickPatient({ firstName: "", lastName: "", dni: "", phone: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear paciente")
    }
  }

  const handleSave = async () => {
    try {
      const created = await createAppointment({
        patientId: form.patientId!,
        therapistId: form.therapistId!,
        serviceId: form.serviceId,
        date: form.date!,
        startTime: form.startTime!,
        endTime: form.endTime!,
        type: form.type!,
        status: form.status as AppointmentStatus,
        notes: form.notes || "",
      })
      setApts(prev => [...prev, created])
      setShowForm(false)
      setShowQuickPatient(false)
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

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando agenda...</div>
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Agenda semanal
          </h1>
          <p className="text-sm text-[#6B7A94] mt-0.5">
            {MONTHS[currentWeek.getMonth()]} {currentWeek.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] transition-colors">
            <ChevronLeft size={16} className="text-[#6B7A94]" />
          </button>
          <button onClick={nextWeek} className="p-2 border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8] transition-colors">
            <ChevronRight size={16} className="text-[#6B7A94]" />
          </button>
          <button onClick={() => {
            setShowForm(true)
            setShowQuickPatient(false)
            setSelectedApt(null)
            setForm({
              patientId: "",
              therapistId: therapists[0]?.id || "",
              serviceId: services[0]?.id || "",
              date: dateStr(today),
              startTime: "09:00",
              endTime: "10:00",
              type: "Individual",
              status: "Pendiente",
              notes: "",
            })
          }}
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
                  const dayApts = apts.filter(a => a.date === dayStr && a.startTime?.startsWith(hour))
                  return (
                    <div key={d.getDay() + hour} className="border-r border-[#E2E7EF] p-1 min-h-[64px] relative">
                      {dayApts.map(a => {
                        const p = patients.find(p => p.id === a.patientId)
                        const t = therapists.find(t => t.id === a.therapistId)
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelectedApt(a)}
                            className={`w-full text-left px-2 py-1.5 rounded-md mb-1 text-xs font-medium transition-colors ${
                              a.status === "Confirmada" ? "bg-[#EEF1F8] text-[#2B3A5C] border border-[#2B3A5C]/10" :
                              a.status === "Cancelada" ? "bg-red-50 text-red-700 border border-red-100" :
                              "bg-[#FDF0EC] text-[#E8481E] border border-[#E8481E]/10"
                            }`}
                          >
                            <p className="font-semibold truncate">{p?.firstName} {p?.lastName}</p>
                            <p className="text-[10px] opacity-75">{t?.firstName} {t?.lastName}</p>
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

        {/* Side panel - appointment detail */}
        {selectedApt && (
          <div className="w-80 border-l border-[#E2E7EF] bg-white p-5 overflow-auto shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#2B3A5C] text-sm">Detalle de cita</h3>
              <button onClick={() => setSelectedApt(null)}><X size={16} className="text-[#6B7A94]" /></button>
            </div>
            <div className="space-y-3">
              <Row label="Paciente" value={`${patients.find(p => p.id === selectedApt.patientId)?.firstName || ""} ${patients.find(p => p.id === selectedApt.patientId)?.lastName || ""}`} />
              <Row label="Terapeuta" value={`${therapists.find(t => t.id === selectedApt.therapistId)?.firstName || ""} ${therapists.find(t => t.id === selectedApt.therapistId)?.lastName || ""}`} />
              <Row label="Fecha" value={selectedApt.date} />
              <Row label="Hora" value={`${selectedApt.startTime} - ${selectedApt.endTime}`} />
              <Row label="Tipo" value={selectedApt.type || ""} />
              <Row label="Estado" value={selectedApt.status} />
              <Row label="Notas" value={selectedApt.notes || "-"} />
            </div>
            <div className="flex gap-2 mt-5">
              {selectedApt.status === "Pendiente" && (
                <button onClick={() => updateStatus(selectedApt.id, "Confirmada")}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14]">
                  Confirmar
                </button>
              )}
              {selectedApt.status !== "Cancelada" && (
                <button onClick={() => updateStatus(selectedApt.id, "Cancelada")}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#2B3A5C]">Nueva cita</h3>
              <button onClick={() => { setShowForm(false); setShowQuickPatient(false) }}><X size={18} className="text-[#6B7A94]" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Paciente</label>
                <select 
                  value={showQuickPatient ? "__new__" : (form.patientId || "")} 
                  onChange={e => {
                    if (e.target.value === "__new__") {
                      setShowQuickPatient(true)
                      setForm(f => ({ ...f, patientId: "" }))
                    } else {
                      setForm(f => ({ ...f, patientId: e.target.value }))
                      setShowQuickPatient(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                  <option value="__new__" className="text-[#E8481E] font-semibold">+ Nuevo paciente</option>
                </select>
              </div>

              {/* Mini-formulario de paciente rápido */}
              {showQuickPatient && (
                <div className="bg-[#FDF0EC] border border-[#E8481E]/20 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#E8481E]">Registrar paciente rápido</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#6B7A94] mb-1">Nombre *</label>
                      <input 
                        value={quickPatient.firstName}
                        onChange={e => setQuickPatient(p => ({ ...p, firstName: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                        placeholder="Nombre"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6B7A94] mb-1">Apellido *</label>
                      <input 
                        value={quickPatient.lastName}
                        onChange={e => setQuickPatient(p => ({ ...p, lastName: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                        placeholder="Apellido"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#6B7A94] mb-1">DNI</label>
                      <input 
                        value={quickPatient.dni}
                        onChange={e => setQuickPatient(p => ({ ...p, dni: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6B7A94] mb-1">Teléfono</label>
                      <input 
                        value={quickPatient.phone}
                        onChange={e => setQuickPatient(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleQuickPatient}
                      disabled={!quickPatient.firstName || !quickPatient.lastName}
                      className="px-4 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors disabled:opacity-50"
                    >
                      Guardar y seleccionar
                    </button>
                    <button 
                      onClick={() => { setShowQuickPatient(false); setForm(f => ({ ...f, patientId: "" })) }}
                      className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Terapeuta</label>
                <select value={form.therapistId} onChange={e => setForm(f => ({ ...f, therapistId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                  {therapists.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} · {t.specialty}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">N° Servicio</label>
                <select
                  value={form.serviceId || ""}
                  onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
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
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Tipo</label>
                <select value={form.type || "Individual"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                  <option>Individual</option>
                  <option>Pareja</option>
                  <option>Familiar</option>
                  <option>Grupal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Notas</label>
                <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] resize-none" placeholder="Opcional" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowForm(false); setShowQuickPatient(false) }} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]">Cancelar</button>
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