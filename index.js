'use strict'

const Worker = require('tiny-worker'),
  ora = require('ora'),
  caches = [
    'lru-cache',
    'lru-fast',
    'js-lru',
    'modern-lru',
    'quick-lru',
    'secondary-cache',
    'simple-lru-cache',
    'tiny-lru',
    'hashlru',
    'hyperlru-object',
    'hyperlru-map',
    'lru_cache',
    'lru',
    'mkc'
  ],
  total = caches.length;

const spinner = ora(`Benchmarking ${total} caches`).start();

Promise.all(caches.map(i => {
  return new Promise(resolve => {
    const worker = new Worker('worker.js');

    worker.onmessage = ev => {
      resolve(ev.data);
      worker.terminate();
    };

    worker.postMessage(i);
  });
})).then(results => {
  const toMD = require('markdown-tables'),
    keysort = require('keysort');

  spinner.stop();
  console.log(toMD(['name,set,get1,update,get2,evict'].concat(keysort(results.map(i => JSON.parse(i)), 'evict, set, get1, update, get2').map(i => `${i.name},${i.set},${i.get1},${i.update},${i.get2},${i.evict}`)).join('\n')));
}).catch(err => console.error(err.stack || err.message || err));
