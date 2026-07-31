import { supabase } from "../supabaseClient"
import type { Sede } from "../../types"

export async function getSedes(): Promise<Sede[]> {
  const { data, error } = await supabase
    .from("sedes")
    .select("*")
    .order("nombre", { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []).map(row => ({
    id: row.id,
    nombre: row.nombre,
  }))
}