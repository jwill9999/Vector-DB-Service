-- Enable pgvector extension for embedding similarity search
create extension if not exists vector;

create table if not exists public.documents (
  id uuid primary key,
  title text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  source text not null,
  ordering integer not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists document_chunks_document_order_idx
  on public.document_chunks (document_id, ordering);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  score double precision
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as score
  from public.document_chunks as dc
  where case
    when filter ? 'documentId' then dc.document_id = (filter ->> 'documentId')::uuid
    else true
  end
  order by dc.embedding <=> query_embedding
  limit greatest(match_count, 1);
end;
$$;
