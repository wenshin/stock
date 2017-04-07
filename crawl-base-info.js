const fs = require('fs');
const request = require('request');
const {requestGBK, throttle} = require('./util');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');


// let $ = cheerio.load('<h2 class="title">Hello world</h2>')

// http://q.10jqka.com.cn/gn/ 获取概念板块 ID 列表
// http://q.10jqka.com.cn/thshy/ 获取同花顺行业 ID 列表
// http://www.iwencai.com/diag/concept-detail?conceptId=301558

const headers = {
  // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  // 'Accept-Encoding': 'gzip, deflate, sdch',
  // 'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
  // Host: 'd.10jqka.com.cn',
  // Referer: 'http://stock.10jqka.com.cn/market.shtml',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
};


function fetchPage(url) {
  return new Promise((resolve, reject) => {
    request({
      // url: 'http://q.10jqka.com.cn/gn/',
      url,
      encoding: null,
      headers
    }, (err, res, body) => {
      if (err) reject(err);
      resolve(parseData(body));
    });
  });
}

function parseData(bodyBuf) {
  if (!bodyBuf) {
    console.log('WARNING no body');
    return null;
  }

  const body = iconv.decode(bodyBuf, 'gbk');
  const $ = cheerio.load(body);
  const list = [];
  $('.cate_items a').each((idx, elem) => {
    // http://q.10jqka.com.cn/gn/detail/code/301416/
    if (!elem.attribs.href) return;

    const idMatch = elem.attribs.href.match(/code\/(\d+)/);
    const id = idMatch && idMatch[1];
    const textNode = elem.children[0];
    let name;
    if (textNode && textNode.type === 'text') {
      name = textNode.data;
    }
    if (name && id) {
      list.push({name, id, href: elem.attribs.href});
    }
  });
  return list;
}

(function () {
  Promise.all([
    fetchPage('http://q.10jqka.com.cn/gn/'),
    fetchPage('http://q.10jqka.com.cn/thshy/')
  ]).then(([concepts, industries]) => {
    fs.writeFileSync(
      'ths-base.json',
      JSON.stringify({concepts, industries}, null, 2)
    );
  }).catch(err => console.log(err))
})()
