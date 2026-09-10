import os
from pathlib import Path

# NodejsFunction looks for esbuild on PATH (npx provides it during `cdk synth`).
_bin = Path(__file__).resolve().parent.parent / "node_modules" / ".bin"
os.environ["PATH"] = f"{_bin}{os.pathsep}{os.environ.get('PATH', '')}"
