'use strict';

const Worker = require('tiny-worker'),
  ora = require('ora'),
  caches = [
    'hashlru',
    'hyperlru-map',
    'hyperlru-object',
    'js-lru',
    'lru',
    //'lru-cache', // slow
    'lru-fast',
    'lru_cache',
    //'mkc', // slow
    //'modern-lru', // slow
    'quick-lru',
    //'secondary-cache', // slow
    'simple-lru-cache',
    'tiny-lru'
  ];

const spinner = ora(`Benchmarking ${caches.length} caches`).start();

Promise.all(caches.map(i => {
  return new Promise(resolve => {
    const worker = new Worker('worker.js');

    worker.onmessage = ev => {
      resolve(ev.data);
      worker.terminate();
    };

    worker.onerror = ev => {
      console.error(ev.data || ev);
      process.exit(1);
    };

    worker.postMessage(i);
  });
})).then(results => {
  const toMD = require('markdown-tables'),
    keysort = require('keysort');

  spinner.stop();
  console.log(toMD(['name,set,get1,update,get2,evict'].concat(keysort(results.map(i => JSON.parse(i)), 'evict desc, set desc, get1 desc, update desc, get2 desc').map(i => `${i.name},${i.set},${i.get1},${i.update},${i.get2},${i.evict}`)).join('\n')));
}).catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
