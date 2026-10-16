"""Package a chapter directory without retaining machine-specific absolute paths."""
from pathlib import Path
import argparse, json, zipfile, os
parser=argparse.ArgumentParser()
parser.add_argument('directory',type=Path)
parser.add_argument('archive',type=Path)
args=parser.parse_args()
directory=args.directory.resolve(); archive=args.archive.resolve()
if not directory.is_dir(): raise SystemExit('Chapter directory is missing')
if archive.is_relative_to(directory): raise SystemExit('Place the ZIP outside the source chapter directory')
entries=json.loads((directory/'chapters.json').read_text('utf8'))
for entry in entries:
    for key in ('html','video'):
        if key in entry and not (directory/entry[key]).is_file(): raise SystemExit('Missing chapter file: '+entry[key])
archive.parent.mkdir(parents=True,exist_ok=True)
temporary=archive.with_suffix(archive.suffix+'.tmp')
try:
    with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as target:
        for file in sorted(directory.rglob('*')):
            if file.is_file(): target.write(file,Path(directory.name)/file.relative_to(directory))
    with zipfile.ZipFile(temporary) as check:
        if check.testzip(): raise SystemExit('Archive integrity failed')
    os.replace(temporary,archive)
finally:
    if temporary.exists(): temporary.unlink()
print(json.dumps({'archive':str(archive),'chapters':len(entries),'bytes':archive.stat().st_size},ensure_ascii=False))
