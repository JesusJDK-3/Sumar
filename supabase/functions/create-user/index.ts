// @ts-nocheck
// supabase/functions/create-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar que quien llama sea admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (!user) throw new Error('No autorizado')

    const { data: caller } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (caller?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo admin puede crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, fullName, role, permissions } = await req.json()

    // Separar nombre y apellido
    const nameParts = fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // 1. Crear usuario en auth
    let userId: string

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authError) throw authError
      userId = authData.user.id
    } catch (err: any) {
      if (err.message?.includes('already been registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existing = existingUsers?.users.find((u: any) => u.email === email)
        if (!existing) throw new Error('No se encontró usuario existente')
        userId = existing.id
        if (password) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password })
        }
      } else {
        throw err
      }
    }

    // 2. Si es psicologia, crear en therapists también
    let therapistId: string | null = null
    if (role === 'psicologia') {
      const { data: therapistData, error: therapistError } = await supabaseAdmin
        .from('therapists')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email,
          color: '#E8481E', // color por defecto
        })
        .select('id')
        .single()

      if (therapistError) throw therapistError
      therapistId = therapistData.id
    }

    // 3. Crear/actualizar profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        role,
        permissions,
        therapist_id: therapistId,
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, userId, therapistId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})