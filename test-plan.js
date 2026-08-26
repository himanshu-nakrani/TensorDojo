const fs = require('fs');
const content = fs.readFileSync('./artifacts/tensor-dojo/src/components/sim/LossLandscape.tsx', 'utf-8');
console.log(content.includes('STATIC_HEATMAPS'));
