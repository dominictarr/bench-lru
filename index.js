'use strict';

const Worker = require('tiny-worker'),
  ora = require('ora'),
  meta = {
    'hashlru': {url: 'https://npmjs.com/package/hashlru'},
    'hyperlru-map': {url: 'https://npmjs.com/package/hyperlru-map'},
    'hyperlru-object': {url: 'https://npmjs.com/package/hyperlru-object'},
    'js-lru': {url: 'https://www.npmjs.com/package/js-lru'},
    'lru': {url: 'https://www.npmjs.com/package/lru'},
    'lru-cache': {url: 'https://npmjs.com/package/lru-cache'},
    'lru-fast': {url: 'https://npmjs.com/package/lru-fast'},
    'mkc': {url: 'https://npmjs.com/packacge/package/mkc'},
    'modern-lru': {url: 'https://npmjs.com/package/modern-lru'},
    'quick-lru': {url: 'https://npmjs.com/package/quick-lru'},
    'secondary-cache': {url: 'https://npmjs.com/package/secondary-cache'},
    'simple-lru-cache': {url: 'https://npmjs.com/package/simple-lru-cache'},
    'tiny-lru': {url: 'https://npmjs.com/package/tiny-lru'},
    'mnemonist-object': {url: 'https://www.npmjs.com/package/mnemonist'},
    'mnemonist-map': {url: 'https://www.npmjs.com/package/mnemonist'},

    // NOTE: temporarily withdrawn because of a capacity leak
    // See https://github.com/Empact/lru_cache/pull/2
    // 'lru_cache': {url: 'https://npmjs.com/package/lru_cache'},
  },
  caches = Object.keys(meta),
  nth = caches.length;

const spinner = ora(`Starting benchmark of ${nth} caches`).start(),
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
        worker.terminate();
      };

      spinner.text = `Benchmarking ${idx + 1} of ${nth} caches [${i}]`;
      worker.postMessage(i);
    }).catch(reject);
  }));
});

Promise.all(promises).then(results => {
  const toMD = require('markdown-tables'),
    keysort = require('keysort');

  spinner.stop();
  console.log(toMD(['name,set,get1,update,get2,evict'].concat(keysort(results.map(i => JSON.parse(i)), 'evict desc, set desc, get1 desc, update desc, get2 desc').map(i => `[${i.name}](${meta[i.name].url}),${i.set},${i.get1},${i.update},${i.get2},${i.evict}`)).join('\n')));
}).catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
