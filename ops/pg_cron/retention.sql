select cron.schedule(
  'retention',
  '0 0 * * *',
  $$
    select net.http_post(
      url := 'https://REPLACE_WITH_APP_HOST/api/jobs/retention',
      headers := jsonb_build_object(
        'Authorization', 'Bearer REPLACE_WITH_JOBS_SECRET',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
