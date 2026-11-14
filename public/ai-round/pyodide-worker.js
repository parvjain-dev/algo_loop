/* Runs Python tests off the main thread. A hung run (infinite loop) is
   handled by the page terminating this worker and starting a new one. */
const PYODIDE_VERSION = "0.27.7";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const WHEELS = [
  "iniconfig-2.0.0-py3-none-any.whl",
  "packaging-24.2-py3-none-any.whl",
  "pluggy-1.5.0-py3-none-any.whl",
  "pytest-8.3.5-py3-none-any.whl",
];

let ready = null;

async function init(base) {
  importScripts(PYODIDE_URL + "pyodide.js");
  const py = await loadPyodide({ indexURL: PYODIDE_URL });
  const site = py.runPython("import sysconfig; sysconfig.get_paths()['purelib']");
  for (const w of WHEELS) {
    const res = await fetch(base + "wheels/" + w);
    if (!res.ok) throw new Error("Could not load " + w);
    py.unpackArchive(await res.arrayBuffer(), "zip", { extractDir: site });
  }
  py.runPython(await (await fetch(base + "harness.py")).text());
  return py;
}

self.onmessage = async (e) => {
  const { id, kind, base, files, targets } = e.data;
  try {
    if (!ready) {
      ready = init(base).catch((err) => {
        ready = null; // let the next message retry loading
        throw err;
      });
    }
    const py = await ready;
    if (kind === "init") {
      self.postMessage({ id, ok: true });
      return;
    }
    const run = py.globals.get("run");
    const out = run(JSON.stringify(files), JSON.stringify(targets));
    run.destroy();
    self.postMessage({ id, ok: true, result: JSON.parse(out) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
