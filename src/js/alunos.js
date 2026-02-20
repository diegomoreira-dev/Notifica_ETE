const { auth, database, utils } = SupabaseAPI

let alunos = []
let alunosFiltrados = []
let editingId = null

// Evita que texto do usuário quebre o HTML ou o tooltip
function escapeDescricaoAttr(str) {
    if (!str) return ''
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeHtml(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

async function checkAuth() {
    const { session } = await auth.getSession()
    if (!session) {
        window.location.href = 'login.html'
        return false
    }
    return true
}

async function loadAlunos() {
    try {
        console.log('🔄 Carregando alunos...')
        
        const { data, error } = await database.select('alunos', {
            select: '*',
            order: { column: 'nome', ascending: true }
        })

        if (error) throw error

        alunos = data || []
        alunosFiltrados = alunos
        console.log('📊 Alunos carregados:', alunos.length)
        
        renderAlunos(alunosFiltrados)
        populateTurmaFilter()

    } catch (error) {
        console.error('❌ Erro ao carregar alunos:', error)
        utils.showNotification('Erro ao carregar alunos: ' + error.message, 'error')
    }
}

function populateTurmaFilter() {
    const turmas = [...new Set(alunos.map(a => a.turma).filter(Boolean))].sort()
    const select = document.getElementById('turmaFilter')
    
    select.innerHTML = '<option value="">Todas as Turmas</option>' + 
        turmas.map(turma => `<option value="${turma}">${turma}</option>`).join('')
}

function renderAlunos(data) {
    const tbody = document.getElementById('alunosTableBody')
    const totalEl = document.getElementById('totalAlunosExibidos')

    totalEl.textContent = data.length

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>Nenhum aluno encontrado</p>
                </td>
            </tr>
        `
        updateExcluirSelecionadosState()
        return
    }

    try {
        tbody.innerHTML = data.map(aluno => `
            <tr>
                <td class="td-checkbox">
                    <input type="checkbox" class="aluno-check" data-id="${aluno.id}" aria-label="Selecionar aluno">
                </td>
                <td><strong>${aluno.codigo_portal || 'N/A'}</strong></td>
                <td>${aluno.nome || 'N/A'}</td>
                <td>${utils.formatDate(aluno.data_nascimento)}</td>
                <td>${aluno.matricula || 'N/A'}</td>
                <td><span class="badge badge-info">${aluno.turma || 'N/A'}</span></td>
                <td>${aluno.responsavel || 'N/A'}</td>
                <td>${utils.formatPhone(aluno.telefone_responsavel)}</td>
                <td>
                    <div class="flex-gap-sm">
                        <button class="btn btn-sm btn-warning" onclick="verNotificacoesAluno('${aluno.id}')" title="Ver Notificações">
                            <i class="fas fa-bell"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editarAluno('${aluno.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletarAluno('${aluno.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('')

        const selectAll = document.getElementById('selectAllAlunos')
        if (selectAll) {
            selectAll.checked = false
            selectAll.indeterminate = false
        }
        updateExcluirSelecionadosState()
    } catch (error) {
        console.error('Erro ao renderizar alunos:', error)
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>Erro ao carregar alunos</p>
                </td>
            </tr>
        `
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase()
    const turmaFiltro = document.getElementById('turmaFilter').value

    alunosFiltrados = alunos.filter(aluno => {
        const matchSearch = !searchTerm || 
            aluno.nome.toLowerCase().includes(searchTerm) ||
            aluno.matricula.toLowerCase().includes(searchTerm) ||
            aluno.codigo_portal.includes(searchTerm)

        const matchTurma = !turmaFiltro || aluno.turma === turmaFiltro

        return matchSearch && matchTurma
    })

    renderAlunos(alunosFiltrados)
}

window.openModalNovo = function() {
    editingId = null
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Novo Aluno'
    document.getElementById('alunoForm').reset()
    document.getElementById('alunoId').value = ''
    gerarCodigoPortal()
    document.getElementById('alunoModal').classList.add('active')
}

window.gerarCodigoPortal = function() {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString()
    document.getElementById('alunoCodigoPortal').value = codigo
}

window.editarAluno = async function(id) {
    try {
        const aluno = alunos.find(a => a.id === id)
        if (!aluno) {
            utils.showNotification('Aluno não encontrado', 'error')
        return
    }
    
        editingId = id
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Aluno'
        document.getElementById('alunoId').value = aluno.id
        document.getElementById('alunoNome').value = aluno.nome
        document.getElementById('alunoDataNascimento').value = aluno.data_nascimento
        document.getElementById('alunoMatricula').value = aluno.matricula
        document.getElementById('alunoTurma').value = aluno.turma
        document.getElementById('alunoResponsavel').value = aluno.responsavel
        document.getElementById('alunoTelefone').value = aluno.telefone_responsavel
        document.getElementById('alunoCodigoPortal').value = aluno.codigo_portal

        document.getElementById('alunoModal').classList.add('active')
    } catch (error) {
        console.error('Erro ao editar aluno:', error)
        utils.showNotification('Erro ao carregar dados do aluno', 'error')
    }
}

window.deletarAluno = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) {
        return
    }
    
    try {
        const { error } = await database.delete('alunos', id)
        if (error) throw error
        
        utils.showNotification('Aluno excluído com sucesso!', 'success')
        await loadAlunos()
    } catch (error) {
        console.error('Erro ao excluir aluno:', error)
        utils.showNotification('Erro ao excluir aluno: ' + error.message, 'error')
    }
}

function updateExcluirSelecionadosState() {
    const checkboxes = document.querySelectorAll('.aluno-check:checked')
    const total = checkboxes.length
    const btn = document.getElementById('btnExcluirSelecionados')
    const label = document.getElementById('btnExcluirSelecionadosLabel')
    const selectAll = document.getElementById('selectAllAlunos')
    if (btn) {
        btn.style.display = total > 0 ? '' : 'none'
        btn.disabled = total === 0
    }
    if (label) {
        label.textContent = total > 0 ? `Excluir selecionados (${total})` : 'Excluir selecionados'
    }
    if (selectAll) {
        const all = document.querySelectorAll('.aluno-check')
        selectAll.checked = all.length > 0 && all.length === total
        selectAll.indeterminate = total > 0 && total < all.length
    }
}

window.excluirSelecionados = async function() {
    const ids = [...document.querySelectorAll('.aluno-check:checked')].map(cb => cb.getAttribute('data-id'))
    if (!ids.length) return
    if (!confirm(`Tem certeza que deseja excluir ${ids.length} aluno(s)? Esta ação não pode ser desfeita.`)) {
        return
    }
    const btn = document.getElementById('btnExcluirSelecionados')
    if (btn) {
        btn.disabled = true
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...'
    }
    try {
        let ok = 0
        let erros = 0
        for (const id of ids) {
            const { error } = await database.delete('alunos', id)
            if (error) {
                console.error('Erro ao excluir aluno', id, error)
                erros++
            } else {
                ok++
            }
        }
        if (erros > 0) {
            utils.showNotification(`${ok} excluído(s). Falha ao excluir ${erros} aluno(s).`, 'error')
        } else {
            utils.showNotification(`${ok} aluno(s) excluído(s) com sucesso!`, 'success')
        }
        await loadAlunos()
    } catch (error) {
        console.error('Erro ao excluir em massa:', error)
        utils.showNotification('Erro ao excluir alunos: ' + error.message, 'error')
    } finally {
        if (btn) {
            btn.disabled = false
            btn.innerHTML = '<i class="fas fa-trash-alt"></i> <span id="btnExcluirSelecionadosLabel">Excluir selecionados</span>'
            updateExcluirSelecionadosState()
        }
    }
}

window.closeModal = function() {
    document.getElementById('alunoModal').classList.remove('active')
}

window.closeModalNotificacoes = function() {
    document.getElementById('notificacoesAlunoModal').classList.remove('active')
}

// Tooltip da descrição no modal de notificações do aluno
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

window.abrirModalImportacao = async function() {
    await loadAlunos()
    document.getElementById('importacaoModal').classList.add('active')
}

window.closeModalImportacao = function() {
    document.getElementById('importacaoModal').classList.remove('active')
    document.getElementById('importacaoForm').reset()
    document.getElementById('importacaoProgress').style.display = 'none'
}

window.baixarTemplateExcel = function() {
    try {
        if (typeof XLSX === 'undefined') {
            utils.showNotification('Biblioteca Excel não carregada', 'error')
            return
        }

        const wb = XLSX.utils.book_new()
        // Dados de exemplo no template 
        const templateData = [
            ['nome', 'data_nascimento', 'matricula', 'turma', 'responsavel', 'telefone_responsavel'],
            ['João Silva', '15-03-2005', '2024001', '3º A', 'Maria Silva', '(81) 99999-9999'],
            ['Ana Costa', '22-07-2006', '2024002', '2º B', 'José Costa', '(81) 88888-8888'],
            ['Pedro Santos', '08-11-2007', '2024003', '1º C', 'Lucia Santos', '(81) 77777-7777']
        ]
        
        const ws = XLSX.utils.aoa_to_sheet(templateData)
        // Cabeçalho do Excel 
        const headerStyle = {
            fill: { patternType: 'solid', fgColor: { rgb: 'FF1E3A8A' }, bgColor: { rgb: 'FF1E3A8A' } },
            font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 11 }
        }
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
            if (ws[cellRef]) {
                ws[cellRef].s = headerStyle
            }
        }
        
        ws['!cols'] = [
            { wch: 20 }, // nome
            { wch: 15 }, // data_nascimento
            { wch: 12 }, // matricula
            { wch: 10 }, // turma
            { wch: 20 }, // responsavel
            { wch: 18 }  // telefone_responsavel
        ]
        
        XLSX.utils.book_append_sheet(wb, ws, 'Alunos')
        const nomeArquivo = `template_importacao_alunos_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, nomeArquivo)
        
        utils.showNotification('Template Excel baixado com sucesso!', 'success')

    } catch (error) {
        console.error('Erro ao gerar template Excel:', error)
        utils.showNotification('Erro ao gerar template Excel', 'error')
    }
}

window.baixarTemplateCSV = function() {
    try {
        const csvContent = `nome,data_nascimento,matricula,turma,responsavel,telefone_responsavel
João Silva,2005-03-15,2024001,3º A,Maria Silva,(81) 99999-9999
Ana Costa,2006-07-22,2024002,2º B,José Costa,(81) 88888-8888
Pedro Santos,2007-11-08,2024003,1º C,Lucia Santos,(81) 77777-7777`
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        
        link.setAttribute('href', url)
        link.setAttribute('download', `template_importacao_alunos_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        utils.showNotification('Template CSV baixado com sucesso!', 'success')

    } catch (error) {
        console.error('Erro ao gerar template CSV:', error)
        utils.showNotification('Erro ao gerar template CSV', 'error')
    }
}

window.verNotificacoesAluno = async function(alunoId) {
    try {
        const aluno = alunos.find(a => a.id === alunoId)
        if (!aluno) {
            utils.showNotification('Aluno não encontrado', 'error')
            return
        }

        const { data: notifData, error } = await database.select('notificacoes', {
            select: '*',
            order: { column: 'data_hora', ascending: false }
        })
        
        if (error) throw error
        
        const notificacoesAluno = notifData?.filter(n => n.aluno_id === alunoId) || []

        document.getElementById('notificacoesModalTitle').innerHTML = `
            <i class="fas fa-bell"></i>
            Notificações de ${aluno.nome}
        `

        const infoDiv = document.getElementById('notificacoesAlunoInfo')
        infoDiv.innerHTML = `
            <div class="grid-auto bg-light rounded-12 p-1">
                <div>
                    <strong>Matrícula:</strong> ${aluno.matricula}
                </div>
                <div>
                    <strong>Turma:</strong> ${aluno.turma}
                </div>
                <div>
                    <strong>Total:</strong> <span class="badge badge-info">${notificacoesAluno.length}</span>
                </div>
            </div>
        `

        const listaDiv = document.getElementById('notificacoesAlunoLista')
        
        if (notificacoesAluno.length === 0) {
            listaDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle empty-state-icon"></i>
                    <p class="empty-state-title">Nenhuma notificação registrada</p>
                    <p class="empty-state-text">Este aluno não possui notificações disciplinares.</p>
                </div>
            `
        } else {
            try {
                listaDiv.innerHTML = notificacoesAluno.map(notif => {
                    let nivelClass = notif.nivel ? notif.nivel.toLowerCase() : 'leve'
                    nivelClass = nivelClass.replace(/á|à|â|ã|ä/g, 'a')
                    nivelClass = nivelClass.replace(/é|è|ê|ë/g, 'e')
                    nivelClass = nivelClass.replace(/í|ì|î|ï/g, 'i')
                    nivelClass = nivelClass.replace(/ó|ò|ô|õ|ö/g, 'o')
                    nivelClass = nivelClass.replace(/ú|ù|û|ü/g, 'u')
                    nivelClass = nivelClass.replace(/ç/g, 'c')
                    const descricaoTexto = notif.descricao || 'N/A'
                    const descricaoAttr = escapeDescricaoAttr(descricaoTexto)
                    const descricaoHtml = escapeHtml(descricaoTexto)
                    return `
                    <div class="card mb-1">
                        <div class="card-header flex-between">
                            <div class="notification-badges">
                                <span class="badge badge-${nivelClass}">${notif.nivel || 'N/A'}</span>
                                <span class="badge badge-${notif.status || 'pendente'} ml-0-5">${notif.status || 'N/A'}</span>
                            </div>
                            <span class="text-muted">
                                <i class="fas fa-clock"></i>
                                ${utils.formatDateTime(notif.data_hora)}
                            </span>
                        </div>
                        <div class="card-body">
                            <p><strong>Descrição:</strong></p>
                            <div class="descricao-tooltip-trigger" data-descricao="${descricaoAttr}"><span class="descricao-truncada">${descricaoHtml}</span></div>
                            <p class="mt-1"><small><strong>Registrado por:</strong> ${notif.registrado_por || 'N/A'}</small></p>
                        </div>
                    </div>
                    `
                }).join('')
            } catch (error) {
                console.error('Erro ao renderizar notificações do aluno:', error)
                listaDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        Erro ao carregar notificações
                    </div>
                `
            }
        }

        document.getElementById('notificacoesAlunoModal').classList.add('active')
        
    } catch (error) {
        console.error('Erro ao carregar notificações do aluno:', error)
        utils.showNotification('Erro ao carregar notificações', 'error')
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

function parseFileData(data, fileName) {
    return parseExcel(data)
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((header, index) => {
            obj[header] = values[index] || ''
        })
        return obj
    })
}

function parseExcel(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet)
}

function isValidDate(dateString) {
    if (!dateString) return false
    
    // Aceita DD-MM-AAAA ou AAAA-MM-DD
    const formatoBrasileiro = /^\d{2}-\d{2}-\d{4}$/
    const formatoISO = /^\d{4}-\d{2}-\d{2}$/
    
    if (!formatoBrasileiro.test(dateString) && !formatoISO.test(dateString)) {
        return false
    }
    
    let dataISO = dateString
    if (formatoBrasileiro.test(dateString)) {
        const partes = dateString.split('-')
        dataISO = `${partes[2]}-${partes[1]}-${partes[0]}`
    }
    
    const date = new Date(dataISO)
    return date instanceof Date && !isNaN(date)
}

function converterDataParaISO(dateString) {
    if (!dateString) return null
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
    }
    
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        const partes = dateString.split('-')
        return `${partes[2]}-${partes[1]}-${partes[0]}`
    }
    
    return dateString
}

function generatePortalCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

document.getElementById('importacaoForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const arquivo = document.getElementById('arquivoImportacao').files[0]
    if (!arquivo) {
        utils.showNotification('Selecione um arquivo', 'error')
        return
    }

    try {
        const progressDiv = document.getElementById('importacaoProgress')
        const progressBar = document.getElementById('progressBar')
        const statusP = document.getElementById('importacaoStatus')
        
        progressDiv.style.display = 'block'
        progressBar.style.width = '10%'
        statusP.textContent = 'Lendo arquivo...'

        // Ler arquivo
        const data = await readFile(arquivo)
        progressBar.style.width = '30%'
        statusP.textContent = 'Processando dados...'

        // Converter para JSON
        const alunosData = parseFileData(data, arquivo.name)
        progressBar.style.width = '50%'
        statusP.textContent = `Encontrados ${alunosData.length} alunos...`

        const alunosValidos = []
        const erros = []

        for (let i = 0; i < alunosData.length; i++) {
            const aluno = alunosData[i]
            const linha = i + 2 // +2 porque começa na linha 1 e pula cabeçalho

            if (!aluno.nome) {
                erros.push(`Linha ${linha}: Nome é obrigatório`)
                continue
            }
            if (!aluno.data_nascimento) {
                erros.push(`Linha ${linha}: Data de nascimento é obrigatória`)
                continue
            }
            if (!aluno.matricula) {
                erros.push(`Linha ${linha}: Matrícula é obrigatória`)
                continue
            }
            if (!aluno.turma) {
                erros.push(`Linha ${linha}: Turma é obrigatória`)
                continue
            }
            if (!aluno.responsavel) {
                erros.push(`Linha ${linha}: Responsável é obrigatório`)
                continue
            }
            if (!aluno.telefone_responsavel) {
                erros.push(`Linha ${linha}: Telefone do responsável é obrigatório`)
                continue
            }

            if (!isValidDate(aluno.data_nascimento)) {
                erros.push(`Linha ${linha}: Data inválida. Use formato DD-MM-AAAA (Excel) ou YYYY-MM-DD (CSV)`)
                continue
            }

            aluno.data_nascimento = converterDataParaISO(aluno.data_nascimento)
            aluno.codigo_portal = generatePortalCode()

            alunosValidos.push(aluno)
        }

        progressBar.style.width = '70%'
        statusP.textContent = `Validados ${alunosValidos.length} alunos...`

        if (erros.length > 0) {
            const erroMsg = erros.slice(0, 5).join('\n') + (erros.length > 5 ? `\n... e mais ${erros.length - 5} erros` : '')
            utils.showNotification(`Erros encontrados:\n${erroMsg}`, 'error')
            progressDiv.style.display = 'none'
            return
        }

        // Evita duplicar matrícula
        const matriculasExistentes = new Set((alunos || []).map(a => String(a.matricula || '').trim()))
        const duplicados = alunosValidos.filter(a => matriculasExistentes.has(String(a.matricula || '').trim()))
        let alunosAImportar = alunosValidos

        if (duplicados.length > 0) {
            const listaMatriculas = duplicados.map(a => a.matricula).join(', ')
            const msg = duplicados.length === 1
                ? `O arquivo contém 1 aluno já cadastrado (matrícula: ${listaMatriculas}). Deseja importar apenas os novos alunos? (O já cadastrado será ignorado.)`
                : `O arquivo contém ${duplicados.length} alunos já cadastrados (matrículas: ${listaMatriculas}). Deseja importar apenas os novos alunos? (Os já cadastrados serão ignorados.)`
            const confirmar = window.confirm(msg)
            if (!confirmar) {
                statusP.textContent = 'Importação cancelada.'
                progressDiv.style.display = 'none'
                return
            }
            alunosAImportar = alunosValidos.filter(a => !matriculasExistentes.has(String(a.matricula || '').trim()))
            if (alunosAImportar.length === 0) {
                utils.showNotification('Todos os alunos do arquivo já estão cadastrados. Nada a importar.', 'info')
                progressDiv.style.display = 'none'
                return
            }
        }

        let sucessos = 0
        for (let i = 0; i < alunosAImportar.length; i++) {
            const aluno = alunosAImportar[i]
            try {
                await database.insert('alunos', aluno)
                sucessos++
                const progress = 70 + ((i + 1) / alunosAImportar.length) * 25
                progressBar.style.width = `${progress}%`
                statusP.textContent = `Importando... ${sucessos}/${alunosAImportar.length}`
            } catch (error) {
                console.error(`Erro ao inserir aluno ${aluno.nome}:`, error)
                erros.push(`${aluno.nome}: ${error.message}`)
            }
        }

        progressBar.style.width = '100%'
        const ignorados = alunosValidos.length - alunosAImportar.length
        statusP.textContent = ignorados > 0
            ? `Importação concluída! ${sucessos} alunos importados, ${ignorados} já existentes (ignorados).`
            : `Importação concluída! ${sucessos} alunos importados.`

        if (erros.length > 0) {
            utils.showNotification(`Importação parcial: ${sucessos} importados, ${erros.length} erros.`, 'warning')
        } else if (ignorados > 0) {
            utils.showNotification(`${sucessos} alunos importados. ${ignorados} já cadastrados (ignorados).`, 'success')
        } else {
            utils.showNotification(`${sucessos} alunos importados com sucesso!`, 'success')
        }

        await loadAlunos()

        setTimeout(() => {
            closeModalImportacao()
        }, 2000)

    } catch (error) {
        console.error('Erro na importação:', error)
        utils.showNotification('Erro ao processar arquivo: ' + error.message, 'error')
        progressDiv.style.display = 'none'
    }
})

// Salvar aluno
document.getElementById('alunoForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const saveBtn = document.getElementById('saveBtn')
    const originalText = saveBtn.innerHTML

    const dados = {
        nome: document.getElementById('alunoNome').value.trim(),
        data_nascimento: document.getElementById('alunoDataNascimento').value,
        matricula: document.getElementById('alunoMatricula').value.trim(),
        turma: document.getElementById('alunoTurma').value.trim(),
        responsavel: document.getElementById('alunoResponsavel').value.trim(),
        telefone_responsavel: document.getElementById('alunoTelefone').value.trim(),
        codigo_portal: document.getElementById('alunoCodigoPortal').value
    }

    try {
        saveBtn.disabled = true
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'

        if (editingId) {
            const { error } = await database.update('alunos', editingId, dados)
            if (error) throw error
            utils.showNotification('Aluno atualizado com sucesso!', 'success')
        } else {
            const { error } = await database.insert('alunos', dados)
            if (error) throw error
            utils.showNotification('Aluno cadastrado com sucesso!', 'success')
        }

        closeModal()
        await loadAlunos()
    } catch (error) {
        console.error('Erro ao salvar aluno:', error)
        utils.showNotification('Erro ao salvar aluno: ' + error.message, 'error')
    } finally {
        saveBtn.disabled = false
        saveBtn.innerHTML = originalText
    }
})

document.getElementById('searchInput').addEventListener('input', applyFilters)
document.getElementById('turmaFilter').addEventListener('change', applyFilters)


document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault()
    if (confirm('Deseja sair do sistema?')) {
        await auth.logout()
        window.location.href = 'login.html'
    }
})

document.addEventListener('DOMContentLoaded', async () => {
    initDescricaoTooltip()
    const selectAll = document.getElementById('selectAllAlunos')
    if (selectAll) {
        selectAll.addEventListener('change', function () {
            document.querySelectorAll('.aluno-check').forEach(cb => { cb.checked = this.checked })
            updateExcluirSelecionadosState()
        })
    }
    const tbody = document.getElementById('alunosTableBody')
    if (tbody) {
        tbody.addEventListener('change', function (e) {
            if (e.target.classList.contains('aluno-check')) updateExcluirSelecionadosState()
        })
    }

    if (await checkAuth()) {
        await loadAlunos()
    }
})

