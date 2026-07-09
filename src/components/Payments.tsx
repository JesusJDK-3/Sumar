import { useState, useEffect } from "react"
import { Plus, X, ChevronDown, Search, Receipt, AlertCircle } from "lucide-react"
import { getPayments, createPayment } from "../lib/api/payments"
import { getPatients } from "../lib/api/patients"
import type { Payment, PaymentMethod, PaymentStatus, Patient } from "../types"

const statusColor: Record<PaymentStatus, string> = {
  Pagado: "bg-emerald-100 text-emerald-700",
  Parcial: "bg-amber-100 text-amber-700",
  Pendiente: "bg-red-100 text-red-700",
}

const methodColor: Record<PaymentMethod, string> = {
  Efectivo: "bg-slate-100 text-slate-700",
  Transferencia: "bg-blue-100 text-blue-700",
  Tarjeta: "bg-purple-100 text-purple-700",
  Yape: "bg-violet-100 text-violet-700",
  Plin: "bg-teal-100 text-teal-700",
}

export default function Payments() {
  const [paymentList, setPaymentList] = useState<Payment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "Todos">("Todos")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Payment>>({
    date: new Date().toISOString().split("T")[0],
    amount: 120,
    type: "Por sesión",
    method: "Efectivo",
    status: "Pagado",
    notes: "",
    receiptNumber: "",
    period: "",
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [paymentsData, patientsData] = await Promise.all([getPayments(), getPatients()])
        setPaymentList(paymentsData)
        setPatients(patientsData)
        setForm(f => ({ ...f, patientId: patientsData[0]?.id }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando pagos...</div>
  }

  const getPatient = (id: string) => patients.find(p => p.id === id)

  const filtered = paymentList
    .filter(pay => {
      const p = getPatient(pay.patientId)
      const name = `${p?.firstName} ${p?.lastName}`.toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase()) || pay.receiptNumber.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "Todos" || pay.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalPaid = paymentList.filter(p => p.status === "Pagado").reduce((a, p) => a + p.amount, 0)
  const totalPending = paymentList.filter(p => p.status === "Pendiente").reduce((a, p) => a + p.amount, 0)
  const totalPartial = paymentList.filter(p => p.status === "Parcial").reduce((a, p) => a + p.amount, 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthTotal = paymentList.filter(p => p.status === "Pagado" && p.date.startsWith(currentMonth)).reduce((a, p) => a + p.amount, 0)

  const handleSave = async () => {
    try {
      const receipt = form.receiptNumber || `R-${Date.now().toString().slice(-6)}`
      const created = await createPayment({
        patientId: form.patientId!,
        date: form.date!,
        amount: form.amount!,
        type: form.type as Payment["type"],
        method: form.method as PaymentMethod,
        status: form.status as PaymentStatus,
        notes: form.notes || "",
        receiptNumber: receipt,
        period: form.period,
      })
      setPaymentList(prev => [created, ...prev])
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar pago")
    }
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
          <h1 className="text-xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gestión de Pagos</h1>
          <p className="text-xs text-[#6B7A94] mt-0.5">{paymentList.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7A94]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente o recibo..."
              className="pl-7 pr-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] w-52 bg-[#F2F4F8]" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PaymentStatus | "Todos")}
              className="appearance-none pl-3 pr-7 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-[#F2F4F8]">
              {["Todos", "Pagado", "Parcial", "Pendiente"].map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7A94] pointer-events-none" />
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14] transition-colors">
            <Plus size={14} /> Registrar pago
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 p-5 pb-0">
        {[
          { label: "Ingresos del mes", value: `S/ ${monthTotal.toLocaleString()}`, color: "#059669", bg: "#ECFDF5" },
          { label: "Total cobrado", value: `S/ ${totalPaid.toLocaleString()}`, color: "#2B3A5C", bg: "#EEF1F8" },
          { label: "Pagos parciales", value: `S/ ${totalPartial}`, color: "#D97706", bg: "#FFFBEB" },
          { label: "Por cobrar", value: `S/ ${totalPending}`, color: "#DC2626", bg: "#FEF2F2" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E7EF] p-4 shadow-sm">
            <p className="text-2xl font-bold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-xs text-[#6B7A94] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending alerts */}
      {paymentList.filter(p => p.status !== "Pagado").length > 0 && (
        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Cuentas por cobrar pendientes</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {paymentList.filter(p => p.status === "Pendiente").length} pagos pendientes y{" "}
              {paymentList.filter(p => p.status === "Parcial").length} pagos parciales sin completar.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-5">
        <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E7EF]">
                {["Recibo", "Fecha", "Paciente", "Tipo", "Método", "Monto", "Estado", "Notas"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F8]">
              {filtered.map(pay => {
                const p = getPatient(pay.patientId)
                return (
                  <tr key={pay.id} className="hover:bg-[#F8F9FC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Receipt size={13} className="text-[#6B7A94]" />
                        <span className="font-mono text-xs text-[#6B7A94]">{pay.receiptNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1A2332]">{pay.date}</td>
                    <td className="px-4 py-3 font-semibold text-[#1A2332]">{p?.firstName} {p?.lastName}</td>
                    <td className="px-4 py-3 text-[#6B7A94] text-xs">{pay.type}{pay.period ? ` · ${pay.period}` : ""}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${methodColor[pay.method as PaymentMethod]}`}>
                        {pay.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#2B3A5C]">S/ {pay.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[pay.status]}`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7A94] max-w-[160px] truncate">{pay.notes || "—"}</td>
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
              <h2 className="font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Registrar pago</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Fecha</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Monto (S/)</label>
                  <input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Tipo de pago</label>
                  <select value={form.type || "Por sesión"} onChange={e => setForm(f => ({ ...f, type: e.target.value as Payment["type"] }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                    {["Por sesión", "Mensualidad", "Parcial"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Método de pago</label>
                  <select value={form.method || "Efectivo"} onChange={e => setForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                    {["Efectivo", "Transferencia", "Tarjeta", "Yape", "Plin"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Estado</label>
                  <select value={form.status || "Pagado"} onChange={e => setForm(f => ({ ...f, status: e.target.value as PaymentStatus }))}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white">
                    {["Pagado", "Parcial", "Pendiente"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Período (mensualidad)</label>
                  <input value={form.period || ""} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="Ej: Julio 2026"
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">N° de comprobante</label>
                <input value={form.receiptNumber || ""} onChange={e => setForm(f => ({ ...f, receiptNumber: e.target.value }))} placeholder="Se genera automáticamente"
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Notas</label>
                <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors">Registrar pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}