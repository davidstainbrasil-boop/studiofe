const f = require('../feature_list.json');
const feat = f.features.find(x => x.id === 64);
console.log(JSON.stringify(feat, null, 2));
