import { INTAKE_MODEL, intakeMessages, parseProposal } from "./intake-core.js";
let generator;
self.onmessage = async ({ data: { id, brief } }) => {
  const progress = (message) =>
    self.postMessage({ id, type: "progress", message });
  try {
    const messages = intakeMessages(brief);
    if (!generator) {
      progress(
        "Downloading the staffing model · first use is about 365 MB plus runtime…",
      );
      const { pipeline, env } = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js"
      );
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      generator = await pipeline("text-generation", INTAKE_MODEL, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (event) => {
          if (event.status === "progress" && event.file?.endsWith(".onnx"))
            progress(
              `Downloading staffing model · ${Math.round(event.progress || 0)}%`,
            );
        },
      });
    }
    progress("Reading the brief and drafting roles · this may take a minute…");
    const result = await generator(messages, {
      max_new_tokens: 440,
      do_sample: false,
      repetition_penalty: 1.05,
    });
    const generated = result[0].generated_text;
    const text = Array.isArray(generated)
      ? generated.at(-1).content
      : generated;
    const proposal = parseProposal(text);
    self.postMessage({ id, type: "result", proposal, model: INTAKE_MODEL });
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      message:
        "The model could not return a valid staffing plan. No roles have been approved.",
    });
  }
};
