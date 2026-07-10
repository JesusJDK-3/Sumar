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
    patients?: { id: string; first_name: string; last_name: string }
  }

  return ((sessionsData || []) as RawSession[]).filter(s => !recordedSessionIds.has(s.id)) as unknown as Session[]
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