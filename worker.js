import hashlru from 'hashlru';
import hyperlru from 'hyperlru';
import hyperlruMapImpl from 'hyperlru-map';
import hyperlruObjectImpl from 'hyperlru-object';
import lru from 'lru';
import LRUCacheHyphen from 'lru-cache';
import LruFash from 'lru-fast';
import lruMap from 'lru_map';
import MKC from 'mkc';
import MnemonistLRUCache from 'mnemonist/lru-cache.js';
import MnemonistLRUMap from 'mnemonist/lru-map.js';
import Modern from 'modern-lru';
import precise from 'precise';
import QuickLRU from 'quick-lru';
import retsu from 'retsu';
import secondaryCache from 'secondary-cache';
import Simple from 'simple-lru-cache';
import tinyLru from 'tiny-lru';
import { parentPort } from 'worker_threads';
const Fast = LruFash.LRUCache;
const LRUMap = lruMap.LRUMap;
const median = retsu.median;

const hyperlruObject = hyperlru(hyperlruObjectImpl);
const hyperlruMap = hyperlru(hyperlruMapImpl);
const caches = {
  'lru-cache': n => new LRUCacheHyphen(n),
  'lru-fast': n => new Fast(n),
  'js-lru': n => new LRUMap(n),
  'modern-lru': n => new Modern(n),
  'quick-lru': maxSize => new QuickLRU({ maxSize }),
  'secondary-cache': secondaryCache,
  'simple-lru-cache': maxSize => new Simple({ maxSize }),
  'tiny-lru': tinyLru,
  hashlru,
  'hyperlru-object': max => hyperlruObject({ max }),
  'hyperlru-map': max => hyperlruMap({ max }),
  //lru_cache: n => new LRUCache(n),
  lru,
  mkc: max => new MKC({ max }),
  'mnemonist-object': n => new MnemonistLRUCache(n),
  'mnemonist-map': n => new MnemonistLRUMap(n)
};
const num = 2e5;
const evict = num * 2;
const times = 5;
const x = 1e6;
const data1 = new Array(evict);
const data2 = new Array(evict);

(function seed () {
  let z = -1;

  while (++z < evict) {
    data1[z] = [z, Math.floor(Math.random() * 1e7)];
    data2[z] = [z, Math.floor(Math.random() * 1e7)];
  }
}());

parentPort.on("message", (id) => {
  const time = {
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
    const lru = caches[id](num)
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
    results[i] = Number((num / median(time[i]).toFixed(2)).toFixed(0));
  });

  parentPort.postMessage(results);
})