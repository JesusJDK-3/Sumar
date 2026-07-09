import { useState } from "react"
import { useAuth } from "../lib/auth/AuthContext"

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
    <div className="flex items-center justify-center h-screen bg-[#F2F4F8]">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E2E7EF] p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-[#2B3A5C] mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Sumar
        </h1>
        <p className="text-xs text-[#6B7A94] mb-6">Centro de Atención Familiar</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14] transition-colors disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </form>
    </div>
  )
}