import React from "react"
import { createPortal } from "react-dom"
import {
  ShieldCheck,
  X,
  Code2,
  Stethoscope,
  Database,
  Calendar,
  ExternalLink,
} from "lucide-react"

interface LegalTermsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LegalTermsModal({ isOpen, onClose }: LegalTermsModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Ventana flotante en pantalla completa */}
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] transition-all animate-in zoom-in-95 duration-150 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de la ventana */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E8481E] flex items-center justify-center border border-orange-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2B3A5C] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Acerca del Sistema y Términos
              </h2>
              <p className="text-[11px] text-[#6B7A94]">Información legal y alcance operativo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido scrolleable limpio */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          {/* Card 1: Autoría */}
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#2B3A5C] font-bold text-xs">
              <Code2 size={15} className="text-[#E8481E]" />
              <span>Desarrollo y Autoría</span>
            </div>
            <p className="text-slate-600">
              Sistema desarrollado de forma independiente por <strong className="text-slate-800 font-semibold">Luciani Jiménez (JDKdev)</strong>.
            </p>
            <p className="text-[11px] text-slate-500">
              Todos los derechos de arquitectura, código fuente y autoría intelectual corresponden al desarrollador, otorgándose licencia de uso operativo para el Centro de Atención Familiar SUMAR.
            </p>
            <div className="pt-1">
              <a
                href="https://wa.me/51955768525"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#E8481E] hover:underline text-[11px]"
              >
                Contacto JDKdev <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Card 2: Alcance / Qué es y qué no es */}
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#2B3A5C] font-bold text-xs">
              <Stethoscope size={15} className="text-[#E8481E]" />
              <span>Finalidad y Alcance del Software</span>
            </div>
            <p className="text-slate-600">
              Esta plataforma es una <strong className="text-slate-800">herramienta de gestión administrativa</strong> para el agendamiento de citas, control de asistencia, seguimiento financiero y registro de actividades operativas.
            </p>
            <div className="p-2.5 bg-amber-50/80 border border-amber-200/50 rounded-lg text-amber-900 text-[11px] leading-normal">
              <strong>Aviso Clínico:</strong> El sistema <strong>no reemplaza el juicio clínico</strong>, diagnóstico, evaluación ni prescripción de los profesionales o especialistas de salud tratantes.
            </div>
          </div>

          {/* Card 3: Tratamiento y Consentimiento de Datos */}
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#2B3A5C] font-bold text-xs">
              <Database size={15} className="text-[#E8481E]" />
              <span>Responsabilidad de Datos y Privacidad</span>
            </div>
            <p className="text-slate-600">
              La clínica / centro de atención es la única responsable del tratamiento, custodia y confidencialidad de los datos de sus pacientes y apoderados, debiendo contar en todo momento con el debido consentimiento informado de cada paciente.
            </p>
          </div>
        </div>

        {/* Footer flotante */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Calendar size={13} />
            <span>Versión 1.0 · Septiembre 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2B3A5C] hover:bg-[#1E2942] text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
