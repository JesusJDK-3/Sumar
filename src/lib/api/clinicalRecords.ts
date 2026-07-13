import { supabase } from '../supabaseClient'
import type { ClinicalRecord, Session } from '../../types'

interface ClinicalRecordRow {
  id: string
  patient_id: string
  session_id: string | null
  therapist_id: string
  date: string
  session_number: number | null
  objectives: string | null
  observations: string | null
  diagnosis: string | null
  treatment: string | null
  next_steps: string | null
  mood: number | null
  progress: number | null
}

function rowToRecord(row: ClinicalRecordRow): ClinicalRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    sessionId: row.session_id ?? undefined,
    therapistId: row.therapist_id,
    date: row.date,
    sessionNumber: row.session_number ?? 0,
    objectives: row.objectives ?? "",
    observations: row.observations ?? "",
    diagnosis: row.diagnosis ?? "",
    treatment: row.treatment ?? "",
    nextSteps: row.next_steps ?? "",
    mood: row.mood ?? 3,
    progress: row.progress ?? 50,
  }
}

function recordToRow(r: Partial<ClinicalRecord>) {
  return {
    patient_id: r.patientId,
    session_id: r.sessionId ?? null,
    therapist_id: r.therapistId,
    date: r.date,
    session_number: r.sessionNumber ?? null,
    objectives: r.objectives || null,
    observations: r.observations || null,
    diagnosis: r.diagnosis || null,
    treatment: r.treatment || null,
    next_steps: r.nextSteps || null,
    mood: r.mood ?? null,
    progress: r.progress ?? null,
  }
}

export async function getClinicalRecords(): Promise<ClinicalRecord[]> {
  const { data, error } = await supabase
    .from('clinical_records')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return (data as ClinicalRecordRow[]).map(rowToRecord)
}

export async function getSessionsWithoutRecord(patientId: string): Promise<Session[]> {
  const { data: recordsData, error: recordsError } = await supabase
    .from('clinical_records')
    .select('session_id')
    .eq('patient_id', patientId)
    .not('session_id', 'is', null)

  if (recordsError) throw recordsError

  const recordedSessionIds = new Set((recordsData || []).map(r => r.session_id))

  const { data: sessionsData, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, patients(*)')
    .eq('patient_id', patientId)
    .eq('status', 'Realizada')
    .order('date', { ascending: false })

  if (sessionsError) throw sessionsError

  // Mapear snake_case a camelCase como hace sessions.ts
  return (sessionsData || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    patientId: s.patient_id as string,
    therapistId: s.therapist_id as string,
    serviceId: (s.service_id as string | null) ?? undefined,
    date: s.date as string,
    startTime: s.start_time as string,
    endTime: s.end_time as string,
    type: s.type as string,
    status: s.status as Session['status'],
    notes: s.notes as string,
    fee: s.fee as number,
    createdAt: s.created_at as string,
  })).filter(s => !recordedSessionIds.has(s.id))
}

export async function createClinicalRecord(record: Omit<ClinicalRecord, 'id'>): Promise<ClinicalRecord> {
  const { data, error } = await supabase
    .from('clinical_records')
    .insert(recordToRow(record))
    .select()
    .single()

  if (error) throw error
  return rowToRecord(data as ClinicalRecordRow)
}