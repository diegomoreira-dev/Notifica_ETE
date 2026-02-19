const { auth, utils } = SupabaseAPI

const cardForm = document.getElementById('cardForm')
const cardMensagem = document.getElementById('cardMensagem')
const cardCarregando = document.getElementById('cardCarregando')

function mostrarCard(id) {
    cardForm.style.display = id === 'cardForm' ? 'block' : 'none'
    cardMensagem.style.display = id === 'cardMensagem' ? 'block' : 'none'
    cardCarregando.style.display = id === 'cardCarregando' ? 'block' : 'none'
}

async function init() {
    try {
        const { data: { session }, error } = await SupabaseAPI.client.auth.getSession()
        if (error) throw error
        if (session) {
            mostrarCard('cardForm')
            return
        }
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const type = hashParams.get('type')
        if (type === 'recovery' && (hashParams.get('access_token') || hashParams.get('refresh_token'))) {
            const { data, error: errExchange } = await SupabaseAPI.client.auth.getSession()
            if (!errExchange && data.session) {
                mostrarCard('cardForm')
                return
            }
        }
    } catch (e) {
        console.error(e)
    }
    document.getElementById('mensagemTexto').textContent = 'Link inválido ou expirado. Solicite um novo link em "Esqueci minha senha".'
    mostrarCard('cardMensagem')
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
setupTogglePassword('toggleNovaSenha', 'novaSenha')
setupTogglePassword('toggleConfirmarSenha', 'confirmarSenha')

init()

document.getElementById('redefinirSenhaForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const novaSenha = document.getElementById('novaSenha').value
    const confirmarSenha = document.getElementById('confirmarSenha').value
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
        const { error } = await auth.updatePassword(novaSenha)
        if (error) throw error
        document.getElementById('mensagemTexto').textContent = 'Senha alterada com sucesso. Faça login com a nova senha.'
        mostrarCard('cardMensagem')
    } catch (err) {
        console.error(err)
        utils.showNotification(err.message || 'Erro ao redefinir senha.', 'error')
    } finally {
        btn.disabled = false
        btnText.textContent = 'Redefinir senha'
    }
})
