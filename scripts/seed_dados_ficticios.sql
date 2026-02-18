-- ================================================
-- NOTIFICA ETE - Dados fictícios para inserir no SQL
-- Execute no SQL Editor do Supabase (após as tabelas criadas)
-- ================================================

-- ------------------------------------------------
-- ALUNOS (código_portal 6 dígitos, matrícula única)
-- ------------------------------------------------
INSERT INTO alunos (nome, data_nascimento, matricula, turma, responsavel, telefone_responsavel, codigo_portal) VALUES
('João Silva', '2005-03-15', '2024001', '3º A', 'Maria Silva', '(81) 99999-9999', '240001'),
('Ana Santos', '2006-07-22', '2024002', '2º B', 'Carlos Santos', '(81) 88888-8888', '240002'),
('Pedro Costa', '2007-11-08', '2024003', '1º C', 'Lucia Costa', '(81) 77777-7777', '240003'),
('Mariana Oliveira', '2005-09-12', '2024004', '3º A', 'Roberto Oliveira', '(81) 98765-4321', '240004'),
('Lucas Ferreira', '2006-01-30', '2024005', '2º B', 'Fernanda Ferreira', '(81) 97654-3210', '240005'),
('Julia Almeida', '2007-05-18', '2024006', '1º C', 'Paulo Almeida', '(81) 96543-2109', '240006'),
('Rafael Souza', '2005-12-03', '2024007', '3º B', 'Cristina Souza', '(81) 95432-1098', '240007'),
('Beatriz Lima', '2006-04-25', '2024008', '2º A', 'Marcos Lima', '(81) 94321-0987', '240008'),
('Gabriel Martins', '2007-08-14', '2024009', '1º A', 'Patricia Martins', '(81) 93210-9876', '240009'),
('Isabela Rocha', '2005-06-20', '2024010', '3º C', 'André Rocha', '(81) 92109-8765', '240010')
ON CONFLICT (matricula) DO NOTHING;

-- ------------------------------------------------
-- NOTIFICAÇÕES (referenciam alunos por matrícula)
-- ------------------------------------------------
INSERT INTO notificacoes (aluno_id, nivel, descricao, status, registrado_por, data_hora) VALUES
((SELECT id FROM alunos WHERE matricula = '2024001'), 'Leve',   'Atraso na entrada da aula.', 'ativo', 'operador@escola.com', NOW() - INTERVAL '2 days'),
((SELECT id FROM alunos WHERE matricula = '2024001'), 'Leve',   'Esqueceu material escolar.', 'resolvido', 'operador@escola.com', NOW() - INTERVAL '5 days'),
((SELECT id FROM alunos WHERE matricula = '2024002' ), 'Média',  'Uso inadequado do celular durante a aula.', 'pendente', 'operador@escola.com', NOW() - INTERVAL '1 day'),
((SELECT id FROM alunos WHERE matricula = '2024003' ), 'Grave',  'Falta de respeito com professor em sala.', 'pendente', 'operador@escola.com', NOW() - INTERVAL '3 hours'),
((SELECT id FROM alunos WHERE matricula = '2024004' ), 'Leve',   'Conversa paralela em momento de explicação.', 'enviada', 'operador@escola.com', NOW() - INTERVAL '4 days'),
((SELECT id FROM alunos WHERE matricula = '2024004' ), 'Média',  'Não realizou atividade em grupo combinada.', 'respondida', 'operador@escola.com', NOW() - INTERVAL '6 days'),
((SELECT id FROM alunos WHERE matricula = '2024005' ), 'Leve',   'Atraso na entrega de trabalho.', 'resolvido', 'operador@escola.com', NOW() - INTERVAL '8 days'),
((SELECT id FROM alunos WHERE matricula = '2024006' ), 'Média',  'Comportamento inadequado no recreio.', 'ativo', 'operador@escola.com', NOW() - INTERVAL '1 day'),
((SELECT id FROM alunos WHERE matricula = '2024007' ), 'Grave',  'Desacato à coordenação.', 'pendente', 'operador@escola.com', NOW() - INTERVAL '2 days'),
((SELECT id FROM alunos WHERE matricula = '2024008' ), 'Leve',   'Uniforme incompleto.', 'resolvido', 'operador@escola.com', NOW() - INTERVAL '10 days'),
((SELECT id FROM alunos WHERE matricula = '2024009' ), 'Média',  'Uso de boné em sala de aula após orientação.', 'pendente', 'operador@escola.com', NOW() - INTERVAL '12 hours'),
((SELECT id FROM alunos WHERE matricula = '2024010' ), 'Leve',   'Esqueceu carteirinha de identificação.', 'visualizada', 'operador@escola.com', NOW() - INTERVAL '3 days');

-- Fim do seed. Verifique no Supabase se as políticas RLS permitem INSERT (usuário autenticado ou service_role).
