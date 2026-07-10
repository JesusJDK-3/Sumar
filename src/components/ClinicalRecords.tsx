import { useState, useEffect } from "react"
import { Search, Plus, X, TrendingUp, Brain, Target, ChevronDown, Calendar } from "lucide-react"
import { getClinicalRecords, createClinicalRecord, getSessionsWithoutRecord } from "../lib/api/clinicalRecords"
import { getPatients } from "../lib/api/patients"
import { getTherapists } from "../lib/api/therapists"
import type { ClinicalRecord, Patient, Therapist, Session } from "../types"

export default function ClinicalRecords() {
  const [records, setRecords] = useState<ClinicalRecord[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [sessionsWithoutRecord, setSessionsWithoutRecord] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [form, setForm] = useState<Partial<ClinicalRecord>>({})

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [recordsData, patientsData, therapistsData] = await Promise.all([
          getClinicalRecords(),
          getPatients(),
          getTherapists(),
        ])
        setRecords(recordsData)
        setPatients(patientsData)
        setTherapists(therapistsData)
        setSelectedPatientId(patientsData[0]?.id || "")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Cargar sesiones sin registro clínico cuando cambia el paciente seleccionado
  useEffect(() => {
    if (!selectedPatientId) return
    async function loadSessions() {
      try {
        const sessions = await getSessionsWithoutRecord(selectedPatientId)
        setSessionsWithoutRecord(sessions)
      } catch (err) {
        console.error("Error cargando sesiones sin registro:", err)
      }
    }
    loadSessions()
  }, [selectedPatientId, records]) // Se recarga cuando cambian los records también

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando historia clínica...</div>
  }

  const filteredPatients = patients.filter(p =>
    !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  const patient = patients.find(p => p.id === selectedPatientId)
  const therapist = therapists.find(t => t.id === patient?.therapistId)
  const patientRecords = records
    .filter(r => r.patientId === selectedPatientId)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Abrir formulario para completar ficha de una sesión existente
  const openRecordForSession = (session: Session) => {
    setSelectedSession(session)
    setForm({
      patientId: selectedPatientId,
      sessionId: session.id,
      therapistId: session.therapistId,
      date: session.date,
      sessionNumber: patientRecords.length + 1,
      objectives: "",
      observations: "",
      diagnosis: patient?.diagnosis || "",
      treatment: "",
      nextSteps: "",
      mood: 3,
      progress: 50,
    })
    setShowForm(true)
    setSelectedRecord(null)
  }

  const handleSave = async () => {
    try {
      const created = await createClinicalRecord({
        patientId: form.patientId!,
        sessionId: form.sessionId,
        therapistId: form.therapistId!,
        date: form.date!,
        sessionNumber: form.sessionNumber!,
        objectives: form.objectives || "",
        observations: form.observations || "",
        diagnosis: form.diagnosis || "",
        treatment: form.treatment || "",
        nextSteps: form.nextSteps || "",
        mood: form.mood || 3,
        progress: form.progress || 50,
      })
      setRecords(prev => [created, ...prev])
      setShowForm(false)
      setSelectedSession(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar registro")
    }
  }

  const moodLabel = (m: number) => ["", "Muy bajo", "Bajo", "Regular", "Bueno", "Excelente"][m] || "—"
  const moodColor = (m: number) => {
    if (m <= 2) return "text-red-500"
    if (m === 3) return "text-amber-500"
    return "text-emerald-500"
  }

  return (
    <div className="flex h-full">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      {/* Patient list */}
      <div className="w-64 bg-white border-r border-[#E2E7EF] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-[#E2E7EF]">
          <h1 className="font-bold text-[#2B3A5C] text-base mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Historia Clínica
          </h1>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7A94]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-[#F2F4F8]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredPatients.map(p => {
            const t = therapists.find(th => th.id === p.therapistId)
            const rCount = records.filter(r => r.patientId === p.id).length
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedPatientId(p.id); setSelectedRecord(null); setShowForm(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#F2F4F8] ${
                  selectedPatientId === p.id ? "bg-[#FDF0EC]" : "hover:bg-[#F8F9FC]"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: t?.color || "#E8481E" }}
                >
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1A2332] truncate">{p.firstName} {p.lastName}</p>
                  <p className="text-[10px] text-[#6B7A94]">{rCount} registro{rCount !== 1 ? "s" : ""}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Records area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Patient header */}
        {patient && (
          <div className="bg-white border-b border-[#E2E7EF] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#1A2332] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-xs text-[#6B7A94]">
                {patient.code} · {patient.age} años · Terapeuta: {therapist?.firstName} {therapist?.lastName}
              </p>
              {patient.diagnosis && (
                <p className="text-xs text-[#2B3A5C] mt-1 font-medium">{patient.diagnosis}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            
            {/* Sesiones pendientes de ficha clínica */}
            {sessionsWithoutRecord.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#E8481E] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Calendar size={14} /> Sesiones pendientes de ficha clínica
                </h3>
                <div className="space-y-2">
                  {sessionsWithoutRecord.map(session => {
                    const t = therapists.find(th => th.id === session.therapistId)
                    return (
                      <button
                        key={session.id}
                        onClick={() => openRecordForSession(session)}
                        className="w-full text-left bg-[#FDF0EC] border border-[#E8481E]/20 rounded-xl p-4 hover:shadow-md transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#1A2332]">
                            Sesión del {session.date} · {session.startTime} - {session.endTime}
                          </p>
                          <p className="text-xs text-[#6B7A94] mt-0.5">
                            Terapeuta: {t?.firstName} {t?.lastName} · {session.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8481E] text-white text-xs font-semibold rounded-lg">
                          <Plus size={12} /> Completar ficha
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {patientRecords.length === 0 && sessionsWithoutRecord.length === 0 && (
              <div className="text-center py-16 text-[#6B7A94]">
                <Brain size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No hay registros clínicos ni sesiones pendientes para este paciente.</p>
              </div>
            )}

            {patientRecords.length === 0 && sessionsWithoutRecord.length > 0 && (
              <div className="text-center py-8 text-[#6B7A94]">
                <p className="text-sm">Selecciona una sesión de arriba para completar su ficha clínica.</p>
              </div>
            )}

            {/* Registros clínicos existentes */}
            {patientRecords.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-[#2B3A5C] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Brain size={14} /> Historial clínico
                </h3>
                <div className="space-y-3">
                  {patientRecords.map(rec => {
                    const t = therapists.find(th => th.id === rec.therapistId)
                    return (
                      <button
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        className={`w-full text-left bg-white rounded-xl border p-5 hover:shadow-md transition-all ${
                          selectedRecord?.id === rec.id ? "border-[#E8481E] shadow-md" : "border-[#E2E7EF] shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-xs font-bold text-[#E8481E] bg-[#FDF0EC] px-2 py-0.5 rounded-full">
                              Sesión #{rec.sessionNumber}
                            </span>
                            <p className="text-sm font-semibold text-[#2B3A5C] mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {rec.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-[10px] text-[#6B7A94] font-medium">Estado ánimo</p>
                              <p className={`text-sm font-bold ${moodColor(rec.mood)}`}>{rec.mood}</p>
                              <p className="text-[10px] text-[#6B7A94]">{moodLabel(rec.mood)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-[#6B7A94] font-medium">Progreso</p>
                              <p className="text-sm font-bold text-[#2B3A5C]">{rec.progress}%</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-[#6B7A94]">Terapeuta: {t?.firstName} {t?.lastName}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedRecord && (
            <div className="w-80 bg-white border-l border-[#E2E7EF] p-5 overflow-y-auto shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Sesión #{selectedRecord.sessionNumber}
                </h3>
                <button onClick={() => setSelectedRecord(null)}><X size={16} className="text-[#6B7A94]" /></button>
              </div>
              <div className="space-y-5">
                <Section icon={Target} title="Objetivos" content={selectedRecord.objectives} />
                <Section icon={Brain} title="Observaciones" content={selectedRecord.observations} />
                <Section icon={TrendingUp} title="Diagnóstico" content={selectedRecord.diagnosis} />
                <Section icon={TrendingUp} title="Tratamiento" content={selectedRecord.treatment} />
                <Section icon={Target} title="Próximos pasos" content={selectedRecord.nextSteps} />
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E2E7EF]">
                  <div className="text-center p-3 bg-[#F2F4F8] rounded-lg">
                    <p className="text-[10px] text-[#6B7A94] font-medium">Estado de ánimo</p>
                    <p className={`text-xl font-bold ${moodColor(selectedRecord.mood)}`}>{selectedRecord.mood}</p>
                    <p className="text-[10px] text-[#6B7A94]">{moodLabel(selectedRecord.mood)}</p>
                  </div>
                  <div className="text-center p-3 bg-[#F2F4F8] rounded-lg">
                    <p className="text-[10px] text-[#6B7A94] font-medium">Progreso</p>
                    <p className="text-xl font-bold text-[#2B3A5C]">{selectedRecord.progress}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form modal - completar ficha clínica de una sesión existente */}
      {showForm && selectedSession && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E7EF]">
              <h2 className="font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Completar ficha clínica
              </h2>
              <button onClick={() => { setShowForm(false); setSelectedSession(null) }}><X size={18} className="text-[#6B7A94]" /></button>
            </div>
            
            {/* Info de la sesión (solo lectura) */}
            <div className="px-6 py-3 bg-[#F2F4F8] border-b border-[#E2E7EF]">
              <p className="text-xs text-[#6B7A94]">
                <span className="font-semibold text-[#2B3A5C]">Sesión:</span> {selectedSession.date} · {selectedSession.startTime} - {selectedSession.endTime}
              </p>
              <p className="text-xs text-[#6B7A94] mt-0.5">
                <span className="font-semibold text-[#2B3A5C]">Tipo:</span> {selectedSession.type}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Fecha del registro</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">N° de sesión</label>
                  <input type="number" value={form.sessionNumber || ""} readOnly
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg bg-[#F2F4F8] text-[#6B7A94]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Estado de ánimo (1-5)</label>
                  <div className="relative">
                    <select value={form.mood || 3} onChange={e => setForm(f => ({ ...f, mood: +e.target.value }))}
                      className="w-full appearance-none px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} - {["","Muy bajo","Bajo","Regular","Bueno","Excelente"][n]}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7A94] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Progreso (%)</label>
                  <input type="number" min={0} max={100} value={form.progress || 50} onChange={e => setForm(f => ({ ...f, progress: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
              </div>
              {[
                { key: "objectives", label: "Objetivos de la sesión" },
                { key: "observations", label: "Observaciones clínicas" },
                { key: "diagnosis", label: "Diagnóstico / evolución" },
                { key: "treatment", label: "Tratamiento aplicado" },
                { key: "nextSteps", label: "Próximos pasos / tareas" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">{label}</label>
                  <textarea
                    rows={3}
                    value={(form as Record<string, string>)[key] || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] resize-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button onClick={() => { setShowForm(false); setSelectedSession(null) }} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors">Guardar ficha clínica</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, content }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; content: string }) {
  if (!content) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-[#E8481E]" />
        <p className="text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">{title}</p>
      </div>
      <p className="text-sm text-[#1A2332] leading-relaxed">{content}</p>
    </div>
  )
}