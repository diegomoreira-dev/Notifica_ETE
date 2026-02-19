const { auth, utils } = SupabaseAPI

document.getElementById('esqueciSenhaForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value.trim()
    const btn = document.getElementById('submitBtn')
    const btnText = document.getElementById('btnText')

    if (!email) {
        utils.showNotification('Informe seu e-mail.', 'error')
        return
    }

    btn.disabled = true
    btnText.textContent = 'Enviando...'

    try {
        const redirectTo = window.location.origin + '/pages/redefinir-senha.html'
        const { error } = await auth.resetPasswordForEmail(email, redirectTo)

        if (error) throw error

        utils.showNotification('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha. Verifique também a pasta de spam.', 'success')
        document.getElementById('email').value = ''
    } catch (err) {
        console.error(err)
        let msg = err.message || 'Erro ao enviar e-mail. Tente novamente.'
        if (/rate limit|rate_limit|too many requests/i.test(msg)) {
            msg = 'Limite de e-mails atingido. O Supabase limita a quantidade de convites por hora. Aguarde alguns minutos e tente novamente.'
        }
        utils.showNotification(msg, 'error')
    } finally {
        btn.disabled = false
        btnText.textContent = 'Enviar link'
    }
})
