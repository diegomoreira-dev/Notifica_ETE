const { auth, database, utils } = SupabaseAPI

async function checkAuth() {
    try {
        console.log('🔐 Verificando autenticação...')
        const { session } = await auth.getSession()
        
        if (!session) {
            console.log('❌ Não autenticado, redirecionando...')
            window.location.href = 'login.html'
            return false
        }
        
        console.log('✅ Autenticado:', session.user.email)
        
        let displayName = session.user.email
        if (session.user.user_metadata) {
            displayName = session.user.user_metadata.full_name || 
                         session.user.user_metadata.nome || 
                         session.user.user_metadata.display_name || 
                         session.user.email
        }
        
        const welcomeMsg = document.getElementById('welcomeMessage')
        if (welcomeMsg) {
            welcomeMsg.textContent = `Bem-vindo, ${displayName}`
        }
        
        return true
    } catch (error) {
        console.error('Erro na autenticação:', error)
        window.location.href = 'login.html'
        return false
    }
}

async function loadDashboardData() {
    try {
        console.log('🔄 Carregando dados do painel...')
        
        const [alunosResult, notificacoesResult] = await Promise.all([
            database.select('alunos', { select: 'id' }),
            database.select('notificacoes', { select: 'id, nivel, status' })
        ])

        const alunos = alunosResult.data || []
        const notificacoes = notificacoesResult.data || []

        console.log('📊 Dados carregados:', { 
            alunos: alunos.length, 
            notificacoes: notificacoes.length 
        })

        document.getElementById('totalAlunos').textContent = alunos.length
        document.getElementById('totalNotificacoes').textContent = notificacoes.length
        
        const pendentes = notificacoes.filter(n => n.status === 'pendente').length
        const resolvidas = notificacoes.filter(n => n.status === 'resolvido').length
        
        document.getElementById('notificacoesPendentes').textContent = pendentes
        document.getElementById('notificacoesResolvidas').textContent = resolvidas

        const leves = notificacoes.filter(n => n.nivel === 'Leve').length
        const medias = notificacoes.filter(n => n.nivel === 'Média').length
        const graves = notificacoes.filter(n => n.nivel === 'Grave').length

        document.getElementById('notificacoesLeves').textContent = leves
        document.getElementById('notificacoesMedias').textContent = medias
        document.getElementById('notificacoesGraves').textContent = graves

        await Promise.all([
            loadAlertas(),
            loadNotificacoesRecentes()
        ])

        console.log('✅ Dados do painel carregados com sucesso!')

    } catch (error) {
        console.error('❌ Erro ao carregar dados do painel:', error)
        utils.showNotification('Erro ao carregar dados do painel', 'error')
    }
}

async function loadAlertas() {
    try {
        const { data: notifData } = await database.select('notificacoes', {
            select: 'aluno_id, status'
        })
        
        const { data: alunosData } = await database.select('alunos', {
            select: 'id, nome, matricula, turma, responsavel, telefone_responsavel'
        })

        if (notifData && alunosData) {
            const counts = {}
            notifData.forEach(n => {
                // Contar apenas notificações com status ativo ou pendente
                if (n.aluno_id && (n.status === 'ativo' || n.status === 'pendente')) {
                    counts[n.aluno_id] = (counts[n.aluno_id] || 0) + 1
                }
            })

            const alertas = Object.entries(counts)
                .filter(([_, count]) => count >= 3)
                .map(([alunoId, count]) => {
                    const aluno = alunosData.find(a => a.id === alunoId)
                    return {
                        id: alunoId,
                        total_notificacoes: count,
                        ...aluno
                    }
                })

            if (alertas && alertas.length > 0) {
                const section = document.getElementById('alertasSection')
                const list = document.getElementById('alertasList')
                
                list.innerHTML = alertas.map(alerta => `
                    <div class="alert alert-warning alert-horizontal">
                        <div class="alert-content">
                            <strong class="alert-title">${alerta.nome || 'Aluno'}</strong>
                            <div class="alert-meta">
                                <span><i class="fas fa-id-card"></i> ${alerta.matricula || 'N/A'}</span>
                                <span><i class="fas fa-users"></i> ${alerta.turma || 'N/A'}</span>
                                <span class="alert-badge">
                                    <i class="fas fa-exclamation-triangle"></i> ${alerta.total_notificacoes} notificações
                                </span>
                            </div>
                        </div>
                        <a href="notificacoes.html?aluno_id=${alerta.id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-eye"></i> Ver Histórico
                        </a>
                    </div>
                `).join('')
                
                section.style.display = 'block'
            }
        }

    } catch (error) {
        console.error('Erro ao carregar alertas:', error)
    }
}

function escapeDescricaoAttr(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function escapeHtml(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

async function loadNotificacoesRecentes() {
    try {
        const { data, error } = await database.select('notificacoes', {
            select: 'id, aluno_id, data_hora, nivel, descricao, status',
            order: { column: 'data_hora', ascending: false },
            limit: 5
        })

        if (error) throw error
        
        // Buscar dados dos alunos
        if (data && data.length > 0) {
            const { data: alunosData } = await database.select('alunos', {
                select: 'id, nome, matricula, turma'
            })
            
            data.forEach(notif => {
                notif.alunos = alunosData?.find(a => a.id === notif.aluno_id)
            })
        }

        const container = document.getElementById('notificacoesRecentesList')

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nenhuma notificação registrada</p>'
            return
        }

        container.innerHTML = data.map(notif => {
            const nivelClass = (notif.nivel || 'Leve').toLowerCase()
                .replace(/á|à|â|ã|ä/g, 'a')
                .replace(/é|è|ê|ë/g, 'e')
                .replace(/í|ì|î|ï/g, 'i')
                .replace(/ó|ò|ô|õ|ö/g, 'o')
                .replace(/ú|ù|û|ü/g, 'u')
                .replace(/ç/g, 'c')
            const descricaoTexto = notif.descricao || ''
            const descricaoAttr = escapeDescricaoAttr(descricaoTexto)
            return `
            <div class="notification-item">
                <div class="notification-header">
                    <div class="notification-badges">
                        <span class="badge badge-${nivelClass} badge-enhanced">${notif.nivel}</span>
                        <span class="badge badge-enhanced-sm badge-${notif.status}">${notif.status}</span>
                    </div>
                    <span class="notification-date">
                        <i class="fas fa-clock"></i> ${utils.formatDateTime(notif.data_hora)}
                    </span>
                </div>
                <div class="penalty-content">
                    <h4 class="notification-content-title">
                        <i class="fas fa-user"></i> ${notif.alunos?.nome || 'Aluno não encontrado'}
                    </h4>
                    <div class="notification-meta">
                        <span><i class="fas fa-id-card"></i> <strong>Matrícula:</strong> ${notif.alunos?.matricula || 'N/A'}</span>
                        <span><i class="fas fa-users"></i> <strong>Turma:</strong> ${notif.alunos?.turma || 'N/A'}</span>
                    </div>
                    <p class="notification-inline descricao-tooltip-trigger" data-descricao="${descricaoAttr}"><span class="descricao-truncada">${escapeHtml(descricaoTexto)}</span></p>
                </div>
            </div>
        `
        }).join('')

        console.log('✅ Notificações recentes carregadas')

    } catch (error) {
        console.error('Erro ao carregar notificações recentes:', error)
        const container = document.getElementById('notificacoesRecentesList')
        container.innerHTML = '<p class="text-center text-danger">Erro ao carregar notificações</p>'
    }
}

// Balão da descrição ao passar o mouse (notificações recentes)
let descricaoTooltipTimer = null
function showDescricaoTooltip(el) {
    const tooltip = document.getElementById('descricaoTooltip')
    if (!tooltip) return
    const text = el.getAttribute('data-descricao')
    if (!text || !String(text).trim()) return
    descricaoTooltipTimer = setTimeout(() => {
        tooltip.textContent = text
        tooltip.setAttribute('aria-hidden', 'false')
        tooltip.classList.add('visible')
        const rect = el.getBoundingClientRect()
        const tw = 320
        const thMax = 280
        const pad = 8
        let left = rect.left
        let top = rect.bottom + pad
        if (left + tw > window.innerWidth) left = window.innerWidth - tw - pad
        if (left < pad) left = pad
        if (top + thMax > window.innerHeight - pad) top = Math.max(pad, rect.top - thMax - pad)
        if (top < pad) top = pad
        tooltip.style.left = left + 'px'
        tooltip.style.top = top + 'px'
        descricaoTooltipTimer = null
    }, 200)
}
function hideDescricaoTooltip() {
    if (descricaoTooltipTimer) {
        clearTimeout(descricaoTooltipTimer)
        descricaoTooltipTimer = null
    }
    const tooltip = document.getElementById('descricaoTooltip')
    if (tooltip) {
        tooltip.classList.remove('visible')
        tooltip.setAttribute('aria-hidden', 'true')
    }
}
function initDescricaoTooltip() {
    const tooltip = document.getElementById('descricaoTooltip')
    if (!tooltip) return
    document.addEventListener('mouseenter', (e) => {
        const el = e.target && e.target.nodeType === 1 ? e.target : null
        const trigger = el && el.closest ? el.closest('.descricao-tooltip-trigger') : null
        if (trigger) showDescricaoTooltip(trigger)
    }, true)
    document.addEventListener('mouseleave', (e) => {
        const el = e.target && e.target.nodeType === 1 ? e.target : null
        const trigger = el && el.closest ? el.closest('.descricao-tooltip-trigger') : null
        if (trigger && !tooltip.contains(e.relatedTarget)) hideDescricaoTooltip()
    }, true)
    tooltip.addEventListener('mouseleave', (e) => {
        const related = e.relatedTarget && e.relatedTarget.nodeType === 1 ? e.relatedTarget : null
        if (!related || !related.closest || !related.closest('.descricao-tooltip-trigger')) hideDescricaoTooltip()
    })
}

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

async function initPage() {
    try {
        console.log('🚀 Inicializando painel...')
        
        const isAuthenticated = await checkAuth()
        if (!isAuthenticated) return

        setupLogout()

        initDescricaoTooltip()

        await loadDashboardData()

        console.log('✅ Painel inicializado com sucesso!')

    } catch (error) {
        console.error('❌ Erro ao inicializar painel:', error)
        utils.showNotification('Erro ao inicializar painel', 'error')
    }
}

document.addEventListener('DOMContentLoaded', initPage)

