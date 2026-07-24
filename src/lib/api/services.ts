import { supabase } from "../supabaseClient"
import type { Service } from "../../types"

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("number", { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []).map(row => ({
    id: row.id,
    number: row.number,
    name: row.name,
    description: row.description,
    defaultFee: row.default_fee,
    sessionCount: row.session_count ?? 1,
    createdAt: row.created_at,
  }))
}

export async function getServiceById(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return null
  return {
    id: data.id,
    number: data.number,
    name: data.name,
    description: data.description,
    defaultFee: data.default_fee,
    sessionCount: data.session_count ?? 1,
    createdAt: data.created_at,
  }
}