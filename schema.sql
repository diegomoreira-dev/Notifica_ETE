-- ============================================================================
-- Notifica ETE — Schema do banco (Supabase / PostgreSQL)
-- ============================================================================
-- Este script cria as tabelas usadas pela aplicação, habilita Row Level
-- Security (RLS) e define as políticas de acesso:
--   - Usuários autenticados (operadores da escola): CRUD completo.
--   - Usuários anônimos (anon): SEM acesso direto às tabelas. O portal do
--     responsável consulta os dados através da função consultar_portal(),
--     que retorna apenas o aluno correspondente ao código de 6 dígitos
--     informado, em vez de expor a tabela inteira.
--
-- Rode este script no SQL Editor do seu projeto Supabase, em um projeto novo
-- ou vazio. Ajuste conforme a necessidade do seu ambiente antes de rodar em
-- produção.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensão necessária para gen_random_uuid()
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tabela: alunos
-- ----------------------------------------------------------------------------
create table public.alunos (
  id                    uuid not null default gen_random_uuid(),
  nome                  text not null check (char_length(trim(nome)) > 0),
  data_nascimento       date,
  matricula             text not null unique check (char_length(trim(matricula)) > 0),
  turma                 text,
  responsavel           text,
  telefone_responsavel  text,
  codigo_portal         text not null unique,
  codigo_aluno          text,
  created_at            timestamp with time zone default now(),
  updated_at            timestamp with time zone default now(),
  constraint alunos_pkey primary key (id)
);

comment on table public.alunos is 'Cadastro de alunos. codigo_portal é o código de 6 dígitos usado pelo responsável no portal público.';
comment on column public.alunos.codigo_aluno is 'Reservado para uso futuro — não utilizado pelo frontend atual.';

-- ----------------------------------------------------------------------------
-- Tabela: notificacoes
-- ----------------------------------------------------------------------------
create table public.notificacoes (
  id                    uuid not null default gen_random_uuid(),
  aluno_id              uuid not null,
  nivel                 text not null check (nivel = any (array['Leve', 'Média', 'Grave'])),
  descricao             text not null check (char_length(trim(descricao)) > 0),
  status                text not null default 'pendente'
                          check (status = any (array['pendente', 'enviada', 'visualizada', 'respondida', 'resolvido', 'ativo'])),
  registrado_por        text,
  mensagem              text,
  whatsapp_enviado      boolean default false,
  whatsapp_data_envio   timestamp with time zone,
  pdf_url               text,
  data_hora             timestamp with time zone default now(),
  created_at            timestamp with time zone default now(),
  updated_at            timestamp with time zone default now(),
  constraint notificacoes_pkey primary key (id),
  constraint notificacoes_aluno_id_fkey foreign key (aluno_id) references public.alunos (id) on delete cascade
);

comment on table public.notificacoes is 'Notificações disciplinares vinculadas a um aluno.';

-- Índices para acelerar os filtros mais comuns das telas de Alunos/Notificações/Relatórios
create index idx_notificacoes_aluno_id on public.notificacoes (aluno_id);
create index idx_notificacoes_data_hora on public.notificacoes (data_hora desc);
create index idx_notificacoes_status on public.notificacoes (status);
create index idx_notificacoes_nivel on public.notificacoes (nivel);

-- ----------------------------------------------------------------------------
-- Trigger: manter updated_at sempre atualizado
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_alunos_updated_at
  before update on public.alunos
  for each row execute function public.set_updated_at();

create trigger trg_notificacoes_updated_at
  before update on public.notificacoes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.alunos enable row level security;
alter table public.notificacoes enable row level security;

-- Operadores autenticados (qualquer usuário logado via Supabase Auth) têm
-- acesso completo de leitura e escrita. Se quiser diferenciar admin/operador
-- mais adiante, troque "authenticated" por uma checagem de app_metadata.role.
create policy "Operadores autenticados podem ler alunos"
  on public.alunos for select
  to authenticated
  using (true);

create policy "Operadores autenticados podem inserir alunos"
  on public.alunos for insert
  to authenticated
  with check (true);

create policy "Operadores autenticados podem atualizar alunos"
  on public.alunos for update
  to authenticated
  using (true)
  with check (true);

create policy "Operadores autenticados podem excluir alunos"
  on public.alunos for delete
  to authenticated
  using (true);

create policy "Operadores autenticados podem ler notificacoes"
  on public.notificacoes for select
  to authenticated
  using (true);

create policy "Operadores autenticados podem inserir notificacoes"
  on public.notificacoes for insert
  to authenticated
  with check (true);

create policy "Operadores autenticados podem atualizar notificacoes"
  on public.notificacoes for update
  to authenticated
  using (true)
  with check (true);

create policy "Operadores autenticados podem excluir notificacoes"
  on public.notificacoes for delete
  to authenticated
  using (true);

-- IMPORTANTE: nenhuma policy é criada para o role "anon" nas tabelas acima.
-- Isso significa que, por padrão, usuários não autenticados NÃO conseguem
-- ler nem escrever em alunos/notificacoes diretamente — nem com a chave anon
-- pública usada no frontend. O acesso do portal do responsável é feito
-- exclusivamente pela função abaixo.

-- ============================================================================
-- FUNÇÃO SEGURA PARA O PORTAL DO RESPONSÁVEL
-- ============================================================================
-- Recebe o código de 6 dígitos e retorna SOMENTE o aluno correspondente e
-- suas notificações, em JSON. Por ser SECURITY DEFINER, a função consegue ler
-- as tabelas (ignorando RLS) mas só devolve os dados de UM aluno por vez —
-- nunca a tabela inteira. É a forma correta (e a única) de o usuário anônimo
-- acessar esses dados.
create or replace function public.consultar_portal(p_codigo_portal text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno    public.alunos;
  v_result   jsonb;
begin
  if p_codigo_portal is null or length(trim(p_codigo_portal)) <> 6 then
    return jsonb_build_object('success', false, 'message', 'Código inválido.');
  end if;

  select * into v_aluno
  from public.alunos
  where codigo_portal = p_codigo_portal
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Código não encontrado. Verifique se digitou corretamente.');
  end if;

  select jsonb_build_object(
    'success', true,
    'aluno', jsonb_build_object(
      'nome', v_aluno.nome,
      'matricula', v_aluno.matricula,
      'turma', v_aluno.turma,
      'responsavel', v_aluno.responsavel
    ),
    'notificacoes', coalesce(jsonb_agg(
      jsonb_build_object(
        'nivel', n.nivel,
        'descricao', n.descricao,
        'status', n.status,
        'registrado_por', n.registrado_por,
        'data_hora', n.data_hora,
        'pdf_url', n.pdf_url
      ) order by n.data_hora desc
    ) filter (where n.id is not null), '[]'::jsonb)
  )
  into v_result
  from public.notificacoes n
  where n.aluno_id = v_aluno.id;

  return v_result;
end;
$$;

-- Permite que o frontend público (chave anon) execute a função, mas não
-- consulte as tabelas diretamente.
revoke all on function public.consultar_portal(text) from public;
grant execute on function public.consultar_portal(text) to anon, authenticated;

-- ============================================================================
-- Como chamar a função a partir do supabase-js (substitui os dois
-- database.select('*') usados hoje em src/js/portal-responsavel.js):
--
--   const { data, error } = await supabaseClient.rpc('consultar_portal', {
--     p_codigo_portal: codigo
--   })
--   // data já vem no formato { success, message? , aluno?, notificacoes? }
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Observação: a tabela "atualizar" (id, created_at, numero) que aparecia no
-- dump original do projeto não é referenciada em nenhum lugar do frontend
-- (src/js/*.js). Parece ter sido uma tabela de teste e foi propositalmente
-- omitida deste schema. Se ela for necessária para algo, adicione-a separadamente.
-- ----------------------------------------------------------------------------
