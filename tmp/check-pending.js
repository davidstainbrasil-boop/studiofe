const f = require('./feature_list.json');
console.log('Completas: ' + f.completed_features + '/' + f.total_features);
console.log('Pendentes: ' + pending.length + '\n');
pending.forEach(x => console.log('#' + x.id + ' [' + x.priority + '] ' + x.name + ' (deps: ' + JSON.stringify(x.dependencies) + ')'));
