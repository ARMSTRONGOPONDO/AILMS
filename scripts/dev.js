const net = require('net');
const { spawn } = require('child_process');

const DEFAULT_START_PORT = 3000;
const MAX_PORT_ATTEMPTS = 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    // Let Node bind the default host (same behavior Next uses),
    // so occupied ports on IPv4/IPv6 are detected consistently.
    server.listen(port);
  });
}

async function pickPort(startPort) {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const candidate = startPort + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }
  throw new Error(`No free port found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS - 1}.`);
}

async function main() {
  const preferredPort = Number(process.env.PORT) || DEFAULT_START_PORT;
  const selectedPort = await pickPort(preferredPort);

  const env = {
    ...process.env,
    PORT: String(selectedPort),
    NEXTAUTH_URL: `http://localhost:${selectedPort}`,
    SITE_URL: `http://localhost:${selectedPort}`,
  };

  console.log(`Starting Next.js on http://localhost:${selectedPort}`);

  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(selectedPort)], {
    stdio: 'inherit',
    env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
