#!/bin/bash

# Start backend server in background
npm run dev &

# Wait a bit for backend to start
sleep 3

# Start frontend dev server
cd client && npx vite --host 0.0.0.0 --port 5000
