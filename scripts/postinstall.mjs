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
    const current = await fs.readFile(hranaLicensePath, "utf8");

    let sourceForModule = current;
    if (current.includes("export default")) {
      if (await fileExists(backupPath)) {
        sourceForModule = await fs.readFile(backupPath, "utf8");
      } else {
        return;
      }
    }

    const moduleSource = `/*\n${sourceForModule}\n*/\nexport default ${JSON.stringify(
      sourceForModule
    )};\n`;

    if (!(await fileExists(backupPath))) {
      await fs.writeFile(backupPath, sourceForModule, "utf8");
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
