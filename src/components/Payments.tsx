import { useState, useEffect } from "react"
import { X, Search, CreditCard, Banknote, Smartphone, Package, Calendar } from "lucide-react"
import { getPayments, getSessionsWithoutPayment, createPayment, createPatientPackage } from "../lib/api/payments"
import { getPatients } from "../lib/api/patients"
import { getServices } from "../lib/api/services"
import type { Payment, Session, Patient, PaymentMethod, Service } from "../types"

type ViewMode = "historial" | "pendientes"
type KpiFilter = "todos" | "ingresos" | "cobrado" | "parciales" | "porCobrar"
type PayMode = "sesion" | "paquete"

const methodIcon: Record<PaymentMethod, typeof Banknote> = {
  Efectivo: Banknote,
  Transferencia: Banknote,
  Tarjeta: CreditCard,
  Yape: Smartphone,
  Plin: Smartphone,
}

const statusColor = {
  Pagado: "bg-emerald-100 text-emerald-700",
  Parcial: "bg-amber-100 text-amber-700",
  Pendiente: "bg-red-100 text-red-700",
}

const defaultPayForm = {
  amountReceived: 0,
  method: "Efectivo" as PaymentMethod,
  date: new Date().toISOString().split('T')[0],
  notes: "",
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingSessions, setPendingSessions] = useState<Session[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("historial")
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>("todos")
  const [search, setSearch] = useState("")
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [payMode, setPayMode] = useState<PayMode>("sesion")
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState("")

  // Form de pago
  const [payForm, setPayForm] = useState(defaultPayForm)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [paymentsData, pendingData, patientsData, servicesData] = await Promise.all([
        getPayments(),
        getSessionsWithoutPayment(),
        getPatients(),
        getServices(),
      ])
      setPayments(paymentsData)
      setPendingSessions(pendingData)
      setPatients(patientsData)
      setServices(servicesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const getPatient = (id: string) => patients.find(p => p.id === id)
  const getService = (id: string) => services.find(s => s.id === id)

  // KPIs
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthPayments = payments.filter(p => p.date.startsWith(currentMonth))
  
  const stats = {
    ingresosMes: monthPayments.reduce((sum, p) => sum + p.amount, 0),
    totalCobrado: payments.filter(p => p.status === "Pagado").reduce((sum, p) => sum + p.amount, 0),
    pagosParciales: payments.filter(p => p.status === "Parcial").length,
    porCobrar: pendingSessions.reduce((sum, s) => sum + (s.fee - (payments.filter(pay => pay.sessionId === s.id).reduce((a, b) => a + b.amount, 0))), 0),
  }

  // Filtrar pagos según KPI seleccionado
  const filteredPayments = payments.filter(p => {
    const patient = getPatient(p.patientId)
    const name = `${patient?.firstName} ${patient?.lastName}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || p.date.includes(search)
    
    if (kpiFilter === "todos") return matchSearch
    if (kpiFilter === "cobrado") return p.status === "Pagado" && matchSearch
    if (kpiFilter === "parciales") return p.status === "Parcial" && matchSearch
    if (kpiFilter === "ingresos") return p.date.startsWith(currentMonth) && matchSearch
    return matchSearch
  })

  const handlePay = async () => {
    try {
      if (payMode === "sesion") {
        if (!selectedSession) return
        await createPayment({
          sessionId: selectedSession.id,
          patientId: selectedSession.patientId,
          amountReceived: payForm.amountReceived,
          method: payForm.method,
          date: payForm.date,
          notes: payForm.notes,
        })
      } else {
        // Pago por paquete
        if (!selectedPatientId || !selectedServiceId) return
        const service = getService(selectedServiceId)
        if (!service) return

        const payment = await createPayment({
          patientId: selectedPatientId,
          serviceId: selectedServiceId,
          sessionCount: service.sessionCount,
          amountReceived: payForm.amountReceived,
          method: payForm.method,
          date: payForm.date,
          notes: payForm.notes,
        })

        // Crear el paquete para el paciente
        await createPatientPackage({
          patientId: selectedPatientId,
          serviceId: selectedServiceId,
          totalSessions: service.sessionCount,
          amountPaid: payForm.amountReceived,
          paymentId: payment.id,
        })
      }

      setShowPayModal(false)
      setSelectedSession(null)
      setSelectedPatientId("")
      setSelectedServiceId("")
      setPayMode("sesion")
      setPayForm(defaultPayForm)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar pago")
    }
  }

  const openPayModal = (session: Session) => {
    setSelectedSession(session)
    setPayMode("sesion")
    setSelectedPatientId(session.patientId)
    const paid = payments
      .filter(p => p.sessionId === session.id)
      .reduce((sum, p) => sum + p.amount, 0)
    const remaining = session.fee - paid
    setPayForm({
      ...defaultPayForm,
      amountReceived: remaining,
    })
    setShowPayModal(true)
  }

  const openPackageModal = () => {
    setSelectedSession(null)
    setPayMode("paquete")
    setSelectedPatientId("")
    setSelectedServiceId("")
    setPayForm({
      ...defaultPayForm,
      amountReceived: 0,
    })
    setShowPayModal(true)
  }

  // Calcular monto sugerido para paquete
  const getPackageTotal = () => {
    const service = getService(selectedServiceId)
    if (!service) return 0
    return service.defaultFee * service.sessionCount
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#6B7A94] text-sm">Cargando pagos...</div>
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
          <h1 className="text-xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Gestión de Pagos
          </h1>
          <p className="text-xs text-[#6B7A94] mt-0.5">
            {viewMode === "historial" ? `${payments.length} pagos registrados` : `${pendingSessions.length} pendientes de cobro`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7A94]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar paciente..."
              className="pl-7 pr-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] w-44 bg-[#F2F4F8]" 
            />
          </div>
          <div className="flex bg-[#F2F4F8] rounded-lg p-0.5">
            <button 
              onClick={() => { setViewMode("historial"); setKpiFilter("todos") }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "historial" ? "bg-white text-[#2B3A5C] shadow-sm" : "text-[#6B7A94]"}`}
            >
              Historial
            </button>
            <button 
              onClick={() => { setViewMode("pendientes"); setKpiFilter("porCobrar") }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "pendientes" ? "bg-white text-[#E8481E] shadow-sm" : "text-[#6B7A94]"}`}
            >
              Por cobrar
            </button>
          </div>
          <button 
            onClick={openPackageModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#2B3A5C] text-white text-sm font-semibold rounded-lg hover:bg-[#1A2440] transition-colors"
          >
            <Package size={14} /> Paquete
          </button>
        </div>
      </div>

      {/* KPIs clickeables */}
      <div className="grid grid-cols-4 gap-4 p-5 pb-0">
        <button 
          onClick={() => { setViewMode("historial"); setKpiFilter("ingresos") }}
          className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${kpiFilter === "ingresos" ? "border-[#E8481E] ring-1 ring-[#E8481E]" : "border-[#E2E7EF]"}`}
        >
          <p className="text-2xl font-bold text-emerald-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            S/ {stats.ingresosMes}
          </p>
          <p className="text-xs text-[#6B7A94] font-medium mt-0.5">Ingresos del mes</p>
        </button>
        <button 
          onClick={() => { setViewMode("historial"); setKpiFilter("cobrado") }}
          className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${kpiFilter === "cobrado" ? "border-[#E8481E] ring-1 ring-[#E8481E]" : "border-[#E2E7EF]"}`}
        >
          <p className="text-2xl font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            S/ {stats.totalCobrado}
          </p>
          <p className="text-xs text-[#6B7A94] font-medium mt-0.5">Total cobrado</p>
        </button>
        <button 
          onClick={() => { setViewMode("historial"); setKpiFilter("parciales") }}
          className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${kpiFilter === "parciales" ? "border-[#E8481E] ring-1 ring-[#E8481E]" : "border-[#E2E7EF]"}`}
        >
          <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {stats.pagosParciales}
          </p>
          <p className="text-xs text-[#6B7A94] font-medium mt-0.5">Pagos parciales</p>
        </button>
        <button 
          onClick={() => { setViewMode("pendientes"); setKpiFilter("porCobrar") }}
          className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${kpiFilter === "porCobrar" ? "border-[#E8481E] ring-1 ring-[#E8481E]" : "border-[#E2E7EF]"}`}
        >
          <p className="text-2xl font-bold text-red-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            S/ {stats.porCobrar}
          </p>
          <p className="text-xs text-[#6B7A94] font-medium mt-0.5">Por cobrar</p>
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-5">
        <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
          {viewMode === "historial" ? (
            // HISTORIAL DE PAGOS
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E7EF]">
                  {["Fecha", "Paciente", "Tipo", "Método", "Monto", "Estado", "Notas"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F8]">
                {filteredPayments.map(p => {
                  const patient = getPatient(p.patientId)
                  const MethodIcon = methodIcon[p.method] || Banknote
                  const isPackagePayment = p.sessionCount && p.sessionCount > 1
                  return (
                    <tr key={p.id} className="hover:bg-[#F8F9FC] transition-colors">
                      <td className="px-4 py-3 text-[#1A2332] font-medium">{p.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#1A2332]">{patient?.firstName} {patient?.lastName}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isPackagePayment ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#2B3A5C] text-white">
                            <Package size={11} /> Paquete {p.sessionCount} ses.
                          </span>
                        ) : (
                          <span className="text-[#6B7A94] text-xs">Sesión #{p.sessionId?.slice(0, 6)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[#6B7A94]">
                          <MethodIcon size={13} /> {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2B3A5C]">S/ {p.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7A94] text-xs">{p.notes || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            // PENDIENTES DE COBRO
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E7EF]">
                  {["Fecha", "Paciente", "Servicio", "Honorario", "Pagado", "Debe", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F8]">
                {pendingSessions.map(s => {
                  const patient = getPatient(s.patientId)
                  const paid = payments
                    .filter(p => p.sessionId === s.id)
                    .reduce((sum, p) => sum + p.amount, 0)
                  const remaining = s.fee - paid
                  return (
                    <tr key={s.id} className="hover:bg-[#F8F9FC] transition-colors">
                      <td className="px-4 py-3 text-[#1A2332] font-medium">{s.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#1A2332]">{patient?.firstName} {patient?.lastName}</span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7A94] text-xs">{s.type}</td>
                      <td className="px-4 py-3 font-semibold text-[#2B3A5C]">S/ {s.fee}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">S/ {paid}</td>
                      <td className="px-4 py-3 text-red-600 font-bold">S/ {remaining}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => openPayModal(s)}
                          className="px-3 py-1.5 bg-[#E8481E] text-white text-xs font-semibold rounded-lg hover:bg-[#C93A14] transition-colors"
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de pago */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E7EF]">
              <h2 className="font-bold text-[#2B3A5C]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {payMode === "sesion" ? "Registrar pago" : "Registrar paquete"}
              </h2>
              <button onClick={() => { setShowPayModal(false); setPayMode("sesion") }}><X size={18} className="text-[#6B7A94]" /></button>
            </div>

            {/* Toggle modo de pago */}
            <div className="px-6 pt-4">
              <div className="flex bg-[#F2F4F8] rounded-lg p-0.5">
                <button 
                  onClick={() => setPayMode("sesion")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors ${payMode === "sesion" ? "bg-white text-[#2B3A5C] shadow-sm" : "text-[#6B7A94]"}`}
                >
                  <Calendar size={14} /> Por sesión
                </button>
                <button 
                  onClick={() => setPayMode("paquete")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors ${payMode === "paquete" ? "bg-white text-[#E8481E] shadow-sm" : "text-[#6B7A94]"}`}
                >
                  <Package size={14} /> Por paquete
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {payMode === "sesion" && selectedSession ? (
                <>
                  {/* Paciente (no editable) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Paciente</label>
                    <div className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg bg-[#F2F4F8] text-[#6B7A94]">
                      {getPatient(selectedSession.patientId)?.firstName} {getPatient(selectedSession.patientId)?.lastName}
                    </div>
                  </div>

                  {/* Sesión (no editable) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Sesión</label>
                    <div className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg bg-[#F2F4F8] text-[#6B7A94]">
                      {selectedSession.date} · {selectedSession.startTime}–{selectedSession.endTime} · {selectedSession.type}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Paciente (select) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Paciente</label>
                    <select 
                      value={selectedPatientId} 
                      onChange={e => setSelectedPatientId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                    >
                      <option value="">Seleccionar paciente...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Servicio/Paquete (select) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Paquete de servicio</label>
                    <select 
                      value={selectedServiceId} 
                      onChange={e => setSelectedServiceId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                    >
                      <option value="">Seleccionar paquete...</option>
                      {services.filter(s => s.sessionCount > 1).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.number}. {s.name} — {s.sessionCount} sesiones × S/ {s.defaultFee} = S/ {s.defaultFee * s.sessionCount}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resumen del paquete seleccionado */}
                  {selectedServiceId && (
                    <div className="bg-[#FDF0EC] border border-[#E8481E]/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-[#E8481E] mb-1">Resumen del paquete</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6B7A94]">Sesiones incluidas:</span>
                        <span className="font-bold text-[#1A2332]">{getService(selectedServiceId)?.sessionCount}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#6B7A94]">Precio unitario:</span>
                        <span className="font-bold text-[#1A2332]">S/ {getService(selectedServiceId)?.defaultFee}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1 pt-1 border-t border-[#E8481E]/10">
                        <span className="text-[#6B7A94] font-semibold">Total:</span>
                        <span className="font-bold text-[#E8481E]">S/ {getPackageTotal()}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Fecha de pago */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Fecha de pago</label>
                <input
                  type="date"
                  value={payForm.date}
                  onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Monto que debe (solo en modo sesión) */}
                {payMode === "sesion" && selectedSession && (
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Monto que debe</label>
                    <div className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg bg-[#F2F4F8] text-red-600 font-bold">
                      S/ {selectedSession.fee - payments.filter(p => p.sessionId === selectedSession.id).reduce((a, b) => a + b.amount, 0)}
                    </div>
                  </div>
                )}

                {/* Monto recibido */}
                <div className={payMode === "paquete" ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-[#6B7A94] mb-1">
                    {payMode === "paquete" ? "Monto total recibido" : "Monto recibido"}
                  </label>
                  <input 
                    type="number" 
                    value={payForm.amountReceived} 
                    onChange={e => setPayForm(f => ({ ...f, amountReceived: +e.target.value }))}
                    placeholder={payMode === "paquete" ? `Sugerido: S/ ${getPackageTotal()}` : ""}
                    className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]" 
                  />
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Método de pago</label>
                <select 
                  value={payForm.method} 
                  onChange={e => setPayForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  {["Efectivo", "Transferencia", "Tarjeta", "Yape", "Plin"].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Estado</label>
                <div className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  payForm.amountReceived >= (payMode === "sesion" && selectedSession ? selectedSession.fee : getPackageTotal())
                    ? "bg-emerald-100 text-emerald-700" 
                    : payForm.amountReceived > 0 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-red-100 text-red-700"
                }`}>
                  {payForm.amountReceived >= (payMode === "sesion" && selectedSession ? selectedSession.fee : getPackageTotal())
                    ? "Pagado" 
                    : payForm.amountReceived > 0 
                      ? "Parcial" 
                      : "Pendiente"}
                </div>
                <p className="text-[10px] text-[#6B7A94] mt-1">Se calcula automáticamente según el monto recibido</p>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Notas</label>
                <textarea 
                  value={payForm.notes} 
                  onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} 
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] resize-none" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6">
              <button 
                onClick={() => { setShowPayModal(false); setPayMode("sesion") }} 
                className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg hover:bg-[#F2F4F8]"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePay} 
                disabled={payForm.amountReceived <= 0 || (payMode === "paquete" && (!selectedPatientId || !selectedServiceId))}
                className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {payMode === "sesion" ? "Registrar pago" : "Registrar paquete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}