import json
import statistics
from pathlib import Path

paths = sorted(Path('/tmp').glob('tensor-dojo-benchmark-*.json'))
runs = [json.loads(p.read_text()) for p in paths]
by_name = {}
for run in runs:
    for row in run['results']:
        by_name.setdefault(row['name'], []).append(row)

summary = {
    'runs': len(runs),
    'metadata': runs[0]['metadata'] if runs else {},
    'benchmarks': [],
}
for name, rows in by_name.items():
    means = [r['meanMs'] for r in rows]
    ops = [r['opsPerSecond'] for r in rows]
    summary['benchmarks'].append({
        'name': name,
        'workload': rows[0]['workload'],
        'meanMsMedian': statistics.median(means),
        'meanMsMin': min(means),
        'meanMsMax': max(means),
        'opsPerSecondMedian': statistics.median(ops),
        'opsPerSecondMin': min(ops),
        'opsPerSecondMax': max(ops),
    })

updated = by_name.get('swiglu.updated', [])
baseline = by_name.get('swiglu.baseline', [])
overheads = [(u['meanMs'] / b['meanMs'] - 1) * 100 for u, b in zip(updated, baseline)]
summary['swigluComparison'] = {
    'overheadPctMedian': statistics.median(overheads) if overheads else None,
    'overheadPctMin': min(overheads) if overheads else None,
    'overheadPctMax': max(overheads) if overheads else None,
    'perRunOverheadPct': overheads,
}
print(json.dumps(summary, indent=2))
