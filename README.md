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

I run a very simple benchmark. In four phases:

1. set the LRU to fit max N=100,000 items.
2. add N random numbers to the cache, with keys 0-N.
3. then update those keys with new random numbers.
4. then _evict_ those keys, by adding keys N-2N.

### Results

Operations per millisecond (*higher is better*):

| name                                                | size    | gzip    | set  | get1  | update | get2  | evict |
|-----------------------------------------------------|---------|---------|------|-------|--------|-------|-------|
| [lru-fast](https://npm.im/lru-fast)                 | 2.34 kB | 793 B   | 6415 | 26349 | 16054  | 24048 | 4061  |
| [lru_cache](https://npm.im/lru_cache)               | 2.19 kB | 756 B   | 5776 | 17463 | 10382  | 11902 | 3497  |
| [simple-lru-cache](https://npm.im/simple-lru-cache) | 1.43 kB | 565 B   | 3230 | 15083 | 7961   | 17664 | 3719  |
| [tiny-lru](https://npm.im/tiny-lru)                 | 4 kB    | 1.64 kB | 5665 | 9901  | 14504  | 13109 | 3923  |
| [hyperlru-object](https://npm.im/hyperlru-object)   | 433 B   | 265 B   | 1123 | 8842  | 6996   | 9904  | 1051  |
| [hashlru](https://npm.im/hashlru)                   | 628 B   | 332 B   | 4736 | 5697  | 4473   | 5767  | 4233  |
| [hyperlru-map](https://npm.im/hyperlru-map)         | 329 B   | 232 B   | 783  | 4425  | 4048   | 4470  | 670   |
| [lru-cache](https://npm.im/lru-cache)               | 19.1 kB | 6.23 kB | 1049 | 4826  | 3155   | 4308  | 807   |
| [lru](https://npm.im/lru)                           | 6.07 kB | 1.86 kB | 2573 | 3198  | 2565   | 3493  | 1342  |
| [secondary-cache](https://npm.im/secondary-cache)   | 22.6 kB | 6.54 kB | 1477 | 2758  | 2313   | 4584  | 1065  |
| [quick-lru](https://npm.im/quick-lru)               | 1.23 kB | 489 B   | 2122 | 2020  | 2612   | 2091  | 2498  |
| [modern-lru](https://npm.im/modern-lru)             | 2.27 kB | 907 B   | 790  | 2067  | 1756   | 1789  | 584   |
| [mkc](https://npm.im/mkc)                           | 10.5 kB | 3.61 kB | 823  | 1289  | 880    | 1523  | 626   |

We can group the results in a few categories:

* all rounders (tiny-lru, hashlru, lru-native, modern-lru, lru-cache) where the performance
  to add update and evict are comparable.
* fast-write, slow-evict (lru_cache, lru, simple-lru-cache, lru-fast) these have better set/update times, but for some reason are quite slow to evict items!
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
