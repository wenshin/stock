const cheerio = require('cheerio');
const request = require('request');

let util;
module.exports = util = {
  print(item, key, days) {
    days = days || [1, 3, 5, 10, 15, 20];
    let str = util.fixedStr(item.name);
    for (const day of days) {
      str += util.fixedStr(item[`${key}${day}`].toFixed(2) + '%');
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
      request(Object.assign({encoding: null}, options), (err, res, bodyBuf) => {
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
      request(options, (err, res, body) => {
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
      request(options, (err, res, body) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        const match = body.match(/^\w+\((.+)\)$/);
        const json = match && match[1];
        resolve(json && JSON.parse(json));
      });
    });
  }
};
