import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const docsRoot = join(projectRoot, "docs");
const publicRoot = join(projectRoot, "public");
const port = 3100;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function resolveRequestPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const isPublicAsset = decoded.startsWith("/public/");
  const root = isPublicAsset ? publicRoot : docsRoot;
  const requested = pathname === "/" ? ".htmlmanual/manual.html" : isPublicAsset ? decoded.slice("/public/".length) : decoded.slice(1);
  const fullPath = resolve(root, normalize(requested));
  if (fullPath !== root && !fullPath.startsWith(`${root}${sep}`)) return null;
  return fullPath;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const filePath = resolveRequestPath(url.pathname);
    if (!filePath) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? join(filePath, "index.html") : filePath;
    const body = await readFile(finalPath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extname(finalPath).toLowerCase()] ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Close the old manual window, then try again.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Meawketting manual: http://127.0.0.1:${port}/`);
  console.log("Close this window to stop the manual server.");
});
