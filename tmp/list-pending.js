const fl = require('../feature_list.json');
pending.forEach(f => console.log('#' + f.id, '|', f.priority, '|', f.name, '| deps:', JSON.stringify(f.dependencies)));
console.log('---');
console.log('Total pending:', pending.length);
