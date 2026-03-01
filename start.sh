#!/bin/bash

(
  while true; do
    python3 /app/check_models.py >> /var/log/check_models.log 2>&1
    sleep 900
  done
) &

exec /app/new-api
