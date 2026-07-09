import { supabase } from '../supabaseClient'
import type { AttendanceRecord, AttendanceStatus } from '../../types'

interface AttendanceRow {
  id: string
  entity_id: string
  entity_type: 'patient' | 'therapist'
  date: string
  status: AttendanceStatus
  checkin_time: string | null
  notes: string
}

function rowToRecord(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    date: row.date,
    status: row.status,
    checkinTime: row.checkin_time || undefined,
    notes: row.notes,
  }
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase.from('attendance').select('*')
  if (error) throw error
  return (data as AttendanceRow[]).map(rowToRecord)
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date)

  if (error) throw error
  return (data as AttendanceRow[]).map(rowToRecord)
}

// Si ya existe un registro para esa entidad+fecha, lo actualiza; si no, lo crea.
export async function markAttendance(
  entityId: string,
  entityType: 'patient' | 'therapist',
  date: string,
  status: AttendanceStatus,
  checkinTime?: string
): Promise<AttendanceRecord> {
  const { data: existing, error: findError } = await supabase
    .from('attendance')
    .select('id')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .eq('date', date)
    .maybeSingle()

  if (findError) throw findError

  if (existing) {
    const { data, error } = await supabase
      .from('attendance')
      .update({ status, checkin_time: checkinTime || null })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return rowToRecord(data as AttendanceRow)
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      entity_id: entityId,
      entity_type: entityType,
      date,
      status,
      checkin_time: checkinTime || null,
      notes: '',
    })
    .select()
    .single()
  if (error) throw error
  return rowToRecord(data as AttendanceRow)
}