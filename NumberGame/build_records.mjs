import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.resolve(directory, "../number_languages");
const files = fs.readdirSync(sourceDirectory)
  .filter((filename) => filename.endsWith(".json"))
  .sort();

if (files.length !== 50) {
  throw new Error(`Expected 50 source records, found ${files.length}.`);
}

const records = files.map((sourceFile) => {
  const record = JSON.parse(
    fs.readFileSync(path.join(sourceDirectory, sourceFile), "utf8")
  );
  return { sourceFile, ...record };
});

fs.writeFileSync(
  path.join(directory, "records.js"),
  `window.NUMERAL_RECORDS = ${JSON.stringify(records, null, 2)};\n`,
  "utf8"
);

console.log(`Built WebGame/records.js from ${records.length} JSON records.`);
