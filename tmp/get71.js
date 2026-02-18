const d = JSON.parse(require('fs').readFileSync('feature_list.json','utf8'));
const f = d.features.find(x => x.id === 71);
console.log(JSON.stringify(f, null, 2));
