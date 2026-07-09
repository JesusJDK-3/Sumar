import { supabase } from '../supabaseClient'
import type { Therapist } from '../../types'

interface TherapistRow {
  id: string
  first_name: string
  last_name: string
  specialty: string
  phone: string
  email: string
  color: string
}

function rowToTherapist(row: TherapistRow): Therapist {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    specialty: row.specialty,
    phone: row.phone,
    email: row.email,
    color: row.color,
  }
}

export async function getTherapists(): Promise<Therapist[]> {
  const { data, error } = await supabase.from('therapists').select('*').order('first_name')
  if (error) throw error
  return (data as TherapistRow[]).map(rowToTherapist)
}