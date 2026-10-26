Set `APP_URL` and `JOBS_SECRET` in `/etc/gc-orders/jobs.env`, then enable `expire-orders.timer`.

Manual request:

```sh
curl --fail --silent --show-error --request POST \
  "${APP_URL}/api/jobs/expire-orders" \
  --header "Authorization: Bearer ${JOBS_SECRET}"
```
