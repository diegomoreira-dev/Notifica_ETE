// Conexão com o Supabase. A chave usada é a anônima (pública); a proteção dos dados fica por conta do RLS no servidor.
// Para não commitar a chave, use window.__SUPABASE_CONFIG__ (ver supabase-config.example.js).

var _config = (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__) || {}
const SUPABASE_URL = _config.url || ''
const SUPABASE_ANON_KEY = _config.anonKey || ''

const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Depois de 8 horas de uso, o usuário precisa fazer login de novo (ajuste no Dashboard do Supabase se quiser)
const SESSION_STARTED_KEY = 'notifica_ete_session_started_at'
const MAX_SESSION_AGE_MS = (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__?.maxSessionAgeMs) || (8 * 60 * 60 * 1000)

const SupabaseAPI = {
    client: supabaseClient,
    functionsUrl: SUPABASE_URL + '/functions/v1',

    auth: {
        async login(email, password) {
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
                return { data, error: null }
            } catch (error) {
                console.error('Erro no login:', error)
                return { data: null, error }
            }
        },

        async logout() {
            try {
                if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_STARTED_KEY)
                const { error } = await supabaseClient.auth.signOut()
                if (error) throw error
                return { error: null }
            } catch (error) {
                console.error('Erro no logout:', error)
                return { error }
            }
        },

        // Se passou do tempo máximo de sessão, desloga e retorna null
        async getSession() {
            try {
                const { data: { session }, error } = await supabaseClient.auth.getSession()
                if (error) throw error
                if (!session) {
                    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_STARTED_KEY)
                    return { session: null, error: null }
                }
                var started = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_STARTED_KEY) : null
                if (!started) {
                    if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()))
                    started = String(Date.now())
                }
                var startedMs = parseInt(started, 10)
                if (isNaN(startedMs) || (Date.now() - startedMs) > MAX_SESSION_AGE_MS) {
                    await supabaseClient.auth.signOut()
                    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_STARTED_KEY)
                    return { session: null, error: null }
                }
                return { session, error: null }
            } catch (error) {
                console.error('Erro ao obter sessão:', error)
                return { session: null, error }
            }
        },

        async isAuthenticated() {
            const { session } = await this.getSession()
            return !!session
        },

        async isAdmin() {
            try {
                const { user } = await this.getCurrentUser()
                return !!(user && user.app_metadata && user.app_metadata.role === 'admin')
            } catch (e) {
                return false
            }
        },

        async getCurrentUser() {
            try {
                const { data: { user }, error } = await supabaseClient.auth.getUser()
                if (error) throw error
                return { user, error: null }
            } catch (error) {
                console.error('Erro ao obter usuário:', error)
                return { user: null, error }
            }
        },

        async updateProfile(data) {
            try {
                const { data: result, error } = await supabaseClient.auth.updateUser({
                    data: data
                })
                if (error) throw error
                return { data: result, error: null }
            } catch (error) {
                console.error('Erro ao atualizar perfil:', error)
                return { data: null, error }
            }
        },

        async updatePassword(newPassword) {
            try {
                const { data, error } = await supabaseClient.auth.updateUser({
                    password: newPassword
                })
                if (error) throw error
                return { data, error: null }
            } catch (error) {
                console.error('Erro ao atualizar senha:', error)
                return { data: null, error }
            }
        },

        async resetPasswordForEmail(email, redirectTo) {
            try {
                const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectTo || (window.location.origin + '/pages/redefinir-senha.html')
                })
                if (error) throw error
                return { data, error: null }
            } catch (error) {
                console.error('Erro ao enviar email de redefinição:', error)
                return { data: null, error }
            }
        }
    },

    database: {
        async select(table, options = {}) {
            try {
                let query = supabaseClient.from(table).select(options.select || '*')
                if (options.where) {
                    Object.entries(options.where).forEach(([key, value]) => {
                        query = query.eq(key, value)
                    })
                }
                if (options.order) {
                    query = query.order(options.order.column, { 
                        ascending: options.order.ascending !== false 
                    })
                }
                if (options.limit) {
                    query = query.limit(options.limit)
                }
                if (options.single) {
                    query = query.single()
                }
                
                const { data, error } = await query
                
                if (error) throw error
                return { data, error: null }
            } catch (error) {
                console.error(`Erro ao selecionar de ${table}:`, error)
                return { data: null, error }
            }
        },

        async insert(table, data) {
            try {
                console.log(`📝 Inserindo em ${table}:`, data)
                
                const { data: result, error } = await supabaseClient
                    .from(table)
                    .insert(data)
                    .select()
                
                if (error) {
                    console.error(`❌ Erro ao inserir:`, error)
                    throw error
                }
                
                console.log(`✅ Inserido com sucesso:`, result)
                return { data: result ? result[0] : null, error: null }
            } catch (error) {
                console.error(`❌ Erro ao inserir em ${table}:`, error)
                return { data: null, error }
            }
        },

        async update(table, id, data) {
            try {
                console.log(`📝 Atualizando ${table} (${id}):`, data)
                
                const { data: result, error } = await supabaseClient
                    .from(table)
                    .update(data)
                    .eq('id', id)
                    .select()
                
                if (error) {
                    console.error(`❌ Erro ao atualizar:`, error)
                    throw error
                }
                
                console.log(`✅ Atualizado com sucesso:`, result)
                return { data: result ? result[0] : null, error: null }
            } catch (error) {
                console.error(`❌ Erro ao atualizar ${table}:`, error)
                return { data: null, error }
            }
        },

        async delete(table, id) {
            try {
                const { error } = await supabaseClient
                    .from(table)
                    .delete()
                    .eq('id', id)
                
                if (error) throw error
                return { error: null }
            } catch (error) {
                console.error(`Erro ao deletar de ${table}:`, error)
                return { error }
            }
        }
    },

    // ================================================
    // STORAGE
    // ================================================
    storage: {
        async upload(bucket, path, file) {
            try {
                const { data, error } = await supabaseClient.storage
                    .from(bucket)
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: false
                    })
                
                if (error) throw error
                return { data, error: null }
            } catch (error) {
                console.error('Erro no upload:', error)
                return { data: null, error }
            }
        },

        getPublicUrl(bucket, path) {
            const { data } = supabaseClient.storage
                .from(bucket)
                .getPublicUrl(path)
            
            return data.publicUrl
        },

        async delete(bucket, paths) {
            try {
                const { error } = await supabaseClient.storage
                    .from(bucket)
                    .remove(paths)
                
                if (error) throw error
                return { error: null }
            } catch (error) {
                console.error('Erro ao deletar arquivo:', error)
                return { error }
            }
        }
    },

    // ================================================
    // UTILIDADES
    // ================================================
    utils: {
        /** Fuso horário do Brasil (Supabase guarda em UTC; exibimos sempre em horário de Brasília) */
        TIMEZONE_BR: 'America/Sao_Paulo',

        formatDate(date) {
            if (!date) return 'N/A'
            const d = new Date(date)
            return d.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: this.TIMEZONE_BR
            })
        },

        formatDateTime(date) {
            if (!date) return 'N/A'
            const d = new Date(date)
            return d.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: this.TIMEZONE_BR
            })
        },

        /** Retorna data no formato YYYY-MM-DD em horário de Brasília (para input type="date") */
        toLocalDateString(date) {
            const d = date instanceof Date ? date : new Date(date)
            const s = d.toLocaleDateString('pt-BR', { timeZone: this.TIMEZONE_BR })
            const [dd, mm, yyyy] = s.split('/')
            return `${yyyy}-${mm}-${dd}`
        },

        /** Retorna data/hora no formato YYYY-MM-DDTHH:mm em horário de Brasília (para input type="datetime-local") */
        toLocalDateTimeString(date) {
            const d = date instanceof Date ? date : new Date(date)
            const dateStr = d.toLocaleDateString('pt-BR', { timeZone: this.TIMEZONE_BR })
            const timeStr = d.toLocaleTimeString('pt-BR', { timeZone: this.TIMEZONE_BR, hour12: false, hour: '2-digit', minute: '2-digit' })
            const [dd, mm, yyyy] = dateStr.split('/')
            const [hh, min] = (timeStr || '00:00').split(':')
            return `${yyyy}-${mm}-${dd}T${String(hh).padStart(2, '0')}:${String(min || '00').padStart(2, '0')}`
        },

        /** Converte valor de datetime-local (horário local Brasil) para ISO UTC para enviar ao Supabase */
        localDateTimeToISO(localDateTimeStr) {
            if (!localDateTimeStr) return null
            const d = new Date(localDateTimeStr)
            return d.toISOString()
        },

        formatPhone(phone) {
            if (!phone) return 'N/A'
            const numbers = phone.replace(/\D/g, '')
            
            if (numbers.length === 13 && numbers.startsWith('55')) {
                return `+55 (${numbers.substr(2, 2)}) ${numbers.substr(4, 5)}-${numbers.substr(9, 4)}`
            }
            
            return phone
        },

        validatePhone(phone) {
            const numbers = phone.replace(/\D/g, '')
            return numbers.length >= 11 && numbers.length <= 13
        },

        generateCodigoPortal() {
            return Math.floor(100000 + Math.random() * 900000).toString()
        },

        showNotification(message, type = 'info') {
            const notification = document.createElement('div')
            notification.className = `notification notification-${type}`
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                font-weight: 500;
            `
            notification.textContent = message
            
            document.body.appendChild(notification)
            
            setTimeout(() => {
                notification.remove()
            }, 3000)
        },

        downloadCSV(filename, data) {
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            
            link.setAttribute('href', url)
            link.setAttribute('download', filename)
            link.style.visibility = 'hidden'
            
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }
}

window.SupabaseAPI = SupabaseAPI
window.supabaseClient = supabaseClient
