import jsPDF from "jspdf"
import type { ClinicalRecord, Patient, Therapist } from "../../types"

const BRAND_ORANGE = "#E8481E"
const BRAND_NAVY = "#2B3A5C"
const TEXT_GRAY = "#6B7A94"

// Convierte la URL del logo (importada por Vite) a un data URL en base64,
// que es lo que jsPDF necesita para poder incrustar la imagen.
async function loadImageAsDataURL(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const SECTIONS: { key: keyof ClinicalRecord; title: string }[] = [
  { key: "objectives", title: "OBJETIVOS" },
  { key: "observations", title: "OBSERVACIONES" },
  { key: "diagnosis", title: "DIAGNÓSTICO" },
  { key: "treatment", title: "TRATAMIENTO" },
  { key: "nextSteps", title: "PRÓXIMOS PASOS" },
]

export async function generateClinicalRecordPdf(
  record: ClinicalRecord,
  patient: Patient | undefined,
  therapist: Therapist | undefined,
  logoUrl: string
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 50
  let y = 55

  // --- Encabezado ---
  try {
    const logoDataUrl = await loadImageAsDataURL(logoUrl)
    doc.addImage(logoDataUrl, "PNG", marginX, y - 22, 30, 30)
  } catch {
    // Si el logo no carga, seguimos sin él para no romper la generación del PDF
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.setTextColor(BRAND_NAVY)
  doc.text("SUMAR", marginX + 38, y - 8)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(TEXT_GRAY)
  doc.text("CENTRO FAMILIAR", marginX + 38, y + 4)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(BRAND_NAVY)
  doc.text("HISTORIAL CLÍNICO", pageWidth - marginX, y - 8, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setTextColor(TEXT_GRAY)
  doc.text("REGISTRO DE SESIÓN", pageWidth - marginX, y + 4, { align: "right" })

  y += 24
  doc.setDrawColor(BRAND_NAVY)
  doc.setLineWidth(1)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 26

  // --- Datos del paciente y la sesión ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(BRAND_NAVY)
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "—"
  doc.text(patientName, marginX, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(TEXT_GRAY)
  const subtitle = [
    patient?.code,
    patient?.age ? `${patient.age} años` : null,
    therapist ? `Terapeuta: ${therapist.firstName} ${therapist.lastName}` : null,
  ].filter(Boolean).join(" · ")
  doc.text(subtitle, marginX, y + 13)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(BRAND_NAVY)
  doc.text(`Sesión: N.° ${record.sessionNumber}`, pageWidth - marginX, y, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setTextColor(TEXT_GRAY)
  doc.text(record.date, pageWidth - marginX, y + 13, { align: "right" })

  y += 34
  doc.setDrawColor("#E2E7EF")
  doc.setLineWidth(0.5)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 26

  const maxWidth = pageWidth - marginX * 2
  const pageHeight = doc.internal.pageSize.getHeight()

  for (const { key, title } of SECTIONS) {
    const content = (record[key] as string) || ""
    if (!content) continue

    if (y > pageHeight - 80) {
      doc.addPage()
      y = 55
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9.5)
    doc.setTextColor(BRAND_ORANGE)
    doc.text(title, marginX, y)
    y += 16

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor("#1A2332")
    const lines: string[] = doc.splitTextToSize(content, maxWidth)
    for (const line of lines) {
      if (y > pageHeight - 50) {
        doc.addPage()
        y = 55
      }
      doc.text(line, marginX, y)
      y += 14
    }
    y += 16
  }

  const fileNamePatient = patient
    ? `${patient.firstName}_${patient.lastName}`.replace(/\s+/g, "_")
    : "paciente"
  doc.save(`Historial_Clinico_${fileNamePatient}_Sesion_${record.sessionNumber}.pdf`)
}