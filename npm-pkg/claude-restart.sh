#!/usr/bin/env bash

# Claude CLI Restart Wrapper
#
# This script acts as a wrapper around the main Claude CLI (cli.mjs) that:
# 1. Launches the CLI with the same arguments passed to this script
# 2. Monitors the CLI process for a special exit code (42)
# 3. If the special exit code is detected, it restarts the CLI with the same arguments
# 4. Prevents infinite restart loops by limiting restart attempts

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Path to cli.mjs - look for it in the same directory as this script
CLI_PATH="$SCRIPT_DIR/cli.js"

# DO NOT change the current working directory
# The CLI needs to maintain the original working directory it was launched from

# Define the signal we'll use to indicate a restart is needed
# Using exit code 42 as our special signal
RESTART_EXIT_CODE=42

# Track restart attempts to prevent infinite restart loops
RESTART_COUNT=0
MAX_RESTARTS=5
RESTART_RESET_TIME=60 # 1 minute in seconds

# Check if cli.mjs exists
if [ ! -f "$CLI_PATH" ]; then
  echo "Error: Could not find $CLI_PATH"
  exit 1
fi

# Function to start the CLI
start_cli() {
  local is_restart="${2:-false}"
  local args=("$@")
  
  # Remove the is_restart parameter from args
  if [ "$is_restart" = "true" ]; then
    # If second parameter is "true", remove first two parameters
    args=("${args[@]:2}")
  else
    # If second parameter is not "true", just remove first parameter
    args=("${args[@]:1}")
  fi
  
  # If we restart too many times in a short period, exit
  if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
    echo "Too many restarts ($RESTART_COUNT) in a short period. Exiting."
    exit 1
  fi
  
  # If this is a restart and no args are provided, add 'resume 0' to restore the last conversation
  if [ "$is_restart" = "true" ] && [ ${#args[@]} -eq 0 ]; then
    args=("resume" "0")
  fi
  
  # Run cli.mjs with the provided arguments
  "$CLI_PATH" "${args[@]}"
  
  # Capture the exit code
  EXIT_CODE=$?
  
  # Check if we need to restart
  if [ $EXIT_CODE -eq $RESTART_EXIT_CODE ]; then
    RESTART_COUNT=$((RESTART_COUNT + 1))
    
    # Reset restart counter after some time (in background)
    (
      sleep $RESTART_RESET_TIME
      RESTART_COUNT=0
    ) &
    
    # Restart with the same arguments
    start_cli "true" "${args[@]}"
  else
    # Any other exit code - exit with the same code
    exit $EXIT_CODE
  fi
}

# Start the CLI with all arguments passed to this script
start_cli "false" "$@"