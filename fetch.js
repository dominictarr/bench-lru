'use strict';

const got = require('got'),
  prettyBytes = require('pretty-bytes');

const fetchSize = async pkg => {
  const url = `https://bundlephobia.com/api/size?package=${pkg}&record=true`,
    {body} = await got(url, {json: true});

  return [prettyBytes(body.size), prettyBytes(body.gzip)];
};

module.exports = fetchSize;
