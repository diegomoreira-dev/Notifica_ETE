// Na hora do deploy (ex.: Vercel), monta o arquivo de config do Supabase a partir das variáveis de ambiente.
// Assim as chaves não precisam ir no repositório. Defina SUPABASE_URL e SUPABASE_ANON_KEY no painel.

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

const content = `// Gerado no deploy – não editar
window.__SUPABASE_CONFIG__ = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
};
`

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, content, 'utf8')
console.log('✅ supabase-config.js gerado a partir das variáveis de ambiente.')
