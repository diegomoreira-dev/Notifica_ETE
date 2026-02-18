// ================================================
// NOTIFICA ETE - Gestão de usuários (somente admin)
// ================================================

const { auth, utils } = SupabaseAPI

/** Nome da Edge Function (GET listar, POST convite, PATCH editar, DELETE excluir). */
const EDGE_FUNCTION_GESTAO = 'smart-service'

let currentUserId = null

function getGestaoUrl() {
    return SupabaseAPI.functionsUrl + '/' + EDGE_FUNCTION_GESTAO
}

async function checkAuth() {
    const { session } = await auth.getSession()
    if (!session) {
        window.location.href = 'login.html'
        return null
    }
    const isAdmin = await auth.isAdmin()
    if (!isAdmin) {
        utils.showNotification('Acesso negado. Apenas administradores podem acessar esta página.', 'error')
        window.location.href = 'painel.html'
        return null
    }
    currentUserId = session.user?.id || null
    return session
}

function formatDateTime(str) {
    if (!str) return '—'
    const d = new Date(str)
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    })
}

function getRoleLabel(user) {
    const role = user.app_metadata?.role || user.role
    if (role === 'admin') return 'Admin'
    if (role === 'operador') return 'Operador'
    return role ? String(role) : '—'
}

function getRoleValue(user) {
    const r = user.app_metadata?.role || user.role
    return r === 'admin' ? 'admin' : 'operador'
}

function getNome(user) {
    const m = user.user_metadata || {}
    return m.full_name || m.nome || m.display_name || '—'
}

function showSection(id) {
    document.getElementById('usuariosLoading').style.display = 'none'
    document.getElementById('usuariosErro').style.display = 'none'
    document.getElementById('usuariosWrapper').style.display = 'none'
    document.getElementById('usuariosEmpty').style.display = 'none'
    const el = document.getElementById(id)
    if (el) el.style.display = id === 'usuariosLoading' ? 'block' : id === 'usuariosErro' ? 'block' : 'block'
}

async function loadUsers() {
    const session = await checkAuth()
    if (!session) return

    showSection('usuariosLoading')

    try {
        const res = await fetch(getGestaoUrl(), {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'Content-Type': 'application/json'
            }
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
            const msg = data.error || data.message || 'Erro ao carregar usuários.'
            document.getElementById('usuariosErro').innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg
            showSection('usuariosErro')
            return
        }

        const users = data.users || data.data?.users || []
        const tbody = document.getElementById('usuariosTableBody')

        if (users.length === 0) {
            showSection('usuariosEmpty')
            return
        }

        tbody.innerHTML = users.map(u => {
            const isSelf = u.id === currentUserId
            const nome = getNome(u)
            const roleValue = getRoleValue(u)
            return `
            <tr>
                <td>${escapeHtml(u.email || '—')}</td>
                <td>${escapeHtml(nome)}</td>
                <td><span class="badge ${(u.app_metadata?.role || u.role) === 'admin' ? 'badge-warning' : 'badge-info'}">${escapeHtml(getRoleLabel(u))}</span></td>
                <td>${formatDateTime(u.created_at)}</td>
                <td>
                    <div class="flex-gap-sm">
                        <button type="button" class="btn btn-sm btn-primary btn-editar-usuario" data-user-id="${escapeHtml(u.id)}" data-email="${escapeHtml(u.email || '')}" data-nome="${escapeHtml(nome === '—' ? '' : nome)}" data-role="${roleValue}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger btn-excluir-usuario" data-user-id="${escapeHtml(u.id)}" ${isSelf ? 'disabled title="Você não pode excluir a si mesmo"' : 'title="Excluir"'}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `
        }).join('')

        tbody.querySelectorAll('.btn-editar-usuario').forEach(btn => {
            btn.addEventListener('click', () => abrirModalEditar(btn.dataset))
        })
        tbody.querySelectorAll('.btn-excluir-usuario:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => excluirUsuario(btn.dataset.userId))
        })

        showSection('usuariosWrapper')
    } catch (err) {
        console.error(err)
        document.getElementById('usuariosErro').innerHTML = '<i class="fas fa-exclamation-circle"></i> Falha de conexão. Verifique se a Edge Function está publicada e a URL está correta.'
        showSection('usuariosErro')
    }
}

function escapeHtml(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth()
    if (!session) return
    await loadUsers()
})

document.getElementById('btnRecarregar').addEventListener('click', () => loadUsers())

const modalEditar = document.getElementById('modalEditarUsuario')

function abrirModalEditar(dataset) {
    document.getElementById('editarUserId').value = dataset.userId || ''
    document.getElementById('editarEmail').value = dataset.email || ''
    document.getElementById('editarNome').value = dataset.nome || ''
    document.getElementById('editarRole').value = dataset.role || 'operador'
    if (modalEditar) modalEditar.classList.add('active')
}

function fecharModalEditar() {
    if (modalEditar) modalEditar.classList.remove('active')
}

document.getElementById('btnFecharModalEditar').addEventListener('click', fecharModalEditar)
document.getElementById('btnCancelarEditar').addEventListener('click', fecharModalEditar)

document.getElementById('formEditarUsuario').addEventListener('submit', async (e) => {
    e.preventDefault()
    const session = await checkAuth()
    if (!session) return

    const userId = document.getElementById('editarUserId').value.trim()
    const fullName = document.getElementById('editarNome').value.trim()
    const role = document.getElementById('editarRole').value

    if (!userId) return

    const btn = document.getElementById('btnSalvarEditar')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'

    try {
        const res = await fetch(getGestaoUrl(), {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, full_name: fullName || null, role })
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
            utils.showNotification(data.error || data.message || 'Erro ao salvar.', 'error')
            btn.disabled = false
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar'
            return
        }
        utils.showNotification('Usuário atualizado.', 'success')
        fecharModalEditar()
        await loadUsers()
    } catch (err) {
        console.error(err)
        utils.showNotification('Falha ao salvar. Verifique a conexão.', 'error')
    } finally {
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar'
    }
})

async function excluirUsuario(userId) {
    if (!userId) return
    if (!confirm('Tem certeza que deseja excluir este usuário? Ele não poderá mais acessar o sistema.')) return

    const session = await checkAuth()
    if (!session) return
    if (userId === currentUserId) {
        utils.showNotification('Você não pode excluir a si mesmo.', 'error')
        return
    }

    try {
        const res = await fetch(getGestaoUrl(), {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId })
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
            utils.showNotification(data.error || data.message || 'Erro ao excluir.', 'error')
            return
        }
        utils.showNotification('Usuário excluído.', 'success')
        await loadUsers()
    } catch (err) {
        console.error(err)
        utils.showNotification('Falha ao excluir. Verifique a conexão.', 'error')
    }
}

document.getElementById('formConvidar').addEventListener('submit', async (e) => {
    e.preventDefault()
    const session = await checkAuth()
    if (!session) return

    const emailInput = document.getElementById('emailConvidar')
    const email = emailInput.value.trim()
    if (!email) return

    const btn = document.getElementById('btnConvidar')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'

    try {
        const res = await fetch(getGestaoUrl(), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                redirectTo: window.location.origin + '/pages/definir-senha.html'
            })
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
            let msg = data.error || data.message || 'Erro ao enviar convite.'
            if (/rate limit|rate_limit|too many requests/i.test(msg)) {
                msg = 'Limite de e-mails atingido. O Supabase limita a quantidade de convites por hora. Aguarde alguns minutos e tente novamente.'
            }
            utils.showNotification(msg, 'error')
            btn.disabled = false
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar convite'
            return
        }

        utils.showNotification('Convite enviado para ' + email + '. O usuário receberá um e-mail com o link.', 'success')
        emailInput.value = ''
        await loadUsers()
    } catch (err) {
        console.error(err)
        utils.showNotification('Falha ao enviar convite. Verifique a conexão e a Edge Function.', 'error')
    } finally {
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar convite'
    }
})

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault()
    if (!confirm('Deseja sair?')) return
    await auth.logout()
    window.location.href = 'login.html'
})
