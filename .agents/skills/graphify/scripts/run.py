"""Build and explore this repository's structural Graphify index."""

import argparse
import json
import os
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUNTIME = ROOT / ".graphify-venv"
VERSION = "0.9.113"
GRAPH = "graphify-out/graph.json"
OBSIDIAN_EXPORT = "docs/obsidian/Graphify"


def graphify_python() -> Path:
    python = RUNTIME / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    installed = RUNTIME / "graphify-version"
    if python.is_file() and installed.is_file() and installed.read_text(encoding="ascii").strip() == VERSION:
        return python

    venv.EnvBuilder(with_pip=True).create(RUNTIME)
    subprocess.run(
        [
            str(python), "-m", "pip", "--isolated", "--disable-pip-version-check",
            "--no-input", "--no-cache-dir", "install", "--only-binary=:all:", f"graphifyy=={VERSION}",
        ],
        cwd=ROOT,
        check=True,
    )
    installed.write_text(f"{VERSION}\n", encoding="ascii")
    return python


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("build", help="Actualiser le graphe local du code")
    commands.add_parser("query", help="Chercher des relations").add_argument("question")
    path = commands.add_parser("path", help="Relier deux symboles")
    path.add_argument("source")
    path.add_argument("target")
    commands.add_parser("explain", help="Inspecter un symbole").add_argument("symbol")
    commands.add_parser("obsidian", help="Exporter le graphe vers le coffre du projet")
    args = parser.parse_args()

    if not (3, 11, 5) <= sys.version_info[:3] < (3, 15):
        parser.error("Graphify requiert Python 3.11.5 à 3.14.")
    if args.command != "build" and not (ROOT / GRAPH).is_file():
        parser.error("Exécutez d’abord la commande build.")

    env = os.environ.copy()
    env.update(
        GRAPHIFY_OUT="graphify-out",
        GRAPHIFY_BACKEND="none",
        GRAPHIFY_QUERY_LOG_DISABLE="1",
        GRAPHIFY_NO_TIPS="1",
    )
    python = graphify_python()

    def run(*arguments: str, quiet: bool = False) -> None:
        subprocess.run(
            [str(python), "-m", "graphify", *arguments],
            cwd=ROOT,
            env=env,
            check=True,
            stdout=subprocess.DEVNULL if quiet else None,
        )

    if args.command == "build":
        run("extract", ".", "--code-only", "--max-workers", "4")
        run("cluster-only", ".", "--no-label", "--no-viz")
    elif args.command == "query":
        run("query", args.question, "--graph", GRAPH)
    elif args.command == "path":
        run("path", args.source, args.target, "--graph", GRAPH)
    elif args.command == "explain":
        run("explain", args.symbol, "--graph", GRAPH)
    else:
        run("export", "obsidian", "--graph", GRAPH, "--dir", OBSIDIAN_EXPORT, quiet=True)
        # Graphify treats its export as a vault. This project uses docs/obsidian
        # as the vault root, so Canvas cards need vault-relative note paths.
        canvas_path = ROOT / OBSIDIAN_EXPORT / "graph.canvas"
        canvas = json.loads(canvas_path.read_text(encoding="utf-8"))
        folder = canvas_path.parent.name
        for node in canvas["nodes"]:
            if node["type"] == "file":
                node["file"] = f"{folder}/{node['file']}"
        canvas_path.write_text(json.dumps(canvas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Canvas Obsidian : {OBSIDIAN_EXPORT}/graph.canvas")
        print("Ouvrez docs/obsidian/ comme coffre dans Obsidian.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as exc:
        sys.exit(exc.returncode)
