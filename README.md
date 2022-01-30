# bench-lru

benchmark the least-recently-used caches which are available on npm.

## Update: January, 2022

This is a fork of Dominc Tarr's original `bench-lru` script.  I've made the
following modifications.

First, I noted that cache performance and correctness in JavaScript is
highly dependent on the types of keys used to store items in the cache.

Specifically:

1. When using keys that aren't strings or symbols, it's possible for keys
   to collide if using an `Object` as the backing store rather than a
   `Map`.
2. When using integer numbers as object keys, V8 is extremely optimized for
   `Object` data storage, especially if the values are also integers.
   However, if the values are numeric strings but numeric _float_ strings,
   performance goes out the window.
3. Long strings are much slower Object keys than long strings.

In the real world, it's quite rare to store 200k integers using the exact
same 200k integers as keys.  This iteration of the benchmark uses a variety
of integers, floats, numeric integer strings, numeric float strings, long
strings, strings and integers that collide, objects, and so on, and
disqualifies caches that don't pass a basic correctness smoke test.

Next, the weighting of scores doesn't much match real world use cases
either.  In observing several production use cases of LRU caches, the
some consistent patterns can be observed.

Typically, an LRUCache is being used (if it is actually needed) for a case
where:

1. The total data corpus is _very large_, and cannot comfortably fit in
   memory.  (If it isn't large, just save it all, don't bother with an
   LRU.)
2. The time required to fetch any given item is significant.  (If it isn't,
   just fetch it each time, don't bother with an LRU.)
3. The time over which the data will be accessed is significant, and thus
   the subset of the corpus of data which will _eventually_ need to be
   accessed is by the process is more than can comfortably fit in memory.
4. Items tend to spike in popularity for a while, then become less
   frequenty accessed.

If these criteria are met, an LRUCache is a good fit.  If a few of them are
likely, and the others _might_ be true, then it might still be a good fit
to be safe.  It's a fairly common need, if somewhat specific.

Given this behavior pattern, the weights in the benchmark were off.  Simply
reporting updates per ms next to evictions per ms is a bit unhelpful.
Dominic was correct that evictions are important.

However, an eviction _can only happen_ at the time of making a `set()`
call, which means that you just performed some expensive upstream action to
get the thing that you're caching from its origin.

`update`s (that is, setting a key which is already in the cache) are
extremely rare in normal LRU-friendly workloads.  If you already have it in
the cache, don't fetch it upstream or write it again, use the cached one.
That's the whole point!

The _most_ frequent operations an LRUCache is normally called upon for is:
"fetching an item from the queue again".

That is to say, to the greatest extent possible, `get()` performance should
be roughly equivalent, regardless of where in the heirarchy of recency a
given item is found.  If fetching the most recently used item is fast, but
fetching the item 50% most recently used, or even least recently used, is
slow, then the cache will perform poorly (and unpredictably!) under real
workloads.

To account for the priorities (and the fact that eviction is much slower in
every cache measured), the following weights are applied to form a
final "score", which is used to sort the list:

1. `evict * 5`
2. `get2 * 5`
3. `get1 * 3`
4. `set * 2`
5. `update * 1`

Note that since `get2` tends to be much faster than `evict` in all caches
tested, this ends up being the most important metric.

Also, I observed that some caches perform very well when `get()` calls are
made in the order in which they were inserted into the cache, but much more
poorly when `get()` calls are made out of order.  Under real workloads, a
cache is rarely called upon to list its contents in insertion order, but
instead is used in an unpredictable order.

To accomplish this, the ordering of the data used in the `update` and
`get2` benchmarks is randomized, so that the items need to be constantly
reshuffled, as they would be in a real use case.

### Conclusions from this new approach, and my attempts to make lru-cache perform well

1. Only caches with `Map`-based key stores are capable of handling keys
   that are long string, numeric float strings, or `Symbol` objects with
   adequate performance.

   This was surprising to me!  I expected that `Symbol` objects would
   perform well in an `Object` key store, and I suspect that future
   versions of V8 may optimize this code path if more people use it.  The
   performance gains on long strings (and especially numeric float strings)
   in `Map` key stores was somewhat surprising as well, but this just shows
   the hazard of optimizing for a benchmark instead of making a benchmark
   match real workloads.

2. Only caches with `Map`-based key stores are capable of handling
   non-string/symbol keys correctly.

3. The garbage-collection penalty for throwing away an object (the approach
   advocated below) is very low for an object full of integer keys and
   numeric values.  However, it rises dramatically for almost any other
   shape of data, making linked-list style approaches more effective.

4. Similarly, the gc penalty for object-based linked list approaches makes
   them perform significantly worse than pointer-based linked list
   approaches.

    That is, it's much faster to implement the linked list as two arrays of
    integers and do `this.next[index]` and `this.previous[index]` rather
    than an array of node objects and `node.next` and `node.previous`.  No
    amount of object optimization (reusing objects from a pool, etc.)
    seemed able to get around this.

    This wasn't surprising, but it was disappointing.  `node.next.value` is
    much more ergonomic and readable than
    `this.valueList[this.next[index]]`.

Almost any of these cache implementations will perform well enough in any
situation where you find yourself with a problem that needs a cache.  But
as always, if you are optimizing a hot path and performance matters, make
sure to test it against your actual scenario.  If you are strictly using
integers as keys, it's worth using one of the "worse" caches on this list.

## Results

```
int: just an integer
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 29455 | 65359 | 10235  | 64516 | 6651  | 621057 |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 32468 | 56180 | 11130  | 54496 | 6341  | 548791 |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 16681 | 51948 | 7539   | 46838 | 12618 | 494025 |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 39139 | 38911 | 17889  | 38835 | 16584 | 489995 |
| [hashlru](https://npmjs.com/package/hashlru)                   | 37106 | 33841 | 15674  | 29762 | 13387 | 407154 |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 8302  | 32258 | 10020  | 25974 | 7410  | 290318 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 13615 | 26076 | 7877   | 24969 | 7138  | 273870 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 13414 | 23392 | 7846   | 25840 | 7128  | 269690 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 12853 | 25940 | 6211   | 24420 | 7223  | 267952 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 14948 | 22599 | 10390  | 21075 | 8210  | 254508 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 8673  | 18797 | 9416   | 17575 | 4334  | 192698 |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 10035 | 17953 | 6141   | 16722 | 4338  | 185370 |
| [lru](https://www.npmjs.com/package/lru)                       | 12804 | 14514 | 6530   | 15408 | 4252  | 173980 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 5577  | 14848 | 5632   | 13175 | 3745  | 145930 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 5299  | 14006 | 6479   | 12555 | 3081  | 137275 |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 8114  | 11554 | 4686   | 11884 | 3617  | 133081 |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 8418  | 10081 | 4952   | 9272  | 5469  | 125736 |

strint: stringified integer
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [hashlru](https://npmjs.com/package/hashlru)                   | 44643 | 40816 | 16207  | 40650 | 15256 | 507471 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 19763 | 48077 | 9430   | 44743 | 17559 | 504697 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 18674 | 47059 | 9046   | 44543 | 17528 | 497926 |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 33670 | 48780 | 13822  | 36832 | 15785 | 490587 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 19139 | 45147 | 9170   | 41494 | 16543 | 473074 |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 30211 | 47506 | 10199  | 44053 | 6127  | 464039 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 21505 | 37037 | 12812  | 34542 | 18674 | 433013 |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 14124 | 41754 | 10256  | 41841 | 11834 | 432141 |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 24331 | 5063  | 10373  | 58140 | 6398  | 396914 |
| [lru](https://www.npmjs.com/package/lru)                       | 23502 | 32000 | 6991   | 30257 | 4857  | 325565 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 10707 | 30960 | 9238   | 30675 | 6964  | 311727 |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 8302  | 30211 | 7550   | 30441 | 5653  | 295257 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 6859  | 27739 | 6689   | 28329 | 7628  | 283409 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 6182  | 23283 | 7651   | 23068 | 5672  | 233564 |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 9289  | 19342 | 7987   | 20597 | 6687  | 221011 |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 9852  | 14545 | 5997   | 15674 | 10168 | 198546 |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 9174  | 16194 | 5256   | 12618 | 3877  | 154661 |

str: string that is not a number
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 8299  | 22447 | 9569   | 20619 | 6506  | 229133 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 8768  | 16393 | 6676   | 15528 | 4797  | 175016 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 8850  | 16221 | 6826   | 15094 | 4884  | 173079 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 8258  | 16013 | 6118   | 15662 | 4676  | 172363 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 8993  | 13957 | 7334   | 12610 | 4989  | 155186 |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 7779  | 15911 | 7275   | 13219 | 3534  | 154331 |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 4610  | 12232 | 7070   | 13012 | 5463  | 145361 |
| [hashlru](https://npmjs.com/package/hashlru)                   | 10070 | 7883  | 5241   | 8224  | 10116 | 140730 |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 4866  | 12945 | 6289   | 12763 | 3171  | 134526 |
| [lru](https://www.npmjs.com/package/lru)                       | 7239  | 13193 | 6727   | 11827 | 2569  | 132764 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 6227  | 11730 | 6207   | 11912 | 3170  | 129261 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 4329  | 9867  | 3942   | 9611  | 2613  | 103321 |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 3988  | 10152 | 4924   | 8949  | 2822  | 102211 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 3842  | 9732  | 4333   | 8853  | 2504  | 97998  |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 6019  | 7800  | 3769   | 7283  | 3862  | 94932  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 5342  | 7740  | 3968   | 7605  | 2625  | 89022  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 5316  | 8386  | 3333   | 7223  | 2541  | 87943  |

numstr: a mix of integers and strings that look like them
⠴ Benchmarking 1 of 17 caches [hashlru] failed correctness check at key="2"
⠙ Benchmarking 3 of 17 caches [hyperlru-object] failed correctness check at key="2"
⠏ Benchmarking 5 of 17 caches [lru] failed correctness check at key="2"
⠹ Benchmarking 11 of 17 caches [lru-fast] failed correctness check at key="2"
⠸ Benchmarking 13 of 17 caches [secondary-cache] failed correctness check at key="2"
⠏ Benchmarking 14 of 17 caches [simple-lru-cache] failed correctness check at key="2"
⠼ Benchmarking 15 of 17 caches [tiny-lru] failed correctness check at key="2"
⠋ Benchmarking 16 of 17 caches [mnemonist-object] failed correctness check at key="2"
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 12780 | 24661 | 7971   | 22936 | 7383  | 259109 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 12895 | 28289 | 7326   | 20640 | 7485  | 258608 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 12369 | 28090 | 7410   | 20513 | 7003  | 253998 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 13468 | 22805 | 6194   | 19685 | 7813  | 239035 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 8347  | 17575 | 7813   | 16736 | 4105  | 181437 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 5366  | 15004 | 4877   | 13396 | 3868  | 146941 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 4677  | 14245 | 5080   | 12987 | 3261  | 138409 |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 7205  | 11521 | 5516   | 11876 | 3815  | 132944 |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 7567  | 9985  | 4260   | 9606  | 5580  | 125279 |
| [hashlru](https://npmjs.com/package/hashlru)                   | 0     | 0     | 0      | 0     | 0     | 0      |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 0     | 0     | 0      | 0     | 0     | 0      |
| [lru](https://www.npmjs.com/package/lru)                       | 0     | 0     | 0      | 0     | 0     | 0      |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 0     | 0     | 0      | 0     | 0     | 0      |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 0     | 0     | 0      | 0     | 0     | 0      |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 0     | 0     | 0      | 0     | 0     | 0      |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 0     | 0     | 0      | 0     | 0     | 0      |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 0     | 0     | 0      | 0     | 0     | 0      |

pi: multiples of pi
| name                                                           | set  | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|------|-------|--------|-------|-------|--------|
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 9828 | 13746 | 7593   | 13004 | 5094  | 158977 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 6845 | 14959 | 4623   | 14104 | 4023  | 153825 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 7405 | 14848 | 5727   | 13661 | 3829  | 152531 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 6483 | 8688  | 4727   | 17241 | 4160  | 150762 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 4315 | 10707 | 6425   | 11527 | 2955  | 119586 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 3820 | 9221  | 4036   | 8302  | 2189  | 91794  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 3384 | 8624  | 4407   | 7921  | 2145  | 87377  |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 3999 | 5423  | 4335   | 7161  | 3202  | 80417  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 4044 | 5045  | 3362   | 5607  | 2082  | 65030  |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 2114 | 3166  | 2595   | 3100  | 1080  | 37221  |
| [lru](https://www.npmjs.com/package/lru)                       | 2377 | 2880  | 2285   | 2476  | 1678  | 36449  |
| [hashlru](https://npmjs.com/package/hashlru)                   | 2102 | 2023  | 1711   | 1997  | 2084  | 32389  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 1699 | 2589  | 2259   | 2600  | 991   | 31379  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 1913 | 2512  | 1975   | 2415  | 1036  | 30592  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 1630 | 2452  | 2091   | 2602  | 835   | 29892  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 1614 | 2403  | 1886   | 2639  | 827   | 29653  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 1704 | 2110  | 1540   | 2222  | 794   | 26358  |

float: floating point values
| name                                                           | set  | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|------|-------|--------|-------|-------|--------|
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 9276 | 14075 | 7584   | 12853 | 5136  | 158306 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 7305 | 15699 | 5585   | 13652 | 3857  | 154837 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 7022 | 14959 | 5284   | 13633 | 3922  | 151980 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 6443 | 15396 | 4570   | 13504 | 3871  | 150519 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 4251 | 10571 | 6570   | 11044 | 2872  | 116365 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 3525 | 8247  | 4087   | 8330  | 2177  | 88413  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 3497 | 8193  | 4582   | 7590  | 2127  | 84740  |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 4141 | 5326  | 4303   | 6991  | 3128  | 79158  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 3979 | 4925  | 3365   | 5609  | 2009  | 64188  |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 2079 | 3215  | 2622   | 3301  | 1100  | 38430  |
| [lru](https://www.npmjs.com/package/lru)                       | 2239 | 2724  | 2232   | 2567  | 1645  | 35942  |
| [hashlru](https://npmjs.com/package/hashlru)                   | 2488 | 2150  | 1827   | 2040  | 2075  | 33828  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 2068 | 2540  | 2028   | 2540  | 1076  | 31864  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 1751 | 2520  | 2226   | 2599  | 980   | 31183  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 1635 | 2570  | 2119   | 2677  | 857   | 30769  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 1562 | 2537  | 1845   | 2582  | 836   | 29670  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 1662 | 2010  | 1494   | 2223  | 792   | 25923  |

obj: an object with a single key
⠴ Benchmarking 1 of 17 caches [hashlru] failed correctness check at key={"z":0}
⠋ Benchmarking 3 of 17 caches [hyperlru-object] failed correctness check at key={"z":0}
⠇ Benchmarking 5 of 17 caches [lru] failed correctness check at key={"z":0}
⠇ Benchmarking 11 of 17 caches [lru-fast] failed correctness check at key={"z":0}
⠇ Benchmarking 13 of 17 caches [secondary-cache] failed correctness check at key={"z":0}
⠸ Benchmarking 14 of 17 caches [simple-lru-cache] failed correctness check at key={"z":0}
⠇ Benchmarking 15 of 17 caches [tiny-lru] failed correctness check at key={"z":0}
⠼ Benchmarking 16 of 17 caches [mnemonist-object] failed correctness check at key={"z":0}
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 12158 | 26774 | 8344   | 25221 | 7107  | 274622 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 11614 | 25974 | 7602   | 24907 | 6969  | 268132 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 12477 | 26212 | 7179   | 23952 | 7052  | 265789 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 13149 | 23121 | 6581   | 20704 | 7372  | 242622 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 8299  | 18215 | 8177   | 17559 | 4224  | 188335 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 5015  | 13514 | 5297   | 14420 | 4014  | 148039 |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 6932  | 13333 | 6725   | 13141 | 3888  | 145733 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 5119  | 14194 | 5491   | 12953 | 3178  | 138966 |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 7477  | 9732  | 4444   | 9681  | 5280  | 123399 |
| [hashlru](https://npmjs.com/package/hashlru)                   | 0     | 0     | 0      | 0     | 0     | 0      |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 0     | 0     | 0      | 0     | 0     | 0      |
| [lru](https://www.npmjs.com/package/lru)                       | 0     | 0     | 0      | 0     | 0     | 0      |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 0     | 0     | 0      | 0     | 0     | 0      |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 0     | 0     | 0      | 0     | 0     | 0      |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 0     | 0     | 0      | 0     | 0     | 0      |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 0     | 0     | 0      | 0     | 0     | 0      |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 0     | 0     | 0      | 0     | 0     | 0      |

rand: random floating point number
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 10070 | 14225 | 7405   | 13193 | 5369  | 163030 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 7310  | 14205 | 4822   | 13523 | 3857  | 148957 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 6590  | 14235 | 3802   | 13245 | 3892  | 145372 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 6536  | 13746 | 4678   | 12739 | 3886  | 142113 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 4330  | 11494 | 6081   | 10881 | 2829  | 117773 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 4052  | 7849  | 4154   | 8187  | 2218  | 87830  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 3630  | 8271  | 4462   | 7752  | 2139  | 85990  |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 3964  | 5436  | 3926   | 6817  | 2965  | 77072  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 3570  | 5290  | 2993   | 5212  | 2092  | 62523  |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 1875  | 3346  | 2635   | 3149  | 1077  | 37553  |
| [lru](https://www.npmjs.com/package/lru)                       | 2161  | 2518  | 2103   | 2333  | 1603  | 33659  |
| [hashlru](https://npmjs.com/package/hashlru)                   | 2403  | 2117  | 1701   | 2010  | 2107  | 33443  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 2104  | 2619  | 1999   | 2588  | 1031  | 32159  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 1722  | 2646  | 2226   | 2564  | 998   | 31418  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 1426  | 2355  | 1894   | 2629  | 820   | 29056  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 1549  | 2276  | 1950   | 2528  | 818   | 28606  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 1552  | 2073  | 1411   | 2123  | 743   | 25064  |

sym: a Symbol object
⠴ Benchmarking 5 of 17 caches [lru] failed correctness check TypeError: Cannot convert a Symbol value to a string
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 12415 | 24010 | 8489   | 24213 | 7140  | 262114 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 12399 | 24242 | 8163   | 23121 | 7047  | 256527 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 11848 | 24301 | 8016   | 23364 | 6787  | 255370 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 13841 | 22346 | 6311   | 20747 | 7550  | 242516 |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 8937  | 23202 | 10060  | 20640 | 6331  | 232395 |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 6754  | 22548 | 8010   | 21459 | 3183  | 212372 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 7816  | 17986 | 8167   | 17528 | 4283  | 186812 |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 8482  | 16234 | 8382   | 15649 | 3406  | 169323 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 5750  | 13918 | 4969   | 14609 | 3700  | 149768 |
| [hashlru](https://npmjs.com/package/hashlru)                   | 11050 | 8734  | 6062   | 8569  | 9785  | 146134 |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 4960  | 12626 | 7446   | 12618 | 5352  | 145094 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 5156  | 14255 | 5729   | 12579 | 3291  | 138156 |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 7413  | 10204 | 4555   | 9385  | 5313  | 123483 |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 6918  | 10667 | 6006   | 10776 | 3326  | 122353 |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 4315  | 10621 | 5308   | 8100  | 2655  | 99576  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 6013  | 9611  | 3745   | 6256  | 2401  | 87889  |
| [lru](https://www.npmjs.com/package/lru)                       | 0     | 0     | 0      | 0     | 0     | 0      |

longstr: a very long string
| name                                                           | set  | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|------|-------|--------|-------|-------|--------|
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 7631 | 14652 | 6329   | 13450 | 4032  | 152957 |
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 7809 | 14826 | 6022   | 13236 | 4072  | 152658 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 7797 | 14804 | 6099   | 13106 | 4056  | 151915 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 6705 | 11723 | 7000   | 10905 | 4121  | 130709 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 5299 | 10995 | 6572   | 9965  | 2896  | 114460 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 4121 | 9737  | 3794   | 8110  | 2430  | 93947  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 3708 | 8826  | 4364   | 8565  | 2277  | 92468  |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 3319 | 8244  | 6447   | 7429  | 3103  | 90477  |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 5302 | 7474  | 4133   | 7000  | 3380  | 89059  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 2467 | 5363  | 4728   | 4786  | 2886  | 64111  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 3576 | 5599  | 3187   | 5539  | 1674  | 63201  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 2509 | 5287  | 4510   | 5511  | 1836  | 62124  |
| [hashlru](https://npmjs.com/package/hashlru)                   | 4537 | 3869  | 3339   | 3557  | 3540  | 59505  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 2694 | 5013  | 4466   | 4467  | 1971  | 57083  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 2178 | 4578  | 2890   | 4028  | 1424  | 48240  |
| [lru](https://www.npmjs.com/package/lru)                       | 2600 | 3828  | 3544   | 3716  | 1274  | 45178  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 2605 | 4155  | 2204   | 3412  | 1358  | 43729  |

mix: a mix of all the types
⠴ Benchmarking 1 of 17 caches [hashlru] failed correctness check at key={"z":3}
⠇ Benchmarking 3 of 17 caches [hyperlru-object] failed correctness check at key={"z":3}
⠴ Benchmarking 5 of 17 caches [lru] failed correctness check TypeError: Cannot convert a Symbol value to a string
⠴ Benchmarking 11 of 17 caches [lru-fast] failed correctness check at key={"z":3}
⠧ Benchmarking 13 of 17 caches [secondary-cache] failed correctness check at key={"z":3}
⠸ Benchmarking 14 of 17 caches [simple-lru-cache] failed correctness check at key={"z":3}
⠏ Benchmarking 15 of 17 caches [tiny-lru] failed correctness check at key={"z":3}
⠴ Benchmarking 16 of 17 caches [mnemonist-object] failed correctness check at key={"z":3}
| name                                                           | set   | get1  | update | get2  | evict | score  |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|--------|
| [lru-cache-7](https://npmjs.com/package/lru-cache)             | 9667  | 17316 | 6748   | 16077 | 5020  | 183515 |
| [lru-cache-7-dispose](https://npmjs.com/package/lru-cache)     | 9465  | 16964 | 6723   | 15175 | 4981  | 177325 |
| [lru-cache-7-size](https://npmjs.com/package/lru-cacheize)     | 8897  | 16103 | 6133   | 15962 | 4906  | 176576 |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 10086 | 14015 | 7855   | 13307 | 5126  | 162237 |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 6165  | 11869 | 5444   | 11689 | 3419  | 128921 |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 4731  | 10357 | 4032   | 9412  | 3048  | 106865 |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 4491  | 9770  | 4179   | 9221  | 2532  | 101236 |
| [lru-cache-7-ttl](https://npmjs.com/package/lru-cache)         | 6048  | 7590  | 3815   | 7228  | 4032  | 94981  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 5469  | 7536  | 4017   | 7550  | 2725  | 88938  |
| [hashlru](https://npmjs.com/package/hashlru)                   | 0     | 0     | 0      | 0     | 0     | 0      |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 0     | 0     | 0      | 0     | 0     | 0      |
| [lru](https://www.npmjs.com/package/lru)                       | 0     | 0     | 0      | 0     | 0     | 0      |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 0     | 0     | 0      | 0     | 0     | 0      |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 0     | 0     | 0      | 0     | 0     | 0      |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 0     | 0     | 0      | 0     | 0     | 0      |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 0     | 0     | 0      | 0     | 0     | 0      |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 0     | 0     | 0      | 0     | 0     | 0      |
```

The best performers are `lru-cache` version 7 and `mnemonist`'s `LRUMap`, across
most categories.  `mnemonist-map` seems to consistently have slightly
better eviction and set performance, and slightly worse get performance,
for many key types.  The difference is small enough to be negligible,
which is to be expected.

For object-friendly key spaces (strictly integers or strictly short strings),
`mnemonist`'s `LRUCache` and `hashlru` seem to do the best.

For strictly integer key sets, `lru-fast` lives up to its name, blowing the
other implementations out of the water, but did not perform nearly as well
with other types of keys.

---

What follows below is Dominic Tarr's original discussion from 2016.

_[@isaacs](https://github.com/isaacs)_

---

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


| name                                                           | set   | get1  | update | get2  | evict |
|----------------------------------------------------------------|-------|-------|--------|-------|-------|
| [hashlru](https://npmjs.com/package/hashlru)                   | 18536 | 17590 | 17794  | 18332 | 9381  |
| [mnemonist-object](https://www.npmjs.com/package/mnemonist)    | 15314 | 69444 | 35026  | 68966 | 7949  |
| [quick-lru](https://npmjs.com/package/quick-lru)               | 8214  | 4572  | 6777   | 4608  | 6345  |
| [tiny-lru](https://npmjs.com/package/tiny-lru)                 | 6530  | 46296 | 37244  | 42017 | 5961  |
| [lru-fast](https://npmjs.com/package/lru-fast)                 | 5979  | 36832 | 32626  | 40900 | 5929  |
| [mnemonist-map](https://www.npmjs.com/package/mnemonist)       | 6272  | 15785 | 10923  | 16077 | 3738  |
| [lru](https://www.npmjs.com/package/lru)                       | 3927  | 5454  | 5001   | 5366  | 2827  |
| [simple-lru-cache](https://npmjs.com/package/simple-lru-cache) | 3393  | 3855  | 3701   | 3899  | 2496  |
| [hyperlru-object](https://npmjs.com/package/hyperlru-object)   | 3515  | 3953  | 4044   | 4102  | 2495  |
| [js-lru](https://www.npmjs.com/package/js-lru)                 | 3813  | 10010 | 9246   | 10309 | 1843  |
| [secondary-cache](https://npmjs.com/package/secondary-cache)   | 2780  | 5705  | 5790   | 10549 | 1727  |
| [lru-cache](https://npmjs.com/package/lru-cache)               | 2275  | 3388  | 3334   | 3301  | 1593  |
| [hyperlru-map](https://npmjs.com/package/hyperlru-map)         | 2424  | 2508  | 2443   | 2540  | 1552  |
| [modern-lru](https://npmjs.com/package/modern-lru)             | 2710  | 3946  | 3581   | 4021  | 1327  |
| [mkc](https://npmjs.com/packacge/package/mkc)                  | 1559  | 2044  | 1178   | 2161  | 1037  |


We can group the results in a few categories:

* all rounders (mnemonist, lru_cache, tiny-lru, simple-lru-cache, lru-fast) where the performance to add update and evict are comparable.
* fast-write, slow-evict (lru, hashlru, lru-native, modern-lru) these have better set/update times, but for some reason are quite slow to evict items!
* slow in at least 2 categories (lru-cache, mkc, faster-lru-cache, secondary-cache)

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
