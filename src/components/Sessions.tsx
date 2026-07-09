import { useState, useEffect } from "react"
import { Plus, X, ChevronDown, Search } from "lucide-react"
import { getSessions, createSession, updateSessionStatus } from "../lib/api/sessions"
import { getPatients } from "../lib/api/patients"
import { getTherapists } from "../lib/api/therapists"
import type { Session, SessionStatus, Patient, Therapist } from "../types"

const statusColor: Record<SessionStatus, string> = {
  Realizada: "bg-emerald-100 text-emerald-700",
  Pendiente: "bg-yellow-100 text-yellow-700",
  Cancelada: "bg-red-100 text-red-700",
  Reprogramada: "bg-blue-100 text-blue-700",
}

export default function Sessions() {
  const [sessionList, setSessionList] = useState<Session[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "Todos">("Todos")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Session>>({
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    type: "Individual",
    status: "Pendiente",
    notes: "",
    fee: 120,
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [sessionsData, patientsData, therapistsData] = await Promise.all([
          getSessions(),
          getPatients(),
          getTherapists(),
        ])
        setSessionList(sessionsData)
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

  const getPatient = (id: string) => patients.find(p => p.id === id)
  const getTherapist = (id: string) => therapists.find(t => t.id === id)

  const filtered = sessionList
    .filter(s => {
      const p = getPatient(s.patientId)
      const name = `${p?.firstName} ${p?.lastName}`.toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase()) || s.date.includes(search)
      const matchStatus = statusFilter === "Todos" || s.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))

  const handleSave = async () => {
    try {
      const created = await createSession({
        patientId: form.patientId!,
        therapistId: form.therapistId!,
        date: form.date!,
        startTime: form.startTime!,
        endTime: form.endTime!,
        type: form.type!,
        status: form.status as SessionStatus,
        notes: form.notes || "",
        fee: form.fee || 120,
      })
      setSessionList(prev => [created, ...prev])
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar sesión")
    }
  }

  const handleStatusChange = async (id: string, status: SessionStatus) => {
    try {
      const updated = await updateSessionStatus(id, status)
      setSessionList(prev => prev.map(x => x.id === id ? updated : x))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estado")
    }
  }

  const stats = {
    total: sessionList.length,
    realizadas: sessionList.filter(s => s.status === "Realizada").length,
    pendientes: sessionList.filter(s => s.status === "Pendiente").length,
    canceladas: sessionList.filter(s => s.status === "Cancelada").length,
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando sesiones...</div>
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
          <h1 className="text-xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sesiones</h1>
          <p className="text-xs text-[#6B7A94] mt-0.5">{stats.realizadas} realizadas · {stats.pendientes} pendientes · {stats.canceladas} canceladas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7A94]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="pl-7 pr-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] w-44 bg-[#F2F4F8]" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SessionStatus | "Todos")}
              className="appearance-none pl-3 pr-7 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-[#F2F4F8]">
              {["Todos", "Realizada", "Pendiente", "Cancelada", "Reprogramada"].map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7A94] pointer-events-none" />
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14] transition-colors">
            <Plus size={14} /> Nueva sesión
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 p-5 pb-0">
        {[
          { label: "Total sesiones", value: stats.total, color: "#2B3A5C", bg: "#EEF1F8" },
          { label: "Realizadas", value: stats.realizadas, color: "#059669", bg: "#ECFDF5" },
          { label: "Pendientes", value: stats.pendientes, color: "#D97706", bg: "#FFFBEB" },
          { label: "Canceladas", value: stats.canceladas, color: "#DC2626", bg: "#FEF2F2" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E7EF] p-4 shadow-sm">
            <p className="text-2xl font-bold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-xs text-[#6B7A94] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-5">
        <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E7EF]">
                {["Fecha", "Hora", "Paciente", "Terapeuta", "Tipo", "Honorario", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F8]">
              {filtered.map(s => {
                const p = getPatient(s.patientId)
                const t = getTherapist(s.therapistId)
                return (
                  <tr key={s.id} className="hover:bg-[#F8F9FC] transition-colors">
                    <td className="px-4 py-3 text-[#1A2332] font-medium">{s.date}</td>
                    <td className="px-4 py-3 text-[#6B7A94]">{s.startTime} – {s.endTime}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: t?.color || "#E8481E" }}>
                          {p?.firstName[0]}{p?.lastName[0]}
                        </div>
                        <span className="font-semibold text-[#1A2332]">{p?.firstName} {p?.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7A94] text-xs">{t?.firstName} {t?.lastName}</td>
                    <td className="px-4 py-3 text-[#6B7A94]">{s.type}</td>
                    <td className="px-4 py-3 font-semibold text-[#2B3A5C]">S/ {s.fee}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={s.status}
                        onChange={e => handleStatusChange(s.id, e.target.value as SessionStatus)}
                        className="text-xs border border-[#E2E7EF] rounded px-1 py-0.5 bg-white outline-none"
                        onClick={e => e.stopPropagation()}
                      >
                        {["Pendiente", "Realizada", "Cancelada", "Reprogramada"].map(st => <option key={st}>{st}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E7EF]">
              <h2 className="font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nueva sesión</h2>
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
                  {therapists.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Fecha</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Honorario (S/)</label>
                  <input type="number" value={form.fee || ""} onChange={e => setForm(f => ({ ...f, fee: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Hora inicio</label>
                  <input type="time" value={form.startTime || ""} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Hora fin</label>
                  <input type="time" value={form.endTime || ""} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Tipo</label>
                <select value={form.type || "Individual"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                  {["Individual", "Grupal", "Familiar", "Evaluación inicial"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Estado</label>
                <select value={form.status || "Pendiente"} onChange={e => setForm(f => ({ ...f, status: e.target.value as SessionStatus }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                  {["Pendiente", "Realizada", "Cancelada", "Reprogramada"].map(st => <option key={st}>{st}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Notas</label>
                <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors">Registrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}