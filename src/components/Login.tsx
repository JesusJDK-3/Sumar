import { useState } from "react"
import { useAuth } from "../lib/auth/AuthContext"
import { Heart, Shield, Users } from "lucide-react"
import sumarfondo from "../imports/sumar_fondo.jpg"; // ajusta la ruta

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error)
    setLoading(false)
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left side - Image & branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-10 overflow-hidden">
        {/* Background image - REPLACE THIS URL with your own */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${sumarfondo})`,
          }}
        />
        {/* Warm overlay */}
        <div className="absolute inset-0 bg-[#2B3A5C]/75" />

        {/* Top content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#E8481E] rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-white" fill="white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Sumar
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Cuidamos el bienestar<br />de tu familia
          </h2>
          <p className="text-white/70 text-sm leading-relaxed mb-8">
            Centro de Atención Familiar especializado en psicología, terapia de lenguaje,
            orientación vocacional y modificación conductual para niños, adolescentes y adultos.
          </p>

          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-white/80">
              <Users size={16} />
              <span className="text-xs font-medium">Atención familiar</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Shield size={16} />
              <span className="text-xs font-medium">Espacio seguro</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Heart size={16} />
              <span className="text-xs font-medium">Cuidado integral</span>
            </div>
          </div>
        </div>

        {/* Bottom content */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs">
            © 2026 Sumar Centro de Atención Familiar. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-[#F8F9FC] p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-[#E8481E] rounded-lg flex items-center justify-center">
              <Heart size={18} className="text-white" fill="white" />
            </div>
            <span className="text-[#2B3A5C] font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Sumar
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E7EF] p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-[#2B3A5C] mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Bienvenido de vuelta
              </h1>
              <p className="text-xs text-[#6B7A94]">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@sumar.pe"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7EF] rounded-xl outline-none focus:border-[#E8481E] focus:ring-2 focus:ring-[#E8481E]/10 transition-all bg-[#F8F9FC]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7EF] rounded-xl outline-none focus:border-[#E8481E] focus:ring-2 focus:ring-[#E8481E]/10 transition-all bg-[#F8F9FC]/50"
                />
              </div>

              <div className="flex items-center justify-between">
                
                
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#E8481E] text-white text-sm font-semibold rounded-xl hover:bg-[#C93A14] transition-colors disabled:opacity-60 shadow-sm shadow-[#E8481E]/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  "Ingresar al sistema"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#F2F4F8] text-center">
              <p className="text-[11px] text-[#9AA5BE]">
                Sistema interno de{" "}
                <span className="font-semibold text-[#6B7A94]">Sumar Centro de Atención Familiar</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}