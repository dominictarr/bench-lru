'use strict'

const Worker = require('tiny-worker'),
  ora = require('ora'),
  caches = [
    'lru-cache',
    'lru-fast',
    'js-lru',
    'modern-lru',
    'quick-lru',
    'secondary-cache',
    'simple-lru-cache',
    'tiny-lru',
    'hashlru',
    'hyperlru-object',
    'hyperlru-map',
    'lru_cache',
    'lru',
    'mkc'
  ],
  total = caches.length;

const spinner = ora(`Benchmarking ${total} caches`).start();

Promise.all(caches.map(i => {
  return new Promise(resolve => {
    const worker = new Worker('worker.js');

    worker.onmessage = ev => resolve(ev.data);
    worker.postMessage(i);
  });
})).then(results => {
  const toMD = require('markdown-tables'),
    headers = [
      'name',
      'size',
      'gzip',
      'set',
      'get1',
      'update',
      'get2',
      'evict'
    ];

  spinner.stop();
  console.log(results.map(i => JSON.parse(i)).sort((a, b) => a.total > b.total ? 1 : a.total < b.total ? -1 : 0));
  process.exit(0);
}).catch(err => console.error(err.stack || err.message || err));

/*let index = 0

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
*/
