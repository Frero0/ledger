// Collect license notices from the installed runtime dependency graph.
// Run after npm ci and whenever package-lock.json changes. No network requests.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
const root = resolve(".");
const seen = new Map();
function locate(name, from) {
  let cursor = from;
  while (cursor.startsWith(root)) {
    const candidate = join(cursor, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (cursor === root) break;
    cursor = dirname(cursor);
  }
  return null;
}
function visit(name, from) {
  const dir = locate(name, from);
  if (!dir || seen.has(dir)) return;
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  seen.set(dir, pkg);
  for (const dependency of Object.keys({
    ...pkg.dependencies,
    ...pkg.optionalDependencies,
  }))
    visit(dependency, dir);
}
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
for (const name of Object.keys(manifest.dependencies)) visit(name, root);
const blocks = [
  "Ledger — runtime third-party license notices\nGenerated from the installed lockfile dependencies. Each package retains its own copyright and license.",
];
for (const [dir, pkg] of [...seen].sort((a, b) =>
  a[1].name.localeCompare(b[1].name),
)) {
  const files = readdirSync(dir, { withFileTypes: true }).filter(
    (entry) =>
      entry.isFile() && /^(licen[cs]e|copying|notice)(\.|$)/i.test(entry.name),
  );
  if (!files.length)
    throw Error(
      `Missing license file for ${pkg.name}; review before distributing`,
    );
  blocks.push(
    `${pkg.name}@${pkg.version} (${pkg.license || "see notice"})\n\n${files.map((file) => readFileSync(join(dir, file.name), "utf8")).join("\n\n")}`,
  );
}
writeFileSync(
  "public/THIRD_PARTY_NOTICES.txt",
  blocks
    .join("\n\n" + "=".repeat(72) + "\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trimEnd() + "\n",
);
console.log(`Collected notices for ${seen.size} runtime packages.`);
