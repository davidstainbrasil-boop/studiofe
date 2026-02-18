const f = require('../feature_list.json');
console.log('Total:', f.total_features, 'Completed:', f.completed_features);
const next = f.features.filter(x => !x.passes).slice(0, 5);
next.forEach(x => console.log('#' + x.id, x.priority, x.name));
