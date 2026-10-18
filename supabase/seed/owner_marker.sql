-- Seed marcador: inserta al owner del panel UNA VEZ creado el usuario en Auth.
-- Correo esperado: davidkaseo@hotmail.com
--
-- Uso (después de crear el usuario en Authentication → Users, o con supabase auth):
--
--   insert into public.owners (user_id)
--   select id from auth.users where email = 'davidkaseo@hotmail.com'
--   on conflict (user_id) do nothing;
--
-- No ejecutes esto hasta que el usuario exista en auth.users.

-- Marcador documentado (no-op seguro):
select 'Seed owner: davidkaseo@hotmail.com — ejecutar INSERT cuando el user exista' as note;
