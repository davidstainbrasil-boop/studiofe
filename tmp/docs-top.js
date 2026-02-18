const fs = require('fs');
const j = JSON.parse(fs.readFileSync('docs/reports/docs-audit.json', 'utf8'));

function isOps(file) {
  const f = String(file || '');
  return (
    f.startsWith('docs/operations/') ||
    f.startsWith('docs/operacao/') ||
    f.startsWith('docs/setup/') ||
    f.startsWith('docs/seguranca/') ||
    f.startsWith('docs/DEPLOY') ||
    f.startsWith('docs/DEPLOYMENT') ||
    f.startsWith('docs/PRODUCTION') ||
    f.startsWith('docs/OPERATIONS_RUNBOOK') ||
    f.startsWith('docs/MANUAL') ||
    f.startsWith('docs/GUIA') ||
    f.startsWith('docs/ROLLBACK') ||
    f.startsWith('docs/RECOVERY')
  );
}

const rows = (j.results || [])
  .map((r) => {
    const mr = (r.missingRoutes || []).length;
    const mf = (r.missingFileRefs || []).length;
    return { file: r.file, issues: mr + mf, mr, mf };
  })
  .filter((r) => isOps(r.file) && r.issues > 0)
  .sort((a, b) => b.issues - a.issues)
  .slice(0, 20);

console.log('Top ops/deploy docs with issues:');
for (const r of rows) {
  console.log(String(r.issues) + '\t(routes ' + r.mr + ', refs ' + r.mf + ')\t' + r.file);
}
