import { supabase } from '../supabaseClient'
import type { Patient, Session, Payment, PatientPackage } from '../../types'

export interface AdminPatientFullData {
  patient: Patient
  packages: (PatientPackage & {
    serviceName?: string
    serviceNumber?: number
    paymentAmount?: number
    paymentStatus?: string
    paymentMethod?: string
    paymentNotes?: string
  })[]
  sessions: (Session & {
    serviceName?: string
    therapistName?: string
    sedeNombre?: string
    packageName?: string
  })[]
  payments: (Payment & {
    serviceName?: string
    sessionDate?: string
  })[]
}

export interface CascadeUpdateResult {
  success: boolean
  packageUpdated: boolean
  sessionsUpdatedCount: number
  paymentsUpdatedCount: number
  serviceName: string
}

export interface InconsistencyIssue {
  id: string
  type: 'package_session_service' | 'package_payment_service' | 'used_sessions_mismatch' | 'orphan_session'
  severity: 'warning' | 'error' | 'info'
  title: string
  description: string
  affectedId: string
  packageId?: string
  suggestedFix: string
  fixData: Record<string, any>
}

// 1. Cargar toda la información 360 del paciente para el panel Admin
export async function getAdminPatientFullData(patientId: string): Promise<AdminPatientFullData> {
  const [
    patientRes,
    packagesRes,
    sessionsRes,
    paymentsRes,
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', patientId).single(),
    supabase.from('patient_packages').select('*, services(*)').eq('patient_id', patientId).order('created_at', { ascending: false }),
    supabase.from('sessions').select('*, services(*), sedes(*), therapists(*)').eq('patient_id', patientId).order('date', { ascending: false }),
    supabase.from('payments').select('*, services(*), sessions(*)').eq('patient_id', patientId).order('date', { ascending: false }),
  ])

  if (patientRes.error) throw patientRes.error
  if (packagesRes.error) throw packagesRes.error
  if (sessionsRes.error) throw sessionsRes.error
  if (paymentsRes.error) throw paymentsRes.error

  const patientRaw = patientRes.data
  const patient: Patient = {
    id: patientRaw.id,
    code: patientRaw.code,
    firstName: patientRaw.first_name,
    lastName: patientRaw.last_name,
    age: patientRaw.age,
    gender: patientRaw.gender,
    dni: patientRaw.dni || '',
    phone: patientRaw.phone || '',
    email: patientRaw.email || '',
    address: patientRaw.address || '',
    emergencyContact: patientRaw.emergency_contact || '',
    emergencyPhone: patientRaw.emergency_phone || '',
    insurance: patientRaw.insurance || '',
    therapistId: patientRaw.therapist_id,
    status: patientRaw.status,
    registeredAt: patientRaw.registered_at,
    diagnosis: patientRaw.diagnosis || '',
    notes: patientRaw.notes || '',
  }

  // Mapear paquetes
  const paymentsList = paymentsRes.data || []
  const packages = (packagesRes.data || []).map((pkg: any) => {
    const matchedPayment = paymentsList.find((p: any) => p.id === pkg.payment_id)
    return {
      id: pkg.id,
      patientId: pkg.patient_id,
      serviceId: pkg.service_id,
      totalSessions: pkg.total_sessions,
      usedSessions: pkg.used_sessions,
      amountPaid: pkg.amount_paid,
      totalAmount: pkg.total_amount,
      paymentId: pkg.payment_id,
      status: pkg.status,
      createdAt: pkg.created_at,
      serviceName: pkg.services?.name || 'Servicio desconocido',
      serviceNumber: pkg.services?.number,
      paymentAmount: matchedPayment?.amount,
      paymentStatus: matchedPayment?.status,
      paymentMethod: matchedPayment?.method,
      paymentNotes: matchedPayment?.notes,
    }
  })

  // Mapear sesiones
  const packagesList = packagesRes.data || []
  const sessions = (sessionsRes.data || []).map((sess: any) => {
    const parentPkg = packagesList.find((p: any) => p.id === sess.package_id)
    return {
      id: sess.id,
      patientId: sess.patient_id,
      therapistId: sess.therapist_id,
      serviceId: sess.service_id || undefined,
      packageId: sess.package_id || undefined,
      sedeId: sess.sede_id || undefined,
      date: sess.date,
      startTime: sess.start_time,
      endTime: sess.end_time,
      type: sess.type,
      status: sess.status,
      notes: sess.notes,
      fee: sess.fee,
      serviceName: sess.services?.name || 'Sin servicio',
      therapistName: sess.therapists ? `${sess.therapists.first_name} ${sess.therapists.last_name}` : 'Sin terapeuta',
      sedeNombre: sess.sedes?.nombre || 'Sin sede',
      packageName: parentPkg ? `${parentPkg.services?.name || 'Paquete'} (${parentPkg.used_sessions}/${parentPkg.total_sessions})` : undefined,
    }
  })

  // Mapear pagos
  const payments = paymentsList.map((p: any) => ({
    id: p.id,
    patientId: p.patient_id,
    sessionId: p.session_id || undefined,
    serviceId: p.service_id || undefined,
    sessionCount: p.session_count || undefined,
    date: p.date,
    amount: p.amount,
    method: p.method,
    status: p.status,
    notes: p.notes,
    serviceName: p.services?.name || 'Sin servicio específico',
    sessionDate: p.sessions?.date,
  }))

  return {
    patient,
    packages,
    sessions,
    payments,
  }
}

// 2. REASIGNACIÓN EN CASCADA: Actualizar Paquete + Sesiones + Pagos en una sola acción
export async function cascadeUpdatePackageService(params: {
  packageId: string
  newServiceId: string
  updateSessions?: boolean
  updatePayments?: boolean
  updateNotes?: boolean
  customNote?: string
}): Promise<CascadeUpdateResult> {
  const {
    packageId,
    newServiceId,
    updateSessions = true,
    updatePayments = true,
    updateNotes = true,
    customNote,
  } = params

  // 1. Obtener información del nuevo servicio
  const { data: serviceData, error: svcError } = await supabase
    .from('services')
    .select('id, name')
    .eq('id', newServiceId)
    .single()

  if (svcError) throw new Error('Servicio no encontrado: ' + svcError.message)
  const serviceName = serviceData.name

  // 2. Obtener el paquete actual
  const { data: pkgData, error: pkgFetchError } = await supabase
    .from('patient_packages')
    .select('id, payment_id')
    .eq('id', packageId)
    .single()

  if (pkgFetchError) throw new Error('Paquete no encontrado: ' + pkgFetchError.message)

  // 3. Actualizar el paquete
  const { error: pkgUpdateError } = await supabase
    .from('patient_packages')
    .update({ service_id: newServiceId })
    .eq('id', packageId)

  if (pkgUpdateError) throw new Error('Error al actualizar paquete: ' + pkgUpdateError.message)

  // 4. Actualizar sesiones vinculadas al paquete
  let sessionsUpdatedCount = 0
  if (updateSessions) {
    const { data: updatedSessions, error: sessUpdateError } = await supabase
      .from('sessions')
      .update({ service_id: newServiceId })
      .eq('package_id', packageId)
      .select('id')

    if (sessUpdateError) throw new Error('Error al actualizar sesiones: ' + sessUpdateError.message)
    sessionsUpdatedCount = updatedSessions?.length || 0
  }

  // 5. Actualizar pago(s) asociado(s)
  let paymentsUpdatedCount = 0
  if (updatePayments) {
    const paymentIdsToUpdate = new Set<string>()

    // Si el paquete tiene payment_id explícito
    if (pkgData.payment_id) {
      paymentIdsToUpdate.add(pkgData.payment_id)
    }

    // Buscar también pagos que estén asociados a las sesiones de este paquete
    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('id')
      .eq('package_id', packageId)

    if (sessionRows && sessionRows.length > 0) {
      const sessionIds = sessionRows.map(s => s.id)
      const { data: sessionPayments } = await supabase
        .from('payments')
        .select('id')
        .in('session_id', sessionIds)

      sessionPayments?.forEach(p => paymentIdsToUpdate.add(p.id))
    }

    // Ejecutar actualización para cada pago identificado
    const targetPaymentIds = Array.from(paymentIdsToUpdate)
    if (targetPaymentIds.length > 0) {
      const updatePayload: Record<string, any> = {
        service_id: newServiceId,
      }
      if (updateNotes) {
        updatePayload.notes = customNote || `Pago de paquete ${serviceName}`
      }

      const { data: updatedPayments, error: payUpdateError } = await supabase
        .from('payments')
        .update(updatePayload)
        .in('id', targetPaymentIds)
        .select('id')

      if (payUpdateError) throw new Error('Error al actualizar pagos: ' + payUpdateError.message)
      paymentsUpdatedCount = updatedPayments?.length || 0
    }
  }

  return {
    success: true,
    packageUpdated: true,
    sessionsUpdatedCount,
    paymentsUpdatedCount,
    serviceName,
  }
}

// 3. Edición directa de paquete
export async function updateAdminPackage(
  packageId: string,
  fields: {
    serviceId?: string
    totalSessions?: number
    usedSessions?: number
    amountPaid?: number
    totalAmount?: number
    status?: 'activo' | 'completado' | 'cancelado'
    paymentId?: string | null
  }
) {
  const payload: Record<string, any> = {}
  if (fields.serviceId !== undefined) payload.service_id = fields.serviceId
  if (fields.totalSessions !== undefined) payload.total_sessions = fields.totalSessions
  if (fields.usedSessions !== undefined) payload.used_sessions = fields.usedSessions
  if (fields.amountPaid !== undefined) payload.amount_paid = fields.amountPaid
  if (fields.totalAmount !== undefined) payload.total_amount = fields.totalAmount
  if (fields.status !== undefined) payload.status = fields.status
  if (fields.paymentId !== undefined) payload.payment_id = fields.paymentId

  const { data, error } = await supabase
    .from('patient_packages')
    .update(payload)
    .eq('id', packageId)
    .select('*, services(*)')
    .single()

  if (error) throw error
  return data
}

// 4. Crear paquete manualmente como admin
export async function createAdminPackage(fields: {
  patientId: string
  serviceId: string
  totalSessions: number
  usedSessions?: number
  amountPaid: number
  totalAmount?: number
  status?: 'activo' | 'completado' | 'cancelado'
  paymentId?: string | null
}) {
  const { data, error } = await supabase
    .from('patient_packages')
    .insert({
      patient_id: fields.patientId,
      service_id: fields.serviceId,
      total_sessions: fields.totalSessions,
      used_sessions: fields.usedSessions || 0,
      amount_paid: fields.amountPaid,
      total_amount: fields.totalAmount || fields.amountPaid,
      status: fields.status || 'activo',
      payment_id: fields.paymentId || null,
    })
    .select('*, services(*)')
    .single()

  if (error) throw error
  return data
}

// 5. Eliminar paquete
export async function deleteAdminPackage(packageId: string, deleteSessions: boolean = false) {
  if (deleteSessions) {
    await supabase.from('sessions').delete().eq('package_id', packageId)
  } else {
    // Desvincular las sesiones para que no queden bloqueadas
    await supabase.from('sessions').update({ package_id: null }).eq('package_id', packageId)
  }

  const { error } = await supabase
    .from('patient_packages')
    .delete()
    .eq('id', packageId)

  if (error) throw error
}

// 6. Edición directa de sesión
export async function updateAdminSession(
  sessionId: string,
  fields: {
    serviceId?: string | null
    packageId?: string | null
    therapistId?: string
    sedeId?: string | null
    date?: string
    startTime?: string
    endTime?: string
    type?: string
    status?: Session['status']
    fee?: number
    notes?: string
  }
) {
  const payload: Record<string, any> = {}
  if (fields.serviceId !== undefined) payload.service_id = fields.serviceId
  if (fields.packageId !== undefined) payload.package_id = fields.packageId
  if (fields.therapistId !== undefined) payload.therapist_id = fields.therapistId
  if (fields.sedeId !== undefined) payload.sede_id = fields.sedeId
  if (fields.date !== undefined) payload.date = fields.date
  if (fields.startTime !== undefined) payload.start_time = fields.startTime
  if (fields.endTime !== undefined) payload.end_time = fields.endTime
  if (fields.type !== undefined) payload.type = fields.type
  if (fields.status !== undefined) payload.status = fields.status
  if (fields.fee !== undefined) payload.fee = fields.fee
  if (fields.notes !== undefined) payload.notes = fields.notes

  const { data, error } = await supabase
    .from('sessions')
    .update(payload)
    .eq('id', sessionId)
    .select('*, services(*), sedes(*), therapists(*)')
    .single()

  if (error) throw error
  return data
}

// 7. Eliminar sesión
export async function deleteAdminSession(sessionId: string) {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) throw error
}

// 8. Edición directa de pago
export async function updateAdminPayment(
  paymentId: string,
  fields: {
    serviceId?: string | null
    sessionId?: string | null
    sessionCount?: number | null
    amount?: number
    method?: Payment['method']
    status?: Payment['status']
    date?: string
    notes?: string
  }
) {
  const payload: Record<string, any> = {}
  if (fields.serviceId !== undefined) payload.service_id = fields.serviceId
  if (fields.sessionId !== undefined) payload.session_id = fields.sessionId
  if (fields.sessionCount !== undefined) payload.session_count = fields.sessionCount
  if (fields.amount !== undefined) payload.amount = fields.amount
  if (fields.method !== undefined) payload.method = fields.method
  if (fields.status !== undefined) payload.status = fields.status
  if (fields.date !== undefined) payload.date = fields.date
  if (fields.notes !== undefined) payload.notes = fields.notes

  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', paymentId)
    .select('*, services(*)')
    .single()

  if (error) throw error
  return data
}

// 9. Eliminar pago
export async function deleteAdminPayment(paymentId: string) {
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) throw error
}

// 10. DIAGNÓSTICO: Analizar inconsistencias en los datos del paciente
export function diagnosePatientInconsistencies(data: AdminPatientFullData): InconsistencyIssue[] {
  const issues: InconsistencyIssue[] = []

  // A. Inconsistencias Paquete vs Sesiones
  data.packages.forEach(pkg => {
    const linkedSessions = data.sessions.filter(s => s.packageId === pkg.id)
    
    // Contar sesiones con servicio diferente al del paquete
    const mismatchedSessions = linkedSessions.filter(s => s.serviceId && s.serviceId !== pkg.serviceId)
    if (mismatchedSessions.length > 0) {
      issues.push({
        id: `mismatch-sess-${pkg.id}`,
        type: 'package_session_service',
        severity: 'error',
        title: `Servicio discordante en ${mismatchedSessions.length} sesión(es)`,
        description: `El paquete "${pkg.serviceName}" tiene ${mismatchedSessions.length} sesión(es) registradas con un servicio diferente.`,
        affectedId: pkg.id,
        packageId: pkg.id,
        suggestedFix: `Sincronizar el servicio de las ${mismatchedSessions.length} sesiones con el servicio del paquete (${pkg.serviceName}).`,
        fixData: {
          packageId: pkg.id,
          targetServiceId: pkg.serviceId,
          sessionIds: mismatchedSessions.map(s => s.id),
        },
      })
    }

    // Contar sesiones con estado 'Realizada' vs used_sessions
    const realCompletedCount = linkedSessions.filter(s => s.status === 'Realizada').length
    if (realCompletedCount !== pkg.usedSessions) {
      issues.push({
        id: `count-mismatch-${pkg.id}`,
        type: 'used_sessions_mismatch',
        severity: 'warning',
        title: `Descuadre en contador de sesiones usadas`,
        description: `El paquete registra ${pkg.usedSessions} sesiones usadas, pero en la base de datos hay ${realCompletedCount} sesión(es) con estado 'Realizada'.`,
        affectedId: pkg.id,
        packageId: pkg.id,
        suggestedFix: `Actualizar el contador del paquete a ${realCompletedCount} sesiones usadas.`,
        fixData: {
          packageId: pkg.id,
          correctUsedCount: realCompletedCount,
        },
      })
    }

    // B. Inconsistencias Paquete vs Pago
    if (pkg.paymentId) {
      const linkedPayment = data.payments.find(p => p.id === pkg.paymentId)
      if (linkedPayment && linkedPayment.serviceId && linkedPayment.serviceId !== pkg.serviceId) {
        issues.push({
          id: `mismatch-pay-${pkg.id}`,
          type: 'package_payment_service',
          severity: 'error',
          title: `Servicio discordante en el Pago asociado`,
          description: `El pago por S/ ${linkedPayment.amount} asignado al paquete "${pkg.serviceName}" tiene asignado "${linkedPayment.serviceName}".`,
          affectedId: linkedPayment.id,
          packageId: pkg.id,
          suggestedFix: `Reasignar el pago al servicio correcto (${pkg.serviceName}) y actualizar su nota descriptiva.`,
          fixData: {
            paymentId: linkedPayment.id,
            targetServiceId: pkg.serviceId,
            serviceName: pkg.serviceName,
          },
        })
      }
    }
  })

  // C. Sesiones con package_id huérfano
  const existingPackageIds = new Set(data.packages.map(p => p.id))
  const orphanSessions = data.sessions.filter(s => s.packageId && !existingPackageIds.has(s.packageId))
  if (orphanSessions.length > 0) {
    issues.push({
      id: `orphan-sessions-${data.patient.id}`,
      type: 'orphan_session',
      severity: 'warning',
      title: `${orphanSessions.length} sesión(es) con paquete no existente`,
      description: `Hay sesiones vinculadas a un ID de paquete que ya no existe en la base de datos.`,
      affectedId: data.patient.id,
      suggestedFix: `Desvincular las sesiones huérfanas dejándolas como sesiones individuales.`,
      fixData: {
        sessionIds: orphanSessions.map(s => s.id),
      },
    })
  }

  return issues
}

// 11. Reparar inconsistencia individual
export async function fixSingleInconsistency(issue: InconsistencyIssue): Promise<void> {
  if (issue.type === 'package_session_service') {
    const { sessionIds, targetServiceId } = issue.fixData
    if (sessionIds?.length && targetServiceId) {
      const { error } = await supabase
        .from('sessions')
        .update({ service_id: targetServiceId })
        .in('id', sessionIds)
      if (error) throw error
    }
  } else if (issue.type === 'package_payment_service') {
    const { paymentId, targetServiceId, serviceName } = issue.fixData
    if (paymentId && targetServiceId) {
      const { error } = await supabase
        .from('payments')
        .update({
          service_id: targetServiceId,
          notes: `Pago de paquete ${serviceName || ''}`.trim(),
        })
        .eq('id', paymentId)
      if (error) throw error
    }
  } else if (issue.type === 'used_sessions_mismatch') {
    const { packageId, correctUsedCount } = issue.fixData
    if (packageId !== undefined && correctUsedCount !== undefined) {
      const { data: pkg } = await supabase
        .from('patient_packages')
        .select('total_sessions')
        .eq('id', packageId)
        .single()

      const newStatus = pkg && correctUsedCount >= pkg.total_sessions ? 'completado' : 'activo'

      const { error } = await supabase
        .from('patient_packages')
        .update({
          used_sessions: correctUsedCount,
          status: newStatus,
        })
        .eq('id', packageId)
      if (error) throw error
    }
  } else if (issue.type === 'orphan_session') {
    const { sessionIds } = issue.fixData
    if (sessionIds?.length) {
      const { error } = await supabase
        .from('sessions')
        .update({ package_id: null })
        .in('id', sessionIds)
      if (error) throw error
    }
  }
}
