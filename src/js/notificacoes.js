// ================================================
// NOTIFICA ETE - Gestão de Notificações
// ================================================

// Usar API global
const { auth, database, utils } = SupabaseAPI

// Estado global
let notificacoes = []
let notificacoesFiltradas = []
let alunos = []
let editingId = null

// Função auxiliar para normalizar nível para classe CSS
function normalizarNivelParaClasse(nivel) {
    if (!nivel) return 'leve' // fallback
    let normalized = nivel.toLowerCase()
    // Remover acentos manualmente para compatibilidade
    normalized = normalized.replace(/á|à|â|ã|ä/g, 'a')
    normalized = normalized.replace(/é|è|ê|ë/g, 'e')
    normalized = normalized.replace(/í|ì|î|ï/g, 'i')
    normalized = normalized.replace(/ó|ò|ô|õ|ö/g, 'o')
    normalized = normalized.replace(/ú|ù|û|ü/g, 'u')
    normalized = normalized.replace(/ç/g, 'c')
    return normalized
}

// Obter display name do usuário
async function getUserDisplayName() {
    try {
        const { user } = await auth.getCurrentUser()
        if (!user) return null
        
        // Tentar obter nome de diferentes lugares nos metadados
        const displayName = user.user_metadata?.full_name || 
                           user.user_metadata?.nome || 
                           user.user_metadata?.display_name ||
                           null
        
        // Se não tiver display name, usar email como fallback
        return displayName || user.email || 'Operador'
    } catch (error) {
        console.error('Erro ao obter display name:', error)
        return null
    }
}

// Verificar autenticação
async function checkAuth() {
    const { session } = await auth.getSession()
    if (!session) {
        window.location.href = 'login.html'
        return false
    }
    
    // Preencher "Registrado Por" com display name do usuário
    const displayName = await getUserDisplayName()
    const registradoPorInput = document.getElementById('notificacaoRegistradoPor')
    if (registradoPorInput && displayName) {
        registradoPorInput.value = displayName
    }
    
    return true
}

// Escape para exibir texto no HTML
function escapeHtml(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

// Label do aluno para exibição no select com busca
function getAlunoLabel(aluno) {
    if (!aluno) return ''
    return `${aluno.nome} - ${aluno.matricula} (${aluno.turma})`
}

// Filtrar alunos por texto (nome, matrícula ou turma)
function filtrarAlunos(texto) {
    if (!texto || !texto.trim()) return alunos
    const t = texto.trim().toLowerCase()
    return alunos.filter(a =>
        (a.nome && a.nome.toLowerCase().includes(t)) ||
        (a.matricula && String(a.matricula).toLowerCase().includes(t)) ||
        (a.turma && a.turma.toLowerCase().includes(t))
    )
}

// Renderizar opções do dropdown do select de alunos
function renderAlunoDropdown(filterText) {
    const dropdown = document.getElementById('alunoSelectDropdown')
    const list = filtrarAlunos(filterText)
    if (!dropdown) return
    dropdown.innerHTML = list.length
        ? list.map(aluno =>
            `<div class="aluno-select-option" role="option" data-id="${aluno.id}" data-label="${escapeHtml(getAlunoLabel(aluno))}">${escapeHtml(getAlunoLabel(aluno))}</div>`
        ).join('')
        : '<div class="aluno-select-empty">Nenhum aluno encontrado</div>'
    dropdown.setAttribute('aria-hidden', 'false')
}

// Abrir/fechar dropdown do select de alunos
function setAlunoDropdownOpen(open) {
    const container = document.getElementById('alunoSelectSearch')
    const dropdown = document.getElementById('alunoSelectDropdown')
    if (!container || !dropdown) return
    if (open) {
        container.classList.add('dropdown-open')
        dropdown.setAttribute('aria-hidden', 'false')
    } else {
        container.classList.remove('dropdown-open')
        dropdown.setAttribute('aria-hidden', 'true')
    }
}

// Limpar seleção do aluno no modal
function clearAlunoSelect() {
    const hidden = document.getElementById('notificacaoAluno')
    const search = document.getElementById('notificacaoAlunoSearch')
    if (hidden) hidden.value = ''
    if (search) search.value = ''
    setAlunoDropdownOpen(false)
}

// Selecionar aluno no componente de busca
function setAlunoSelectValue(alunoId, label) {
    const hidden = document.getElementById('notificacaoAluno')
    const search = document.getElementById('notificacaoAlunoSearch')
    if (hidden) hidden.value = alunoId || ''
    if (search) search.value = label || ''
    setAlunoDropdownOpen(false)
}

// Inicializar eventos do select de alunos com busca
function initAlunoSearchSelect() {
    const searchInput = document.getElementById('notificacaoAlunoSearch')
    const dropdown = document.getElementById('alunoSelectDropdown')
    const container = document.getElementById('alunoSelectSearch')
    if (!searchInput || !dropdown || !container) return

    let blurTimeout = null

    searchInput.addEventListener('focus', () => {
        if (blurTimeout) clearTimeout(blurTimeout)
        renderAlunoDropdown(searchInput.value)
        setAlunoDropdownOpen(true)
    })

    searchInput.addEventListener('input', () => {
        const val = searchInput.value
        const hidden = document.getElementById('notificacaoAluno')
        if (hidden && hidden.value) {
            const selected = alunos.find(a => String(a.id) === String(hidden.value))
            if (!selected || getAlunoLabel(selected) !== val) hidden.value = ''
        }
        renderAlunoDropdown(val)
        setAlunoDropdownOpen(true)
    })

    searchInput.addEventListener('blur', () => {
        blurTimeout = setTimeout(() => setAlunoDropdownOpen(false), 200)
    })

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setAlunoDropdownOpen(false)
            searchInput.blur()
        }
    })

    dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.aluno-select-option')
        if (!option) return
        const id = option.getAttribute('data-id')
        const label = option.getAttribute('data-label')
        setAlunoSelectValue(id, label)
    })
}

// Carregar alunos para o select com busca
async function loadAlunos() {
    try {
        const { data, error } = await database.select('alunos', {
            select: 'id, nome, matricula, turma',
            order: { column: 'nome', ascending: true }
        })

        if (error) throw error

        alunos = data || []
        renderAlunoDropdown('')
    } catch (error) {
        console.error('Erro ao carregar alunos:', error)
    }
}

// Carregar notificações
async function loadNotificacoes() {
    try {
        console.log('🔄 Carregando notificações...')
        
        const { data, error } = await database.select('notificacoes', {
            select: 'id, aluno_id, data_hora, nivel, descricao, status, registrado_por',
            order: { column: 'data_hora', ascending: false }
        })

        if (error) throw error
        
        // Buscar dados dos alunos separadamente
        if (data && data.length > 0) {
            const { data: alunosData } = await database.select('alunos', {
                select: 'id, nome, matricula, turma'
            })
            
            // Mapear alunos para as notificações
            data.forEach(notif => {
                notif.alunos = alunosData?.find(a => a.id === notif.aluno_id)
            })
        }
        
        notificacoes = data || []
        notificacoesFiltradas = notificacoes
        console.log('📊 Notificações carregadas:', notificacoes.length)
        
        renderNotificacoes(notificacoesFiltradas)
        
    } catch (error) {
        console.error('❌ Erro ao carregar notificações:', error)
        utils.showNotification('Erro ao carregar notificações: ' + error.message, 'error')
    }
}

// Renderizar tabela de notificações
function renderNotificacoes(data) {
    const tbody = document.getElementById('notificacoesTableBody')
    const totalEl = document.getElementById('totalNotificacoesExibidas')

    totalEl.textContent = data.length

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>Nenhuma notificação encontrada</p>
                </td>
            </tr>
        `
        return
    }

    try {
        tbody.innerHTML = data.map(notif => {
            const nivelClass = normalizarNivelParaClasse(notif.nivel)
            const descricaoTexto = notif.descricao || ''
            const descricaoTitle = descricaoTexto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
            return `
            <tr>
                <td>${utils.formatDateTime(notif.data_hora)}</td>
                <td>${notif.alunos?.nome || 'Aluno não encontrado'}<br><small>${notif.alunos?.matricula || 'N/A'} - ${notif.alunos?.turma || 'N/A'}</small></td>
                <td><span class="badge badge-${nivelClass}">${notif.nivel}</span></td>
                <td class="td-descricao" data-descricao="${descricaoTitle}"><span class="descricao-truncada">${escapeHtml(descricaoTexto)}</span></td>
                <td><span class="badge badge-${notif.status}">${notif.status}</span></td>
                <td>
                    <div class="flex-gap-sm">
                        <button class="btn btn-sm btn-success" onclick="enviarWhatsApp('${notif.id}')" title="Enviar WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="gerarPDF('${notif.id}')" title="Gerar PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editarNotificacao('${notif.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletarNotificacao('${notif.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `
        }).join('')
    } catch (error) {
        console.error('Erro ao renderizar notificações:', error)
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>Erro ao carregar notificações</p>
                </td>
            </tr>
        `
    }
}

// Aplicar filtros
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase()
    const nivelFiltro = document.getElementById('nivelFilter').value
    const statusFiltro = document.getElementById('statusFilter').value

    notificacoesFiltradas = notificacoes.filter(notif => {
        const matchSearch = !searchTerm ||
            (notif.alunos?.nome && notif.alunos.nome.toLowerCase().includes(searchTerm)) ||
            (notif.alunos?.matricula && String(notif.alunos.matricula).toLowerCase().includes(searchTerm))

        const matchNivel = !nivelFiltro || notif.nivel === nivelFiltro
        const matchStatus = !statusFiltro || notif.status === statusFiltro

        return matchSearch && matchNivel && matchStatus
    })

    renderNotificacoes(notificacoesFiltradas)
}

// Abrir modal para nova notificação
window.openModalNovo = async function() {
    editingId = null
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Nova Notificação'
    document.getElementById('notificacaoForm').reset()
    document.getElementById('notificacaoId').value = ''
    clearAlunoSelect()

    // Preencher data/hora atual em horário de Brasília
    document.getElementById('notificacaoDataHora').value = utils.toLocalDateTimeString(new Date())
    
    // Preencher "Registrado Por" com display name do usuário e garantir que seja readonly
    const displayName = await getUserDisplayName()
    const registradoPorInput = document.getElementById('notificacaoRegistradoPor')
    if (registradoPorInput) {
        if (displayName) {
            registradoPorInput.value = displayName
        }
        registradoPorInput.readOnly = true
        registradoPorInput.style.background = '#f8fafc'
        registradoPorInput.style.cursor = 'not-allowed'
    }
    
    document.getElementById('notificacaoModal').classList.add('active')
}

// Editar notificação
window.editarNotificacao = async function(id) {
    try {
        const notif = notificacoes.find(n => n.id === id)
        if (!notif) {
            utils.showNotification('Notificação não encontrada', 'error')
            return
        }

        editingId = id
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Notificação'
        document.getElementById('notificacaoId').value = notif.id
        const alunoLabel = notif.alunos ? getAlunoLabel(notif.alunos) : getAlunoLabel(alunos.find(a => a.id === notif.aluno_id))
        setAlunoSelectValue(notif.aluno_id, alunoLabel)
        document.getElementById('notificacaoDataHora').value = utils.toLocalDateTimeString(notif.data_hora)
        document.getElementById('notificacaoNivel').value = notif.nivel
        document.getElementById('notificacaoDescricao').value = notif.descricao
        document.getElementById('notificacaoStatus').value = notif.status
        
        // Manter o valor original do "Registrado Por" e garantir que seja readonly
        const registradoPorInput = document.getElementById('notificacaoRegistradoPor')
        if (registradoPorInput) {
            registradoPorInput.value = notif.registrado_por || ''
            registradoPorInput.readOnly = true
            registradoPorInput.style.background = '#f8fafc'
            registradoPorInput.style.cursor = 'not-allowed'
        }

        document.getElementById('notificacaoModal').classList.add('active')
    } catch (error) {
        console.error('Erro ao editar notificação:', error)
        utils.showNotification('Erro ao carregar dados da notificação', 'error')
    }
}

// Deletar notificação
window.deletarNotificacao = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta notificação? Esta ação não pode ser desfeita.')) {
        return
    }

    try {
        const { error } = await database.delete('notificacoes', id)
        if (error) throw error

        utils.showNotification('Notificação excluída com sucesso!', 'success')
        await loadNotificacoes()
    } catch (error) {
        console.error('Erro ao excluir notificação:', error)
        utils.showNotification('Erro ao excluir notificação: ' + error.message, 'error')
    }
}

// Fechar modal
window.closeModal = function() {
    document.getElementById('notificacaoModal').classList.remove('active')
}

// Fechar modal WhatsApp
window.closeModalWhatsApp = function() {
    document.getElementById('whatsappModal').classList.remove('active')
}

// Variáveis globais para WhatsApp
let whatsappData = null

// Enviar WhatsApp (abre modal de conferência)
window.enviarWhatsApp = async function(notificacaoId) {
    try {
        const notif = notificacoes.find(n => n.id === notificacaoId)
        if (!notif) {
            utils.showNotification('Notificação não encontrada', 'error')
            return
        }

        // Buscar dados COMPLETOS do aluno do banco
        const { data: alunoData, error: alunoError } = await database.select('alunos', {
            select: '*'
        })
        
        if (alunoError) throw alunoError
        
        const alunoCompleto = alunoData?.find(a => a.id === notif.aluno_id)
        
        if (!alunoCompleto) {
            utils.showNotification('Aluno não encontrado', 'error')
            return
        }
        
        console.log('📱 Preparando WhatsApp para:', alunoCompleto)

        // Formatar telefone (remover caracteres especiais)
        const telefone = alunoCompleto.telefone_responsavel.replace(/\D/g, '')
        
        // ✅ ÚNICA ALTERAÇÃO: emojis em Unicode escape (não depende de UTF-8 do arquivo)
        const mensagem = `\uD83C\uDFEB *NOTIFICA ETE - Convocação*

Prezado(a) *${alunoCompleto.responsavel}*,

Informamos que o(a) aluno(a) *${alunoCompleto.nome}* recebeu uma notificação disciplinar.

\u26A0\uFE0F *Tipo de Advertência:* ${notif.nivel}

\uD83D\uDCDD *Informações:*
- Aluno: ${alunoCompleto.nome}
- Matrícula: ${alunoCompleto.matricula}
- Turma: ${alunoCompleto.turma}
- \uD83D\uDCC5 Data do Ocorrido: ${utils.formatDate(notif.data_hora)}

\u2705 *PRESENÇA OBRIGATÓRIA DO RESPONSÁVEL*

Solicitamos sua presença na coordenação pedagógica para tratar do assunto.

\uD83D\uDCF1 *Consulte mais detalhes no Portal:*
${window.location.origin}/pages/portal-responsavel.html

\uD83D\uDD11 *Código de Acesso:* ${alunoCompleto.codigo_portal}

Atenciosamente,
Equipe Pedagógica - Notifica ETE`

        // Salvar dados para uso posterior
        whatsappData = {
            telefone: telefone,
            mensagem: mensagem,
            aluno: alunoCompleto,
            notificacao: notif
        }

        // Preencher modal
        document.getElementById('whatsappMessage').value = mensagem
        document.getElementById('whatsappPhone').value = alunoCompleto.telefone_responsavel

        // Abrir modal de conferência
        document.getElementById('whatsappModal').classList.add('active')

    } catch (error) {
        console.error('Erro ao preparar WhatsApp:', error)
        utils.showNotification('Erro ao preparar mensagem', 'error')
    }
}

// Enviar WhatsApp confirmado
window.enviarWhatsAppConfirmado = function() {
    if (!whatsappData) {
        utils.showNotification('Dados não encontrados', 'error')
        return
    }

    try {
        // Obter mensagem editada
        const mensagemEditada = document.getElementById('whatsappMessage').value
        
        if (!mensagemEditada.trim()) {
            utils.showNotification('Mensagem não pode estar vazia', 'error')
            return
        }

        // Codificar mensagem para URL
        const mensagemCodificada = encodeURIComponent(mensagemEditada)
        
        // Abrir WhatsApp Web
        const urlWhatsApp = `https://wa.me/${whatsappData.telefone}?text=${mensagemCodificada}`
        
        console.log('🔗 URL WhatsApp:', urlWhatsApp)
        
        window.open(urlWhatsApp, '_blank')
        
        // Fechar modal
        closeModalWhatsApp()
        
        utils.showNotification('WhatsApp Web aberto! Mensagem pronta para envio.', 'success')

    } catch (error) {
        console.error('Erro ao abrir WhatsApp:', error)
        utils.showNotification('Erro ao abrir WhatsApp', 'error')
    }
}

// Gerar PDF
window.gerarPDF = async function(notificacaoId) {
    try {
        const notif = notificacoes.find(n => n.id === notificacaoId)
        if (!notif) {
            utils.showNotification('Notificação não encontrada', 'error')
            return
        }

        // Buscar dados COMPLETOS do aluno do banco
        const { data: alunoData, error: alunoError } = await database.select('alunos', {
            select: '*'
        })
        
        if (alunoError) throw alunoError
        
        const alunoCompleto = alunoData?.find(a => a.id === notif.aluno_id)
        
        if (!alunoCompleto) {
            utils.showNotification('Aluno não encontrado', 'error')
            return
        }
        
        console.log('📄 Gerando PDF para:', alunoCompleto)

        // Verificar se jsPDF está disponível
        if (typeof window.jspdf === 'undefined') {
            utils.showNotification('Biblioteca PDF não carregada', 'error')
            return
        }

        const { jsPDF } = window.jspdf
        const doc = new jsPDF()
        
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height
        const margin = 20
        let y = 20

        // Timbre em tamanho A4 (fundo da página): assets/images/timbre.png ou timbre.jpg
        const timbreUrl = new URL('/assets/images/timbre.png', window.location.origin).href
        const timbreJpgUrl = new URL('/assets/images/timbre.jpg', window.location.origin).href
        const loadTimbre = (url, format) => new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth
                    canvas.height = img.naturalHeight
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0)
                    resolve({ dataUrl: canvas.toDataURL('image/' + (format === 'JPEG' ? 'jpeg' : 'png')), format })
                } catch (e) { reject(e) }
            }
            img.onerror = () => reject(new Error('Timbre não carregado'))
            img.src = url
        })
        try {
            const { dataUrl, format } = await loadTimbre(timbreUrl, 'PNG')
            doc.addImage(dataUrl, format, 0, 0, pageWidth, pageHeight)
        } catch {
            try {
                const { dataUrl, format } = await loadTimbre(timbreJpgUrl, 'JPEG')
                doc.addImage(dataUrl, format, 0, 0, pageWidth, pageHeight)
            } catch {
                // Sem timbre
            }
        }

        // Cabeçalho
        doc.setFontSize(22)
        doc.setFont(undefined, 'bold')
        doc.text('NOTIFICAÇÃO DISCIPLINAR', margin, y)
        
        y += 15
        
        // Linha separadora
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 10

        // Dados do Aluno
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('DADOS DO ALUNO', margin, y)
        y += 8
        
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        
        doc.text(`Nome: ${alunoCompleto.nome}`, margin, y); y += 6
        doc.text(`Matrícula: ${alunoCompleto.matricula}`, margin, y); y += 6
        doc.text(`Turma: ${alunoCompleto.turma}`, margin, y); y += 6
        doc.text(`Responsável: ${alunoCompleto.responsavel}`, margin, y); y += 6
        doc.text(`Telefone: ${alunoCompleto.telefone_responsavel}`, margin, y); y += 6
        doc.text(`Código Portal: ${alunoCompleto.codigo_portal}`, margin, y); y += 12

        // Linha separadora
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 10

        // Dados da Notificação
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('DADOS DA NOTIFICAÇÃO', margin, y)
        y += 8
        
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        
        // Data e Hora
        doc.text(`Data/Hora: ${utils.formatDateTime(notif.data_hora)}`, margin, y); y += 6
        
        // Nível
        doc.setFont(undefined, 'bold')
        doc.text(`Nível: `, margin, y)
        doc.setFont(undefined, 'normal')
        
        // Cor baseada no nível
        if (notif.nivel === 'Grave') {
            doc.setTextColor(220, 38, 38)
        } else if (notif.nivel === 'Média') {
            doc.setTextColor(234, 88, 12)
        } else {
            doc.setTextColor(234, 179, 8)
        }
        
        doc.text(notif.nivel, margin + 20, y)
        doc.setTextColor(0, 0, 0)
        y += 6
        
        // Status
        doc.text(`Status: ${notif.status}`, margin, y); y += 6
        
        // Registrado por
        doc.text(`Registrado por: ${notif.registrado_por}`, margin, y); y += 12

        // Linha separadora
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 10

        // Descrição
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('DESCRIÇÃO DA OCORRÊNCIA', margin, y)
        y += 8
        
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        
        const descricaoLinhas = doc.splitTextToSize(notif.descricao, pageWidth - (margin * 2))
        doc.text(descricaoLinhas, margin, y)
        y += (descricaoLinhas.length * 6) + 15

        // Assinaturas
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text('ASSINATURAS', margin, y); y += 15
        
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        doc.text('Declaramos ciência da notificação disciplinar acima descrita.', margin, y); y += 20
        
        // Assinatura do Aluno
        doc.line(margin, y, margin + 70, y)
        doc.setFontSize(9)
        doc.text('Assinatura do Aluno', margin, y + 5)
        
        // Assinatura do Notificador
        doc.line(pageWidth - margin - 70, y, pageWidth - margin, y)
        doc.text('Assinatura do Notificador', pageWidth - margin - 70, y + 5)
        
        y += 20
        
        // Assinatura do Responsável
        doc.line(margin, y, margin + 70, y)
        doc.text('Assinatura do Responsável', margin, y + 5)
        
        // Data
        // doc.line(pageWidth - margin - 50, y, pageWidth - margin, y)
        doc.text('Data: ___/___/___', pageWidth - margin - 50, y + 5)

        // Rodapé
        y = doc.internal.pageSize.height - 15
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        const rodape = `Documento gerado em ${utils.formatDateTime(new Date())} - Sistema Notifica ETE`
        doc.text(rodape, pageWidth / 2, y, { align: 'center' })

        // Download
        const nomeArquivo = `notificacao_${alunoCompleto.matricula}_${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(nomeArquivo)
        
        utils.showNotification('PDF gerado com sucesso!', 'success')

    } catch (error) {
        console.error('Erro ao gerar PDF:', error)
        utils.showNotification('Erro ao gerar PDF: ' + error.message, 'error')
    }
}

// Salvar notificação
document.getElementById('notificacaoForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const saveBtn = document.getElementById('saveBtn')
    const originalText = saveBtn.innerHTML

    const dados = {
        aluno_id: document.getElementById('notificacaoAluno').value,
        data_hora: utils.localDateTimeToISO(document.getElementById('notificacaoDataHora').value),
        nivel: document.getElementById('notificacaoNivel').value,
        descricao: document.getElementById('notificacaoDescricao').value.trim(),
        status: document.getElementById('notificacaoStatus').value,
        registrado_por: document.getElementById('notificacaoRegistradoPor').value.trim()
    }

    try {
        saveBtn.disabled = true
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'

        if (editingId) {
            // Atualizar
            const { error } = await database.update('notificacoes', editingId, dados)
            if (error) throw error
            utils.showNotification('Notificação atualizada com sucesso!', 'success')
        } else {
            // Criar
            const { error } = await database.insert('notificacoes', dados)
            if (error) throw error
            utils.showNotification('Notificação cadastrada com sucesso!', 'success')
        }

        closeModal()
        await loadNotificacoes()
    } catch (error) {
        console.error('Erro ao salvar notificação:', error)
        utils.showNotification('Erro ao salvar notificação: ' + error.message, 'error')
    } finally {
        saveBtn.disabled = false
        saveBtn.innerHTML = originalText
    }
})

// Balão da descrição ao passar o mouse
let descricaoTooltipTimer = null
function showDescricaoTooltip(td) {
    const tooltip = document.getElementById('descricaoTooltip')
    if (!tooltip) return
    const text = td.getAttribute('data-descricao')
    if (!text || !text.trim()) return
    descricaoTooltipTimer = setTimeout(() => {
        tooltip.textContent = text
        tooltip.setAttribute('aria-hidden', 'false')
        tooltip.classList.add('visible')
        const rect = td.getBoundingClientRect()
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
    const tbody = document.getElementById('notificacoesTableBody')
    const tooltip = document.getElementById('descricaoTooltip')
    if (!tbody || !tooltip) return
    tbody.addEventListener('mouseenter', (e) => {
        const td = e.target.closest('.td-descricao')
        if (td) showDescricaoTooltip(td)
    }, true)
    tbody.addEventListener('mouseleave', (e) => {
        const td = e.target.closest('.td-descricao')
        if (td && !tooltip.contains(e.relatedTarget)) hideDescricaoTooltip()
    }, true)
    tooltip.addEventListener('mouseleave', (e) => {
        if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.td-descricao')) hideDescricaoTooltip()
    })
}

// Buscar notificações
document.getElementById('searchInput').addEventListener('input', applyFilters)
document.getElementById('nivelFilter').addEventListener('change', applyFilters)
document.getElementById('statusFilter').addEventListener('change', applyFilters)

// Exportar CSV

// Logout
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault()
    if (confirm('Deseja sair do sistema?')) {
        await auth.logout()
        window.location.href = 'login.html'
    }
})

// Filtrar por aluno da URL
async function filtrarPorAlunoDaURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search)
        const alunoId = urlParams.get('aluno_id')
        
        if (alunoId) {
            // Buscar o aluno pelo ID
            const { data: alunoData, error } = await database.select('alunos', {
                select: 'id, nome, matricula',
                where: { id: alunoId }
            })
            
            if (!error && alunoData && alunoData.length > 0) {
                const aluno = alunoData[0]
                // Preencher o campo de busca com o nome do aluno
                const searchInput = document.getElementById('searchInput')
                if (searchInput) {
                    searchInput.value = aluno.nome
                    // Aplicar o filtro após garantir que as notificações foram carregadas
                    // Usar um pequeno delay para garantir que o renderNotificacoes já foi executado
                    setTimeout(() => {
                        applyFilters()
                        // Scroll suave para a tabela
                        const table = document.getElementById('notificacoesTableBody')
                        if (table) {
                            table.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                    }, 800)
                }
            }
        }
    } catch (error) {
        console.error('Erro ao filtrar por aluno da URL:', error)
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    initAlunoSearchSelect()
    initDescricaoTooltip()
    if (await checkAuth()) {
        await loadAlunos()
        await loadNotificacoes()
        // Verificar se há filtro de aluno na URL
        await filtrarPorAlunoDaURL()
    }
})
