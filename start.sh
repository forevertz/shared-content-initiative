#!/bin/sh

# Run elasticsearch
bash /usr/local/bin/docker-entrypoint.sh &
sleep 10

# Run application
cd /usr/src/app
yarn start
