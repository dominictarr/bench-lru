'use strict'

const {times, chain, size} = require('lodash')

const N_TIMES = 5

const createTimestamp = () => {
  const start = Date.now()
  return () => Date.now() - start
}

const createBench = (createLRU, num) => () => {
  const lru = createLRU(num)

  // set
  let setTimestamp = createTimestamp()
  for (let i = 0; i < num; i++) lru.set(i, Math.random())
  setTimestamp = setTimestamp()

  // get
  let getTimestamp = createTimestamp()
  for (let i = 0; i < num; i++) lru.get(i)
  getTimestamp = getTimestamp()

  // update
  let updateTimestmap = createTimestamp()
  for (let i = 0; i < num; i++) lru.set(i, Math.random())
  updateTimestmap = updateTimestmap()

  // get
  let getTimestampTwo = createTimestamp()
  for (let i = 0; i < num; i++) lru.get(i)
  getTimestampTwo = getTimestampTwo()

  // evict
  let evictTimestamp = createTimestamp()
  const evicts = num * 2
  for (let i = num; i < evicts; i++) lru.set(i, Math.random())
  evictTimestamp = evictTimestamp()

  return [
    setTimestamp,
    getTimestamp,
    updateTimestmap,
    getTimestampTwo,
    evictTimestamp
  ].map(value => num / value)
}

const avgBench = (benchs) => {
  const total = size(benchs)
  return chain(benchs)
    .reduce(function (acc, bench) {
      bench.forEach((result, i) => (acc[i] = (acc[i] || 0) + result))
      return acc
    }, [])
    .map(value => Math.round(value / total))
    .value()
}

module.exports = (createLRU, num) => {
  const bench = createBench(createLRU, num)
  const benchs = times(N_TIMES, bench)
  const result = avgBench(benchs)
  return result
}
