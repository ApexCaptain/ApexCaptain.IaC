#! /bin/sh

vault server -config=/vault/config/local.json &

while true
do vault status
sleep 1
done

wait < <(jobs -p)