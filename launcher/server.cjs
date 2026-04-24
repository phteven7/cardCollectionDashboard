const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { exec } = require("node:child_process");

const args = process.argv.slice(2);
const distArgIndex = args.indexOf("--dist");
const shouldOpen = args.includes("--open");
const FIXED_PORT = 4173;
const baseDir = process.pkg ? path.dirname(process.execPath) : path.resolve(__dirname, "..");

const distDir =
  distArgIndex >= 0 && args[distArgIndex + 1]
    ? path.resolve(process.cwd(), args[distArgIndex + 1])
    : path.resolve(baseDir, "dist");

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(command);
}

function startServer(options = {}) {
  const open = options.open ?? shouldOpen;
  const onReady = options.onReady;

  if (!fs.existsSync(distDir)) {
    throw new Error(`Unable to find dist folder at ${distDir}.`);
  }

  const server = http.createServer((request, response) => {
    const urlPath = request.url ?? "/";
    const requestPath = urlPath === "/" ? "/index.html" : urlPath.split("?")[0];
    const target = path.join(distDir, requestPath);
    const safeTarget = target.startsWith(distDir) ? target : path.join(distDir, "index.html");

    const filePath = fs.existsSync(safeTarget) && fs.statSync(safeTarget).isFile()
      ? safeTarget
      : path.join(distDir, "index.html");

    response.writeHead(200, { "Content-Type": contentType(filePath) });
    response.end(fs.readFileSync(filePath));
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${FIXED_PORT} is already in use. Close the other process using http://localhost:${FIXED_PORT} and try again.`);
      process.exit(1);
    }
    throw error;
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(FIXED_PORT, "127.0.0.1", () => {
      server.off("error", reject);
      const url = `http://localhost:${FIXED_PORT}`;
      if (open) {
        openBrowser(url);
      }
      if (typeof onReady === "function") {
        onReady(url);
      }
      resolve({
        url,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((closeError) => {
              if (closeError) {
                closeReject(closeError);
                return;
              }
              closeResolve();
            });
          })
      });
    });
  });
}

async function main() {
  const { url } = await startServer();
  console.log(`CardTracker running at ${url}`);
}

module.exports = {
  FIXED_PORT,
  startServer
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
