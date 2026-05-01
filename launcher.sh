#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start the backend in a new terminal window so logs are visible
# This uses gnome-terminal (default on Ubuntu)
if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --working-directory="$DIR/backend" --title="S M Glamz Backend" -- bash -c "npm start; exec bash"
else
    # Fallback for other terminals
    x-terminal-emulator -e "bash -c 'cd \"$DIR/backend\" && npm start; exec bash'" &
fi

# Wait for the server to start (check port 4000)
echo "Waiting for app to start..."
while ! nc -z localhost 4000; do   
  sleep 1
done

# Open the browser
xdg-open "http://localhost:4000"
