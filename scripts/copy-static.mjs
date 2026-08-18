import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (entry.name === "dist" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;

  const source = path.join(root, entry.name);
  const destination = path.join(dist, entry.name);

  if (entry.isDirectory() && ["assets"].includes(entry.name)) {
    await cp(source, destination, { recursive: true, force: true });
  } else if (entry.isFile() && (entry.name.endsWith(".html") || entry.name.endsWith(".css") || entry.name === "catalogo.json")) {
    await cp(source, destination, { force: true });
  }
}

const oldScript = path.join(dist, "script.js");
const nestedScript = path.join(dist, "src", "script.js");
try {
  await cp(nestedScript, oldScript, { force: true });
  await rm(path.join(dist, "src"), { recursive: true, force: true });
} catch {
  // O compilador pode emitir directamente para dist conforme o rootDir configurado.
}

console.log("Ficheiros estáticos copiados para dist/");
