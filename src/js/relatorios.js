// ================================================
// NOTIFICA ETE - Relatórios
// ================================================

// Usar API global
const { auth, database, utils } = SupabaseAPI

// Estado global
let dadosFiltrados = []
let tipoRelatorioAtual = 'alunos'
let turmas = []
let usuarioLogado = null

// Verificar autenticação
async function checkAuth() {
    const { session } = await auth.getSession()
    if (!session) {
        window.location.href = 'login.html'
        return false
    }
    
    // Salvar dados do usuário logado
    usuarioLogado = {
        email: session.user.email || 'N/A',
        id: session.user.id || 'N/A'
    }
    
    // Tentar obter mais informações do usuário
    try {
        const { user } = await auth.getCurrentUser()
        if (user) {
            usuarioLogado.email = user.email || usuarioLogado.email
            usuarioLogado.nome = user.user_metadata?.nome || user.user_metadata?.full_name || null
        }
    } catch (error) {
        console.warn('Não foi possível obter dados completos do usuário:', error)
    }
    
    return true
}

// Carregar turmas para o filtro
async function loadTurmas() {
    try {
        const { data, error } = await database.select('alunos', {
            select: 'turma'
        })

        if (error) throw error

        turmas = [...new Set((data || []).map(a => a.turma).filter(Boolean))].sort()
        const select = document.getElementById('turmaFiltro')
        
        if (select) {
            select.innerHTML = '<option value="">Todas as Turmas</option>' + 
                turmas.map(turma => `<option value="${turma}">${turma}</option>`).join('')
        }
    } catch (error) {
        console.error('Erro ao carregar turmas:', error)
    }
}

// Configurar filtros dinâmicos
const tipoRelatorioSelect = document.getElementById('tipoRelatorio')
if (tipoRelatorioSelect) {
    tipoRelatorioSelect.addEventListener('change', (e) => {
        tipoRelatorioAtual = e.target.value
        
        // Mostrar/ocultar filtros baseado no tipo
        const turmaGroup = document.getElementById('turmaFilterGroup')
        const nivelGroup = document.getElementById('nivelFilterGroup')
        const statusGroup = document.getElementById('statusFilterGroup')
        
        if (tipoRelatorioAtual === 'alunos') {
            if (turmaGroup) turmaGroup.style.display = 'block'
            if (nivelGroup) nivelGroup.style.display = 'none'
            if (statusGroup) statusGroup.style.display = 'none'
        } else if (tipoRelatorioAtual === 'notificacoes') {
            if (turmaGroup) turmaGroup.style.display = 'block'
            if (nivelGroup) nivelGroup.style.display = 'block'
            if (statusGroup) statusGroup.style.display = 'block'
        } else {
            if (turmaGroup) turmaGroup.style.display = 'block'
            if (nivelGroup) nivelGroup.style.display = 'block'
            if (statusGroup) statusGroup.style.display = 'block'
        }
        
        limparFiltros()
    })
}

// Aplicar filtros
window.aplicarFiltros = async function() {
    try {
        const tipoRelatorio = document.getElementById('tipoRelatorio')?.value || 'alunos'
        const dataInicio = document.getElementById('dataInicio')?.value || ''
        const dataFim = document.getElementById('dataFim')?.value || ''
        const turma = document.getElementById('turmaFiltro')?.value || ''
        const nivel = document.getElementById('nivelFiltro')?.value || ''
        const status = document.getElementById('statusFiltro')?.value || ''

        const previewContainer = document.getElementById('previewContainer')
        if (previewContainer) {
            previewContainer.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Carregando dados...</p></div>'
        }

        let dados = []

        if (tipoRelatorio === 'alunos') {
            dados = await carregarAlunos(turma)
        } else if (tipoRelatorio === 'notificacoes') {
            dados = await carregarNotificacoes(dataInicio, dataFim, turma, nivel, status)
        } else if (tipoRelatorio === 'consolidado') {
            dados = await carregarConsolidado(dataInicio, dataFim, turma, nivel, status)
        }

        dadosFiltrados = dados
        renderizarPreview(dados, tipoRelatorio)
        atualizarEstatisticas(dados, tipoRelatorio)

    } catch (error) {
        console.error('Erro ao aplicar filtros:', error)
        utils.showNotification('Erro ao carregar dados: ' + error.message, 'error')
    }
}

// Carregar alunos
async function carregarAlunos(turma) {
    const { data, error } = await database.select('alunos', {
        select: '*',
        order: { column: 'nome', ascending: true }
    })

    if (error) throw error

    let alunos = data || []

    if (turma) {
        alunos = alunos.filter(a => a.turma === turma)
    }

    return alunos.map(a => {
        // Garantir que a data seja tratada corretamente
        let dataNascFormatada = 'N/A'
        if (a.data_nascimento) {
            try {
                dataNascFormatada = utils.formatDate(a.data_nascimento)
            } catch (error) {
                console.warn('Erro ao formatar data de nascimento:', a.data_nascimento, error)
                dataNascFormatada = a.data_nascimento ? String(a.data_nascimento) : 'N/A'
            }
        }
        
        return {
            'Código Portal': a.codigo_portal || 'N/A',
            'Nome': a.nome || 'N/A',
            'Data Nascimento': dataNascFormatada,
            'Matrícula': a.matricula || 'N/A',
            'Turma': a.turma || 'N/A',
            'Responsável': a.responsavel || 'N/A',
            'Telefone': a.telefone_responsavel || 'N/A'
        }
    })
}

// Carregar notificações
async function carregarNotificacoes(dataInicio, dataFim, turma, nivel, status) {
    const { data: notifData, error: notifError } = await database.select('notificacoes', {
        select: '*',
        order: { column: 'data_hora', ascending: false }
    })

    if (notifError) throw notifError

    const { data: alunosData, error: alunosError } = await database.select('alunos', {
        select: '*'
    })

    if (alunosError) throw alunosError

    let notificacoes = (notifData || []).map(n => {
        const aluno = alunosData?.find(a => a.id === n.aluno_id)
        return {
            ...n,
            aluno: aluno
        }
    })

    // Aplicar filtros
    if (dataInicio) {
        const inicio = new Date(dataInicio + 'T00:00:00')
        notificacoes = notificacoes.filter(n => {
            const dataNotif = new Date(n.data_hora)
            return dataNotif >= inicio
        })
    }
    if (dataFim) {
        const fim = new Date(dataFim + 'T23:59:59')
        notificacoes = notificacoes.filter(n => {
            const dataNotif = new Date(n.data_hora)
            return dataNotif <= fim
        })
    }
    if (turma) {
        notificacoes = notificacoes.filter(n => n.aluno?.turma === turma)
    }
    if (nivel) {
        notificacoes = notificacoes.filter(n => n.nivel === nivel)
    }
    if (status) {
        notificacoes = notificacoes.filter(n => n.status === status)
    }

    return notificacoes.map(n => {
        // Garantir que a data seja tratada corretamente
        let dataFormatada = 'N/A'
        if (n.data_hora) {
            try {
                dataFormatada = utils.formatDateTime(n.data_hora)
            } catch (error) {
                console.warn('Erro ao formatar data:', n.data_hora, error)
                dataFormatada = n.data_hora ? String(n.data_hora) : 'N/A'
            }
        }
        
        return {
            'Data/Hora': dataFormatada,
            'Aluno': n.aluno?.nome || 'N/A',
            'Matrícula': n.aluno?.matricula || 'N/A',
            'Turma': n.aluno?.turma || 'N/A',
            'Nível': n.nivel || 'N/A',
            'Status': n.status || 'N/A',
            
            'Registrado Por': n.registrado_por || 'N/A'
        }
    })
}

// Carregar relatório consolidado
async function carregarConsolidado(dataInicio, dataFim, turma, nivel, status) {
    const alunos = await carregarAlunos(turma)
    const notificacoes = await carregarNotificacoes(dataInicio, dataFim, turma, nivel, status)

    // Combinar dados
    const consolidado = alunos.map(aluno => {
        const notifAluno = notificacoes.filter(n => n.Matrícula === aluno.Matrícula)
        return {
            ...aluno,
            'Total Notificações': notifAluno.length,
            'Notificações Leves': notifAluno.filter(n => n.Nível === 'Leve').length,
            'Notificações Médias': notifAluno.filter(n => n.Nível === 'Média').length,
            'Notificações Graves': notifAluno.filter(n => n.Nível === 'Grave').length,
            'Pendentes': notifAluno.filter(n => n.Status === 'pendente').length
        }
    })

    return consolidado
}

// Renderizar preview
function renderizarPreview(dados, tipo) {
    const container = document.getElementById('previewContainer')
    
    if (!container) {
        console.warn('Elemento previewContainer não encontrado')
        return
    }

    if (!dados || dados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox empty-state-icon"></i>
                <p class="empty-state-title">Nenhum dado encontrado</p>
                <p class="empty-state-text">Ajuste os filtros e tente novamente</p>
            </div>
        `
        return
    }

    const headers = Object.keys(dados[0])
    const maxRows = 50 // Limitar preview a 50 linhas

    let html = `
        <div class="overflow-wrapper">
            <table class="table table-responsive">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${dados.slice(0, maxRows).map(row => `
                        <tr>
                            ${headers.map(h => `<td>${row[h] || 'N/A'}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${dados.length > maxRows ? `
                <div class="preview-info">
                    <i class="fas fa-info-circle"></i>
                    Mostrando ${maxRows} de ${dados.length} registros. O relatório completo será exportado.
                </div>
            ` : ''}
        </div>
    `

    container.innerHTML = html
}

// Atualizar estatísticas
function atualizarEstatisticas(dados, tipo) {
    const container = document.getElementById('estatisticasContainer')
    
    if (!container) {
        console.warn('Elemento estatisticasContainer não encontrado')
        return
    }

    if (tipo === 'notificacoes') {
        const niveis = {
            'Leves': dados.filter(d => d.Nível === 'Leve').length,
            'Médias': dados.filter(d => d.Nível === 'Média').length,
            'Graves': dados.filter(d => d.Nível === 'Grave').length
        }

        container.innerHTML = `
            <div class="stat-box">
                <div class="stat-box-value">${dados.length}</div>
                <div class="stat-box-label">Total de Registros</div>
            </div>
            <div class="stat-box stat-leve">
                <div class="stat-box-value">${niveis.Leves}</div>
                <div class="stat-box-label">Leves</div>
            </div>
            <div class="stat-box stat-media">
                <div class="stat-box-value">${niveis.Médias}</div>
                <div class="stat-box-label">Médias</div>
            </div>
            <div class="stat-box stat-grave">
                <div class="stat-box-value">${niveis.Graves}</div>
                <div class="stat-box-label">Graves</div>
            </div>
        `
    } else if (tipo === 'consolidado') {
        const niveis = {
            'Leves': dados.reduce((sum, d) => sum + (d['Notificações Leves'] || 0), 0),
            'Médias': dados.reduce((sum, d) => sum + (d['Notificações Médias'] || 0), 0),
            'Graves': dados.reduce((sum, d) => sum + (d['Notificações Graves'] || 0), 0)
        }

        container.innerHTML = `
            <div class="stat-box">
                <div class="stat-box-value">${dados.length}</div>
                <div class="stat-box-label">Total de Alunos</div>
            </div>
            <div class="stat-box stat-leve">
                <div class="stat-box-value">${niveis.Leves}</div>
                <div class="stat-box-label">Notificações Leves</div>
            </div>
            <div class="stat-box stat-media">
                <div class="stat-box-value">${niveis.Médias}</div>
                <div class="stat-box-label">Notificações Médias</div>
            </div>
            <div class="stat-box stat-grave">
                <div class="stat-box-value">${niveis.Graves}</div>
                <div class="stat-box-label">Notificações Graves</div>
            </div>
        `
    } else {
        container.innerHTML = `
            <div class="stat-box">
                <div class="stat-box-value">${dados.length}</div>
                <div class="stat-box-label">Total de Alunos</div>
            </div>
        `
    }
}

// Limpar filtros
window.limparFiltros = function() {
    const dataInicio = document.getElementById('dataInicio')
    const dataFim = document.getElementById('dataFim')
    const turmaFiltro = document.getElementById('turmaFiltro')
    const nivelFiltro = document.getElementById('nivelFiltro')
    const statusFiltro = document.getElementById('statusFiltro')
    
    if (dataInicio) dataInicio.value = ''
    if (dataFim) dataFim.value = ''
    if (turmaFiltro) turmaFiltro.value = ''
    if (nivelFiltro) nivelFiltro.value = ''
    if (statusFiltro) statusFiltro.value = ''
    
    dadosFiltrados = []
    const previewContainer = document.getElementById('previewContainer')
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter empty-state-icon"></i>
                <p class="empty-state-title">Selecione um tipo de relatório e aplique os filtros</p>
            </div>
        `
    }
    
    const estatisticasContainer = document.getElementById('estatisticasContainer')
    if (estatisticasContainer) {
        estatisticasContainer.innerHTML = `
            <div class="stat-box">
                <div class="stat-box-value">0</div>
                <div class="stat-box-label">Total de Registros</div>
            </div>
        `
    }
}

// Carregar imagem do timbre (retorna { dataUrl, format } ou null)
function loadTimbreImage(url, format) {
    return new Promise((resolve) => {
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
            } catch (e) { resolve(null) }
        }
        img.onerror = () => resolve(null)
        img.src = url
    })
}

// Gerar PDF
window.gerarPDF = async function() {
    if (dadosFiltrados.length === 0) {
        utils.showNotification('Não há dados para exportar. Aplique os filtros primeiro.', 'error')
        return
    }

    try {
        if (typeof window.jspdf === 'undefined') {
            utils.showNotification('Biblioteca PDF não carregada', 'error')
            return
        }

        const { jsPDF } = window.jspdf
        const doc = new jsPDF('landscape', 'mm', 'a4')
        
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height
        const margin = 10
        let y = margin

        // Timbre horizontal (fundo A4 paisagem): assets/images/timbre horizontal.png ou .jpg
        const baseAssets = window.location.origin + '/assets/images/'
        const timbrePngUrl = baseAssets + encodeURIComponent('timbre horizontal.png')
        const timbreJpgUrl = baseAssets + encodeURIComponent('timbre horizontal.jpg')
        let timbre = await loadTimbreImage(timbrePngUrl, 'PNG')
        if (!timbre) timbre = await loadTimbreImage(timbreJpgUrl, 'JPEG')
        const addTimbreToCurrentPage = () => {
            if (timbre) doc.addImage(timbre.dataUrl, timbre.format, 0, 0, pageWidth, pageHeight)
        }
        addTimbreToCurrentPage()

        // Cabeçalho
        // doc.setFontSize(20)
        // doc.setFont(undefined, 'bold')
        // doc.setTextColor(10, 42, 89)
        // doc.text('NOTIFICA ETE - RELATÓRIO', pageWidth / 2, y, { align: 'center' })
        
        y += 10
        
        // Tipo de relatório
        doc.setFontSize(14)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(100, 116, 139)
        const tipoTexto = {
            'alunos': 'Relatório de Alunos',
            'notificacoes': 'Relatório de Notificações',
            'consolidado': 'Relatório Consolidado'
        }[tipoRelatorioAtual] || 'Relatório'
        doc.text(tipoTexto, pageWidth / 2, y, { align: 'center' })
        
        y += 8
        
        // Data de geração e usuário
        doc.setFontSize(10)
        const dataGeracao = utils.formatDateTime(new Date())
        doc.text(`Gerado em: ${dataGeracao}`, pageWidth / 2, y, { align: 'center' })
        y += 5
        
        if (usuarioLogado) {
            const usuarioTexto = usuarioLogado.nome 
                ? `Gerado por: ${usuarioLogado.nome} (${usuarioLogado.email})`
                : `Gerado por: ${usuarioLogado.email}`
            doc.text(usuarioTexto, pageWidth / 2, y, { align: 'center' })
        }
        
        y += 10
        
        // Linha separadora
        doc.setLineWidth(0.5)
        doc.setDrawColor(10, 42, 89)
        doc.line(margin, y, pageWidth - margin, y)
        y += 8

        // Tabela
        const headers = Object.keys(dadosFiltrados[0])
        const colWidth = (pageWidth - (margin * 2)) / headers.length
        
        // Cabeçalho da tabela
        doc.setFontSize(9)
        doc.setFont(undefined, 'bold')
        doc.setFillColor(10, 42, 89)
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
        doc.setTextColor(255, 255, 255)
        
        headers.forEach((header, index) => {
            doc.text(header.substring(0, 15), margin + (index * colWidth) + 2, y + 5)
        })
        
        y += 8
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'normal')
        doc.setFontSize(8)

        // Dados
        dadosFiltrados.forEach((row, rowIndex) => {
            if (y > pageHeight - 20) {
                doc.addPage()
                addTimbreToCurrentPage()
                y = margin
            }

            headers.forEach((header, colIndex) => {
                const value = String(row[header] || 'N/A').substring(0, 20)
                doc.text(value, margin + (colIndex * colWidth) + 2, y + 4)
            })
            
            y += 5
        })

        // Rodapé
        const totalPages = doc.internal.pages.length - 1
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            
            const rodapeTexto = usuarioLogado
                ? `Página ${i} de ${totalPages} - Notifica ETE | Gerado por: ${usuarioLogado.email}`
                : `Página ${i} de ${totalPages} - Notifica ETE`
            
            doc.text(
                rodapeTexto,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            )
        }

        // Download
        const nomeArquivo = `relatorio_${tipoRelatorioAtual}_${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(nomeArquivo)
        
        utils.showNotification('PDF gerado com sucesso!', 'success')

    } catch (error) {
        console.error('Erro ao gerar PDF:', error)
        utils.showNotification('Erro ao gerar PDF: ' + error.message, 'error')
    }
}

// Gerar Excel
window.gerarExcel = function() {
    if (dadosFiltrados.length === 0) {
        utils.showNotification('Não há dados para exportar. Aplique os filtros primeiro.', 'error')
        return
    }

    try {
        if (typeof XLSX === 'undefined') {
            utils.showNotification('Biblioteca Excel não carregada', 'error')
            return
        }

        // Criar workbook
        const wb = XLSX.utils.book_new()
        
        // Converter dados para worksheet
        const ws = XLSX.utils.json_to_sheet(dadosFiltrados)
        
        // Ajustar largura das colunas
        const colWidths = Object.keys(dadosFiltrados[0]).map(() => ({ wch: 20 }))
        ws['!cols'] = colWidths
        
        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
        
        // Criar sheet de informações
        const usuarioTexto = usuarioLogado 
            ? (usuarioLogado.nome 
                ? `${usuarioLogado.nome} (${usuarioLogado.email})`
                : usuarioLogado.email)
            : 'N/A'
        
        const infoData = [
            ['NOTIFICA ETE - RELATÓRIO'],
            [''],
            ['Tipo de Relatório:', {
                'alunos': 'Relatório de Alunos',
                'notificacoes': 'Relatório de Notificações',
                'consolidado': 'Relatório Consolidado'
            }[tipoRelatorioAtual] || 'Relatório'],
            ['Data de Geração:', utils.formatDateTime(new Date())],
            ['Gerado por:', usuarioTexto],
            ['Total de Registros:', dadosFiltrados.length],
            ['']
        ]
        
        const infoWs = XLSX.utils.aoa_to_sheet(infoData)
        XLSX.utils.book_append_sheet(wb, infoWs, 'Informações')
        
        // Download
        const nomeArquivo = `relatorio_${tipoRelatorioAtual}_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, nomeArquivo)
        
        utils.showNotification('Excel gerado com sucesso!', 'success')

    } catch (error) {
        console.error('Erro ao gerar Excel:', error)
        utils.showNotification('Erro ao gerar Excel: ' + error.message, 'error')
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
        await loadTurmas()
        setupLogout()
        
        // Configurar data padrão (últimos 30 dias)
        const hoje = new Date()
        const trintaDiasAtras = new Date()
        trintaDiasAtras.setDate(hoje.getDate() - 30)
        
        const dataFimInput = document.getElementById('dataFim')
        const dataInicioInput = document.getElementById('dataInicio')
        
        if (dataFimInput) dataFimInput.value = utils.toLocalDateString(hoje)
        if (dataInicioInput) dataInicioInput.value = utils.toLocalDateString(trintaDiasAtras)
    }
})

