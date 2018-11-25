'use strict';

const precise = require('precise'),
  retsu = require('retsu'),
  LRUCacheHyphen = require('lru-cache'),
  LRUCache = require('lru_cache').LRUCache,
  Simple = require('simple-lru-cache'),
  Fast = require('lru-fast').LRUCache,
  QuickLRU = require('quick-lru'),
  Modern = require('modern-lru'),
  hyperlru = require('hyperlru'),
  {LRUMap} = require('lru_map'),
  MKC = require('mkc'),
  hyperlruObject = hyperlru(require('hyperlru-object')),
  hyperlruMap = hyperlru(require('hyperlru-map')),
  MnemonistLRUCache = require('mnemonist/lru-cache'),
  MnemonistLRUMap = require('mnemonist/lru-map'),
  caches = {
    'lru-cache': n => new LRUCacheHyphen(n),
    'lru-fast': n => new Fast(n),
    'js-lru': n => new LRUMap(n),
    'modern-lru': n => new Modern(n),
    'quick-lru': maxSize => new QuickLRU({maxSize}),
    'secondary-cache': require('secondary-cache'),
    'simple-lru-cache': maxSize => new Simple({maxSize}),
    'tiny-lru': require('tiny-lru'),
    hashlru: require('hashlru'),
    'hyperlru-object': max => hyperlruObject({max}),
    'hyperlru-map': max => hyperlruMap({max}),
    //lru_cache: n => new LRUCache(n),
    lru: require('lru'),
    mkc: max => new MKC({max}),
    'mnemonist-object': n => new MnemonistLRUCache(n),
    'mnemonist-map': n => new MnemonistLRUMap(n)
  },
  num = 2e5,
  evict = num * 2,
  times = 5,
  x = 1e6,
  data1 = new Array(evict),
  data2 = new Array(evict);

(function seed () {
  let z = -1;

  while (++z < evict) {
    data1[z] = [z, Math.floor(Math.random() * 1e7)];
    data2[z] = [z, Math.floor(Math.random() * 1e7)];
  }
}());

self.onmessage = function (ev) {
  const id = ev.data,
    lru = caches[id](num),
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

  while (++n < times) {
    const stimer = precise().start();
    for (let i = 0; i < num; i++) lru.set(data1[i][0], data1[i][1]);
    time.set.push(stimer.stop().diff() / x);

    const gtimer = precise().start();
    for (let i = 0; i < num; i++) lru.get(data1[i][0]);
    time.get1.push(gtimer.stop().diff() / x);

    const utimer = precise().start();
    for (let i = 0; i < num; i++) lru.set(data1[i][0], data2[i][1]);
    time.update.push(utimer.stop().diff() / x);

    const g2timer = precise().start();
    for (let i = 0; i < num; i++) lru.get(data1[i][0]);
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
