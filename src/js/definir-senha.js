// ================================================
// NOTIFICA ETE - Definir senha (primeiro login)
// ================================================

const { auth, utils } = SupabaseAPI

async function checkAuth() {
    let { session } = await auth.getSession()
    if (!session && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1))
        if (params.get('access_token') || params.get('refresh_token')) {
            await new Promise(r => setTimeout(r, 100))
            const result = await auth.getSession()
            session = result.session
        }
    }
    if (!session) {
        window.location.href = 'login.html'
        return false
    }
    if (session.user?.user_metadata?.primeiro_login !== true) {
        window.location.href = 'painel.html'
        return false
    }
    const nomeEl = document.getElementById('nome')
    if (nomeEl && (session.user?.user_metadata?.full_name || session.user?.user_metadata?.nome)) {
        nomeEl.value = session.user.user_metadata.full_name || session.user.user_metadata.nome || ''
    }
    return true
}

function setupTogglePassword(buttonId, inputId) {
    const btn = document.getElementById(buttonId)
    const input = document.getElementById(inputId)
    if (!btn || !input) return
    btn.addEventListener('click', function () {
        const icon = btn.querySelector('i')
        if (input.type === 'password') {
            input.type = 'text'
            if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash') }
        } else {
            input.type = 'password'
            if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye') }
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth()
    setupTogglePassword('toggleNovaSenha', 'novaSenha')
    setupTogglePassword('toggleConfirmarSenha', 'confirmarSenha')
})

document.getElementById('definirSenhaForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const novaSenha = document.getElementById('novaSenha').value
    const confirmarSenha = document.getElementById('confirmarSenha').value
    const nome = document.getElementById('nome').value.trim()
    const btn = document.getElementById('submitBtn')
    const btnText = document.getElementById('btnText')

    if (novaSenha.length < 6) {
        utils.showNotification('A senha deve ter no mínimo 6 caracteres.', 'error')
        return
    }
    if (novaSenha !== confirmarSenha) {
        utils.showNotification('As senhas não coincidem.', 'error')
        return
    }

    btn.disabled = true
    btnText.textContent = 'Salvando...'

    try {
        const updateData = { primeiro_login: false }
        if (nome) updateData.full_name = nome
        await auth.updateProfile(updateData)
        const { error } = await auth.updatePassword(novaSenha)
        if (error) throw error
        utils.showNotification('Senha definida. Redirecionando...', 'success')
        setTimeout(() => { window.location.href = 'painel.html' }, 1000)
    } catch (err) {
        console.error(err)
        utils.showNotification(err.message || 'Erro ao salvar.', 'error')
    } finally {
        btn.disabled = false
        btnText.textContent = 'Salvar e continuar'
    }
})
