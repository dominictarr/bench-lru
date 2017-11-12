'use strict';

const precise = require('precise'),
  path = require('path'),
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
  init = {
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
  iterations = 200000,
  times = 5;

self.onmessage = function (ev) {
  const id = ev.data,
    timer = precise().start(),
    results = {
      name: id,
      'set': 0,
      get1: 0,
      update: 0,
      get2: 0,
      evict: 0
  };

  results.set = timer.stop().diff() / 1e6;

  postMessage(JSON.stringify(results));
};
