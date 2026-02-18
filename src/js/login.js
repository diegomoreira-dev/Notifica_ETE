// ================================================
// NOTIFICA ETE - Login
// ================================================

// Usar API global
const { auth, utils } = SupabaseAPI

// Função para mostrar notificação
function showNotification(message, type = 'success') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.remove()
    }, 5000)
}

// Verificar se já está logado
async function checkAuth() {
    try {
        const { session } = await auth.getSession()
        if (session) {
            console.log('✅ Usuário já está autenticado, redirecionando...')
            window.location.href = 'painel.html'
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
    }
}

// Fazer login
async function handleLogin(e) {
    e.preventDefault()
    
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value
    const loginBtn = document.getElementById('loginBtn')
    const btnText = document.getElementById('btnText')
    
    // Validação básica
    if (!email || !password) {
        showNotification('Preencha todos os campos', 'error')
        return
    }
    
    // Desabilitar botão
    loginBtn.disabled = true
    btnText.innerHTML = '<span class="loading-spinner"></span> Entrando...'
    
    try {
        console.log('🔐 Tentando fazer login...')
        console.log('Email:', email)
        
        // Fazer login
        const { data, error } = await auth.login(email, password)
        
        if (error) {
            console.error('❌ Erro no login:', error)
            throw error
        }
        
        console.log('✅ Login bem-sucedido!')
        console.log('Usuário:', data.user)
        if (typeof localStorage !== 'undefined') localStorage.setItem('notifica_ete_session_started_at', String(Date.now()))

        const isPrimeiroLogin = data.user?.user_metadata?.primeiro_login === true
        if (isPrimeiroLogin) {
            showNotification('Primeiro acesso: defina sua senha.', 'success')
            setTimeout(() => { window.location.href = 'definir-senha.html' }, 800)
        } else {
            showNotification('Login realizado com sucesso!', 'success')
            setTimeout(() => { window.location.href = 'painel.html' }, 1000)
        }
        
    } catch (error) {
        console.error('❌ Erro ao fazer login:', error)
        
        let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.'
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos. Tente novamente.'
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Email não confirmado. Verifique seu email.'
        } else if (error.message) {
            errorMessage = error.message
        }
        
        showNotification(errorMessage, 'error')
        
        // Reabilitar botão
        loginBtn.disabled = false
        btnText.textContent = 'Entrar'
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Página de login carregada')
    
    // Verificar autenticação
    checkAuth()
    
    // Form submit
    document.getElementById('loginForm').addEventListener('submit', handleLogin)
})

document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});
