'use strict'

const {readFileSync, createWriteStream} = require('fs')
const toMD = require('markdown-tables')
const bench = require('./bench')
const path = require('path')
const ora = require('ora')

const LRU_Cache = require('lru_cache').LRUCache
const Simple = require('simple-lru-cache')
const Fast = require('lru-fast').LRUCache
const QuickLRU = require('quick-lru')
const Modern = require('modern-lru')
const hyperlru = require('hyperlru')
const MKC = require('mkc')

const lrus = {
  'lru-cache': require('lru-cache'),
  'lru-fast': n => new Fast(n),
  'modern-lru': n => new Modern(n),
  'quick-lru': maxSize => new QuickLRU({maxSize}),
  'secondary-cache': require('secondary-cache'),
  'simple-lru-cache': maxSize => new Simple({maxSize}),
  'tiny-lru': require('tiny-lru'),
  hashlru: require('hashlru'),
  hyperlru: max => hyperlru({max}),
  lru_cache: n => new LRU_Cache(n),
  lru: require('lru'),
  mkc: max => new MKC({max}),
}

const N = 200000
const headers = [
  'name',
  'set',
  'get1',
  'update',
  'get2',
  'evict'
];

const keys = Object.keys(lrus)
const size = keys.length
const median = []
const buffer = []

Object.keys(lrus).forEach((lruName, index)  =>{
  const spinner = ora(`${lruName} ${index}/${size}`).start();
  
  const lru = lrus[lruName]
  const result = bench(lru, N)
  let total = 0
  
  const output = result.reduce((acc, value, index) => {
    total += value
    acc.push(value)
    return acc
  }, [`[${lruName}](https://npm.im/${lruName})`])
  
  median.push({name: lruName, total})
  buffer.push(output.join(','))
  spinner.stop()
})

const sort = median.sort(function compare(b, a) {
  if (a.total < b.total) return -1;
  if (a.total > b.total) return 1;
  return 0;
})

const results = sort.map((lru, index) => {
  const {name: lruName} = sort[index]
  return buffer.find(item => item.includes(`[${lruName}]`))
}).join('\n')

const table = [headers.join(',')].concat(results).join('\n')
console.log(toMD(table))
