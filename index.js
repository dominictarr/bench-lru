'use strict'

const {readFileSync, createWriteStream} = require('fs')
const markdownTables = require('markdown-tables')
const bench = require('./bench')
const path = require('path')
const ora = require('ora')

const LRU_Cache = require('lru_cache').LRUCache
const Simple = require('simple-lru-cache')
const Fast = require('lru-fast').LRUCache
const QuickLRU = require('quick-lru')
const Modern = require('modern-lru')
const MKC = require('mkc')

const lrus = {
  'simple-lru-cache': maxSize => new Simple({maxSize}),
  'secondary-cache': require('secondary-cache'),
  'modern-lru': n => new Modern(n),
  lru_cache: n => new LRU_Cache(n),
  'lru-fast': n => new Fast(n),
  mkc: n => new MKC({max: n}),
  hashlru: require('hashlru'),
  'lru-cache': require('lru-cache'),
  'tiny-lru': require('tiny-lru'),
  lru: require('lru'),
  'quick-lru': maxSize => new QuickLRU({maxSize})
}

const N = 100000
const headers = [
  'name',
  'set',
  'get1',
  'update',
  'get2',
  'evict'
];

const buffer = [headers.join(',')]

const keys = Object.keys(lrus)
const size = keys.length

Object.keys(lrus).forEach((lruName, index)  =>{
  const spinner = ora(`${lruName} ${index}/${size}`).start();
  
  const lru = lrus[lruName]
  const result = bench(lru, N)
  
  const output = result.reduce((acc, value, index) => {
    acc.push(Math.round(N / value))
    return acc
  }, [`[${lruName}](https://npm.im/${lruName})`])
  
  buffer.push(output.join(','))
  spinner.stop()
})


const table = markdownTables(buffer.join('\n'))
console.log(table)
