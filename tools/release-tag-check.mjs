import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const requestedTag = process.argv.find((arg) => arg.startsWith("--tag="))?.slice("--tag=".length)
  || process.env.GITHUB_REF_NAME
  || "";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  console.error(`AIstudy release tag check failed: ${message}`);
  process.exit(1);
}

const packageVersion = JSON.parse(read("package.json")).version;
const updateLogVersion = read("src/updateLog.ts").match(/version:\s*"([^"]+)"/)?.[1] ?? "";
const expectedTag = `v${packageVersion}`;

if (!requestedTag) fail("missing release tag");
if (requestedTag !== expectedTag) fail(`tag ${requestedTag} does not match package version ${expectedTag}`);
if (updateLogVersion !== packageVersion) {
  fail(`updateLog latest version ${updateLogVersion || "missing"} does not match package version ${packageVersion}`);
}

console.log(`AIstudy release tag check passed for ${requestedTag}.`);
