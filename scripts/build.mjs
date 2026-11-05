import { access } from "node:fs/promises";
for (const f of [
  "intake-core.js",
  "intake-client.js",
  "intake-worker.js",
  "intake-ui.js",
  "index.html",
  "app.js",
  "engine.js",
  "style.css",
  "semantic-core.js",
  "semantic-worker.js",
  "semantic-client.js",
])
  await access("dist/" + f);
console.log("Static application ready in dist/");
