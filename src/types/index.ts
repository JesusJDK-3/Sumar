export type Gender = "M" | "F" | "Otro"
export type PatientStatus = "Activo" | "Inactivo" | "Alta" | "En espera"
export type SessionStatus = "Realizada" | "Cancelada" | "Reprogramada" | "Pendiente"
export type PaymentMethod = "Efectivo" | "Transferencia" | "Tarjeta" | "Yape" | "Plin"
export type PaymentStatus = "Pagado" | "Parcial" | "Pendiente"
export type AppointmentStatus = "Confirmada" | "Cancelada" | "Reprogramada" | "Pendiente"
export type AttendanceStatus = "Presente" | "Ausente" | "Tardanza" | "Justificado"
export type UserRole = 'admin' | 'coordinacion' | 'psicologia'

export interface Patient {
  id: string
  code: string
  firstName: string
  lastName: string
  age: number
  gender: Gender
  dni: string
  phone: string
  email: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  insurance: string
  therapistId: string
  status: PatientStatus
  registeredAt: string
  diagnosis: string
  notes: string
}

export interface UserPermissions {
  dashboard: boolean
  patients: boolean
  clinical: boolean
  sessions: boolean
  payments: boolean
  agenda: boolean
  attendance: boolean
  reports: boolean
  users: boolean // solo admin
}

export interface Profile {
  id: string
  fullName: string
  role: UserRole
  therapistId: string | null
  permissions: UserPermissions
}

export interface Therapist {
  id: string
  firstName: string
  lastName: string
  specialty: string
  phone: string
  email: string
  color: string
}

export interface Service {
  id: string
  number: number
  name: string
  description?: string
  defaultFee: number
  createdAt: string
}

export interface ClinicalRecord {
  id: string
  patientId: string
  sessionId?: string  
  date: string
  sessionNumber: number
  therapistId: string
  objectives: string
  observations: string
  diagnosis: string
  treatment: string
  nextSteps: string
  mood: number
  progress: number
}

export interface Session {
  id: string
  patientId: string
  therapistId: string
  serviceId?: string
  date: string
  startTime: string
  endTime: string
  type: string
  status: SessionStatus
  notes: string
  fee: number
  service?: Service
}

export interface Payment {
  id: string
  patientId: string
  sessionId: string  
  date: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  notes: string
}

export interface Appointment {
  id: string
  patientId: string
  therapistId: string
  serviceId?: string
  date: string
  startTime: string
  endTime: string
  type: string
  status: AppointmentStatus
  notes: string
  service?: Service
}

export interface AttendanceRecord {
  id: string
  entityId: string
  entityType: "patient" | "therapist"
  date: string
  status: AttendanceStatus
  checkinTime?: string
  notes: string
}
