import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const results = [];

function addResult(status, label, details) {
  results.push({ status, label, details });
}

function addPass(label, details) {
  addResult("pass", label, details);
}

function addWarn(label, details) {
  addResult("warn", label, details);
}

function addFail(label, details) {
  addResult("fail", label, details);
}

function formatStatus(status) {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️";
  return "❌";
}

let manifest;
let packageJson;
let versions;
let readme = null;

try {
  manifest = readJson("manifest.json");
} catch (error) {
  addFail(
    "Read manifest.json",
    `Could not parse manifest.json: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  packageJson = readJson("package.json");
} catch (error) {
  addFail(
    "Read package.json",
    `Could not parse package.json: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  versions = readJson("versions.json");
} catch (error) {
  addFail(
    "Read versions.json",
    `Could not parse versions.json: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (fileExists("README.md")) {
  try {
    readme = readText("README.md");
  } catch (error) {
    addFail(
      "Read README.md",
      `Could not read README.md: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
} else {
  addFail("README presence", "README.md is missing.");
}

if (manifest) {
  const requiredFields = ["id", "name", "version", "minAppVersion", "description"];
  const missingFields = requiredFields.filter((field) => {
    const value = manifest[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingFields.length === 0) {
    addPass(
      "Required manifest fields",
      `manifest.json contains non-empty id, name, version, minAppVersion, and description.`,
    );
  } else {
    addFail(
      "Required manifest fields",
      `Missing or empty manifest fields: ${missingFields.join(", ")}.`,
    );
  }

  const description = typeof manifest.description === "string" ? manifest.description : "";
  if (description.length <= 250) {
    addPass(
      "Manifest description length",
      `Description is ${description.length} characters (limit: 250).`,
    );
  } else {
    addFail(
      "Manifest description length",
      `Description is ${description.length} characters (limit: 250).`,
    );
  }

  if (typeof manifest.id === "string" && manifest.id.startsWith("obsidian-")) {
    addWarn(
      "Plugin ID policy",
      `Plugin id "${manifest.id}" starts with "obsidian-". Obsidian community review rejects plugin IDs containing "obsidian"; rename before submission.`,
    );
  } else if (typeof manifest.id === "string" && manifest.id.includes("obsidian")) {
    addWarn(
      "Plugin ID policy",
      `Plugin id "${manifest.id}" contains "obsidian". Community review may reject this id; confirm whether it must be renamed before submission.`,
    );
  } else if (typeof manifest.id === "string") {
    addPass("Plugin ID policy", `Plugin id "${manifest.id}" does not contain the restricted prefix.`);
  }

  if (Object.prototype.hasOwnProperty.call(manifest, "authorUrl") && manifest.authorUrl === "") {
    addWarn(
      "Optional manifest fields",
      "authorUrl is present but empty. Omit empty optional fields instead of leaving blank strings.",
    );
  } else {
    addPass("Optional manifest fields", "No empty optional authorUrl field found.");
  }
}

if (manifest && packageJson && versions) {
  const manifestVersion = manifest.version;
  const packageVersion = packageJson.version;
  const versionExists = Object.prototype.hasOwnProperty.call(versions, manifestVersion);

  if (manifestVersion === packageVersion && versionExists) {
    addPass(
      "Version parity",
      `manifest.json and package.json both use version ${manifestVersion}, and versions.json includes that key.`,
    );
  } else {
    const issues = [];
    if (manifestVersion !== packageVersion) {
      issues.push(`manifest.json version (${manifestVersion}) does not match package.json version (${packageVersion})`);
    }
    if (!versionExists) {
      issues.push(`versions.json is missing key ${manifestVersion}`);
    }
    addFail("Version parity", `${issues.join("; ")}.`);
  }

  const mappedVersion = versions[manifestVersion];
  if (mappedVersion === manifest.minAppVersion) {
    addPass(
      "minAppVersion mapping",
      `versions.json maps ${manifestVersion} to ${mappedVersion}, matching manifest.json.`,
    );
  } else {
    addFail(
      "minAppVersion mapping",
      `versions.json maps ${manifestVersion} to ${String(mappedVersion)}, but manifest.json minAppVersion is ${manifest.minAppVersion}.`,
    );
  }
}

const requiredAssets = ["main.js", "manifest.json"];
const missingAssets = requiredAssets.filter((asset) => !fileExists(asset));
if (missingAssets.length === 0) {
  addPass(
    "Required release assets",
    "main.js and manifest.json exist at the repository root.",
  );
} else {
  addFail(
    "Required release assets",
    `Missing required release assets: ${missingAssets.join(", ")}.`,
  );
}

if (fileExists("styles.css")) {
  addPass("Optional styles asset", "styles.css exists at the repository root.");
} else {
  addWarn("Optional styles asset", "styles.css is not present. This is optional for release assets.");
}

if (manifest && readme !== null) {
  if (readme.includes(manifest.version)) {
    addPass(
      "README version coverage",
      `README.md references the current plugin version ${manifest.version}.`,
    );
  } else {
    addFail(
      "README version coverage",
      `README.md does not mention the current plugin version ${manifest.version}.`,
    );
  }
}

const errorCount = results.filter((result) => result.status === "fail").length;
const warningCount = results.filter((result) => result.status === "warn").length;
const passCount = results.filter((result) => result.status === "pass").length;

console.log("Release readiness audit\n");
for (const result of results) {
  console.log(`${formatStatus(result.status)} ${result.label}: ${result.details}`);
}

console.log(
  `\nSummary: ${passCount} passed, ${warningCount} warning${warningCount === 1 ? "" : "s"}, ${errorCount} error${errorCount === 1 ? "" : "s"}.`,
);

process.exit(errorCount > 0 ? 1 : 0);
