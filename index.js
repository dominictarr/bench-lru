'use strict';

const Worker = require('tiny-worker'),
  ora = require('ora'),
  meta = {
    // 'faster-lru-cache': {url: 'https://npmjs.com/package/faster-lru-cache'}, // disabled, spins forever
    'hashlru': {url: 'https://npmjs.com/package/hashlru'},
    'hyperlru-map': {url: 'https://npmjs.com/package/hyperlru-map'},
    'hyperlru-object': {url: 'https://npmjs.com/package/hyperlru-object'},
    'js-lru': {url: 'https://www.npmjs.com/package/js-lru'},
    'lru': {url: 'https://www.npmjs.com/package/lru'},
    'lru-cache': {url: 'https://npmjs.com/package/lru-cache'},
    'lru-cache-7': {url: 'https://npmjs.com/package/lru-cache'},
    'lru-cache-7-ttl': {url: 'https://npmjs.com/package/lru-cache'},
    'lru-cache-7-size': {url: 'https://npmjs.com/package/lru-cacheize'},
    'lru-cache-7-dispose': {url: 'https://npmjs.com/package/lru-cache'},
    'lru-fast': {url: 'https://npmjs.com/package/lru-fast'},
    //'lru_cache': {url: 'https://npmjs.com/package/lru_cache'},  // NOTE: temporarily withdrawn because of a capacity leak - see https://github.com/Empact/lru_cache/pull/2
    // 'mkc': {url: 'https://npmjs.com/packacge/package/mkc'}, // withdrawn because it crashes too much in ways tiny-worker can't handle
    'modern-lru': {url: 'https://npmjs.com/package/modern-lru'},
    // 'quick-lru': {url: 'https://npmjs.com/package/quick-lru'}, // disabled esm
    'secondary-cache': {url: 'https://npmjs.com/package/secondary-cache'},
    'simple-lru-cache': {url: 'https://npmjs.com/package/simple-lru-cache'},
    'tiny-lru': {url: 'https://npmjs.com/package/tiny-lru'},
    'mnemonist-object': {url: 'https://www.npmjs.com/package/mnemonist'},
    'mnemonist-map': {url: 'https://www.npmjs.com/package/mnemonist'}
  },
  caches = Object.keys(meta),
  nth = caches.length;

const types = {
  int: 'just an integer',
  strint: 'stringified integer',
  str: 'string that is not a number',
  numstr: 'a mix of integers and strings that look like them',
  pi: 'multiples of pi',
  float: 'floating point values',
  obj: 'an object with a single key',
  rand: 'random floating point number',
  sym: 'a Symbol object',
  longstr: 'a very long string',
  mix: 'a mix of all the types',
}

if (!process.env.TYPE) {
  const spawn = require('child_process').spawn
  const todo = Object.keys(types)
  const run = () => new Promise(res => {
    const TYPE = todo.shift()
    if (!TYPE) return res()
    console.log(`${TYPE}: ${types[TYPE]}`)
    const child = spawn(process.execPath, [__filename], {
      env: { TYPE },
      stdio: 'inherit',
    })
    child.on('close', () => res(run()))
  })
  run()
} else {
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
    console.log(toMD(['name,set,get1,update,get2,evict,score']
      .concat(keysort(results.map(i => {
        const obj = JSON.parse(i)
        obj.score = obj.evict * 5 +
          obj.get2 * 5 +
          obj.get1 * 3 +
          obj.set * 2 +
          obj.update
        return obj
      }), 'score desc')
      .map(i => `[${i.name}](${meta[i.name].url}),${i.set},${i.get1},${i.update},${i.get2},${i.evict},${i.score}`)).join('\n')));
  }).catch(err => {
    console.error(err.stack || err.message || err);
    process.exit(1);
  });
}
