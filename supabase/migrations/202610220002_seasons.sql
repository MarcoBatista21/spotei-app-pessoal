-- Temporadas trimestrais, começando em novembro de 2026.
create table public.season_awards (
  season integer not null,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  colocacao integer not null check (colocacao between 1 and 5),
  criado_em timestamptz not null default now(),
  primary key (season, usuario_id),
  unique (season, colocacao)
);
alter table public.season_awards enable row level security;
create policy season_awards_leitura on public.season_awards
  for select to authenticated using (true);
grant select on public.season_awards to authenticated;

create or replace function public.registrar_temporadas_encerradas()
returns void language plpgsql security definer set search_path=public as $$
declare n integer; inicio timestamptz; fim timestamptz; agora_local timestamp := now() at time zone 'America/Sao_Paulo';
begin
  for n in 1..greatest(0, floor(((extract(year from agora_local)::integer-2026)*12 + extract(month from agora_local)::integer-11) / 3.0)::integer) loop
    inicio := timestamptz '2026-11-01 00:00:00-03' + make_interval(months => (n-1)*3);
    fim := inicio + interval '3 months';
    insert into public.season_awards(season, usuario_id, colocacao)
      select n, id, pos from (
        select p.id, row_number() over(order by coalesce(sum(s.pontos),0) desc, p.usuario asc) as pos
        from public.profiles p
        left join public.user_car_collection s on s.usuario_id=p.id and s.criado_em >= inicio and s.criado_em < fim
        group by p.id, p.usuario having coalesce(sum(s.pontos),0) > 0
      ) ranked where pos <= 5
      on conflict (season, usuario_id) do nothing;
  end loop;
end; $$;
revoke all on function public.registrar_temporadas_encerradas() from public, anon, authenticated;

create or replace function public.ranking(periodo text default 'geral', cidade_filtro text default null)
returns setof public.perfis_app language plpgsql security definer set search_path=public as $$
declare inicio timestamptz; indice integer; agora_local timestamp := now() at time zone 'America/Sao_Paulo';
begin
  if auth.uid() is null then raise exception 'Entre para consultar o ranking'; end if;
  perform public.registrar_temporadas_encerradas();
  if periodo = 'season' then
    if now() < timestamptz '2026-11-01 00:00:00-03' then return; end if;
    indice := floor(((extract(year from agora_local)::integer-2026)*12 + extract(month from agora_local)::integer-11) / 3.0)::integer;
    inicio := timestamptz '2026-11-01 00:00:00-03' + make_interval(months => indice*3);
    return query select p.* from public.perfis_app p
      where cidade_filtro is null or p.cidade ilike '%'||cidade_filtro||'%'
      order by coalesce((select sum(c.pontos)::integer from public.user_car_collection c where c.usuario_id=p.id and c.criado_em>=inicio),0) desc,p.usuario;
  elsif periodo = 'semanal' or periodo = 'mensal' then
    return query select p.id,p.usuario,p.nome,p.bio,p.avatar,p.cidade,
      coalesce((select sum(c.pontos)::integer from public.user_car_collection c where c.usuario_id=p.id and c.criado_em>=now()-case when periodo='semanal' then interval '7 days' else interval '30 days' end),0),p."criadoEm",p.administrador
      from public.perfis_app p where cidade_filtro is null or p.cidade ilike '%'||cidade_filtro||'%'
      order by 7 desc,p.usuario;
  else
    return query select p.* from public.perfis_app p
      where cidade_filtro is null or p.cidade ilike '%'||cidade_filtro||'%'
      order by p.pontos desc,p.usuario;
  end if;
end; $$;

create or replace function public.tags_temporada(p_usuario uuid)
returns table(season integer, colocacao integer) language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Entre para consultar o perfil'; end if;
  perform public.registrar_temporadas_encerradas();
  return query select a.season,a.colocacao from public.season_awards a where a.usuario_id=p_usuario order by a.season desc;
end; $$;
grant execute on function public.tags_temporada(uuid) to authenticated;
