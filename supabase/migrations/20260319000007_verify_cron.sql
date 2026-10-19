do $$
declare
  n int;
begin
  select count(*) into n from cron.job where jobname = 'panel-sync-all-hourly' and active;
  if n < 1 then
    raise exception 'cron job panel-sync-all-hourly missing';
  end if;
  raise notice 'cron ok: % job(s)', n;
end $$;
