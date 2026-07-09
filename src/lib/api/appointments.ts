import { supabase } from '../supabaseClient'
import type { Appointment, AppointmentStatus } from '../../types'

interface AppointmentRow {
  id: string
  patient_id: string
  therapist_id: string
  date: string
  start_time: string
  end_time: string
  type: string
  status: AppointmentStatus
  notes: string
}

function rowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    therapistId: row.therapist_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    type: row.type,
    status: row.status,
    notes: row.notes,
  }
}

function appointmentToRow(a: Partial<Appointment>) {
  return {
    patient_id: a.patientId,
    therapist_id: a.therapistId,
    date: a.date,
    start_time: a.startTime,
    end_time: a.endTime,
    type: a.type,
    status: a.status,
    notes: a.notes,
  }
}

export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })

  if (error) throw error
  return (data as AppointmentRow[]).map(rowToAppointment)
}

// La BD ya tiene un constraint unique(therapist_id, date, start_time) que
// previene conflictos a nivel de base de datos. Aquí devolvemos un mensaje
// claro si Postgres rechaza por esa razón (código 23505 = unique_violation).
export async function createAppointment(appt: Omit<Appointment, 'id'>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentToRow(appt))
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Conflicto de horario: el terapeuta ya tiene una cita en esa fecha y hora.')
    }
    throw error
  }
  return rowToAppointment(data as AppointmentRow)
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToAppointment(data as AppointmentRow)
}