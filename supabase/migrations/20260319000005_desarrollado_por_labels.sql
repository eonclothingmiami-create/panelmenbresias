-- Asegura valores canónicos David / Santiago / Ambos (enum ya creado en 000004).
-- Cualquier valor fuera del enum no puede existir; este paso documenta y normaliza
-- filas por si se importaron con casing distinto vía texto antes del enum.

do $$
begin
  -- No-op seguro si la columna ya es enum public.desarrollador
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'desarrollado_por'
  ) then
    update public.clients
    set desarrollado_por = 'ambos'
    where desarrollado_por is null;

    update public.apps
    set desarrollado_por = 'ambos'
    where desarrollado_por is null;
  end if;
end $$;
