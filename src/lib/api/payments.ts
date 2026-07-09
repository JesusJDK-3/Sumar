import { supabase } from '../supabaseClient'
import type { Payment, PaymentMethod, PaymentStatus } from '../../types'

interface PaymentRow {
  id: string
  patient_id: string
  session_id: string | null
  date: string
  amount: number
  type: Payment['type']
  method: PaymentMethod
  status: PaymentStatus
  period: string | null
  notes: string
  receipt_number: string
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    patientId: row.patient_id,
    sessionId: row.session_id || undefined,
    date: row.date,
    amount: row.amount,
    type: row.type,
    method: row.method,
    status: row.status,
    period: row.period || undefined,
    notes: row.notes,
    receiptNumber: row.receipt_number,
  }
}

function paymentToRow(p: Partial<Payment>) {
  return {
    patient_id: p.patientId,
    session_id: p.sessionId ?? null,
    date: p.date,
    amount: p.amount,
    type: p.type,
    method: p.method,
    status: p.status,
    period: p.period || null,
    notes: p.notes,
    receipt_number: p.receiptNumber,
  }
}

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return (data as PaymentRow[]).map(rowToPayment)
}

export async function createPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentToRow(payment))
    .select()
    .single()

  if (error) throw error
  return rowToPayment(data as PaymentRow)
}