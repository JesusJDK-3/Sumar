import { useState, useEffect } from "react"
import { Search, Plus, X, ChevronDown, User, Phone, Mail, MapPin, AlertCircle } from "lucide-react"
import { getPatients, createPatient, updatePatient } from "../lib/api/patients"
import { getTherapists } from "../lib/api/therapists"
import type { Patient, Gender, PatientStatus, Therapist } from "../types"

const statusColor: Record<PatientStatus, string> = {
  Activo: "bg-emerald-100 text-emerald-700",
  Inactivo: "bg-gray-100 text-gray-600",
  Alta: "bg-blue-100 text-blue-700",
  "En espera": "bg-amber-100 text-amber-700",
}

const emptyPatient: Omit<Patient, "id" | "code" | "registeredAt"> = {
  firstName: "",
  lastName: "",
  age: 0,
  gender: "M",
  dni: "",
  phone: "",
  email: "",
  address: "",
  emergencyContact: "",
  emergencyPhone: "",
  insurance: "",
  therapistId: "",
  status: "Activo",
  diagnosis: "",
  notes: "",
}

export default function Patients() {
  const [patientList, setPatientList] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "Todos">("Todos")
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [form, setForm] = useState(emptyPatient)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [patientsData, therapistsData] = await Promise.all([getPatients(), getTherapists()])
        setPatientList(patientsData)
        setTherapists(therapistsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = patientList.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${p.firstName} ${p.lastName} ${p.code} ${p.dni}`.toLowerCase().includes(q)
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const getTherapist = (id: string) => therapists.find(t => t.id === id)

  const handleSave = async () => {
    try {
      if (editing && selected) {
        const updated = await updatePatient(selected.id, form)
        setPatientList(prev => prev.map(p => p.id === selected.id ? updated : p))
        setSelected(updated)
      } else {
        const code = `PAC-${String(patientList.length + 1).padStart(3, "0")}`
        const created = await createPatient({ ...form, code })
        setPatientList(prev => [created, ...prev])
      }
      setShowForm(false)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar paciente")
    }
  }

  const openNew = () => {
    setForm({ ...emptyPatient, therapistId: therapists[0]?.id || "" })
    setEditing(false)
    setShowForm(true)
  }

  const openEdit = (p: Patient) => {
    setForm({ ...p })
    setEditing(true)
    setShowForm(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando pacientes...</div>
  }

  return (
    <div className="flex h-full">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      {/* List panel */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-5 pb-4 bg-white border-b border-[#E2E7EF]">
          <div>
            <h1 className="text-xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pacientes
            </h1>
            <p className="text-xs text-[#6B7A94]">{filtered.length} de {patientList.length} registros</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A94]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar paciente..."
                className="pl-8 pr-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] w-52 bg-[#F2F4F8]"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as PatientStatus | "Todos")}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-[#F2F4F8] text-[#1A2332]"
              >
                {["Todos", "Activo", "Inactivo", "Alta", "En espera"].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7A94] pointer-events-none" />
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14] transition-colors"
            >
              <Plus size={15} /> Nuevo paciente
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E7EF]">
                  {["Código", "Paciente", "Edad", "Diagnóstico", "Terapeuta", "Estado", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F8]">
                {filtered.map(p => {
                  const therapist = getTherapist(p.therapistId)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`cursor-pointer hover:bg-[#F8F9FC] transition-colors ${selected?.id === p.id ? "bg-[#FDF0EC]" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#6B7A94]">{p.code}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: therapist?.color || "#E8481E" }}
                          >
                            {p.firstName[0]}{p.lastName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1A2332]">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-[#6B7A94]">{p.dni}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7A94]">{p.age} años</td>
                      <td className="px-4 py-3 text-[#1A2332] max-w-[200px]">
                        <p className="truncate">{p.diagnosis || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-[#6B7A94] text-xs">
                        {therapist ? `${therapist.firstName} ${therapist.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); openEdit(p) }}
                          className="text-xs text-[#6B7A94] hover:text-[#E8481E] font-medium transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && !showForm && (
        <div className="w-80 bg-white border-l border-[#E2E7EF] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E7EF]">
            <h3 className="font-semibold text-[#2B3A5C] text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Ficha del paciente
            </h3>
            <button onClick={() => setSelected(null)} className="text-[#6B7A94] hover:text-[#1A2332]">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 border-b border-[#F2F4F8]">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
                style={{ background: getTherapist(selected.therapistId)?.color || "#E8481E" }}
              >
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <h2 className="text-center font-bold text-[#1A2332] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {selected.firstName} {selected.lastName}
              </h2>
              <p className="text-center text-xs text-[#6B7A94] mt-0.5">{selected.code}</p>
              <div className="flex justify-center mt-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <InfoRow icon={User} label="DNI" value={selected.dni || "—"} />
              <InfoRow icon={User} label="Edad" value={`${selected.age} años · ${selected.gender === "M" ? "Masculino" : selected.gender === "F" ? "Femenino" : "Otro"}`} />
              <InfoRow icon={Phone} label="Teléfono" value={selected.phone || "—"} />
              <InfoRow icon={Mail} label="Email" value={selected.email || "—"} />
              <InfoRow icon={MapPin} label="Dirección" value={selected.address || "—"} />
              <InfoRow icon={AlertCircle} label="Padre/apoderado" value={selected.emergencyContact || "—"} />
              <div>
                <p className="text-xs text-[#6B7A94] font-medium mb-1">Diagnóstico</p>
                <p className="text-sm text-[#1A2332] leading-relaxed">{selected.diagnosis || "Sin diagnóstico registrado"}</p>
              </div>
              {selected.notes && (
                <div>
                  <p className="text-xs text-[#6B7A94] font-medium mb-1">Notas</p>
                  <p className="text-sm text-[#1A2332] leading-relaxed">{selected.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#6B7A94] font-medium mb-1">Terapeuta asignado</p>
                <p className="text-sm text-[#1A2332]">
                  {(() => {
                    const t = getTherapist(selected.therapistId)
                    return t ? `${t.firstName} ${t.lastName} · ${t.specialty}` : "—"
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7A94] font-medium mb-1">Seguro</p>
                <p className="text-sm text-[#1A2332]">{selected.insurance || "—"}</p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#E2E7EF]">
            <button
              onClick={() => openEdit(selected)}
              className="w-full py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14] transition-colors"
            >
              Editar paciente
            </button>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E7EF]">
              <h2 className="font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {editing ? "Editar paciente" : "Nuevo paciente"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[#6B7A94] hover:text-[#1A2332]">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <FormField label="Nombre" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} />
              <FormField label="Apellidos" value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} />
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Edad</label>
                <input
                  type="number"
                  min={0}
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: +e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Género</label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value as Gender }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <FormField label="Teléfono" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
              <FormField label="Nombre del padre/apoderado" value={form.emergencyContact} onChange={v => setForm(f => ({ ...f, emergencyContact: v }))} />
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Terapeuta asignado</label>
                <select
                  value={form.therapistId}
                  onChange={e => setForm(f => ({ ...f, therapistId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as PatientStatus }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  {["Activo", "Inactivo", "Alta", "En espera"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors"
              >
                {editing ? "Guardar cambios" : "Registrar paciente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-[#6B7A94] shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-[#6B7A94] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#1A2332]">{value}</p>
      </div>
    </div>
  )
}

function FormField({
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#6B7A94] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
      />
    </div>
  )
}