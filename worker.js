'use strict';

const precise = require('precise'),
  retsu = require('retsu'),
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
  caches = {
    'lru-cache': () => require('lru-cache'),
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
    lru_cache: n => new LRUCache(n),
    lru: require('lru'),
    mkc: max => new MKC({max})
  },
  num = 2e5,
  evicts = num * 4,
  times = 5,
  x = 1e6;

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

  while (++n < times) {
    const lru = caches[id](num);

    let stimer = precise().start();
    for (let i = 0; i < num; i++) lru.set(i, Math.random());
    time.set.push(stimer.stop().diff() / x);

    let gtimer = precise().start();
    for (let i = 0; i < num; i++) lru.get(i);
    time.get1.push(gtimer.stop().diff() / x);

    let utimer = precise().start();
    for (let i = 0; i < num; i++) lru.set(i, Math.random());
    time.update.push(utimer.stop().diff() / x);

    const g2timer = precise().start();
    for (let i = 0; i < num; i++) lru.get(i);
    time.get2.push(g2timer.stop().diff() / x);

    let etimer = precise().start();
    for (let i = num; i < evicts; i++) lru.set(i, Math.random());
    time.evict.push(etimer.stop().diff() / x);
  }

  ['set', 'get1', 'update', 'get2', 'evict'].forEach(i => {
    results[i] = Number((num / retsu.median(time[i]).toFixed(2)).toFixed(0));
  });

  postMessage(JSON.stringify(results));
};
