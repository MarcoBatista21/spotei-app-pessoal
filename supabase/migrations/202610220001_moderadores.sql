create or replace function public.listar_moderadores()
returns table(id uuid, email text, nome text, usuario text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if auth.uid() is null or not public.eh_admin() then
    raise exception 'Sem permissão administrativa';
  end if;

  return query
    select p.id, u.email::text, p.nome, p.usuario
    from public.user_roles r
    join public.profiles p on p.id = r.usuario_id
    join auth.users u on u.id = p.id
    where r.administrador
    order by p.usuario;
end;
$$;

create or replace function public.gerenciar_moderador(p_email text, p_promover boolean)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  alvo uuid;
begin
  if auth.uid() is null or not public.eh_admin() then
    raise exception 'Sem permissão administrativa';
  end if;
  if nullif(trim(p_email), '') is null or p_promover is null then
    raise exception 'Informe o e-mail e a ação';
  end if;

  select p.id into alvo
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email));

  if alvo is null then
    raise exception 'Conta não encontrada. A pessoa precisa criar a conta primeiro.';
  end if;

  if not p_promover and alvo = auth.uid() and
    (select count(*) from public.user_roles where administrador) <= 1 then
    raise exception 'Não é possível remover o último moderador.';
  end if;

  insert into public.user_roles(usuario_id, administrador)
  values (alvo, p_promover)
  on conflict (usuario_id) do update
    set administrador = excluded.administrador;

  insert into public.moderation_actions(administrador_id, alvo, acao)
  values (
    auth.uid(),
    alvo::text,
    case when p_promover then 'concedeu moderação' else 'removeu moderação' end
  );
end;
$$;

revoke all on function public.listar_moderadores() from public, anon;
revoke all on function public.gerenciar_moderador(text, boolean) from public, anon;
grant execute on function public.listar_moderadores() to authenticated;
grant execute on function public.gerenciar_moderador(text, boolean) to authenticated;
