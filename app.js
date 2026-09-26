-- =====================================================
-- Título de la retrospectiva
-- =====================================================
-- Ejecutar una sola vez en Supabase SQL Editor.
-- Mantiene las retrospectivas existentes y agrega el título
-- para las nuevas sesiones.

alter table public.retros
  add column if not exists titulo text;


-- =====================================================
-- Crear retro con título
-- =====================================================
-- No reemplazamos la función create_retro existente.
-- La envolvemos para conservar su comportamiento actual y
-- guardar el nuevo título en la misma operación.

drop function if exists public.create_retro_with_title(text, text, date);

create function public.create_retro_with_title(
  p_titulo text,
  p_equipos text,
  p_fecha date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_title text := trim(coalesce(p_titulo, ''));
  clean_teams text := trim(coalesce(p_equipos, ''));
  created_id uuid;
  created_codigo text;
begin
  if char_length(clean_title) < 1 or char_length(clean_title) > 160 then
    raise exception 'El título debe tener entre 1 y 160 caracteres.';
  end if;

  if char_length(clean_teams) < 1 then
    raise exception 'Los equipos que participan son obligatorios.';
  end if;

  -- Conserva la lógica existente de creación de retrospectivas.
  perform public.create_retro(clean_teams, p_fecha);

  -- Recuperamos la retrospectiva recién creada para asignarle el título.
  select id, codigo
    into created_id, created_codigo
  from public.retros
  where nombre = clean_teams
    and fecha = p_fecha
  order by created_at desc
  limit 1;

  if created_id is null then
    raise exception 'No se pudo identificar la retrospectiva recién creada.';
  end if;

  update public.retros
  set titulo = clean_title
  where id = created_id;

  return jsonb_build_object(
    'success', true,
    'id', created_id,
    'codigo', created_codigo,
    'titulo', clean_title
  );
end;
$$;

grant execute
on function public.create_retro_with_title(text, text, date)
to anon, authenticated;
