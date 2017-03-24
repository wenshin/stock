const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const info = require('./ths-base.json')


// let $ = cheerio.load('<h2 class="title">Hello world</h2>')

// http://www.iwencai.com/diag/concept-detail?conceptId=301558

const headers = {
  // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  // 'Accept-Encoding': 'gzip, deflate, sdch',
  // 'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
  // Host: 'd.10jqka.com.cn',
  // Referer: 'http://stock.10jqka.com.cn/market.shtml',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
};


function fetchConceptDetail(id) {
  return new Promise((resolve, reject) => {
    request({
      url: `http://www.iwencai.com/diag/concept-detail?conceptId=${id}`,
      encoding: null,
      headers
    }, (err, res, body) => {
      if (err) reject(err);
      const result = JSON.parse(body);
      let data
      try {
        data = result.data.data.result;
      } catch (err) {
        reject('获取结果失败', result);
      }
      if (data) {
        data.delta2 = getDelta(data, 2);
        data.delta5 = getDelta(data, 5);
        data.delta10 = getDelta(data, 10);
        data.delta15 = getDelta(data, 15);
      }
      resolve(data);
    });
  });
}


function getDelta(src, days) {
  const dates = Object.keys(src.hq300Data);
  const len = dates.length;
  const lastDate = dates[len - 1];
  const beforeDate = dates[len - 1 - days];
  const last = src.conceptData[lastDate];
  const last300 = src.hq300Data[lastDate];
  const daysBefore = src.conceptData[beforeDate];
  const daysBefore300 = src.hq300Data[beforeDate];
  return last - daysBefore - (last300 - daysBefore300);
}

module.exports = fetchConceptDetail;


const data = [];
let finishCount = 0;
let cursor = 0;
const timer = setInterval(() => {
  const c = info.concepts[cursor];
  if (!c) {
    clearInterval(timer);
    return;
  }
  console.log(`fetch ${c.name}`)
  cursor++;
  fetchConceptDetail(c.id)
    .then(d => {
      data.push(d);
      finishCount++;
      console.log(`fetch ${c.name} finish`)
      writeFile();
    })
    .catch(err => {
      finishCount++;
      writeFile();
      console.log(`fetch ${c.name} error`, err);
    });
}, 1500)


function writeFile() {
  if (finishCount >= info.concepts.length) {
    console.log('writing file')
    fs.writeFileSync('concept-detail.js', 'module.exports = ' + JSON.stringify(data, null, 2));
  }
}
