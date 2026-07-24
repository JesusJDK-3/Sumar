import { supabase } from '../supabaseClient'
import type { Payment, PaymentMethod, Session, Patient, Service } from '../../types'

interface PaymentRow {
  id: string
  patient_id: string
  session_id: string | null
  service_id: string | null
  session_count: number | null
  date: string
  amount: number
  method: PaymentMethod
  status: 'Pagado' | 'Parcial' | 'Pendiente'
  notes: string
  sessions?: {
    id: string
    fee: number
    date: string
    start_time: string
    end_time: string
    patients?: Patient
  }
}

interface RawSession {
  id: string
  patient_id: string
  therapist_id: string
  service_id: string | null
  date: string
  start_time: string
  end_time: string
  type: string
  status: string
  notes: string
  fee: number
  created_at: string
  patients?: {
    id: string
    first_name: string
    last_name: string
  }
}

interface SlimPatient {
  id: string
  firstName: string
  lastName: string
}

interface SessionWithPatient extends Session {
  patient?: SlimPatient
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    patientId: row.patient_id,
    sessionId: row.session_id || undefined,
    serviceId: row.service_id || undefined,
    sessionCount: row.session_count || undefined,
    date: row.date,
    amount: row.amount,
    method: row.method,
    status: row.status,
    notes: row.notes,
  }
}

// Trae todas las sesiones "Realizada" que NO tienen pago o tienen pago parcial
export async function getSessionsWithoutPayment(): Promise<SessionWithPatient[]> {
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, patients(*)')
    .eq('status', 'Realizada')
    .order('date', { ascending: false })

  if (sessionsError) throw sessionsError

  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select('session_id, amount, status')

  if (paymentsError) throw paymentsError

  const paidBySession: Record<string, number> = {}
  paymentsData?.forEach(p => {
    if (p.session_id) {
      paidBySession[p.session_id] = (paidBySession[p.session_id] || 0) + p.amount
    }
  })

  const sessions = (sessionsData || []) as RawSession[]

  const pending = sessions.filter(s => {
    const totalPaid = paidBySession[s.id] || 0
    return totalPaid < s.fee
  })

  return pending.map(s => ({
    id: s.id,
    patientId: s.patient_id,
    therapistId: s.therapist_id,
    serviceId: s.service_id ?? undefined,
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    type: s.type,
    status: s.status as Session['status'],
    notes: s.notes,
    fee: s.fee,
    createdAt: s.created_at,
    patient: s.patients ? {
      id: s.patients.id,
      firstName: s.patients.first_name,
      lastName: s.patients.last_name,
    } : undefined,
  }))
}

// Trae historial de pagos
export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, sessions(fee, date, start_time, end_time, patients(first_name, last_name))')
    .order('date', { ascending: false })

  if (error) throw error
  return (data || []).map(rowToPayment)
}

// Crea un pago: puede ser por sesión individual o por paquete de sesiones
export async function createPayment(params: {
  sessionId?: string
  patientId: string
  serviceId?: string
  sessionCount?: number
  amountReceived: number
  method: PaymentMethod
  date: string
  notes?: string
}): Promise<Payment> {
  // Validar que tengamos al menos sessionId o serviceId
  if (!params.sessionId && !params.serviceId) {
    throw new Error('Debe especificar una sesión o un servicio de paquete')
  }

  let fee: number
  const isPackage = !!params.serviceId && (params.sessionCount ?? 1) > 1

  if (isPackage) {
    // Para paquetes, el monto total es lo que se recibe (no hay fee de sesión individual)
    fee = params.amountReceived
  } else {
    // Para sesiones individuales, consultar el fee de la sesión
    if (!params.sessionId) throw new Error('Se requiere sessionId para pagos por sesión')
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('fee')
      .eq('id', params.sessionId)
      .single()

    if (sessionError) throw sessionError
    if (!sessionData) throw new Error('Sesión no encontrada')

    fee = sessionData.fee as number
  }

  const totalPaid = params.amountReceived

  let status: 'Pagado' | 'Parcial' | 'Pendiente'
  if (totalPaid >= fee) {
    status = 'Pagado'
  } else if (totalPaid > 0) {
    status = 'Parcial'
  } else {
    status = 'Pendiente'
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      session_id: params.sessionId ?? null,
      patient_id: params.patientId,
      service_id: params.serviceId ?? null,
      session_count: params.sessionCount ?? 1,
      date: params.date,
      amount: totalPaid,
      method: params.method,
      status,
      notes: params.notes || '',
    })
    .select()
    .single()

  if (error) throw error
  return rowToPayment(data as PaymentRow)
}

// NUEVO: Trae los paquetes activos de un paciente
export async function getPatientPackages(patientId: string) {
  const { data, error } = await supabase
    .from('patient_packages')
    .select('*, services(*)')
    .eq('patient_id', patientId)
    .eq('status', 'activo')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// NUEVO: Crear un paquete para un paciente (se llama después de registrar el pago del paquete)
export async function createPatientPackage(params: {
  patientId: string
  serviceId: string
  totalSessions: number
  amountPaid: number
  paymentId: string
}) {
  const { data, error } = await supabase
    .from('patient_packages')
    .insert({
      patient_id: params.patientId,
      service_id: params.serviceId,
      total_sessions: params.totalSessions,
      used_sessions: 0,
      amount_paid: params.amountPaid,
      payment_id: params.paymentId,
      status: 'activo',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// NUEVO: Usar una sesión de un paquete (incrementar used_sessions)
export async function usePackageSession(packageId: string) {
  const { data: pkg, error: fetchError } = await supabase
    .from('patient_packages')
    .select('total_sessions, used_sessions')
    .eq('id', packageId)
    .single()

  if (fetchError) throw fetchError
  if (!pkg) throw new Error('Paquete no encontrado')

  const newUsed = (pkg.used_sessions || 0) + 1
  const newStatus = newUsed >= pkg.total_sessions ? 'completado' : 'activo'

  const { error } = await supabase
    .from('patient_packages')
    .update({
      used_sessions: newUsed,
      status: newStatus,
    })
    .eq('id', packageId)

  if (error) throw error
}