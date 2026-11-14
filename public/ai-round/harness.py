# Runs a student's files with pytest inside Pyodide. Loaded once by
# pyodide-worker.js; `run` is called for every test run.
import contextlib
import importlib
import io
import json
import os
import shutil
import sys

sys.dont_write_bytecode = True
ROOT = "/work"


def _reset(files):
    # Forget modules imported from the previous run, or old code would be reused.
    for name, mod in list(sys.modules.items()):
        f = getattr(mod, "__file__", None) or ""
        if f.startswith(ROOT):
            del sys.modules[name]
    os.chdir("/")  # can't remove the folder we're standing in
    os.makedirs(ROOT, exist_ok=True)
    for entry in os.listdir(ROOT):
        full = os.path.join(ROOT, entry)
        if os.path.isdir(full):
            shutil.rmtree(full)
        else:
            os.remove(full)
    for path, content in files.items():
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as fh:
            fh.write(content)
    os.chdir(ROOT)
    if ROOT not in sys.path:
        sys.path.insert(0, ROOT)
    importlib.invalidate_caches()


class _Collector:
    def __init__(self):
        self.results = []

    def pytest_runtest_logreport(self, report):
        if report.when == "call":
            outcome = "failed" if report.failed else report.outcome
        elif report.failed:
            outcome = "error"
        elif report.skipped:
            outcome = "skipped"
        else:
            return
        msg = report.longreprtext[-1500:] if report.failed else ""
        self.results.append({"id": report.nodeid, "outcome": outcome, "message": msg})

    def pytest_collectreport(self, report):
        if report.failed:
            self.results.append(
                {"id": report.nodeid or "collection", "outcome": "error", "message": report.longreprtext[-1500:]}
            )


def run(files_json, targets_json):
    import pytest

    _reset(json.loads(files_json))
    collector = _Collector()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        code = pytest.main(
            ["-q", "-p", "no:cacheprovider", "--tb=short", *json.loads(targets_json)],
            plugins=[collector],
        )
    return json.dumps({"code": int(code), "tests": collector.results, "output": buf.getvalue()[-6000:]})
