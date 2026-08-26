const fs = require('fs');

const path = './artifacts/tensor-dojo/src/components/sim/LossLandscape.tsx';
let content = fs.readFileSync(path, 'utf8');

const staticHeatmaps = `// Precompute the heatmap values and a min/max for shading.
// This is hoisted out of the component to avoid blocking the main thread
// during route transitions when the component remounts and loses useMemo cache.
const STATIC_HEATMAPS = Object.fromEntries(
  listSurfaces().map((surface) => {
    const cells: number[][] = [];
    let fMin = Infinity;
    let fMax = -Infinity;
    const step = (2 * surface.extent) / GRID;
    for (let i = 0; i < GRID; i++) {
      const row: number[] = [];
      const yi = -surface.extent + (i + 0.5) * step;
      for (let j = 0; j < GRID; j++) {
        const xj = -surface.extent + (j + 0.5) * step;
        const v = surface.f(xj, yi);
        row.push(v);
        if (v < fMin) fMin = v;
        if (v > fMax) fMax = v;
      }
      cells.push(row);
    }
    return [surface.id, { cells, fMin, fMax }];
  })
) as Record<SurfaceId, { cells: number[][]; fMin: number; fMax: number }>;

/**
 * Loss-landscape visualizer. Renders the chosen 2D surface as a`;

content = content.replace('/**\n * Loss-landscape visualizer. Renders the chosen 2D surface as a', staticHeatmaps);

const oldMemo = `  // Precompute the heatmap values and a min/max for shading.
  const { cells, fMin, fMax } = useMemo(() => {
    const cells: number[][] = [];
    let fMin = Infinity;
    let fMax = -Infinity;
    const step = (2 * surface.extent) / GRID;
    for (let i = 0; i < GRID; i++) {
      const row: number[] = [];
      const yi = -surface.extent + (i + 0.5) * step;
      for (let j = 0; j < GRID; j++) {
        const xj = -surface.extent + (j + 0.5) * step;
        const v = surface.f(xj, yi);
        row.push(v);
        if (v < fMin) fMin = v;
        if (v > fMax) fMax = v;
      }
      cells.push(row);
    }
    return { cells, fMin, fMax };
  }, [surface]);`;

const newLookup = `  // Retrieve precomputed heatmap values (O(1) lookup).
  // This replaces a heavy useMemo block to prevent main-thread blocking on route remounts.
  const { cells, fMin, fMax } = STATIC_HEATMAPS[surfaceId];`;

content = content.replace(oldMemo, newLookup);

fs.writeFileSync(path, content);
