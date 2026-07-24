import { supabase } from '../supabaseClient'
import type { Session, SessionStatus, Service } from '../../types'

interface SessionRow {
  id: string
  appointment_id: string | null
  patient_id: string
  therapist_id: string
  service_id: string | null
  date: string
  start_time: string
  end_time: string
  type: string
  status: SessionStatus
  notes: string
  fee: number
  services?: ServiceRow
}

interface ServiceRow {
  id: string
  number: number
  name: string
  description: string | null
  default_fee: number
  session_count?: number // ← NUEVO
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    description: row.description || undefined,
    defaultFee: row.default_fee,
    sessionCount: row.session_count ?? 1, // ← NUEVO
    createdAt: '',
  }
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    patientId: row.patient_id,
    therapistId: row.therapist_id,
    serviceId: row.service_id || undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    type: row.type,
    status: row.status,
    notes: row.notes,
    fee: row.fee,
    service: row.services ? rowToService(row.services) : undefined,
  }
}

function sessionToRow(s: Partial<Session> & { appointmentId?: string }) {
  return {
    appointment_id: s.appointmentId ?? null,
    patient_id: s.patientId,
    therapist_id: s.therapistId,
    service_id: s.serviceId ?? null,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    type: s.type,
    status: s.status,
    notes: s.notes,
    fee: s.fee,
  }
}

export async function createSessionsFromPackage(params: {
  patientId: string
  therapistId: string
  serviceId: string
  packageId: string
  count: number
  baseDate: string
  startTime: string
  endTime: string
  type: string
}): Promise<Session[]> {
  const sessions = Array.from({ length: params.count }, (_, i) => ({
    patient_id: params.patientId,
    therapist_id: params.therapistId,
    service_id: params.serviceId,
    package_id: params.packageId,
    date: params.baseDate, // Aquí podrías calcular fechas semanales
    start_time: params.startTime,
    end_time: params.endTime,
    type: params.type,
    status: 'Pendiente',
    notes: `Sesión ${i + 1} de ${params.count} del paquete`,
    fee: 0,
  }))

  const { data, error } = await supabase
    .from('sessions')
    .insert(sessions)
    .select('*, services!left(*)')

  if (error) throw error
  return (data as SessionRow[]).map(rowToSession)
}

export async function getSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, services!left(*)')
    .order('date', { ascending: false })

  if (error) throw error
  return (data as SessionRow[]).map(rowToSession)
}

export async function createSession(session: Omit<Session, 'id'>): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionToRow(session))
    .select('*, services!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function updateSession(id: string, session: Partial<Session>): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update(sessionToRow(session))
    .eq('id', id)
    .select('*, services!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', id)
    .select('*, services!left(*)')
    .single()

  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw error
}