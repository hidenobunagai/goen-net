import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const hranaLicensePath = path.join(
  projectRoot,
  "node_modules",
  "@libsql",
  "hrana-client",
  "LICENSE"
);

const backupPath = `${hranaLicensePath}.txt`;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function patchLicense() {
  try {
    const original = await fs.readFile(hranaLicensePath, "utf8");
    const moduleSource = `/*\n${original}\n*/\nexport default ${JSON.stringify(
      original
    )};\n`;

    if (!(await fileExists(backupPath))) {
      await fs.writeFile(backupPath, original, "utf8");
    }

    await fs.writeFile(hranaLicensePath, moduleSource, "utf8");
  } catch (error) {
    if ((error?.code ?? "") === "ENOENT") {
      return;
    }

    console.warn(
      "[postinstall] Failed to patch @libsql/hrana-client LICENSE:",
      error
    );
  }
}

patchLicense();
