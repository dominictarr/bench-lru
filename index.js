var LRU = require('lru')
var LruCache = require('lru-cache')
var tinyLRU = require('tiny-lru')
var SecondaryCache = require('secondary-cache')
var LRU_Cache = require('lru_cache').LRUCache
var Modern = require('modern-lru')
var Simple = require('simple-lru-cache')
var Faster = require('faster-lru-cache').default
var MKC = require('mkc')
//var Lighter = require('lighter-lru-cache') //could not figure out API
var Fast = require('lru-fast').LRUCache
var Native = require('lru-native')

var algs = {
  'hashlru': require('hashlru'),
  'lru-native': Native,
  'modern-lru': function (n) { return new Modern(n) },
  'lru-cache': LruCache,
  'lru_cache': function (n) { return new LRU_Cache(n) },
  'tiny-lru': tinyLRU,
  'lru': LRU,
  'simple-lru-cache': function (n) { return new Simple({maxSize: n}) },
  'mkc': function (n) { return new MKC({max: n}) },
  'lru-fast': function (n) { return new Fast(n) },
  'faster-lru-cache': function (n) { return new Faster(n) },
  'secondary-cache': SecondaryCache
}

function run(LRU, N) {
  var lru = LRU(N)
  //set
  var start = Date.now()
  for(var i = 0; i < N; i++)
    lru.set(i, Math.random())

  var a = Date.now() - start


  var start_2 = Date.now()
  for(var i = 0; i < N; i++) lru.get(i)

  var a2 = Date.now() - start_2


  //update
  var start2 = Date.now()
  for(var i = 0; i < N; i++)
    lru.set(i, Math.random())

  var b = Date.now() - start2


  var start_3 = Date.now()
  for(var i = 0; i < N; i++) lru.get(i)

  var b2 = Date.now() - start_3


//  if(lru.newCache) lru.newCache()

  //evict
  var start3 = Date.now(), M = N*2
  for(var i = N; i < M; i++)
    lru.set(i, Math.random())

  var c = Date.now() - start3

  return [a, a2, b, b2, c]
}

var N = 100000

console.log('name, set, get1, update, get2, evict')

for(var name in algs) {
  var v = run(algs[name], N).map(function (e) { return Math.round(N/(e)) })
  console.log([name].concat(v).join(', '))
}






