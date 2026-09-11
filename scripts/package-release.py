"""Package only installable runtime files; no Foundry application is needed."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "system.json").read_text(encoding="utf-8-sig"))
dist = root / "dist"
dist.mkdir(exist_ok=True)
runtime = ["assets", "data", "lang", "lib", "module", "packs", "styles", "templates"]
files = [root / "system.json", root / "README.md"]
for folder in runtime:
    files.extend(p for p in (root / folder).rglob("*") if p.is_file()
                 and p.name not in {"LOCK", "LOG", "LOG.old"})
for pack in manifest["packs"]:
    path = root / pack["path"]
    current = (path / "CURRENT").read_text().strip()
    assert (path / current).is_file(), f"Missing LevelDB manifest: {path}"
archive = dist / "gluniverse-titan-world.zip"
with ZipFile(archive, "w", ZIP_DEFLATED) as bundle:
    for file in files:
        bundle.write(file, file.relative_to(root).as_posix())
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert json.loads(bundle.read("system.json")) == manifest
(dist / "system.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Packaged {len(files)} files for v{manifest['version']}")
