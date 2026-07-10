import { supabase } from '../supabaseClient'
import type { ClinicalRecord, Session } from '../../types'

interface ClinicalRecordRow {
  id: string
  patient_id: string
  session_id: string | null
  therapist_id: string
  date: string
  session_number: number
  objectives: string
  observations: string
  diagnosis: string
  treatment: string
  next_steps: string
  mood: number
  progress: number
}

function rowToRecord(row: ClinicalRecordRow): ClinicalRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    sessionId: row.session_id ?? undefined,
    therapistId: row.therapist_id,
    date: row.date,
    sessionNumber: row.session_number,
    objectives: row.objectives,
    observations: row.observations,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    nextSteps: row.next_steps,
    mood: row.mood,
    progress: row.progress,
  }
}

function recordToRow(r: Partial<ClinicalRecord>) {
  return {
    patient_id: r.patientId,
    session_id: r.sessionId ?? null,
    therapist_id: r.therapistId,
    date: r.date,
    session_number: r.sessionNumber,
    objectives: r.objectives,
    observations: r.observations,
    diagnosis: r.diagnosis,
    treatment: r.treatment,
    next_steps: r.nextSteps,
    mood: r.mood,
    progress: r.progress,
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

// NUEVO: Trae sesiones de un paciente que NO tienen registro clínico
export async function getSessionsWithoutRecord(patientId: string): Promise<Session[]> {
  // Primero traemos todos los registros clínicos del paciente
  const { data: recordsData, error: recordsError } = await supabase
    .from('clinical_records')
    .select('session_id')
    .eq('patient_id', patientId)
    .not('session_id', 'is', null)

  if (recordsError) throw recordsError

  const recordedSessionIds = new Set((recordsData || []).map(r => r.session_id))

  // Traemos todas las sesiones del paciente
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, patients(*)')
    .eq('patient_id', patientId)
    .eq('status', 'Realizada')
    .order('date', { ascending: false })

  if (sessionsError) throw sessionsError

  // Filtramos las que ya tienen registro clínico
  return (sessionsData || []).filter((s: Record<string, unknown>) => !recordedSessionIds.has(s.id))
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