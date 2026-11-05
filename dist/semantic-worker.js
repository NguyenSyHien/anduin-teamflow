import { cosine, MODEL_ID } from "./semantic-core.js";

let extractor;
const embeddings = new Map();
let queue = Promise.resolve();

async function run({ id, profiles, requirements }) {
  const progress = (message) =>
    self.postMessage({ id, type: "progress", message });
  try {
    if (!extractor) {
      progress("Loading the matching engine…");
      const { pipeline, env } = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js"
      );
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      extractor = await pipeline("feature-extraction", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (event) => {
          if (event.status === "progress" && event.file?.endsWith(".onnx")) {
            progress(
              `Downloading language model · ${Math.round(event.progress || 0)}%`,
            );
          } else if (event.status === "initiate")
            progress("Preparing language model · first use needs a download");
        },
      });
    }
    const texts = [
      ...new Set([
        ...profiles.map((p) => p.text),
        ...requirements.map((r) => r.text),
      ]),
    ];
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (text.length > 1800) throw new Error("Description is too long");
      if (!embeddings.has(text)) {
        progress(`Matching skills and experience · ${i + 1}/${texts.length}`);
        const output = await extractor(text, {
          pooling: "mean",
          normalize: true,
        });
        embeddings.set(text, Array.from(output.data));
      }
    }
    const scores = Object.fromEntries(
      requirements.map((r) => [
        r.role,
        Object.fromEntries(
          profiles.map((p) => [
            p.id,
            cosine(embeddings.get(r.text), embeddings.get(p.text)),
          ]),
        ),
      ]),
    );
    // In-memory cache is keyed by full content, so editing a profile cannot reuse its old embedding.
    while (embeddings.size > 128)
      embeddings.delete(embeddings.keys().next().value);
    self.postMessage({ id, type: "result", scores, model: MODEL_ID });
  } catch (error) {
    extractor = undefined;
    self.postMessage({
      id,
      type: "error",
      message:
        "The model could not load or run. Check your connection and browser support, then retry.",
    });
  }
}

self.onmessage = (event) => {
  queue = queue.then(() => run(event.data));
};
