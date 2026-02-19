;(async function () {
    const link = document.getElementById('linkGestaoUsuarios')
    if (!link) return
    try {
        const isAdmin = await SupabaseAPI.auth.isAdmin()
        if (isAdmin) link.style.display = ''
    } catch (e) {
        link.style.display = 'none'
    }
})()
