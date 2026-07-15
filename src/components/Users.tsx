import { useState, useEffect } from "react"
import { Plus, X, Pencil } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../lib/auth/AuthContext"
import type { UserPermissions, UserRole } from "../lib/auth/AuthContext"

interface UserProfile {
  id: string
  fullName: string
  email: string
  role: UserRole
  permissions: UserPermissions
  createdAt: string
}

const ALL_PAGES: { key: keyof UserPermissions; label: string }[] = [
  { key: "dashboard", label: "Inicio" },
  { key: "patients", label: "Pacientes" },
  { key: "clinical", label: "Historia Clínica" },
  { key: "sessions", label: "Sesiones" },
  { key: "payments", label: "Pagos" },
  { key: "agenda", label: "Agenda" },
  { key: "attendance", label: "Asistencia" },
  { key: "reports", label: "Reportes" },
  { key: "users", label: "Usuarios" },
]

const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    dashboard: true, patients: true, clinical: true, sessions: true,
    payments: true, agenda: true, attendance: true, reports: true, users: true,
  },
  coordinacion: {
    dashboard: true, patients: true, clinical: true, sessions: true,
    payments: true, agenda: true, attendance: true, reports: true, users: false,
  },
  psicologia: {
    dashboard: false, patients: false, clinical: true, sessions: false,
    payments: false, agenda: false, attendance: false, reports: false, users: false,
  },
}

export default function UsersPage() {
  const { profile: currentUser } = useAuth()
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full text-[#6B7A94]">
        No tienes permiso para acceder a esta sección.
      </div>
    )
  }
  
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "psicologia" as UserRole,
  })
  const [editForm, setEditForm] = useState({
    id: "",
    email: "",
    password: "",
    fullName: "",
    role: "psicologia" as UserRole,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
    .from('profiles_with_email')
    .select('id, full_name, role, permissions, created_at, email')
    .order('created_at', { ascending: false })

      if (error) throw error

      setUsers((data || []).map(u => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email || "",
        role: u.role,
        permissions: u.permissions || DEFAULT_PERMISSIONS[u.role as UserRole],
        createdAt: u.created_at,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  async function createUser() {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          role: createForm.role,
          permissions: DEFAULT_PERMISSIONS[createForm.role],
        },
      })

      if (error || !data?.success) throw new Error(error?.message || 'Error al crear usuario')

      setShowCreate(false)
      setCreateForm({ email: "", password: "", fullName: "", role: "psicologia" })
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario")
    } finally {
      setLoading(false)
    }
  }

  async function updateUser() {
    try {
      setLoading(true)
      const updates: Record<string, unknown> = {
        full_name: editForm.fullName,
        role: editForm.role,
      }
      
      // Only update password if provided
      if (editForm.password) {
        const { error: pwdError } = await supabase.auth.admin.updateUserById(
          editForm.id,
          { password: editForm.password }
        )
        if (pwdError) throw pwdError
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editForm.id)

      if (error) throw error

      setShowEdit(false)
      setEditForm({ id: "", email: "", password: "", fullName: "", role: "psicologia" })
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario")
    } finally {
      setLoading(false)
    }
  }

  async function updateUserPermissions(userId: string, permissions: UserPermissions) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions })
        .eq('id', userId)

      if (error) throw error
      loadUsers()
      setSelectedUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar permisos")
    }
  }

  function openEdit(user: UserProfile) {
    setEditForm({
      id: user.id,
      email: user.email,
      password: "",
      fullName: user.fullName,
      role: user.role,
    })
    setShowEdit(true)
  }

  if (loading) return <div className="flex items-center justify-center h-full text-[#6B7A94]">Cargando...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B3A5C]">Gestión de Usuarios</h1>
          <p className="text-sm text-[#6B7A94]">Administrar accesos y permisos del sistema</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#E8481E] text-white text-sm font-semibold rounded-lg hover:bg-[#C93A14]"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E7EF] bg-[#F8F9FC]">
              <th className="text-left text-[#6B7A94] font-medium py-3 px-4">Nombre</th>
              <th className="text-left text-[#6B7A94] font-medium py-3 px-4">Rol</th>
              <th className="text-left text-[#6B7A94] font-medium py-3 px-4">Accesos</th>
              <th className="text-right text-[#6B7A94] font-medium py-3 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-[#F2F4F8] hover:bg-[#F8F9FC]">
                <td className="py-3 px-4">
                  <p className="font-semibold text-[#1A2332]">{user.fullName}</p>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'coordinacion' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {ALL_PAGES.filter(p => user.permissions[p.key]).map(p => (
                      <span key={p.key} className="text-[10px] bg-[#EEF1F8] text-[#2B3A5C] px-1.5 py-0.5 rounded">
                        {p.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-xs text-[#6B7A94] hover:text-[#2B3A5C] font-medium"
                      title="Editar usuario"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-xs text-[#E8481E] font-medium hover:underline"
                    >
                      Editar permisos
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#2B3A5C]">Crear nuevo usuario</h2>
              <button onClick={() => setShowCreate(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Nombre completo</label>
                <input
                  value={createForm.fullName}
                  onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Correo</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Contraseña</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Rol</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  <option value="coordinacion">Coordinación</option>
                  <option value="psicologia">Psicología</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg">Cancelar</button>
              <button onClick={createUser} disabled={loading} className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] disabled:opacity-50">Crear usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#2B3A5C]">Editar usuario</h2>
              <button onClick={() => setShowEdit(false)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Nombre completo</label>
                <input
                  value={editForm.fullName}
                  onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Correo (solo lectura)</label>
                <input
                  type="email"
                  value={editForm.email}
                  readOnly
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg bg-[#F2F4F8] text-[#6B7A94]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Nueva contraseña (dejar vacío para no cambiar)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7A94] mb-1">Rol</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 text-sm border border-[#E2E7EF] rounded-lg outline-none focus:border-[#E8481E] bg-white"
                >
                  <option value="coordinacion">Coordinación</option>
                  <option value="psicologia">Psicología</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg">Cancelar</button>
              <button onClick={updateUser} disabled={loading} className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14] disabled:opacity-50">Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit permissions modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#2B3A5C]">Permisos de {selectedUser.fullName}</h2>
              <button onClick={() => setSelectedUser(null)}><X size={18} className="text-[#6B7A94]" /></button>
            </div>
            <p className="text-xs text-[#6B7A94] mb-4">Marca las secciones a las que este usuario tendrá acceso:</p>
            <div className="space-y-2">
              {ALL_PAGES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8F9FC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUser.permissions[key]}
                    onChange={e => {
                      setSelectedUser(u => u ? {
                        ...u,
                        permissions: { ...u.permissions, [key]: e.target.checked }
                      } : null)
                    }}
                    className="w-4 h-4 rounded border-[#E2E7EF] text-[#E8481E] focus:ring-[#E8481E]"
                  />
                  <span className="text-sm text-[#1A2332]">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 text-sm font-semibold text-[#6B7A94] border border-[#E2E7EF] rounded-lg">Cancelar</button>
              <button
                onClick={() => updateUserPermissions(selectedUser.id, selectedUser.permissions)}
                className="px-5 py-2 text-sm font-semibold bg-[#E8481E] text-white rounded-lg hover:bg-[#C93A14]"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}