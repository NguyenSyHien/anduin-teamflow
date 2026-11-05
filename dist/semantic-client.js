import { profileText, requirementText } from "./semantic-core.js";

let worker,
  current,
  serial = 0;
export function cancelMatching() {
  if (current) {
    clearTimeout(current.timer);
    current.reject(new Error("Matching cancelled"));
    current = undefined;
    worker?.terminate();
    worker = undefined;
  }
}

export function matchWorkspace(state, project, roles, onProgress) {
  cancelMatching();
  const id = ++serial;
  return new Promise((resolve, reject) => {
    try {
      worker ??= new Worker(new URL("./semantic-worker.js", import.meta.url), {
        type: "module",
      });
      current = {
        id,
        reject,
        timer: setTimeout(() => {
          cancelMatching();
        }, 180000),
      };
      worker.onmessage = ({ data }) => {
        if (!current || data.id !== current.id) return;
        if (data.type === "progress") {
          onProgress(data.message);
          return;
        }
        clearTimeout(current.timer);
        current = undefined;
        if (data.type === "result") resolve(data);
        else reject(new Error(data.message));
      };
      worker.onerror = () => {
        if (!current || current.id !== id) return;
        clearTimeout(current.timer);
        current = undefined;
        worker.terminate();
        worker = undefined;
        reject(new Error("Model worker unavailable."));
      };
      worker.postMessage({
        id,
        profiles: state.people.map((p) => ({ id: p.id, text: profileText(p) })),
        requirements: roles.map((role) => ({
          role,
          text: requirementText(project, role),
        })),
      });
    } catch (error) {
      if (current) clearTimeout(current.timer);
      current = undefined;
      reject(error);
    }
  });
}
