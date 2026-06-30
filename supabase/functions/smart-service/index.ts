// Edge Function: gestao-usuarios
// GET = listar usuários | POST = convitar por e-mail
// CORS habilitado para chamadas do navegador (ex.: http://localhost:3000)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Não autorizado' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user || user.app_metadata?.role !== 'admin') {
    return jsonResponse({ error: 'Acesso negado' }, 403)
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ users: data.users })
  }

  if (req.method === 'POST') {
    let body: { email?: string; redirectTo?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }
    const email = body?.email
    if (!email || typeof email !== 'string') {
      return jsonResponse({ error: 'Campo email é obrigatório' }, 400)
    }
    const options: { data: { primeiro_login: boolean }; redirectTo?: string } = {
      data: { primeiro_login: true },
    }
    if (body.redirectTo && typeof body.redirectTo === 'string' && body.redirectTo.startsWith('http')) {
      options.redirectTo = body.redirectTo
    }
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, options)
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true })
  }

  if (req.method === 'PATCH') {
    let body: { user_id?: string; full_name?: string; role?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }
    const userId = body?.user_id
    if (!userId || typeof userId !== 'string') {
      return jsonResponse({ error: 'Campo user_id é obrigatório' }, 400)
    }
    const updates: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } = {}

    if (body.full_name !== undefined) {
      const { data: existing } = await supabase.auth.admin.getUserById(userId)
      const currentMeta = (existing?.user?.user_metadata as Record<string, unknown>) || {}
      updates.user_metadata = { ...currentMeta, full_name: body.full_name === '' || body.full_name === null ? '' : body.full_name }
    }
    if (body.role !== undefined) {
      updates.app_metadata = { role: body.role === 'operador' || body.role === 'admin' ? body.role : 'operador' }
    }
    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: 'Envie full_name e/ou role para atualizar' }, 400)
    }
    const { error } = await supabase.auth.admin.updateUserById(userId, updates)
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true })
  }

  if (req.method === 'DELETE') {
    let body: { user_id?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }
    const userId = body?.user_id
    if (!userId || typeof userId !== 'string') {
      return jsonResponse({ error: 'Campo user_id é obrigatório' }, 400)
    }
    if (userId === user?.id) {
      return jsonResponse({ error: 'Você não pode excluir a si mesmo' }, 400)
    }
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ ok: true })
  }

  return jsonResponse({ error: 'Método não permitido' }, 405)
})
