import { supabase } from '../supabaseClient'
import type { Session, SessionStatus, Service, Sede } from '../../types'

interface SessionRow {
  id: string
  appointment_id: string | null
  patient_id: string
  therapist_id: string
  service_id: string | null
  package_id: string | null  // ← NUEVO
  sede_id: string | null  // ← NUEVO
  date: string
  start_time: string
  end_time: string
  type: string
  status: SessionStatus
  notes: string
  fee: number
  services?: ServiceRow
  sedes?: SedeRow
}

interface SedeRow {
  id: string
  nombre: string
}

interface ServiceRow {
  id: string
  number: number
  name: string
  description: string | null
  default_fee: number
  session_count?: number  // ← NUEVO
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    description: row.description || undefined,
    defaultFee: row.default_fee,
    sessionCount: row.session_count ?? 1,  // ← NUEVO
    createdAt: '',
  }
}

function rowToSede(row: SedeRow): Sede {
  return {
    id: row.id,
    nombre: row.nombre,
  }
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    patientId: row.patient_id,
    therapistId: row.therapist_id,
    serviceId: row.service_id || undefined,
    packageId: row.package_id || undefined,  // ← NUEVO
    sedeId: row.sede_id || undefined,  // ← NUEVO
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    type: row.type,
    status: row.status,
    notes: row.notes,
    fee: row.fee,
    service: row.services ? rowToService(row.services) : undefined,
    sede: row.sedes ? rowToSede(row.sedes) : undefined,
  }
}

function sessionToRow(s: Partial<Session> & { appointmentId?: string }) {
  return {
    appointment_id: s.appointmentId ?? null,
    patient_id: s.patientId,
    therapist_id: s.therapistId,
    service_id: s.serviceId ?? null,
    package_id: s.packageId ?? null,  // ← NUEVO
    sede_id: s.sedeId ?? null,  // ← NUEVO
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    type: s.type,
    status: s.status,
    notes: s.notes,
    fee: s.fee,
  }
}

// NUEVO: Crear paquete y generar N sesiones
export async function createPackageAndSessions(params: {
  patientId: string
  therapistId: string
  serviceId: string
  totalSessions: number
  baseDate: string
  startTime: string
  endTime: string
  type: string
  packagePrice: number  // ← Monto total acordado del paquete
}): Promise<{ packageId: string; sessions: Session[] }> {
  // 1. Crear el paquete
  // WORKAROUND: Guardamos el monto acordado en amount_paid temporalmente.
  // Cuando agregues la columna 'total_amount' (numeric) a patient_packages,
  // cambia 'amount_paid' por 'total_amount' aquí abajo.
  const { data: pkgData, error: pkgError } = await supabase
    .from('patient_packages')
    .insert({
      patient_id: params.patientId,
      service_id: params.serviceId,
      total_sessions: params.totalSessions,
      used_sessions: 0,
      amount_paid: params.packagePrice,  // ← WORKAROUND: monto acordado (temporal en amount_paid)
      status: 'activo',
    })
    .select()
    .single()

  if (pkgError) throw pkgError
  const packageId = pkgData.id

  // 2. Crear las N sesiones
  const sessionsData = Array.from({ length: params.totalSessions }, (_, i) => ({
    patient_id: params.patientId,
    therapist_id: params.therapistId,
    service_id: params.serviceId,
    package_id: packageId,
    date: params.baseDate, // Podrías calcular fechas futuras aquí
    start_time: params.startTime,
    end_time: params.endTime,
    type: params.type,
    status: 'Pendiente',
    notes: `Sesión ${i + 1} de ${params.totalSessions}`,
    fee: 0,
  }))

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .insert(sessionsData)
    .select('*, services!left(*), sedes!left(*)')

  if (sessionsError) throw sessionsError

  return {
    packageId,
    sessions: (sessions as SessionRow[]).map(rowToSession),
  }
}

export async function getSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, services!left(*), sedes!left(*)')
    .order('date', { ascending: false })

  if (error) throw error
  return (data as SessionRow[]).map(rowToSession)
}

export async function createSession(session: Omit<Session, 'id'>): Promise<Session> {
  // Validar que no exista una sesión activa (no cancelada) en el mismo horario para este terapeuta
  const { data: existing, error: checkError } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('therapist_id', session.therapistId)
    .eq('date', session.date)
    .neq('status', 'Cancelada')
    .or(`and(start_time.lt.${session.endTime},end_time.gt.${session.startTime})`)

  if (checkError) throw checkError

  if (existing && existing.length > 0) {
    throw new Error('Conflicto de horario: el terapeuta ya tiene una sesión en esa fecha y hora.')
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionToRow(session))
    .select('*, services!left(*), sedes!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function updateSession(id: string, session: Partial<Session>): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update(sessionToRow(session))
    .eq('id', id)
    .select('*, services!left(*), sedes!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

// Edición "segura" de sesión: solo los campos no sensibles (fecha, hora,
// terapeuta, tipo, sede). A diferencia de updateSession (que usa sessionToRow
// y castea campos ausentes del Partial a null), aquí solo tocamos lo que
// se pasa explícitamente — paciente, servicio, paquete, monto, notas y estado
// quedan intactos siempre.
export async function updateSessionSchedule(
  id: string,
  fields: { date: string; startTime: string; endTime: string; therapistId: string; type: string; sedeId: string },
  currentStatus: SessionStatus
): Promise<Session> {
  // Validar conflicto de horario para el terapeuta, excluyendo esta misma sesión
  if (currentStatus !== 'Cancelada') {
    const { data: existing, error: checkError } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('therapist_id', fields.therapistId)
      .eq('date', fields.date)
      .neq('status', 'Cancelada')
      .neq('id', id)
      .or(`and(start_time.lt.${fields.endTime},end_time.gt.${fields.startTime})`)

    if (checkError) throw checkError
    if (existing && existing.length > 0) {
      throw new Error('Conflicto de horario: el terapeuta ya tiene una sesión en esa fecha y hora.')
    }
  }

  const { data, error } = await supabase
    .from('sessions')
    .update({
      date: fields.date,
      start_time: fields.startTime,
      end_time: fields.endTime,
      therapist_id: fields.therapistId,
      type: fields.type,
      sede_id: fields.sedeId,
    })
    .eq('id', id)
    .select('*, services!left(*), sedes!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', id)
    .select('*, services!left(*), sedes!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw error
}