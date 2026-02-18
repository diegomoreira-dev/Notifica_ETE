// ================================================
// NOTIFICA ETE - Portal do Responsável
// ================================================

const { database, utils } = SupabaseAPI

// Consultar por código portal
async function consultar(codigoPortal) {
    try {
        console.log('🔍 Consultando código:', codigoPortal)
        
        // Buscar aluno
        const { data: aluno, error: alunoError } = await database.select('alunos', {
            select: '*'
        })

        if (alunoError) throw alunoError

        const alunoEncontrado = aluno?.find(a => a.codigo_portal === codigoPortal)
        
        if (!alunoEncontrado) {
            return { 
                success: false, 
                message: 'Código não encontrado. Verifique se digitou corretamente.' 
            }
        }
        
        console.log('✅ Aluno encontrado:', alunoEncontrado)

        // Buscar notificações do aluno
        const { data: notificacoes, error: notifError } = await database.select('notificacoes', {
            select: '*',
            order: { column: 'data_hora', ascending: false }
        })

        if (notifError) throw notifError

        const notificacoesAluno = notificacoes?.filter(n => n.aluno_id === alunoEncontrado.id) || []
        
        console.log('📋 Notificações encontradas:', notificacoesAluno.length)

        return { 
            success: true, 
            aluno: alunoEncontrado, 
            notificacoes: notificacoesAluno 
        }

    } catch (error) {
        console.error('❌ Erro na consulta:', error)
        return { 
            success: false, 
            message: 'Erro ao consultar. Tente novamente.' 
        }
    }
}

// Renderizar resultado
function renderResultado(aluno, notificacoes) {
    // Mostrar seção de resultado
    document.getElementById('resultadoConsulta').style.display = 'block'
    
    // Scroll suave para o resultado
    document.getElementById('resultadoConsulta').scrollIntoView({ behavior: 'smooth' })

    // Dados do aluno
    document.getElementById('alunoNome').textContent = aluno.nome
    document.getElementById('alunoMatricula').textContent = aluno.matricula
    document.getElementById('alunoTurma').textContent = aluno.turma
    document.getElementById('alunoResponsavel').textContent = aluno.responsavel

    // Estatísticas
    const pendentes = notificacoes.filter(n => n.status === 'pendente').length
    const resolvidas = notificacoes.filter(n => n.status === 'resolvido').length
    
    document.getElementById('totalNotificacoes').textContent = notificacoes.length
    document.getElementById('notificacoesPendentes').textContent = pendentes
    document.getElementById('notificacoesResolvidas').textContent = resolvidas

    // Timeline
    const timeline = document.getElementById('timelineNotificacoes')
    
    if (notificacoes.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state p-2">
                <i class="fas fa-check-circle empty-state-icon"></i>
                <p class="empty-state-title">Nenhuma notificação registrada</p>
                <p class="empty-state-text">Parabéns! O aluno não possui notificações disciplinares.</p>
            </div>
        `
        return
    }

    timeline.innerHTML = notificacoes.map(notif => {
        const nivelClass = (notif.nivel || 'Leve').toLowerCase()
            .replace(/á|à|â|ã|ä/g, 'a')
            .replace(/é|è|ê|ë/g, 'e')
            .replace(/í|ì|î|ï/g, 'i')
            .replace(/ó|ò|ô|õ|ö/g, 'o')
            .replace(/ú|ù|û|ü/g, 'u')
            .replace(/ç/g, 'c')
        return `
        <div class="timeline-item ${nivelClass}">
            <div class="card">
                <div class="card-header flex-between">
                    <div class="notification-badges">
                        <span class="badge badge-${nivelClass}">${notif.nivel}</span>
                        <span class="badge badge-${notif.status} ml-0-5">${notif.status}</span>
                    </div>
                    <span class="text-muted small-text">
                        <i class="fas fa-clock"></i>
                        ${utils.formatDateTime(notif.data_hora)}
                    </span>
                </div>
                <div class="card-body">
                    <p class="mb-0-5"><strong>Descrição:</strong></p>
                    <p class="mb-1">${notif.descricao}</p>
                    
                    <p class="mb-0-5"><strong>Registrado por:</strong> ${notif.registrado_por}</p>
                    
                    ${notif.pdf_url ? `
                        <a href="${notif.pdf_url}" target="_blank" class="btn btn-sm btn-primary mt-1">
                            <i class="fas fa-file-pdf"></i>
                            Baixar Documento
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
        `
    }).join('')
}

// Nova consulta
window.novaConsulta = function() {
    document.getElementById('resultadoConsulta').style.display = 'none'
    document.getElementById('codigoPortal').value = ''
    document.getElementById('codigoPortal').focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Form submit
document.getElementById('consultaForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const codigo = document.getElementById('codigoPortal').value.trim()
    
    if (codigo.length !== 6) {
        alert('❌ O código deve ter exatamente 6 dígitos')
        return
    }

    const btn = e.target.querySelector('button[type="submit"]')
    const originalText = btn.innerHTML
    
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando...'

    try {
        const resultado = await consultar(codigo)
        
        if (resultado.success) {
            renderResultado(resultado.aluno, resultado.notificacoes)
        } else {
            alert('❌ ' + resultado.message)
        }
    } catch (error) {
        alert('❌ Erro ao consultar. Tente novamente.')
    } finally {
        btn.disabled = false
        btn.innerHTML = originalText
    }
})

// Auto-focus no input
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('codigoPortal').focus()
})

