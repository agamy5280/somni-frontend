#!/bin/bash
# Start JSON server in the background
npx json-server --watch src/assets/database/db.json --host 0.0.0.0 --port 3000 &
JSON_SERVER_PID=$!

# Start Angular app with proxy in the foreground
node_modules/.bin/ng serve --host 0.0.0.0 --port 4200 --disable-host-check

# Clean up JSON server when Angular app exits
kill $JSON_SERVER_PID