#!/bin/bash

# Configuration script to prepare .replit for deployment
# Removes multiple external ports to prevent deployment conflicts

echo "🔧 Configuring .replit for deployment..."

# Create a deployment-ready .replit file
cat > .replit << 'EOF'
modules = ["nodejs-20", "web", "postgresql-16"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules", "dist"]

[nix]
channel = "stable-24_05"

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build:client"]
run = ["npm", "run", "start"]

# Single port configuration for deployment (required)
[[ports]]
localPort = 5000
externalPort = 80

[env]
PORT = "5000"

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

[agent]
EOF

echo "✅ .replit configured for deployment with single port (80)"
echo "📋 Changes made:"
echo "   - Removed multiple external ports"
echo "   - Kept only port 5000 -> 80 mapping"
echo "   - Updated build command to use build:client"