import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const violations = [];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    if (/\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/.test(entry.name)) return [];
    return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [absolute] : [];
  }));
  return nested.flat();
}

async function forbid(directory, patterns, reason) {
  for (const file of await sourceFiles(path.join(root, directory))) {
    const source = await readFile(file, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(source)) {
        violations.push(`${path.relative(root, file)}: ${reason} (${pattern})`);
      }
    }
  }
}

await forbid(
  "apps/institutional/src",
  [/@lufa\/(?:database|identity-institutional|integrations|operations|sports)/, /@\/repositories/, /@\/models/, /@\/services\/backend/],
  "el frontend institucional no puede importar backend o persistencia",
);
await forbid(
  "apps/fantasy/src",
  [/@lufa\/(?:database|identity-institutional|integrations|operations|sports)/, /DATABASE_URL|MONGODB_URI/],
  "Fantasy no puede importar backend, dominio institucional o secretos",
);
await forbid(
  "packages/sports/src/entities",
  [/from ["'](?:next|mongoose|@prisma)/, /@lufa\/(?:database|integrations|operations)/, /process\.env/],
  "el dominio debe permanecer libre de frameworks, infraestructura y configuración",
);
await forbid(
  "packages/sports/src/services",
  [/@lufa\/database/, /RepositoryContainer/, /new\s+[A-Z][A-Za-z]+Service\s*\(/],
  "los casos de uso deportivos deben depender de puertos inyectados",
);
await forbid(
  "packages/identity-institutional/src",
  [/@lufa\/(?:database|integrations)/, /RepositoryContainer/, /new\s+[A-Z][A-Za-z]+Service\s*\(/],
  "identidad institucional debe depender de puertos, no de infraestructura",
);
await forbid(
  "packages/operations/src",
  [/@lufa\/database/, /RepositoryContainer/, /new\s+[A-Z][A-Za-z]+Service\s*\(/],
  "operaciones debe recibir persistencia y servicios por inyección",
);
await forbid(
  "packages/integrations/src",
  [/@lufa\/database/, /RepositoryContainer/, /new\s+[A-Z][A-Za-z]+Service\s*\(/],
  "integraciones no debe resolver persistencia ni otros servicios globalmente",
);
await forbid(
  "apps/api/src/app/api",
  [/new\s+[A-Z][A-Za-z]+Service\s*\(/, /@lufa\/database\/(?:models|prisma|mongodb)/],
  "los handlers deben delegar construcción al composition root",
);
await forbid(
  "packages/contracts/src",
  [/@lufa\/(?:database|integrations|operations|sports|identity-institutional)/, /from ["'](?:next|mongoose|@prisma)/],
  "los contratos públicos no pueden depender de infraestructura",
);

if (violations.length > 0) {
  console.error(["Se detectaron violaciones de arquitectura:", ...violations.map((item) => `- ${item}`)].join("\n"));
  process.exitCode = 1;
} else {
  console.log("Límites de arquitectura verificados.");
}
