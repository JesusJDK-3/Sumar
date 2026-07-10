import { supabase } from '../supabaseClient'
import type { Appointment, AppointmentStatus, Service } from '../../types'
interface AppointmentRow {
  id: string
  patient_id: string
  therapist_id: string
  service_id: string | null
  date: string
  start_time: string
  end_time: string
  type: string
  status: AppointmentStatus
  notes: string
  services?: ServiceRow
}

interface ServiceRow {
  id: string
  number: number
  name: string
  description: string | null
  default_fee: number
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    description: row.description || undefined,
    defaultFee: row.default_fee,
    createdAt: '',
  }
}

function rowToAppointment(row: AppointmentRow): Appointment {
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
    service: row.services ? rowToService(row.services) : undefined,
  }
}

function appointmentToRow(a: Partial<Appointment>) {
  return {
    patient_id: a.patientId,
    therapist_id: a.therapistId,
    service_id: a.serviceId ?? null,
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
    .select('*, services!left(*)')
    .order('date', { ascending: true })

  if (error) throw error
  return (data as AppointmentRow[]).map(rowToAppointment)
}

export async function createAppointment(appt: Omit<Appointment, 'id'>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentToRow(appt))
    .select('*, services!left(*)')
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
    .select('*, services!left(*)')
    .single()

  if (error) throw error
  return rowToAppointment(data as AppointmentRow)
}