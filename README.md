# bench-lru

benchmark the least-recently-used caches which are available on npm.

## Introduction

An LRU cache is a cache with bounded memory use.
The point of a cache is to improve performance,
so how performant are the available implementations?

LRUs achive bounded memory use by removing the oldest items when a threashold number of items
is reached. We measure 3 cases, adding an item, updating an item, and adding items
which push other items out of the LRU.

There is a [previous benchmark](https://www.npmjs.com/package/bench-cache)
but it did not describe it's methodology. (and since it measures the memory used,
but tests everything in the same process, it does not get clear results)

## Benchmark

I run a very simple multi-process benchmark, with 5 iterations to get a median of ops/ms:

1. Set the LRU to fit max N=200,000 items.
2. Add N random numbers to the cache, with keys 0-N.
3. Then update those keys with new random numbers.
4. Then _evict_ those keys, by adding keys N-2N.

### Results

Operations per millisecond (*higher is better*):

| name                                                   | set     | get1    | update  | get2    | evict   |
|--------------------------------------------------------|---------|---------|---------|---------|---------|
| [tiny-lru](https://npmjs.com/tiny-lru)                 | 2211000 | 3273000 | 3130000 | 3457000 | 3606000 |
| [lru_cache](https://npmjs.com/lru_cache)               | 2864000 | 3628000 | 1347000 | 3688000 | 1474000 |
| [simple-lru-cache](https://npmjs.com/simple-lru-cache) | 875000  | 4213000 | 2904000 | 6502000 | 891000  |
| [lru-fast](https://npmjs.com/lru-fast)                 | 451000  | 5381000 | 3390000 | 3935000 | 857000  |
| [hashlru](https://npmjs.com/hashlru)                   | 1209000 | 1171000 | 773000  | 1289000 | 544000  |
| [quick-lru](https://npmjs.com/quick-lru)               | 415000  | 725000  | 651000  | 581000  | 533000  |
| [js-lru](https://www.npmjs.com/package/quick-lru)      | 251000  | 1039000 | 1326000 | 1093000 | 431000  |
| [lru](https://npmjs.com/lru)                           | 258000  | 714000  | 686000  | 867000  | 345000  |
| [mkc](https://npmjs.com/mkc)                           | 374000  | 886000  | 415000  | 739000  | 341000  |
| [modern-lru](https://npmjs.com/modern-lru)             | 169000  | 755000  | 906000  | 842000  | 316000  |
| [hyperlru-object](https://npmjs.com/hyperlru-object)   | 237000  | 2256000 | 1252000 | 2546000 | 310000  |
| [secondary-cache](https://npmjs.com/secondary-cache)   | 254000  | 1079000 | 652000  | 1072000 | 279000  |
| [hyperlru-map](https://npmjs.com/hyperlru-map)         | 192000  | 1229000 | 893000  | 1698000 | 218000  |


We can group the results in a few categories:

* all rounders (tiny-lru, lru-cache, simple-lru-cache, lru-fast) where the performance to add update and evict are comparable.
* fast-write, slow-evict (lru_cache, lru, hashlru, lru-native, modern-lru) these have better set/update times, but for some reason are quite slow to evict items!
* slow in at least 2 categories (mkc, faster-lru-cache, secondary-cache)

## Discussion

It appears that all-round performance is the most difficult to achive, in particular,
performance on eviction is difficult to achive. I think eviction performance is the most important
consideration, because once the cache is _warm_ each subsequent addition causes an eviction,
and actively used, _hot_, cache will run close to it's eviction performance.
Also, some have faster add than update, and some faster update than add.

`modern-lru` gets pretty close to `lru-native` perf.
I wrote `hashlru` after my seeing the other results from this benchmark, it's important to point
out that it does not use the classic LRU algorithm, but has the important properties of the LRU
(bounded memory use and O(1) time complexity)

Splitting the benchmark into multiple processes helps minimize JIT state pollution (gc, turbofan opt/deopt, etc.), and we see a much clearer picture of performance per library.

## Future work

This is still pretty early results, take any difference smaller than an order of magnitude with a grain of salt.

It is necessary to measure the statistical significance of the results to know accurately the relative performance of two closely matched implementations.

I also didn't test the memory usage. This should be done running the benchmarks each in a separate process, so that the memory used by each run is not left over while the next is running.

## Conclusion

Javascript is generally slow, so one of the best ways to make it fast is to write less of it.
LRUs are also quite difficult to implement (linked lists!). In trying to come up with a faster
LRU implementation I realized that something far simpler could do the same job. Especially
given the strengths and weaknesses of javascript, this is significantly faster than any of the
other implementations, _including_ the C implementation. Likely, the overhead of the C<->js boundry
is partly to blame here.

## License

MIT
