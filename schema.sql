CREATE TABLE public.alunos (
  nome text NOT NULL CHECK (char_length(TRIM(BOTH FROM nome)) > 0),
  data_nascimento date,
  matricula text NOT NULL UNIQUE CHECK (char_length(TRIM(BOTH FROM matricula)) > 0),
  turma text,
  responsavel text,
  telefone_responsavel text,
  codigo_portal text NOT NULL UNIQUE,
  codigo_aluno text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT alunos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notificacoes (
  aluno_id uuid NOT NULL,
  nivel text NOT NULL CHECK (nivel = ANY (ARRAY['Leve'::text, 'Média'::text, 'Grave'::text])),
  descricao text NOT NULL CHECK (char_length(TRIM(BOTH FROM descricao)) > 0),
  registrado_por text,
  mensagem text,
  whatsapp_data_envio timestamp with time zone,
  pdf_url text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data_hora timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['pendente'::text, 'enviada'::text, 'visualizada'::text, 'respondida'::text, 'resolvido'::text, 'ativo'::text])),
  whatsapp_enviado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notificacoes_pkey PRIMARY KEY (id),
  CONSTRAINT notificacoes_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.alunos(id)
);
CREATE TABLE public.atualizar (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  numero integer,
  CONSTRAINT atualizar_pkey PRIMARY KEY (id)
);
