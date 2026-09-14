import { useState, useEffect, useRef } from "react"
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Layers,
  ClipboardList,
  CreditCard,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Pencil,
  Trash2,
  Plus,
  X,
  Sparkles,
  Calendar,
  Clock,
  User,
  Building2,
  DollarSign,
  Copy,
  Check,
} from "lucide-react"
import { useAuth } from "../lib/auth/AuthContext"
import { getPatients } from "../lib/api/patients"
import { getServices } from "../lib/api/services"
import { getTherapists } from "../lib/api/therapists"
import { getSedes } from "../lib/api/sedes"
import {
  getAdminPatientFullData,
  cascadeUpdatePackageService,
  updateAdminPackage,
  createAdminPackage,
  deleteAdminPackage,
  updateAdminSession,
  deleteAdminSession,
  updateAdminPayment,
  deleteAdminPayment,
  diagnosePatientInconsistencies,
  fixSingleInconsistency,
  type AdminPatientFullData,
  type InconsistencyIssue,
} from "../lib/api/adminManagement"
import type { Patient, Service, Therapist, Sede, SessionStatus, PaymentMethod, PaymentStatus } from "../types"

interface Props {
  initialPatientId?: string
}

type TabType = "paquetes" | "sesiones" | "pagos" | "diagnostico"

export default function AdminHub({ initialPatientId }: Props) {
  const { profile } = useAuth()

  // Protección de rol
  if (profile?.role !== "admin" && !profile?.permissions?.adminHub) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#2B3A5C]">Acceso Restringido</h2>
        <p className="text-sm text-[#6B7A94] max-w-md mt-1">
          Esta sección es de uso exclusivo para Administradores. Por favor contacta al administrador del sistema.
        </p>
      </div>
    )
  }

  // Estados principales
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || "")
  const [patientData, setPatientData] = useState<AdminPatientFullData | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("paquetes")
  const [diagnostics, setDiagnostics] = useState<InconsistencyIssue[]>([])

  // Feedback Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Modales
  // 1. Modal Reasignación en Cascada
  const [showCascadeModal, setShowCascadeModal] = useState(false)
  const [cascadeTargetPkg, setCascadeTargetPkg] = useState<any>(null)
  const [cascadeNewServiceId, setCascadeNewServiceId] = useState("")
  const [cascadeUpdateSessions, setCascadeUpdateSessions] = useState(true)
  const [cascadeUpdatePayments, setCascadeUpdatePayments] = useState(true)
  const [cascadeUpdateNotes, setCascadeUpdateNotes] = useState(true)
  const [cascadeCustomNote, setCascadeCustomNote] = useState("")
  const [isCascading, setIsCascading] = useState(false)

  // 2. Modal Edición de Paquete
  const [showEditPkgModal, setShowEditPkgModal] = useState(false)
  const [pkgEditForm, setPkgEditForm] = useState<any>(null)
  const [isSavingPkg, setIsSavingPkg] = useState(false)

  // 3. Modal Crear Paquete
  const [showCreatePkgModal, setShowCreatePkgModal] = useState(false)
  const [pkgCreateForm, setPkgCreateForm] = useState({
    serviceId: "",
    totalSessions: 8,
    amountPaid: 0,
    totalAmount: 0,
    status: "activo" as const,
  })
  const [isCreatingPkg, setIsCreatingPkg] = useState(false)

  // 4. Modal Edición de Sesión
  const [showEditSessionModal, setShowEditSessionModal] = useState(false)
  const [sessionEditForm, setSessionEditForm] = useState<any>(null)
  const [isSavingSession, setIsSavingSession] = useState(false)

  // 5. Modal Edición de Pago
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [paymentEditForm, setPaymentEditForm] = useState<any>(null)
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  // 6. Modal Confirmación de Eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "package" | "session" | "payment"
    id: string
    title: string
    description: string
    extraOption?: boolean
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Guard ref
  const isActionRunning = useRef(false)

  // Carga inicial
  useEffect(() => {
    async function init() {
      try {
        setInitialLoading(true)
        const [patientsData, servicesData, therapistsData, sedesData] = await Promise.all([
          getPatients(),
          getServices(),
          getTherapists(),
          getSedes(),
        ])
        setPatients(patientsData)
        setServices(servicesData)
        setTherapists(therapistsData)
        setSedes(sedesData)

        if (initialPatientId) {
          setSelectedPatientId(initialPatientId)
        } else if (patientsData.length > 0) {
          setSelectedPatientId(patientsData[0].id)
        }
      } catch (err: any) {
        showToast("error", "Error cargando datos iniciales: " + err.message)
      } finally {
        setInitialLoading(false)
      }
    }
    init()
  }, [initialPatientId])

  // Cargar datos completos del paciente seleccionado
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientData(null)
      return
    }
    loadPatientFullDetails(selectedPatientId)
  }, [selectedPatientId])

  async function loadPatientFullDetails(patientId: string) {
    try {
      setLoading(true)
      const data = await getAdminPatientFullData(patientId)
      setPatientData(data)
      const issues = diagnosePatientInconsistencies(data)
      setDiagnostics(issues)
    } catch (err: any) {
      showToast("error", "Error cargando ficha del paciente: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  function showToast(type: "success" | "error" | "info", message: string) {
    setToast({ type, message })
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev))
    }, 4500)
  }

  // Filtrado de pacientes para el buscador
  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.dni.includes(q) ||
      p.code.toLowerCase().includes(q)
    )
  })

  // Copiar UUID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // ==========================================
  // HANDLERS: REASIGNACIÓN EN CASCADA
  // ==========================================
  function openCascadeModal(pkg: any) {
    setCascadeTargetPkg(pkg)
    // Inicializar con el primer servicio disponible que no sea el actual
    const otherService = services.find(s => s.id !== pkg.serviceId) || services[0]
    setCascadeNewServiceId(otherService?.id || "")
    setCascadeUpdateSessions(true)
    setCascadeUpdatePayments(true)
    setCascadeUpdateNotes(true)
    setCascadeCustomNote(`Pago de paquete ${otherService?.name || ""}`)
    setShowCascadeModal(true)
  }

  useEffect(() => {
    if (cascadeNewServiceId) {
      const svc = services.find(s => s.id === cascadeNewServiceId)
      if (svc) {
        setCascadeCustomNote(`Pago de paquete ${svc.name}`)
      }
    }
  }, [cascadeNewServiceId, services])

  async function executeCascadeUpdate() {
    if (!cascadeTargetPkg || !cascadeNewServiceId || isActionRunning.current) return
    isActionRunning.current = true
    setIsCascading(true)

    try {
      const result = await cascadeUpdatePackageService({
        packageId: cascadeTargetPkg.id,
        newServiceId: cascadeNewServiceId,
        updateSessions: cascadeUpdateSessions,
        updatePayments: cascadeUpdatePayments,
        updateNotes: cascadeUpdateNotes,
        customNote: cascadeCustomNote,
      })

      showToast(
        "success",
        `¡Corrección exitosa! Se actualizó el paquete al servicio "${result.serviceName}", afectando ${result.sessionsUpdatedCount} sesión(es) y ${result.paymentsUpdatedCount} pago(s).`
      )
      setShowCascadeModal(false)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error en reasignación: " + err.message)
    } finally {
      isActionRunning.current = false
      setIsCascading(false)
    }
  }

  // ==========================================
  // HANDLERS: PAQUETES
  // ==========================================
  function openEditPackage(pkg: any) {
    setPkgEditForm({
      id: pkg.id,
      serviceId: pkg.serviceId,
      totalSessions: pkg.totalSessions,
      usedSessions: pkg.usedSessions,
      amountPaid: pkg.amountPaid || 0,
      totalAmount: pkg.totalAmount || pkg.amountPaid || 0,
      status: pkg.status,
      paymentId: pkg.paymentId || "",
    })
    setShowEditPkgModal(true)
  }

  async function savePackageEdit() {
    if (!pkgEditForm || isActionRunning.current) return
    isActionRunning.current = true
    setIsSavingPkg(true)

    try {
      await updateAdminPackage(pkgEditForm.id, {
        serviceId: pkgEditForm.serviceId,
        totalSessions: Number(pkgEditForm.totalSessions),
        usedSessions: Number(pkgEditForm.usedSessions),
        amountPaid: Number(pkgEditForm.amountPaid),
        totalAmount: Number(pkgEditForm.totalAmount),
        status: pkgEditForm.status,
        paymentId: pkgEditForm.paymentId || null,
      })

      showToast("success", "Paquete actualizado correctamente.")
      setShowEditPkgModal(false)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error actualizando paquete: " + err.message)
    } finally {
      isActionRunning.current = false
      setIsSavingPkg(false)
    }
  }

  function openCreatePackage() {
    const firstSvc = services[0]
    setPkgCreateForm({
      serviceId: firstSvc?.id || "",
      totalSessions: firstSvc?.sessionCount || 8,
      amountPaid: firstSvc?.defaultFee || 0,
      totalAmount: firstSvc?.defaultFee || 0,
      status: "activo",
    })
    setShowCreatePkgModal(true)
  }

  async function saveCreatePackage() {
    if (!selectedPatientId || !pkgCreateForm.serviceId || isActionRunning.current) return
    isActionRunning.current = true
    setIsCreatingPkg(true)

    try {
      await createAdminPackage({
        patientId: selectedPatientId,
        serviceId: pkgCreateForm.serviceId,
        totalSessions: Number(pkgCreateForm.totalSessions),
        amountPaid: Number(pkgCreateForm.amountPaid),
        totalAmount: Number(pkgCreateForm.totalAmount),
        status: pkgCreateForm.status,
      })

      showToast("success", "Nuevo paquete creado correctamente.")
      setShowCreatePkgModal(false)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error creando paquete: " + err.message)
    } finally {
      isActionRunning.current = false
      setIsCreatingPkg(false)
    }
  }

  // ==========================================
  // HANDLERS: SESIONES
  // ==========================================
  function openEditSession(sess: any) {
    setSessionEditForm({
      id: sess.id,
      serviceId: sess.serviceId || "",
      packageId: sess.packageId || "",
      therapistId: sess.therapistId,
      sedeId: sess.sedeId || "",
      date: sess.date,
      startTime: sess.startTime,
      endTime: sess.endTime,
      type: sess.type,
      status: sess.status,
      fee: sess.fee,
      notes: sess.notes || "",
    })
    setShowEditSessionModal(true)
  }

  async function saveSessionEdit() {
    if (!sessionEditForm || isActionRunning.current) return
    isActionRunning.current = true
    setIsSavingSession(true)

    try {
      await updateAdminSession(sessionEditForm.id, {
        serviceId: sessionEditForm.serviceId || null,
        packageId: sessionEditForm.packageId || null,
        therapistId: sessionEditForm.therapistId,
        sedeId: sessionEditForm.sedeId || null,
        date: sessionEditForm.date,
        startTime: sessionEditForm.startTime,
        endTime: sessionEditForm.endTime,
        type: sessionEditForm.type,
        status: sessionEditForm.status as SessionStatus,
        fee: Number(sessionEditForm.fee),
        notes: sessionEditForm.notes,
      })

      showToast("success", "Sesión actualizada correctamente.")
      setShowEditSessionModal(false)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error actualizando sesión: " + err.message)
    } finally {
      isActionRunning.current = false
      setIsSavingSession(false)
    }
  }

  // ==========================================
  // HANDLERS: PAGOS
  // ==========================================
  function openEditPayment(pay: any) {
    setPaymentEditForm({
      id: pay.id,
      serviceId: pay.serviceId || "",
      sessionId: pay.sessionId || "",
      amount: pay.amount,
      method: pay.method,
      status: pay.status,
      date: pay.date,
      notes: pay.notes || "",
    })
    setShowEditPaymentModal(true)
  }

  async function savePaymentEdit() {
    if (!paymentEditForm || isActionRunning.current) return
    isActionRunning.current = true
    setIsSavingPayment(true)

    try {
      await updateAdminPayment(paymentEditForm.id, {
        serviceId: paymentEditForm.serviceId || null,
        sessionId: paymentEditForm.sessionId || null,
        amount: Number(paymentEditForm.amount),
        method: paymentEditForm.method as PaymentMethod,
        status: paymentEditForm.status as PaymentStatus,
        date: paymentEditForm.date,
        notes: paymentEditForm.notes,
      })

      showToast("success", "Pago actualizado correctamente.")
      setShowEditPaymentModal(false)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error actualizando pago: " + err.message)
    } finally {
      isActionRunning.current = false
      setIsSavingPayment(false)
    }
  }

  // ==========================================
  // HANDLERS: ELIMINACIONES
  // ==========================================
  async function executeDelete() {
    if (!deleteConfirm || isActionRunning.current) return
    isActionRunning.current = true
    setIsDeleting(true)

    try {
      if (deleteConfirm.type === "package") {
        await deleteAdminPackage(deleteConfirm.id, deleteConfirm.extraOption || false)
        showToast("success", "Paquete eliminado.")
      } else if (deleteConfirm.type === "session") {
        await deleteAdminSession(deleteConfirm.id)
        showToast("success", "Sesión eliminada.")
      } else if (deleteConfirm.type === "payment") {
        await deleteAdminPayment(deleteConfirm.id)
        showToast("success", "Pago eliminado.")
      }

      setDeleteConfirm(null)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error al eliminar: " + err.message)
    } finally {
      isActionRunning.current = false
      setIsDeleting(false)
    }
  }

  // ==========================================
  // HANDLERS: AUTO-REPARACIÓN
  // ==========================================
  async function handleFixIssue(issue: InconsistencyIssue) {
    try {
      await fixSingleInconsistency(issue)
      showToast("success", `Inconsistencia reparada: ${issue.title}`)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error reparando inconsistencia: " + err.message)
    }
  }

  async function handleFixAllIssues() {
    try {
      for (const issue of diagnostics) {
        await fixSingleInconsistency(issue)
      }
      showToast("success", `¡Se repararon todas las ${diagnostics.length} inconsistencias detectadas!`)
      await loadPatientFullDetails(selectedPatientId)
    } catch (err: any) {
      showToast("error", "Error al reparar inconsistencias: " + err.message)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-[#6B7A94] text-sm">
        <RefreshCw className="animate-spin mr-2" size={18} /> Cargando panel administrativo...
      </div>
    )
  }

  const selectedPatient = patientData?.patient

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium border animate-in fade-in slide-in-from-top-4 ${toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : toast.type === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
        >
          {toast.type === "success" && <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />}
          {toast.type === "error" && <AlertTriangle className="text-red-600 shrink-0" size={18} />}
          {toast.type === "info" && <ShieldAlert className="text-blue-600 shrink-0" size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{ backgroundColor: 'rgb(26, 35, 50)' }}
        className="text-white rounded-2xl p-5 sm:p-6 shadow-md border border-white/10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E8481E] flex items-center justify-center text-white shadow-lg shrink-0">
              <Wrench size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Centro de Control y Corrección Admin</h1>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-500/30 text-red-200 border border-red-400/30">
                  Solo Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Soluciona errores de servicios mal asignados, reasigna en cascada y modifica paquetes, sesiones o pagos sin usar SQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => loadPatientFullDetails(selectedPatientId)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Actualizando..." : "Refrescar datos"}
            </button>
          </div>
        </div>
      </div>

      {/* Patient Selector Bar */}
      <div className="bg-white rounded-xl border border-[#E2E7EF] p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A94]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente, DNI o código..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8F9FC] border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] text-[#1A2332]"
          />
        </div>

        <div className="w-full md:flex-1">
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="w-full py-2 px-3 text-sm bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] font-medium text-[#2B3A5C]"
          >
            {filteredPatients.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.firstName} {p.lastName} {p.dni ? `(DNI: ${p.dni})` : ""}
              </option>
            ))}
          </select>
        </div>

        {diagnostics.length > 0 && (
          <button
            onClick={() => setActiveTab("diagnostico")}
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold shrink-0 animate-pulse hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle size={15} className="text-amber-600" />
            <span>{diagnostics.length} inconsistencia(s) detectadas</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {selectedPatient ? (
        <div className="space-y-6">
          {/* Patient Overview Card */}
          <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F2F4F8]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#E8481E] text-white font-bold flex items-center justify-center text-lg shadow-sm shrink-0">
                  {selectedPatient.firstName[0]}
                  {selectedPatient.lastName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#1A2332]">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {selectedPatient.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedPatient.status === "Activo"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {selectedPatient.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6B7A94] mt-1 flex-wrap">
                    <span>DNI: <strong className="text-[#1A2332]">{selectedPatient.dni || "—"}</strong></span>
                    <span>•</span>
                    <span>Edad: <strong className="text-[#1A2332]">{selectedPatient.age} años</strong></span>
                    <span>•</span>
                    <span>Tel: <strong className="text-[#1A2332]">{selectedPatient.phone || "—"}</strong></span>
                    <span>•</span>
                    <span>Apoderado: <strong className="text-[#1A2332]">{selectedPatient.emergencyContact || "—"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyId(selectedPatient.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F8F9FC] hover:bg-[#EEF1F8] border border-[#E2E7EF] rounded-lg text-xs font-medium text-[#6B7A94] transition-colors"
                  title="Copiar UUID del Paciente"
                >
                  {copiedId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span className="font-mono text-[11px]">{copiedId ? "Copiado" : "Copiar UUID"}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="bg-[#F8F9FC] rounded-lg p-3 border border-[#E2E7EF]">
                <p className="text-[11px] uppercase font-semibold text-[#6B7A94]">Paquetes Totales</p>
                <p className="text-xl font-bold text-[#2B3A5C] mt-0.5">{patientData?.packages.length || 0}</p>
              </div>
              <div className="bg-[#F8F9FC] rounded-lg p-3 border border-[#E2E7EF]">
                <p className="text-[11px] uppercase font-semibold text-[#6B7A94]">Sesiones Totales</p>
                <p className="text-xl font-bold text-[#2B3A5C] mt-0.5">{patientData?.sessions.length || 0}</p>
              </div>
              <div className="bg-[#F8F9FC] rounded-lg p-3 border border-[#E2E7EF]">
                <p className="text-[11px] uppercase font-semibold text-[#6B7A94]">Pagos Registrados</p>
                <p className="text-xl font-bold text-[#2B3A5C] mt-0.5">{patientData?.payments.length || 0}</p>
              </div>
              <div className="bg-[#F8F9FC] rounded-lg p-3 border border-[#E2E7EF]">
                <p className="text-[11px] uppercase font-semibold text-[#6B7A94]">Total Abonado</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">
                  S/ {patientData?.payments.reduce((acc, p) => acc + p.amount, 0) || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E2E7EF] gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("paquetes")}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "paquetes"
                ? "border-[#E8481E] text-[#E8481E] bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-[#6B7A94] hover:text-[#2B3A5C]"
                }`}
            >
              <Layers size={16} />
              <span>Paquetes y Corrección en Cascada</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-xs rounded-full">
                {patientData?.packages.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sesiones")}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "sesiones"
                ? "border-[#E8481E] text-[#E8481E] bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-[#6B7A94] hover:text-[#2B3A5C]"
                }`}
            >
              <ClipboardList size={16} />
              <span>Sesiones</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-xs rounded-full">
                {patientData?.sessions.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pagos")}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "pagos"
                ? "border-[#E8481E] text-[#E8481E] bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-[#6B7A94] hover:text-[#2B3A5C]"
                }`}
            >
              <CreditCard size={16} />
              <span>Pagos</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-xs rounded-full">
                {patientData?.payments.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("diagnostico")}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === "diagnostico"
                ? "border-[#E8481E] text-[#E8481E] bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-[#6B7A94] hover:text-[#2B3A5C]"
                }`}
            >
              <Sparkles size={16} />
              <span>Diagnóstico & Auto-Reparación</span>
              {diagnostics.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                  {diagnostics.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: PAQUETES Y CORRECCIÓN EN CASCADA */}
          {activeTab === "paquetes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#2B3A5C]">Paquetes Asignados</h3>
                  <p className="text-xs text-[#6B7A94]">
                    Si la coordinadora asignó el servicio incorrecto, usa <strong>"Reasignar en Cascada"</strong> para corregir el paquete, sesiones y pagos en 1 clic.
                  </p>
                </div>
                <button
                  onClick={openCreatePackage}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#E8481E] text-white text-xs font-semibold rounded-lg hover:bg-[#C93A14] transition-colors"
                >
                  <Plus size={14} /> Nuevo paquete manual
                </button>
              </div>

              {patientData?.packages && patientData.packages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientData.packages.map(pkg => {
                    const linkedSessions = patientData.sessions.filter(s => s.packageId === pkg.id)
                    const percent = pkg.totalSessions > 0 ? Math.round((pkg.usedSessions / pkg.totalSessions) * 100) : 0

                    return (
                      <div
                        key={pkg.id}
                        className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
                      >
                        {/* Package Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded">
                                #{pkg.serviceNumber || "—"}
                              </span>
                              <h4 className="font-bold text-base text-[#1A2332]">{pkg.serviceName}</h4>
                            </div>
                            <p className="text-xs text-[#6B7A94] mt-0.5 font-mono">ID: {pkg.id}</p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${pkg.status === "activo"
                              ? "bg-emerald-100 text-emerald-800"
                              : pkg.status === "completado"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {pkg.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs font-medium text-[#6B7A94] mb-1">
                            <span>Progreso de Sesiones</span>
                            <span className="text-[#1A2332] font-bold">
                              {pkg.usedSessions} / {pkg.totalSessions} usadas ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#F2F4F8] h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#E8481E] h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Financial & Linked Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8F9FC] p-3 rounded-lg border border-[#E2E7EF]">
                          <div>
                            <span className="text-[#6B7A94]">Monto Pagado:</span>
                            <p className="font-bold text-[#1A2332]">S/ {pkg.amountPaid}</p>
                          </div>
                          <div>
                            <span className="text-[#6B7A94]">Monto Total:</span>
                            <p className="font-bold text-[#1A2332]">S/ {pkg.totalAmount || pkg.amountPaid}</p>
                          </div>
                          <div>
                            <span className="text-[#6B7A94]">Sesiones vinculadas:</span>
                            <p className="font-bold text-[#1A2332]">{linkedSessions.length} sesión(es)</p>
                          </div>
                          <div>
                            <span className="text-[#6B7A94]">Pago vinculado:</span>
                            <p className="font-bold text-[#1A2332]">
                              {pkg.paymentId ? `Sí (S/ ${pkg.paymentAmount ?? "—"})` : "Sin pago ligado"}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#F2F4F8]">
                          {/* Super Button: Cascade Reassignment */}
                          <button
                            onClick={() => openCascadeModal(pkg)}
                            className="flex-1 min-w-[170px] flex items-center justify-center gap-1.5 py-2 px-3 bg-[#E8481E] hover:bg-[#C93A14] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                          >
                            <Sparkles size={14} /> Reasignar en Cascada
                          </button>

                          <button
                            onClick={() => openEditPackage(pkg)}
                            className="p-2 border border-[#E2E7EF] hover:bg-[#F2F4F8] text-[#2B3A5C] rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Editar detalles del paquete"
                          >
                            <Pencil size={14} /> Editar
                          </button>

                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "package",
                                id: pkg.id,
                                title: `Eliminar Paquete de ${pkg.serviceName}`,
                                description: `¿Estás seguro de eliminar este paquete? Tienes ${linkedSessions.length} sesiones vinculadas.`,
                                extraOption: false,
                              })
                            }
                            className="p-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs"
                            title="Eliminar paquete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-[#E2E7EF] p-8 text-center text-[#6B7A94]">
                  <Layers size={32} className="mx-auto mb-2 text-[#6B7A94]/40" />
                  <p className="font-medium text-sm">Este paciente no tiene paquetes registrados.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SESIONES */}
          {activeTab === "sesiones" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#2B3A5C]">Sesiones del Paciente</h3>
                  <p className="text-xs text-[#6B7A94]">
                    Modifica directamente el servicio, estado, horario, terapeuta o paquete de cualquier sesión.
                  </p>
                </div>
              </div>

              {patientData?.sessions && patientData.sessions.length > 0 ? (
                <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F8F9FC] border-b border-[#E2E7EF] text-[#6B7A94] uppercase font-semibold">
                        <tr>
                          <th className="py-3 px-4 text-left">Fecha & Hora</th>
                          <th className="py-3 px-4 text-left">Servicio Actual</th>
                          <th className="py-3 px-4 text-left">Terapeuta & Sede</th>
                          <th className="py-3 px-4 text-left">Paquete Vinculado</th>
                          <th className="py-3 px-4 text-left">Estado</th>
                          <th className="py-3 px-4 text-right">Tarifa</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F4F8]">
                        {patientData.sessions.map(sess => (
                          <tr key={sess.id} className="hover:bg-[#F8F9FC] transition-colors">
                            <td className="py-3 px-4 font-medium text-[#1A2332]">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-[#6B7A94]" />
                                <span>{sess.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#6B7A94] mt-0.5">
                                <Clock size={12} />
                                <span>{sess.startTime} - {sess.endTime}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#2B3A5C] bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                {sess.serviceName}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#1A2332]">
                              <div className="flex items-center gap-1">
                                <User size={12} className="text-[#6B7A94]" />
                                <span>{sess.therapistName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[#6B7A94] mt-0.5">
                                <Building2 size={12} />
                                <span>{sess.sedeNombre}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {sess.packageName ? (
                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-medium">
                                  {sess.packageName}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Sesión individual</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold ${sess.status === "Realizada"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : sess.status === "Pendiente"
                                    ? "bg-amber-100 text-amber-800"
                                    : sess.status === "Cancelada"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                              >
                                {sess.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#1A2332]">
                              S/ {sess.fee}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditSession(sess)}
                                  className="p-1.5 text-[#6B7A94] hover:text-[#2B3A5C] hover:bg-slate-100 rounded"
                                  title="Editar sesión completa"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: "session",
                                      id: sess.id,
                                      title: "Eliminar Sesión",
                                      description: `¿Estás seguro de eliminar la sesión del ${sess.date} (${sess.serviceName})?`,
                                    })
                                  }
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Eliminar sesión"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-[#E2E7EF] p-8 text-center text-[#6B7A94]">
                  <ClipboardList size={32} className="mx-auto mb-2 text-[#6B7A94]/40" />
                  <p className="font-medium text-sm">Este paciente no tiene sesiones registradas.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAGOS */}
          {activeTab === "pagos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#2B3A5C]">Pagos del Paciente</h3>
                  <p className="text-xs text-[#6B7A94]">
                    Reasigna el servicio del pago, ajusta el monto, estado o notas descriptivas.
                  </p>
                </div>
              </div>

              {patientData?.payments && patientData.payments.length > 0 ? (
                <div className="bg-white rounded-xl border border-[#E2E7EF] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F8F9FC] border-b border-[#E2E7EF] text-[#6B7A94] uppercase font-semibold">
                        <tr>
                          <th className="py-3 px-4 text-left">Fecha</th>
                          <th className="py-3 px-4 text-left">Servicio Asignado</th>
                          <th className="py-3 px-4 text-left">Método & Estado</th>
                          <th className="py-3 px-4 text-left">Nota / Descripción</th>
                          <th className="py-3 px-4 text-right">Monto</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F4F8]">
                        {patientData.payments.map(pay => (
                          <tr key={pay.id} className="hover:bg-[#F8F9FC] transition-colors">
                            <td className="py-3 px-4 font-medium text-[#1A2332] whitespace-nowrap">
                              {pay.date}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#2B3A5C] bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                {pay.serviceName}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-[#1A2332]">{pay.method}</span>
                                <span
                                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${pay.status === "Pagado"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : pay.status === "Parcial"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                    }`}
                                >
                                  {pay.status}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#6B7A94] max-w-xs truncate">
                              {pay.notes || "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap text-sm">
                              S/ {pay.amount}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditPayment(pay)}
                                  className="p-1.5 text-[#6B7A94] hover:text-[#2B3A5C] hover:bg-slate-100 rounded"
                                  title="Editar pago"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: "payment",
                                      id: pay.id,
                                      title: "Eliminar Pago",
                                      description: `¿Estás seguro de eliminar el pago de S/ ${pay.amount} del ${pay.date}?`,
                                    })
                                  }
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Eliminar pago"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-[#E2E7EF] p-8 text-center text-[#6B7A94]">
                  <CreditCard size={32} className="mx-auto mb-2 text-[#6B7A94]/40" />
                  <p className="font-medium text-sm">Este paciente no tiene pagos registrados.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICO & AUTO-REPARACIÓN */}
          {activeTab === "diagnostico" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-[#2B3A5C] flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={18} /> Diagnóstico Inteligente de Integridad
                  </h3>
                  <p className="text-xs text-[#6B7A94] mt-0.5">
                    Detecta automáticamente incongruencias de servicios entre paquetes, sesiones y pagos, o descuadres en contadores.
                  </p>
                </div>

                {diagnostics.length > 0 && (
                  <button
                    onClick={handleFixAllIssues}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-md transition-all shrink-0"
                  >
                    <Wrench size={15} /> Reparar todas ({diagnostics.length})
                  </button>
                )}
              </div>

              {diagnostics.length > 0 ? (
                <div className="space-y-3">
                  {diagnostics.map(issue => (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white shadow-sm ${issue.severity === "error"
                        ? "border-red-200 bg-red-50/20"
                        : "border-amber-200 bg-amber-50/20"
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${issue.severity === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}
                        >
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1A2332]">{issue.title}</h4>
                          <p className="text-xs text-[#6B7A94] mt-0.5 leading-relaxed">{issue.description}</p>
                          <p className="text-xs text-blue-700 font-medium mt-1">
                            Sugerencia: <strong>{issue.suggestedFix}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleFixIssue(issue)}
                        className="px-3.5 py-1.5 bg-[#2B3A5C] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-lg shrink-0 shadow-sm transition-colors"
                      >
                        Reparar ahora
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center text-emerald-800">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
                  <h4 className="font-bold text-base">¡Excelente! Todo está perfectamente alineado</h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1">
                    No se encontraron inconsistencias de servicios, huérfanos ni descuadres en los paquetes de este paciente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-12 text-center text-[#6B7A94]">
          <Search size={36} className="mx-auto mb-2 text-[#6B7A94]/40" />
          <p className="text-base font-semibold text-[#2B3A5C]">Selecciona un paciente para comenzar</p>
          <p className="text-xs text-[#6B7A94] mt-1">Usa la barra de búsqueda superior para elegir al paciente a corregir.</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REASIGNACIÓN EN CASCADA (LA ESTRELLA DE LA INTERFAZ)             */}
      {/* ========================================================================= */}
      {showCascadeModal && cascadeTargetPkg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-[#E2E7EF]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#2B3A5C] to-[#1E293B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E8481E] flex items-center justify-center text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Reasignar Servicio en Cascada</h3>
                  <p className="text-xs text-slate-300">Corrige paquete, sesiones y pagos en un solo paso</p>
                </div>
              </div>
              <button onClick={() => setShowCascadeModal(false)} className="text-slate-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Comparison Box */}
              <div className="bg-[#F8F9FC] p-4 rounded-xl border border-[#E2E7EF] space-y-3">
                <p className="text-xs font-semibold text-[#6B7A94] uppercase tracking-wide">Cambio de Servicio</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 bg-white p-2.5 rounded-lg border border-red-200">
                    <span className="text-[10px] text-red-600 font-bold uppercase block">Servicio Actual (Equivocado)</span>
                    <span className="text-sm font-bold text-[#1A2332] line-through text-red-700">
                      {cascadeTargetPkg.serviceName}
                    </span>
                  </div>

                  <ArrowRight size={20} className="text-[#6B7A94] mx-auto hidden sm:block shrink-0" />

                  <div className="flex-1 bg-white p-2.5 rounded-lg border border-emerald-300 shadow-xs">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase block">Nuevo Servicio Correcto</span>
                    <select
                      value={cascadeNewServiceId}
                      onChange={e => setCascadeNewServiceId(e.target.value)}
                      className="w-full text-sm font-bold text-emerald-800 bg-transparent outline-none cursor-pointer"
                    >
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          #{s.number} - {s.name} (S/ {s.defaultFee})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Cascade Options Checkboxes */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#2B3A5C] uppercase tracking-wide">
                  Elementos que se actualizarán automáticamente:
                </p>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E7EF] hover:bg-[#F8F9FC] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="mt-0.5 rounded text-[#E8481E] focus:ring-[#E8481E]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A2332]">1. Paquete del Paciente (`patient_packages`)</span>
                    <p className="text-[11px] text-[#6B7A94]">
                      Se reasignará el `service_id` del paquete ({cascadeTargetPkg.totalSessions} sesiones).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E7EF] hover:bg-[#F8F9FC] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={cascadeUpdateSessions}
                    onChange={e => setCascadeUpdateSessions(e.target.checked)}
                    className="mt-0.5 rounded text-[#E8481E] focus:ring-[#E8481E]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A2332]">2. Todas las Sesiones vinculadas (`sessions`)</span>
                    <p className="text-[11px] text-[#6B7A94]">
                      Se actualizará el `service_id` a las{" "}
                      <strong>
                        {patientData?.sessions.filter(s => s.packageId === cascadeTargetPkg.id).length || 0} sesiones
                      </strong>{" "}
                      pertenecientes a este paquete.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E7EF] hover:bg-[#F8F9FC] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={cascadeUpdatePayments}
                    onChange={e => setCascadeUpdatePayments(e.target.checked)}
                    className="mt-0.5 rounded text-[#E8481E] focus:ring-[#E8481E]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A2332]">3. Pago(s) Asociados (`payments`)</span>
                    <p className="text-[11px] text-[#6B7A94]">
                      Se actualizará el `service_id` del pago del paquete (ID: {cascadeTargetPkg.paymentId || "N/A"}).
                    </p>
                  </div>
                </label>

                {cascadeUpdatePayments && (
                  <div className="pl-6 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-[#2B3A5C] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cascadeUpdateNotes}
                        onChange={e => setCascadeUpdateNotes(e.target.checked)}
                        className="rounded text-[#E8481E] focus:ring-[#E8481E]"
                      />
                      <span>Actualizar también la nota descriptiva del pago:</span>
                    </label>
                    {cascadeUpdateNotes && (
                      <input
                        type="text"
                        value={cascadeCustomNote}
                        onChange={e => setCascadeCustomNote(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                        placeholder="Nota descriptiva del pago..."
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F8F9FC] border-t border-[#E2E7EF] flex justify-end gap-2.5">
              <button
                onClick={() => setShowCascadeModal(false)}
                disabled={isCascading}
                className="px-4 py-2 text-xs font-semibold text-[#6B7A94] hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeCascadeUpdate}
                disabled={isCascading || !cascadeNewServiceId}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-[#E8481E] hover:bg-[#C93A14] text-white rounded-lg shadow-md transition-all disabled:opacity-50"
              >
                {isCascading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                {isCascading ? "Aplicando corrección..." : "Confirmar y Reasignar en Cascada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDICIÓN MANUAL DE PAQUETE                                        */}
      {/* ========================================================================= */}
      {showEditPkgModal && pkgEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E7EF]">
            <div className="px-6 py-4 border-b border-[#E2E7EF] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#2B3A5C]">Editar Paquete</h3>
              <button onClick={() => setShowEditPkgModal(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">Servicio</label>
                <select
                  value={pkgEditForm.serviceId}
                  onChange={e => setPkgEditForm({ ...pkgEditForm, serviceId: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>#{s.number} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Sesiones Totales</label>
                  <input
                    type="number"
                    min="1"
                    value={pkgEditForm.totalSessions}
                    onChange={e => setPkgEditForm({ ...pkgEditForm, totalSessions: e.target.value })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Sesiones Usadas</label>
                  <input
                    type="number"
                    min="0"
                    value={pkgEditForm.usedSessions}
                    onChange={e => setPkgEditForm({ ...pkgEditForm, usedSessions: e.target.value })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Monto Pagado (S/)</label>
                  <input
                    type="number"
                    value={pkgEditForm.amountPaid}
                    onChange={e => setPkgEditForm({ ...pkgEditForm, amountPaid: e.target.value })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Monto Total (S/)</label>
                  <input
                    type="number"
                    value={pkgEditForm.totalAmount}
                    onChange={e => setPkgEditForm({ ...pkgEditForm, totalAmount: e.target.value })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">Estado del Paquete</label>
                <select
                  value={pkgEditForm.status}
                  onChange={e => setPkgEditForm({ ...pkgEditForm, status: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                >
                  <option value="activo">Activo</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">ID de Pago Vinculado (Opcional)</label>
                <input
                  type="text"
                  value={pkgEditForm.paymentId}
                  onChange={e => setPkgEditForm({ ...pkgEditForm, paymentId: e.target.value })}
                  placeholder="UUID del pago..."
                  className="w-full p-2.5 font-mono border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F9FC] border-t border-[#E2E7EF] flex justify-end gap-2.5">
              <button
                onClick={() => setShowEditPkgModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#6B7A94]"
              >
                Cancelar
              </button>
              <button
                onClick={savePackageEdit}
                disabled={isSavingPkg}
                className="px-5 py-2 text-xs font-bold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] transition-colors"
              >
                {isSavingPkg ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREAR PAQUETE MANUAL                                             */}
      {/* ========================================================================= */}
      {showCreatePkgModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E7EF]">
            <div className="px-6 py-4 border-b border-[#E2E7EF] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#2B3A5C]">Crear Paquete Manualmente</h3>
              <button onClick={() => setShowCreatePkgModal(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">Servicio</label>
                <select
                  value={pkgCreateForm.serviceId}
                  onChange={e => {
                    const svc = services.find(s => s.id === e.target.value)
                    setPkgCreateForm({
                      ...pkgCreateForm,
                      serviceId: e.target.value,
                      totalSessions: svc?.sessionCount || 8,
                      amountPaid: svc?.defaultFee || 0,
                      totalAmount: svc?.defaultFee || 0,
                    })
                  }}
                  className="w-full p-2.5 bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>#{s.number} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Sesiones Totales</label>
                  <input
                    type="number"
                    min="1"
                    value={pkgCreateForm.totalSessions}
                    onChange={e => setPkgCreateForm({ ...pkgCreateForm, totalSessions: Number(e.target.value) })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Monto Total (S/)</label>
                  <input
                    type="number"
                    value={pkgCreateForm.totalAmount}
                    onChange={e => setPkgCreateForm({ ...pkgCreateForm, totalAmount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F9FC] border-t border-[#E2E7EF] flex justify-end gap-2.5">
              <button onClick={() => setShowCreatePkgModal(false)} className="px-4 py-2 text-xs font-semibold text-[#6B7A94]">
                Cancelar
              </button>
              <button
                onClick={saveCreatePackage}
                disabled={isCreatingPkg}
                className="px-5 py-2 text-xs font-bold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14]"
              >
                {isCreatingPkg ? "Creando..." : "Crear Paquete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDICIÓN COMPLETA DE SESIÓN                                       */}
      {/* ========================================================================= */}
      {showEditSessionModal && sessionEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E2E7EF]">
            <div className="px-6 py-4 border-b border-[#E2E7EF] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#2B3A5C]">Editar Sesión (Admin)</h3>
              <button onClick={() => setShowEditSessionModal(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>

            <div className="p-6 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Servicio</label>
                  <select
                    value={sessionEditForm.serviceId}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, serviceId: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  >
                    <option value="">Sin servicio específico</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>#{s.number} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Paquete Vinculado</label>
                  <select
                    value={sessionEditForm.packageId}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, packageId: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                  >
                    <option value="">Ninguno (Sesión individual)</option>
                    {patientData?.packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.serviceName} ({p.usedSessions}/{p.totalSessions})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Fecha</label>
                  <input
                    type="date"
                    value={sessionEditForm.date}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, date: e.target.value })}
                    className="w-full p-2 border border-[#E2E7EF] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={sessionEditForm.startTime}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, startTime: e.target.value })}
                    className="w-full p-2 border border-[#E2E7EF] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={sessionEditForm.endTime}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, endTime: e.target.value })}
                    className="w-full p-2 border border-[#E2E7EF] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Terapeuta</label>
                  <select
                    value={sessionEditForm.therapistId}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, therapistId: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E2E7EF] rounded-lg"
                  >
                    {therapists.map(t => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Sede</label>
                  <select
                    value={sessionEditForm.sedeId}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, sedeId: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E2E7EF] rounded-lg"
                  >
                    <option value="">Sin sede</option>
                    {sedes.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Estado</label>
                  <select
                    value={sessionEditForm.status}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, status: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E2E7EF] rounded-lg"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Reprogramada">Reprogramada</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Tarifa (S/)</label>
                  <input
                    type="number"
                    value={sessionEditForm.fee}
                    onChange={e => setSessionEditForm({ ...sessionEditForm, fee: e.target.value })}
                    className="w-full p-2 border border-[#E2E7EF] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={sessionEditForm.notes}
                  onChange={e => setSessionEditForm({ ...sessionEditForm, notes: e.target.value })}
                  className="w-full p-2 border border-[#E2E7EF] rounded-lg resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F9FC] border-t border-[#E2E7EF] flex justify-end gap-2.5">
              <button onClick={() => setShowEditSessionModal(false)} className="px-4 py-2 text-xs font-semibold text-[#6B7A94]">
                Cancelar
              </button>
              <button
                onClick={saveSessionEdit}
                disabled={isSavingSession}
                className="px-5 py-2 text-xs font-bold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14]"
              >
                {isSavingSession ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDICIÓN DE PAGO                                                  */}
      {/* ========================================================================= */}
      {showEditPaymentModal && paymentEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E7EF]">
            <div className="px-6 py-4 border-b border-[#E2E7EF] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#2B3A5C]">Editar Pago (Admin)</h3>
              <button onClick={() => setShowEditPaymentModal(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">Servicio Asignado</label>
                <select
                  value={paymentEditForm.serviceId}
                  onChange={e => setPaymentEditForm({ ...paymentEditForm, serviceId: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                >
                  <option value="">Sin servicio específico</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>#{s.number} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Monto (S/)</label>
                  <input
                    type="number"
                    value={paymentEditForm.amount}
                    onChange={e => setPaymentEditForm({ ...paymentEditForm, amount: e.target.value })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Fecha</label>
                  <input
                    type="date"
                    value={paymentEditForm.date}
                    onChange={e => setPaymentEditForm({ ...paymentEditForm, date: e.target.value })}
                    className="w-full p-2.5 border border-[#E2E7EF] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Método de Pago</label>
                  <select
                    value={paymentEditForm.method}
                    onChange={e => setPaymentEditForm({ ...paymentEditForm, method: e.target.value })}
                    className="w-full p-2.5 bg-white border border-[#E2E7EF] rounded-lg"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#6B7A94] mb-1">Estado</label>
                  <select
                    value={paymentEditForm.status}
                    onChange={e => setPaymentEditForm({ ...paymentEditForm, status: e.target.value })}
                    className="w-full p-2.5 bg-white border border-[#E2E7EF] rounded-lg"
                  >
                    <option value="Pagado">Pagado</option>
                    <option value="Parcial">Parcial</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#6B7A94] mb-1">Nota / Descripción</label>
                <input
                  type="text"
                  value={paymentEditForm.notes}
                  onChange={e => setPaymentEditForm({ ...paymentEditForm, notes: e.target.value })}
                  placeholder="Ej: Pago de paquete Terapia Ocupacional"
                  className="w-full p-2.5 border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F9FC] border-t border-[#E2E7EF] flex justify-end gap-2.5">
              <button onClick={() => setShowEditPaymentModal(false)} className="px-4 py-2 text-xs font-semibold text-[#6B7A94]">
                Cancelar
              </button>
              <button
                onClick={savePaymentEdit}
                disabled={isSavingPayment}
                className="px-5 py-2 text-xs font-bold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14]"
              >
                {isSavingPayment ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRMACIÓN DE ELIMINACIÓN                                      */}
      {/* ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-[#E2E7EF] space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-[#1A2332]">{deleteConfirm.title}</h3>
              <p className="text-xs text-[#6B7A94] mt-1">{deleteConfirm.description}</p>
            </div>

            {deleteConfirm.type === "package" && (
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirm.extraOption}
                  onChange={e => setDeleteConfirm({ ...deleteConfirm, extraOption: e.target.checked })}
                  className="rounded text-red-600"
                />
                <span>Eliminar también todas las sesiones vinculadas a este paquete</span>
              </label>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6B7A94]"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
