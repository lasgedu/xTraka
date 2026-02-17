#!/bin/bash
set -e

# Build the frontend
echo "🔨 Building frontend..."
cd /home/xtraka/htdocs/xtraka.com/xTraka/xtraka-interface-master
npm run build

# Start the backend
echo "🚀 Starting backend..."
cd /home/xtraka/htdocs/xtraka.com/xTraka/backend
node server.js
