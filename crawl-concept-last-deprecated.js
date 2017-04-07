const fs = require('fs');
const request = require('request');
const info = require('./base-info.json')


// http://www.iwencai.com/diag/concept-detail?conceptId=301558

const headers = {
  // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  // 'Accept-Encoding': 'gzip, deflate, sdch',
  // 'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
  Host: 'd.10jqka.com.cn',
  Referer: 'http://stock.10jqka.com.cn/market.shtml',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14'
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
      resolve(data);
    });
  });
}


module.exports = fetchConceptDetail;


const data = [];
const concepts = info.concepts;
let finishCount = 0;
let cursor = 0;
const timer = setInterval(() => {
  const c = concepts[cursor];
  console.log(`fetch ${c ? c.name : 'finish all'}`)
  if (!c) {
    clearInterval(timer);
    return;
  }
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
}, 1000)


function writeFile() {
  console.log(`finish ${finishCount} of ${concepts.length}`)
  if (finishCount >= concepts.length - 1) {
    console.log(`writing file`)
    fs.writeFileSync('concept-detail.js', 'module.exports = ' + JSON.stringify(data, null, 2));
  }
}
