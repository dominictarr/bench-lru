'use strict';

const precise = require('precise'),
  retsu = require('retsu'),
  LRUCacheHyphen = require('lru-cache'),
  LRUCacheHyphen7 = require('lru-cache-7/index.js'),
  LRUCache = require('lru_cache').LRUCache,
  Simple = require('simple-lru-cache'),
  Fast = require('lru-fast').LRUCache,
  Faster = require('faster-lru-cache').default,
  Modern = require('modern-lru'),
  hyperlru = require('hyperlru'),
  {LRUMap} = require('lru_map'),
  MKC = require('mkc'),
  hyperlruObject = hyperlru(require('hyperlru-object')),
  hyperlruMap = hyperlru(require('hyperlru-map')),
  MnemonistLRUCache = require('mnemonist/lru-cache-with-delete'),
  MnemonistLRUMap = require('mnemonist/lru-map-with-delete'),
  caches = {
    'lru-cache': n => new LRUCacheHyphen(n),
    'lru-cache-7': n => new LRUCacheHyphen7({ max: n }),
    'lru-cache-7-ttl': n => new LRUCacheHyphen7({ max: n, ttl: 10000 }),
    'lru-cache-7-dispose': n => new LRUCacheHyphen7({ max: n, dispose: () => {} }),
    'lru-cache-7-size': n => new LRUCacheHyphen7({ max: n, maxSize: n * 2, sizeCalculation: () => 2 }),
    //'lru-cache-7-map': n => new LRUCacheHyphen7({ max: n, mode: 'map' }),
    //'lru-cache-7-obj': n => new LRUCacheHyphen7({ max: n, mode: 'object' }),
    'lru-fast': n => new Fast(n),
    'faster-lru-cache': n => new Faster(n),
    'js-lru': n => new LRUMap(n),
    'modern-lru': n => new Modern(n),
    // 'quick-lru': maxSize => new QuickLRU({maxSize}), // disabled esm
    'secondary-cache': require('secondary-cache'),
    'simple-lru-cache': maxSize => new Simple({maxSize}),
    'tiny-lru': require('tiny-lru'),
    hashlru: require('hashlru'),
    'hyperlru-object': max => hyperlruObject({max}),
    'hyperlru-map': max => hyperlruMap({max}),
    lru_cache: n => new LRUCache(n),
    lru: require('lru'),
    mkc: max => new MKC({max}),
    'mnemonist-object': n => new MnemonistLRUCache(n),
    'mnemonist-map': n => new MnemonistLRUMap(n)
  },
  num = 2e5,
  evict = num * 2,
  times = 10,
  x = 1e6,
  dataOrder = [],
  data1 = new Array(evict),
  data2 = new Array(evict),
  data3 = new Array(evict);

const typeGen = {
  numstr: z => z % 2 === 0 ? z : String(z + 1),
  pi: z => z * Math.PI,
  float: z => z + z / (evict + 1),
  obj: z => ({z}),
  strint: z => String(z),
  str: z => 'foo' + z + 'bar',
  rand: z => z * Math.random(),
  sym: z => Symbol(String(z)),
  longstr: z => z + 'z'.repeat(1024 * 4),
  int: z => z,
  mix: z => typeGen[typeKeys[z % (typeKeys.length - 1)]](z),
}
const typeKeys = Object.keys(typeGen);


(function seed () {
  let z = -1;

  const t = process.env.TYPE
  while (++z < evict) {
    const x = typeGen[t](z)
    data1[z] = [x, Math.floor(Math.random() * 1e7)];
    dataOrder.push(z)
  }

  // shuffle up the key orders, so we're not just walking down the list.
  for (const key of dataOrder.sort(() => Math.random() - 0.5)) {
    data2[key] = [data1[key][0], Math.random() * 1e7]
  }

  for (const key of dataOrder.sort(() => Math.random() - 0.5)) {
    data3[key] = data1[key]
  }
}());

self.onmessage = function (ev) {
  const id = ev.data,
    time = {
      'set': [],
      get1: [],
      update: [],
      get2: [],
      evict: []
    },
    results = {
      name: id,
      'set': 0,
      get1: 0,
      update: 0,
      get2: 0,
      evict: 0,
    };

  let n = -1;

  // super rudimentary correctness check
  // make sure that 5 puts get back the same 5 items we put
  // ignore stderr, some caches are complainy about some keys
  let error = console.error
  console.error = () => {}
  try {
    const lru = caches[id](50)
    for (let i = 0; i < 50; i++) lru.set(data1[i][0], data1[i][1])
    for (let i = 0; i < 50; i++) {
      if (lru.get(data1[i][0]) !== data1[i][1]) {
        if (!process.stdout.isTTY) process.stderr.write(id)
        error(' failed correctness check at key=%j', data1[i][0])
        postMessage(JSON.stringify({
          name: id, set: 0, get1: 0, update: 0, get2: 0, evict: 0
        }));
        process.exit(1)
      }
    }
    for (let i = 51; i < 1000; i++) lru.set(data1[i][0], data1[i][1])
    if (lru.get(data1[0][0])) {
      if (!process.stdout.isTTY) process.stderr.write(id)
      error(' failed eviction correctness check')
      postMessage(JSON.stringify({
        name: id, set: 0, get1: 0, update: 0, get2: 0, evict: 0
      }));
      process.exit(1)
    }
  } catch (er) {
    if (!process.stdout.isTTY) process.stderr.write(id)
    error(' failed correctness check', er.stack)
    postMessage(JSON.stringify({
      name: id, set: 0, get1: 0, update: 0, get2: 0, evict: 0
    }));
    process.exit(1)
  }
  console.error = error

  while (++n < times) {
    const lru = caches[id](num)
    const stimer = precise().start();
    for (let i = 0; i < num; i++) lru.set(data1[i][0], data1[i][1]);
    time.set.push(stimer.stop().diff() / x);

    const gtimer = precise().start();
    for (let i = 0; i < num; i++) lru.get(data1[i][0]);
    time.get1.push(gtimer.stop().diff() / x);

    const utimer = precise().start();
    for (let i = 0; i < num; i++) lru.set(data2[i][0], data2[i][1]);
    time.update.push(utimer.stop().diff() / x);

    const g2timer = precise().start();
    for (let i = 0; i < num; i++) lru.get(data3[i][0]);
    time.get2.push(g2timer.stop().diff() / x);

    const etimer = precise().start();
    for (let i = num; i < evict; i++) lru.set(data1[i][0], data1[i][1]);
    time.evict.push(etimer.stop().diff() / x);
  }

  ['set', 'get1', 'update', 'get2', 'evict'].forEach(i => {
    results[i] = Number((num / retsu.median(time[i]).toFixed(2)).toFixed(0));
  });

  postMessage(JSON.stringify(results));
};
