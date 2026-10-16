// Ordinary least squares for a single feature: y = slope*x + intercept
function fitLinearRegression(points) {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  if (n === 1) {
    const c = points[0].y;
    return { slope: 0, intercept: c, r2: 0, predict: () => c };
  }

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0, den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, predict: (x) => slope * x + intercept };
}

module.exports = { fitLinearRegression };
