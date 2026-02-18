// ================================================
// NOTIFICA ETE - Perfil do Usuário
// ================================================

// Usar API global
const { auth, utils } = SupabaseAPI

// Verificar autenticação
async function checkAuth() {
    const { session } = await auth.getSession()
    if (!session) {
        window.location.href = 'login.html'
        return false
    }
    return true
}

// Carregar dados do usuário
async function loadUserData() {
    try {
        const { user, error } = await auth.getCurrentUser()
        
        if (error) throw error
        if (!user) {
            utils.showNotification('Usuário não encontrado', 'error')
            return
        }

        // Preencher campos
        const emailInput = document.getElementById('userEmail')
        const displayNameInput = document.getElementById('userDisplayName')
        const userIdSpan = document.getElementById('userId')
        const lastUpdateSpan = document.getElementById('lastUpdate')
        const createdAtSpan = document.getElementById('createdAt')

        if (emailInput) {
            emailInput.value = user.email || 'N/A'
        }

        if (displayNameInput) {
            // Tentar obter nome de diferentes lugares
            const displayName = user.user_metadata?.full_name || 
                               user.user_metadata?.nome || 
                               user.user_metadata?.display_name || 
                               ''
            displayNameInput.value = displayName
        }

        if (userIdSpan) {
            userIdSpan.textContent = user.id || 'N/A'
        }

        if (lastUpdateSpan) {
            if (user.updated_at) {
                const updatedDate = new Date(user.updated_at)
                lastUpdateSpan.textContent = utils.formatDateTime(updatedDate)
            } else {
                lastUpdateSpan.textContent = 'N/A'
            }
        }

        if (createdAtSpan) {
            if (user.created_at) {
                const createdDate = new Date(user.created_at)
                createdAtSpan.textContent = utils.formatDateTime(createdDate)
            } else {
                createdAtSpan.textContent = 'N/A'
            }
        }

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error)
        utils.showNotification('Erro ao carregar dados do usuário', 'error')
    }
}

// Salvar perfil
window.salvarPerfil = async function() {
    try {
        const displayName = document.getElementById('userDisplayName').value.trim()
        const btnSalvar = document.getElementById('btnSalvarPerfil')
        const originalText = btnSalvar.innerHTML

        if (!displayName) {
            utils.showNotification('O nome de exibição é obrigatório', 'error')
            return
        }

        btnSalvar.disabled = true
        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'

        // Atualizar perfil
        const { data, error } = await auth.updateProfile({
            full_name: displayName,
            nome: displayName,
            display_name: displayName
        })

        if (error) throw error

        utils.showNotification('Perfil atualizado com sucesso!', 'success')
        
        // Recarregar dados
        await loadUserData()

    } catch (error) {
        console.error('Erro ao salvar perfil:', error)
        let errorMessage = 'Erro ao atualizar perfil'
        
        if (error.message) {
            errorMessage = error.message
        }
        
        utils.showNotification(errorMessage, 'error')
    } finally {
        const btnSalvar = document.getElementById('btnSalvarPerfil')
        if (btnSalvar) {
            btnSalvar.disabled = false
            btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações'
        }
    }
}

// Alterar senha
window.alterarSenha = async function(e) {
    e.preventDefault()

    try {
        const senhaAtual = document.getElementById('senhaAtual').value
        const novaSenha = document.getElementById('novaSenha').value
        const confirmarSenha = document.getElementById('confirmarSenha').value
        const btnAlterar = document.getElementById('btnAlterarSenha')
        const originalText = btnAlterar.innerHTML

        // Validações
        if (!senhaAtual || !novaSenha || !confirmarSenha) {
            utils.showNotification('Preencha todos os campos', 'error')
            return
        }

        if (novaSenha.length < 6) {
            utils.showNotification('A nova senha deve ter no mínimo 6 caracteres', 'error')
            return
        }

        if (novaSenha !== confirmarSenha) {
            utils.showNotification('As senhas não coincidem', 'error')
            return
        }

        if (senhaAtual === novaSenha) {
            utils.showNotification('A nova senha deve ser diferente da senha atual', 'error')
            return
        }

        btnAlterar.disabled = true
        btnAlterar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...'

        // Verificar senha atual fazendo login
        const { user } = await auth.getCurrentUser()
        if (!user || !user.email) {
            throw new Error('Usuário não encontrado')
        }

        // Tentar fazer login com a senha atual para validar
        try {
            const { error: loginError } = await auth.login(user.email, senhaAtual)
            
            if (loginError) {
                if (loginError.message && (loginError.message.includes('Invalid') || loginError.message.includes('incorrect'))) {
                    utils.showNotification('Senha atual incorreta', 'error')
                    return
                }
                throw loginError
            }
        } catch (loginError) {
            if (loginError.message && (loginError.message.includes('incorreta') || loginError.message.includes('Invalid'))) {
                utils.showNotification('Senha atual incorreta', 'error')
                return
            }
            throw loginError
        }

        // Atualizar senha
        const { data, error } = await auth.updatePassword(novaSenha)

        if (error) throw error

        utils.showNotification('Senha alterada com sucesso!', 'success')
        
        // Limpar formulário
        limparFormSenha()

    } catch (error) {
        console.error('Erro ao alterar senha:', error)
        let errorMessage = 'Erro ao alterar senha'
        
        if (error.message) {
            errorMessage = error.message
        }
        
        utils.showNotification(errorMessage, 'error')
    } finally {
        const btnAlterar = document.getElementById('btnAlterarSenha')
        if (btnAlterar) {
            btnAlterar.disabled = false
            btnAlterar.innerHTML = '<i class="fas fa-key"></i> Alterar Senha'
        }
    }
}

// Limpar formulário de senha
window.limparFormSenha = function() {
    document.getElementById('senhaAtual').value = ''
    document.getElementById('novaSenha').value = ''
    document.getElementById('confirmarSenha').value = ''
    
    // Resetar ícones de senha
    const toggles = document.querySelectorAll('.password-toggle i')
    toggles.forEach(icon => {
        icon.classList.remove('fa-eye-slash')
        icon.classList.add('fa-eye')
    })
    const inputs = document.querySelectorAll('#senhaForm input[type="password"], #senhaForm input[type="text"]')
    inputs.forEach(input => {
        if (input.id.includes('senha')) {
            input.type = 'password'
        }
    })
}

// Toggle mostrar/ocultar senha
window.togglePassword = function(inputId, button) {
    const input = document.getElementById(inputId)
    const icon = button.querySelector('i')
    
    if (input.type === 'password') {
        input.type = 'text'
        icon.classList.remove('fa-eye')
        icon.classList.add('fa-eye-slash')
    } else {
        input.type = 'password'
        icon.classList.remove('fa-eye-slash')
        icon.classList.add('fa-eye')
    }
}

// Configurar logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault()
            
            if (!confirm('Tem certeza que deseja sair do sistema?')) {
                return
            }

            try {
                const { error } = await auth.logout()
                if (error) throw error
                
                utils.showNotification('Logout realizado com sucesso!', 'success')
                setTimeout(() => {
                    window.location.href = 'login.html'
                }, 1000)
            } catch (error) {
                console.error('Erro no logout:', error)
                utils.showNotification('Erro ao fazer logout', 'error')
            }
        })
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAuth()) {
        await loadUserData()
        setupLogout()
    }
})

