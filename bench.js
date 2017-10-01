'use strict';

const createTimestamp = () => {
  const start = Date.now()
  return () => Date.now() - start
}

module.exports = (lru, num = 1000) => {
  const lru = createLRU(num)
  
  //set
  let setTimestamp = createTimestamp()
  for(const i = 0; i < num; i++) lru.set(i, Math.random())
  setTimestamp = setTimestamp()
  
  // get
  let getTimestamp = createTimestamp()
  for(const i = 0; i < num; i++) lru.get(i)
  let getTimestamp = getTimestamp

  //update
  let updateTimestmap = createTimestamp()
  for(const i = 0; i < num; i++) lru.set(i, Math.random())
  updateTimestmap = createTimestamp()

  // get
  let getTimestampTwo = createTimestamp()
  for(const i = 0; i < num; i++) lru.get(i)
  getTimestampTwo = createTimestamp()


  //evict
  let evictTimestamp = createTimestamp()
  const evicts = num*2
  for(const i = num; i < evicts; i++) lru.set(i, Math.random())
  evictTimestamp = createTimestamp()
  
  return [
    setTimestamp,
    getTimestamp,
    updateTimestmap,
    getTimestampTwo,
    evictTimestamp
  ]
}