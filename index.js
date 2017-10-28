'use strict'

const prettyBytes = require('pretty-bytes')
const toMD = require('markdown-tables')
const bench = require('./bench')
const ora = require('ora')
const got = require('got')

const LRUCache = require('lru_cache').LRUCache
const Simple = require('simple-lru-cache')
const Fast = require('lru-fast').LRUCache
const QuickLRU = require('quick-lru')
const Modern = require('modern-lru')
const hyperlru = require('hyperlru')
const {LRUMap} = require('lru_map')
const MKC = require('mkc')

const hyperlruObject = hyperlru(require('hyperlru-object'))
const hyperlruMap = hyperlru(require('hyperlru-map'))

const lrus = {
  'lru-cache': require('lru-cache'),
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
}

const N_ITERATIONS = 200000
const headers = [
  'name',
  'size',
  'gzip',
  'set',
  'get1',
  'update',
  'get2',
  'evict'
]

const cases = Object.keys(lrus)
const totalCases = cases.length
const median = []
const buffer = []

const fetchSize = async pkg => {
  const url = `https://bundlephobia.com/api/size?package=${pkg}&record=true`
  const {body} = await got(url, {json: true})
  return ['size', 'gzip'].map(value => prettyBytes(body[value]))
}

let index = 0

;(async () => {
  for (const lruName of cases) {
    const spinner = ora(`${lruName} ${++index}/${totalCases}`).start()
    const [size, gzip] = await fetchSize(lruName)

    const lru = lrus[lruName]
    const result = bench(lru, N_ITERATIONS)
    let total = 0

    const output = result.reduce((acc, value, index) => {
      total += value
      acc.push(value)
      return acc
    }, [`[${lruName}](https://npm.im/${lruName})`, size, gzip])

    median.push({name: lruName, total})
    buffer.push(output.join(','))
    spinner.stop()
  }

  const sort = median.sort(function compare (b, a) {
    if (a.total < b.total) return -1
    if (a.total > b.total) return 1
    return 0
  })

  const results = sort.map((lru, index) => {
    const {name: lruName} = sort[index]
    return buffer.find(item => item.includes(`[${lruName}]`))
  }).join('\n')

  const table = [headers.join(',')].concat(results).join('\n')
  console.log(toMD(table))
})()
