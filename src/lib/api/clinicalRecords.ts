import { supabase } from '../supabaseClient'
import type { ClinicalRecord } from '../../types'

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

function recordToRow(r: Partial<ClinicalRecord> & { sessionId?: string }) {
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

export async function createClinicalRecord(record: Omit<ClinicalRecord, 'id'>): Promise<ClinicalRecord> {
  const { data, error } = await supabase
    .from('clinical_records')
    .insert(recordToRow(record))
    .select()
    .single()

  if (error) throw error
  return rowToRecord(data as ClinicalRecordRow)
}