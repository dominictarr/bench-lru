'use strict';

const createTimestamp = () => {
  const start = Date.now()
  return () => Date.now() - start
}

module.exports = (createLRU, num = 1000) => {
  const lru = createLRU(num)
  
  //set
  let setTimestamp = createTimestamp()
  for(let i = 0; i < num; i++) lru.set(i, Math.random())
  setTimestamp = setTimestamp()
  
  // get
  let getTimestamp = createTimestamp()
  for(let i = 0; i < num; i++) lru.get(i)
  getTimestamp = getTimestamp()

  //update
  let updateTimestmap = createTimestamp()
  for(let i = 0; i < num; i++) lru.set(i, Math.random())
  updateTimestmap = updateTimestmap()

  // get
  let getTimestampTwo = createTimestamp()
  for(let i = 0; i < num; i++) lru.get(i)
  getTimestampTwo = getTimestampTwo()


  //evict
  let evictTimestamp = createTimestamp()
  const evicts = num*2
  for(let i = num; i < evicts; i++) lru.set(i, Math.random())
  evictTimestamp = evictTimestamp()
  
  return [
    setTimestamp,
    getTimestamp,
    updateTimestmap,
    getTimestampTwo,
    evictTimestamp
  ]
}