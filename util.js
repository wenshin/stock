const cheerio = require('cheerio');
const request = require('request');

// request
//   .get()
//   .retry({
//     times: 3,
//     delay: 100, // ms
//     isRetry(err, response, body) {

//     }
//   })
//   .then()

function getHeaders() {
  const UAs = [
    'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0)',
    'Mozilla/5.0 (Windows; U; Windows NT 5.2) Gecko/2008070208 Firefox/3.0.1',
    'Mozilla/5.0 (Windows; U; Windows NT 5.2) AppleWebKit/525.13 (KHTML, like Gecko) Version/3.1 Safari/525.13',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
  ];
  return {
    // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    // 'Accept-Encoding': 'gzip, deflate, sdch',
    // 'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
    // Host: 'd.10jqka.com.cn',
    // Referer: 'http://stock.10jqka.com.cn/market.shtml',
    'User-Agent': UAs[Math.round(Math.random() * 4)]
  }
}


let util;
module.exports = util = {
  print(item, key, days) {
    days = days || [1, 3, 5, 10, 15, 20];
    let str = util.fixedStr(item.name);
    for (const day of days) {
      const value = item[`${key}${day}`] || 0;
      if (!value) {
        // console.error(`${item.name} "${key}${day}" 不存在`);
      }
      str += util.fixedStr(value.toFixed(2) + '%');
    }
    console.log(str);
  },

  getPrintHeader(days) {
    let str = '';
    for (const day of days) {
      str += util.fixedStr(`${day}日`);
    }
    return str;
  },

  sortByKey(data, key, isAsc) {
    return data.sort((a, b) => {
      const av = a[key] || 0;
      const bv = b[key] || 0;
      if (av > bv) return isAsc ? 1 : -1;
      if (av === bv) return 0;
      if (av < bv) return isAsc ? -1 : 1;
    });
  },

  throttle({data, interval, doIt, cb, onFinish}) {
    let finishCount = 0;
    let cursor = 0;
    const failedData = [];
    const newInterval = interval || 500;
    const timer = setInterval(() => {
      if (finishCount >= data.length) {
        clearInterval(timer);
        console.log('process finish all');
        console.log('======= failed items =======');
        console.log(JSON.stringify(failedData, null, 2));
        onFinish && onFinish();
        return;
      }

      const item = data[cursor];
      if (!item) return;

      const name = item.name || cursor;
      console.log(`process ${name}, ${cursor + 1}/${data.length}`)
      cursor++;

      function process(retryCount = 0) {
        doIt(item)
          .then(d => {
            const succ = cb(null, {data: d, srcData: item, index: cursor});
            if (succ || retryCount > 3) {
              if (!succ) {
                processFail();
              } else {
                finishCount++;
                console.log('\x1b[32m%s\x1b[0m', `process success ${name}, ${finishCount}/${data.length}`);
              }
            } else {
              console.log(`retrying ${name} ${retryCount + 1} times`);
              setTimeout(() => process(retryCount + 1), newInterval);
            }
          })
          .catch(err => {
            cb(err, {srcData: item});
            processFail(err);
          });
      }

      function processFail(err) {
        finishCount++;
        err && console.log(err);
        console.log('\x1b[31m%s\x1b[0m', `process fail ${name}, ${finishCount}/${data.length}`)
        failedData.push(item);
      }

      process();
    }, newInterval);
  },

  fixedStr(str, len = 15) {
    let newStr = str;
    while (newStr.length < len) {
      newStr += ' ';
    }
    return newStr;
  },

  requestGBK(options, isJSON) {
    return new Promise((resolve, reject) => {
      request(Object.assign({encoding: null, headers: getHeaders()}, options), (err, res, bodyBuf) => {
        if (err) {
          console.log(err)
          return reject(err);
        }
        const iconv = require('iconv-lite');
        const body = iconv.decode(bodyBuf, 'gbk');
        resolve(isJSON ? JSON.parse(body) : cheerio.load(body));
      });
    })
  },

  requestJSON(options) {
    return new Promise((resolve, reject) => {
      request(Object.assign({headers: getHeaders()}, options), (err, res, body) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(JSON.parse(body));
      });
    });
  },

  requestJSONP(options) {
    return new Promise((resolve, reject) => {
      request(Object.assign({headers: getHeaders()}, options), (err, res, body) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        const match = body.match(/^\w+\((.+)\)$/);
        const json = match && match[1];
        resolve(json && JSON.parse(json));
      });
    });
  },

  parseFileJSON(str) {
    return JSON.parse('[' + str.replace(/,\n?$/, '') + ']');
  }
};
