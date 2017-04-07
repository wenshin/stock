const cheerio = require('cheerio');
const request = require('request');

const headers = {
  // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  // 'Accept-Encoding': 'gzip, deflate, sdch',
  // 'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
  // Host: 'd.10jqka.com.cn',
  // Referer: 'http://stock.10jqka.com.cn/market.shtml',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
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
      const av = a[key];
      const bv = b[key];
      if (av > bv) return isAsc ? 1 : -1;
      if (av === bv) return 0;
      if (av < bv) return isAsc ? -1 : 1;
    });
  },

  throttle({data, interval, doIt, cb}) {
    let finishCount = 0;
    let cursor = 0;
    const timer = setInterval(() => {
      const item = data[cursor];
      if (!item) {
        clearInterval(timer);
        console.log('process finish all')
        return;
      }
      const name = item.name || cursor;
      console.log(`process ${name}, ${cursor}/${data.length}`)
      cursor++;

      doIt(item)
        .then(d => {
          finishCount++;
          console.log(`process finish ${name}, ${finishCount}/${data.length}`)
          cb(null, {data: d, srcData: item, index: cursor});
        })
        .catch(err => {
          finishCount++;
          console.log(`process error ${name}, ${finishCount}/${data.length}`)
          console.log(err);
          cb(err);
        });
    }, interval || 500);
  },

  fixedStr(str, len = 15) {
    let newStr = str;
    while (newStr.length < len) {
      newStr += ' ';
    }
    return newStr;
  },

  requestGBK(options) {
    return new Promise((resolve, reject) => {
      request(Object.assign({encoding: null, headers}, options), (err, res, bodyBuf) => {
        if (err) {
          console.log(err)
          return reject(err);
        }
        const iconv = require('iconv-lite');
        const body = iconv.decode(bodyBuf, 'gbk');
        resolve(cheerio.load(body));
      });
    })
  },

  requestJSON(options) {
    return new Promise((resolve, reject) => {
      request(Object.assign({headers}, options), (err, res, body) => {
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
      request(Object.assign({headers}, options), (err, res, body) => {
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
