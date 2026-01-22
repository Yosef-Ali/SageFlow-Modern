const { createServer } = require('http')
const path = require('path')
const { parse } = require('url')
const next = require('next')

async function startServer(port) {
  const dir = path.join(process.resourcesPath, 'standalone')

  // Check if we are in development or production
  // In dev, we don't start the server here (external process)
  // In prod, standalone folder contains everything

  process.env.PORT = port
  process.env.HOSTNAME = 'localhost'

  // In packaged app, the server.js entry point from standalone build is what we want
  // But Electron needs to spawn it as a child process if we want full isolation
  // However, simpler approach: require the server handler if compatible

  const serverPath = path.join(dir, 'server.js')

  // Return the path to server.js so main process can spawn it
  return serverPath
}

module.exports = { startServer }
