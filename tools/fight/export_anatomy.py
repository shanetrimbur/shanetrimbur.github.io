"""Rebuild the public mesh subset from Motion-Runtime's licensed anatomy resources.

python3 tools/fight/export_anatomy.py --resources /path/to/Resources --skeleton /path/to/canonical_humanoid_v1.json
Only the derived BodyParts3D mesh and minimal binding metadata are published.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--resources', type=Path, required=True)
parser.add_argument('--skeleton', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'public/lab/fight/assets')
args = parser.parse_args()
mesh = bytearray((args.resources / 'anatomy-prototype.mskin').read_bytes())
binding = json.loads((args.resources / 'anatomy-prototype.json').read_text())
grip = (args.resources / 'anatomy-prototype.mgrip').read_bytes()
assert hashlib.sha256(mesh).hexdigest() == binding['sha256'], 'Source mesh hash mismatch'
assert hashlib.sha256(grip).hexdigest() == binding['grip_sha256'], 'Grip hash mismatch'
assert mesh[:8] == b'MSKIN001' and grip[:8] == b'MGRIP001'
vertex_count = struct.unpack_from('<I', mesh, 8)[0]
for i in range(struct.unpack_from('<I', grip, 8)[0]):
    offset = 12 + i * 28
    index = struct.unpack_from('<I', grip, offset)[0]
    assert index < vertex_count
    mesh[284 + 48 * index:284 + 48 * index + 24] = grip[offset + 4:offset + 28]
skeleton = json.loads(args.skeleton.read_text())
names = [j['name'] for j in skeleton['joints']]
metadata = {k: binding[k] for k in ['source_bind_positions', 'alignment_rotations', 'attribution', 'license_url', 'limitations']}
metadata.update({
    'sha256': hashlib.sha256(mesh).hexdigest(), 'source_sha256': binding['sha256'],
    'changes': binding['changes'] + ' Existing closed-hand corrections applied for the browser fighting prototype.',
    'parents': [-1 if j['parent'] is None else names.index(j['parent']) for j in skeleton['joints']], 'names': names,
})
args.output.mkdir(parents=True, exist_ok=True)
(args.output / 'anatomy.mskin').write_bytes(mesh)
(args.output / 'anatomy.json').write_text(json.dumps(metadata, separators=(',', ':')) + '\n')
print(f'Exported {len(mesh):,} bytes; SHA256 {metadata["sha256"]}')
