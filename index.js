'use strict';

const Worker = require('tiny-worker'),
  ora = require('ora'),
  caches = [
    'hashlru',
    'hyperlru-map',
    'hyperlru-object',
    'js-lru',
    'lru',
    //'lru-cache', // error on `set()` for Jason Mulligan?
    'lru-fast',
    'lru_cache',
    'mkc',
    'modern-lru',
    'quick-lru',
    'secondary-cache',
    'simple-lru-cache',
    'tiny-lru'
  ];

const spinner = ora(`Benchmarking ${caches.length} caches`).start(),
  promises = [];

caches.forEach((i, idx) => {
  promises.push(new Promise((resolve, reject) => {
    return (idx === 0 ? Promise.resolve() : promises[idx - 1]).then(() => {
      const worker = new Worker('worker.js');

      worker.onmessage = ev => {
        resolve(ev.data);
        worker.terminate();
      };

      worker.onerror = err => {
        reject(err);
        process.exit(1);
      };

      worker.postMessage(i);
    }).catch(reject);
  }));
});

Promise.all(promises).then(results => {
  const toMD = require('markdown-tables'),
    keysort = require('keysort');

  spinner.stop();
  console.log(toMD(['name,set,get1,update,get2,evict'].concat(keysort(results.map(i => JSON.parse(i)), 'evict desc, set desc, get1 desc, update desc, get2 desc').map(i => `${i.name},${i.set},${i.get1},${i.update},${i.get2},${i.evict}`)).join('\n')));
}).catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
