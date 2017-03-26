const fs = require('fs');
const {throttle, requestJSONP} = require('./util');
const {INDEXES} = require('./consts');
const {industries} = require('./base-info.json');

/**
 * @param  {String} type is 'tody' or 'last'
 */
function crawlIndexLast() {
  throttle({
    data: INDEXES,
    interval: 1000,
    doIt(item) {
      const url = `http://d.10jqka.com.cn/v4/line/zs_${item.id}/01/last.js`;
      return requestJSONP(url);
    },
    cb(err, result) {
      handleResult(err, result, 'indexes');
    }
  });
}


function crawlIndustryLast() {
  throttle({
    data: industries,
    interval: 1000,
    doIt(item) {
      const url = `http://d.10jqka.com.cn/v4/line/bk_${item.id}/01/last.js`;
      return requestJSONP(url);
    },
    cb(err, result) {
      handleResult(err, result, 'industry');
    }
  });
}

function handleResult(err, result, path) {
  if (!err) {
    const dataStr = result.data.data;
    const item = result.srcData;
    const data = dataStr.split(';');
    let cursor = data.length - 1;
    while(cursor >= 0) {
      const increase = calcIncrease(data, cursor);
      const date = data[cursor][0];
      const filepath = `./${path}/${date}.json`;
      fs.appendFile(filepath, JSON.stringify({
        id: item.id,
        name: item.name,
        increase
      }, null, 2) + ',\n', (err) => {
        err && console.log(err)
      });
      cursor--;
    }
  }
}

function calcIncrease(data, cursor) {
  if (typeof data[cursor] === 'string') {
    data[cursor] = data[cursor].split(',');
  }
  if (typeof data[cursor - 1] === 'string') {
    data[cursor - 1] = data[cursor - 1].split(',');
  }

  if (cursor <= 0) return 0;

  const cur = Number(data[cursor][4]);
  const last = Number(data[cursor - 1][4]);
  const percentage = (cur - last) / last * 100;
  return Number(percentage.toFixed(2));
}

// crawlIndexLast();
crawlIndustryLast();
