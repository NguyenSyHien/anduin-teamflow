let worker,
  pending,
  serial = 0;
export function cancelIntake() {
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(Error("Cancelled"));
    pending = null;
  }
  worker?.terminate();
  worker = null;
}
export function draftStaffing(brief, onProgress) {
  cancelIntake();
  const id = ++serial;
  return new Promise((resolve, reject) => {
    try {
      worker = new Worker(new URL("./intake-worker.js", import.meta.url), {
        type: "module",
      });
      pending = { id, reject, timer: setTimeout(cancelIntake, 300000) };
      worker.onmessage = ({ data }) => {
        if (pending?.id !== data.id) return;
        if (data.type === "progress") {
          onProgress(data.message);
          return;
        }
        clearTimeout(pending.timer);
        pending = null;
        worker.terminate();
        worker = null;
        if (data.type === "result") resolve(data);
        else reject(Error(data.message));
      };
      worker.onerror = () => {
        if (pending?.id === id) cancelIntake();
      };
      worker.postMessage({ id, brief });
    } catch (error) {
      cancelIntake();
      reject(error);
    }
  });
}
