-- ================================================
-- NOTIFICA ETE - Script SQL Completo do Banco de Dados
-- Compatível com Supabase (PostgreSQL)
-- Execute este script no SQL Editor do Supabase
-- ================================================

-- ================================================
-- 1. LIMPAR ESTRUTURA EXISTENTE (OPCIONAL)
-- ================================================
-- Descomente as linhas abaixo se quiser recriar tudo do zero
-- DROP TABLE IF EXISTS notificacoes CASCADE;
-- DROP TABLE IF EXISTS alunos CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
-- DROP FUNCTION IF EXISTS criar_notificacao_penalidade() CASCADE;

-- ================================================
-- 2. CRIAR TABELA: alunos
-- ================================================
CREATE TABLE IF NOT EXISTS alunos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    data_nascimento DATE,
    matricula TEXT UNIQUE NOT NULL,
    turma TEXT,
    responsavel TEXT,
    telefone_responsavel TEXT,
    codigo_portal TEXT UNIQUE NOT NULL,
    codigo_aluno TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 3. CRIAR TABELA: notificacoes
-- ================================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL CHECK (nivel IN ('Leve', 'Média', 'Grave')),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    descricao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'visualizada', 'respondida', 'resolvido', 'ativo')),
    registrado_por TEXT,
    mensagem TEXT,
    whatsapp_enviado BOOLEAN DEFAULT FALSE,
    whatsapp_data_envio TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_alunos_matricula ON alunos(matricula);
CREATE INDEX IF NOT EXISTS idx_alunos_codigo_portal ON alunos(codigo_portal);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma);
CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno_id ON notificacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_nivel ON notificacoes(nivel);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_hora ON notificacoes(data_hora DESC);

-- ================================================
-- 5. FUNÇÃO: Atualizar updated_at automaticamente
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. TRIGGERS: Atualizar updated_at
-- ================================================
DROP TRIGGER IF EXISTS trigger_update_alunos_updated_at ON alunos;
CREATE TRIGGER trigger_update_alunos_updated_at
    BEFORE UPDATE ON alunos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_notificacoes_updated_at ON notificacoes;
CREATE TRIGGER trigger_update_notificacoes_updated_at
    BEFORE UPDATE ON notificacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ================================================
-- 7. HABILITAR ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 8. POLÍTICAS RLS: alunos
-- ================================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem ver alunos" ON alunos;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir alunos" ON alunos;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar alunos" ON alunos;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar alunos" ON alunos;
DROP POLICY IF EXISTS "Permitir leitura pública de alunos" ON alunos;

-- Política: Usuários autenticados podem ver alunos
CREATE POLICY "Usuários autenticados podem ver alunos" ON alunos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem inserir alunos
CREATE POLICY "Usuários autenticados podem inserir alunos" ON alunos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem atualizar alunos
CREATE POLICY "Usuários autenticados podem atualizar alunos" ON alunos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem deletar alunos
CREATE POLICY "Usuários autenticados podem deletar alunos" ON alunos
    FOR DELETE USING (auth.role() = 'authenticated');

-- Política: Permitir leitura pública de alunos (para portal do responsável)
-- Esta política permite que o portal do responsável consulte alunos por código_portal
CREATE POLICY "Permitir leitura pública de alunos" ON alunos
    FOR SELECT USING (true);

-- ================================================
-- 9. POLÍTICAS RLS: notificacoes
-- ================================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem ver notificações" ON notificacoes;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir notificações" ON notificacoes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar notificações" ON notificacoes;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar notificações" ON notificacoes;
DROP POLICY IF EXISTS "Permitir leitura pública de notificações" ON notificacoes;

-- Política: Usuários autenticados podem ver notificações
CREATE POLICY "Usuários autenticados podem ver notificações" ON notificacoes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem inserir notificações
CREATE POLICY "Usuários autenticados podem inserir notificações" ON notificacoes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem atualizar notificações
CREATE POLICY "Usuários autenticados podem atualizar notificações" ON notificacoes
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem deletar notificações
CREATE POLICY "Usuários autenticados podem deletar notificações" ON notificacoes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Política: Permitir leitura pública de notificações (para portal do responsável)
-- Esta política permite que o portal do responsável consulte notificações
CREATE POLICY "Permitir leitura pública de notificações" ON notificacoes
    FOR SELECT USING (true);

-- ================================================
-- 10. DADOS DE EXEMPLO (OPCIONAL)
-- ================================================
-- Descomente as linhas abaixo se quiser inserir dados de exemplo

-- Inserir alunos de exemplo
INSERT INTO alunos (nome, data_nascimento, matricula, turma, responsavel, telefone_responsavel, codigo_portal) VALUES
('João Silva', '2005-03-15', '2024001', '3º A', 'Maria Silva', '(81) 99999-9999', '240001'),
('Ana Santos', '2006-07-22', '2024002', '2º B', 'Carlos Santos', '(81) 88888-8888', '240002'),
('Pedro Costa', '2007-11-08', '2024003', '1º C', 'Lucia Costa', '(81) 77777-7777', '240003')
ON CONFLICT (matricula) DO NOTHING;

-- Inserir notificações de exemplo
INSERT INTO notificacoes (aluno_id, nivel, descricao, status, registrado_por) VALUES
((SELECT id FROM alunos WHERE matricula = '2024001'), 'Leve', 'Atraso na aula', 'ativo', 'operador@escola.com'),
((SELECT id FROM alunos WHERE matricula = '2024002'), 'Média', 'Uso inadequado do celular', 'pendente', 'operador@escola.com'),
((SELECT id FROM alunos WHERE matricula = '2024003'), 'Grave', 'Falta de respeito com professor', 'pendente', 'operador@escola.com')
ON CONFLICT DO NOTHING;

-- ================================================
-- 11. CONSTRAINTS E VALIDAÇÕES ADICIONAIS
-- ================================================
-- Nota: Estas constraints podem falhar se já houver dados inválidos nas tabelas
-- Se isso acontecer, corrija os dados primeiro ou remova as constraints

-- Garantir que matricula não seja vazia
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_matricula_not_empty'
    ) THEN
        ALTER TABLE alunos ADD CONSTRAINT check_matricula_not_empty 
            CHECK (char_length(trim(matricula)) > 0);
    END IF;
END $$;

-- Garantir que nome não seja vazio
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_nome_not_empty'
    ) THEN
        ALTER TABLE alunos ADD CONSTRAINT check_nome_not_empty 
            CHECK (char_length(trim(nome)) > 0);
    END IF;
END $$;

-- Garantir que descricao não seja vazia
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_descricao_not_empty'
    ) THEN
        ALTER TABLE notificacoes ADD CONSTRAINT check_descricao_not_empty 
            CHECK (char_length(trim(descricao)) > 0);
    END IF;
END $$;

-- ================================================
-- 12. COMENTÁRIOS NAS TABELAS (DOCUMENTAÇÃO)
-- ================================================
COMMENT ON TABLE alunos IS 'Tabela de alunos do sistema de notificações disciplinares';
COMMENT ON TABLE notificacoes IS 'Tabela de notificações disciplinares registradas para os alunos';

COMMENT ON COLUMN alunos.codigo_portal IS 'Código único de 6 dígitos para acesso ao portal do responsável';
COMMENT ON COLUMN alunos.matricula IS 'Matrícula única do aluno na escola';
COMMENT ON COLUMN notificacoes.nivel IS 'Nível da notificação: Leve, Média ou Grave';
COMMENT ON COLUMN notificacoes.status IS 'Status da notificação: pendente, enviada, visualizada, respondida, resolvido ou ativo';
COMMENT ON COLUMN notificacoes.registrado_por IS 'Email do operador que registrou a notificação';

-- ================================================
-- 13. VERIFICAÇÕES FINAIS
-- ================================================
-- Verificar estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('alunos', 'notificacoes')
ORDER BY table_name, ordinal_position;

-- Verificar índices criados
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('alunos', 'notificacoes')
ORDER BY tablename, indexname;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('alunos', 'notificacoes')
ORDER BY tablename, policyname;

-- Verificar constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name
FROM pg_constraint
WHERE conrelid::regclass::text IN ('alunos', 'notificacoes')
ORDER BY table_name, constraint_name;

-- ================================================
-- FIM DO SCRIPT
-- ================================================
-- Após executar este script:
-- 1. Crie um usuário no Supabase Authentication
-- 2. Configure as credenciais em src/js/supabase-global.js
-- 3. Teste o sistema fazendo login e criando um aluno
-- ================================================

