import { supabase } from '../supabaseClient'
import type { Patient, Gender, PatientStatus } from '../../types'

interface PatientRow {
  id: string
  code: string
  first_name: string
  last_name: string
  age: number
  gender: Gender
  dni: string | null
  phone: string | null
  email: string | null
  address: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  insurance: string | null
  therapist_id: string
  status: PatientStatus
  registered_at: string
  diagnosis: string | null
  notes: string | null
}

function rowToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    code: row.code,
    firstName: row.first_name,
    lastName: row.last_name,
    age: row.age,
    gender: row.gender,
    dni: row.dni || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    emergencyContact: row.emergency_contact || "",
    emergencyPhone: row.emergency_phone || "",
    insurance: row.insurance || "",
    therapistId: row.therapist_id,
    status: row.status,
    registeredAt: row.registered_at,
    diagnosis: row.diagnosis || "",
    notes: row.notes || "",
  }
}

function patientToRow(p: Partial<Patient>) {
  return {
    code: p.code,
    first_name: p.firstName,
    last_name: p.lastName,
    age: p.age,
    gender: p.gender,
    dni: p.dni || null,
    phone: p.phone || null,
    email: p.email || null,
    address: p.address || null,
    emergency_contact: p.emergencyContact || null,
    emergency_phone: p.emergencyPhone || null,
    insurance: p.insurance || null,
    therapist_id: p.therapistId,
    status: p.status,
    diagnosis: p.diagnosis || null,
    notes: p.notes || null,
  }
}

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('registered_at', { ascending: false })

  if (error) throw error
  return (data as PatientRow[]).map(rowToPatient)
}

export async function createPatient(patient: Omit<Patient, 'id' | 'registeredAt'>): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert(patientToRow(patient))
    .select()
    .single()

  if (error) throw error
  return rowToPatient(data as PatientRow)
}

export async function updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(patientToRow(patient))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToPatient(data as PatientRow)
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw error
}