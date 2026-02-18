/**
 * Script de build para Vercel (e outros hosts).
 * Gera src/js/supabase-config.js a partir das variáveis de ambiente
 * SUPABASE_URL e SUPABASE_ANON_KEY, para que as chaves não fiquem no repositório.
 *
 * Na Vercel: Defina essas variáveis em Project > Settings > Environment Variables.
 * Build command: npm run build
 */

const fs = require('fs')
const path = require('path')

const url = process.env.SUPABASE_URL || ''
const anonKey = process.env.SUPABASE_ANON_KEY || ''

const outDir = path.join(__dirname, '..', 'src', 'js')
const outFile = path.join(outDir, 'supabase-config.js')

if (!url || !anonKey) {
  console.warn('⚠️  SUPABASE_URL ou SUPABASE_ANON_KEY não definidos. supabase-config.js não será gerado.')
  console.warn('   O app usará o fallback de supabase-global.js (se houver) ou falhará ao conectar.')
  process.exit(0)
}

const content = `// Gerado em build (Vercel) – não edite manualmente
window.__SUPABASE_CONFIG__ = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
};
`

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, content, 'utf8')
console.log('✅ supabase-config.js gerado a partir das variáveis de ambiente.')
