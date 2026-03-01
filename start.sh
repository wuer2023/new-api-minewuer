#!/bin/bash

INTERVAL=${HEALTH_INTERVAL:-900}

(
  while true; do
    python3 /app/check_models.py >> /var/log/check_models.log 2>&1
    sleep "$INTERVAL"
  done
) &

exec /app/new-api
