const fs = require('fs');
const moment = require('moment');
const {requestGBK} = require('./util');
const {INDEXES} = require('./consts');


function fetchConceptToday(date) {
  return requestGBK({url: 'http://q.10jqka.com.cn/gn/'})
    .then(($) => {
      const elem = $('#gnSection')[0];
      const dateStr = date || moment().format('YYYYMMDD');
      if (elem && elem.attribs && elem.attribs.value) {
        const data = JSON.parse(elem.attribs.value);
        console.log('写入概念数据');
        for (const key of Object.keys(data)) {
          const concept = data[key];
          const increase = Number(concept['199112']);
          const increasePercent = Number(concept.zfl);
          const moneyTrack = Number(concept.zjjlr);
          fs.appendFile(`./concept/${dateStr}.json`, JSON.stringify({
            id: concept.cid,
            clid: concept.platecode,
            name: concept.platename,
            increase,
            increasePercent,
            moneyTrack
          }, null, 2) + ',\n', (err) => {
            err && console.log(err)
          });
        }
      }
    });
}


function crawlIndexToday(date, indexes = INDEXES) {
  const dateStr = date || moment().format('YYYYMMDD');
  const filepath = `./indexes/${dateStr}.json`;
  try {
    fs.unlinkSync(filepath);
  } catch (err) {
    console.log(err);
  }
  const promises = [];
  for (const idx of indexes) {
    const url = `http://q.10jqka.com.cn/zs/detail/code/${idx.id}`;
    promises.push(
      requestGBK({url})
        .then(($) => {
          $('.board-infos dl:nth-child(6) dd')
            .each((index, elem) => {
              const increase = Number(elem.children[0].data.replace('%', ''));
              console.log('写入' + idx.name);
              fs.appendFile(`./indexes/${dateStr}.json`, JSON.stringify({
                id: idx.id,
                name: idx.name,
                increase
              }, null, 2) + ',\n', (err) => {
                err && console.log(err)
              });
            });
        })
    )
  }
  return Promise.all(promises);
}


function crawlIndustryToday(date) {
  const dateStr = date || moment().format('YYYYMMDD');
  try {
    fs.unlinkSync(`./industry/${dateStr}.json`);
  } catch (err) {
    console.log(err);
  }
  return Promise.all([
    fetchData(1, dateStr),
    fetchData(2, dateStr)
  ]);
}


function fetchData(page, dateStr) {
  return requestGBK({url: `http://q.10jqka.com.cn/thshy/index/field/199112/order/desc/page/${page}/ajax/1/`})
    .then(($) => {
      $('tbody tr')
        .each((idx, tr) => {
          const nameTd = tr.children[3];
          const nameA = nameTd.children[0];
          const idMatch = nameA.attribs.href.match(/code\/(\d+)/);
          const id = idMatch && idMatch[1];
          const name = nameA.children[0].data;
          const increaseTd = tr.children[5];
          fs.appendFile(`./industry/${dateStr}.json`, JSON.stringify({
            id,
            name,
            increase: Number(increaseTd.children[0].data)
          }, null, 2) + ',\n', (err) => {
            err && console.log(err)
            console.log('写入行业数据')
          });
        });
    });
}

function fetchGlobalToday(date) {
  const dateStr = date || moment().format('YYYYMMDD');
  try {
    fs.unlinkSync(`./industry/${dateStr}.json`);
  } catch (err) {
    console.log(err);
  }
  const url = 'http://q.10jqka.com.cn/global/index/ajax/1/';
  return requestGBK({url}, true)
    .then((body) => {
      if (!body) {
        console.log('返回数据为空！');
        return;
      }
      for (const key of Object.keys(body)) {
        const item = body[key];
        if (item.isRun) {
          continue;
        }
        const date = item.time.replace(/-/g, '');
        if (item && dataArr) {
          fs.appendFile(`./global/${dateStr}.json`, JSON.stringify({
            id,
            name,
            increase: Number(increaseTd.children[0].data)
          }, null, 2) + ',\n', (err) => {
            err && console.log(err)
          });
        }
      }
    })
    .catch(err => console.error(err))
}

crawlIndustryToday()
.then(() => crawlIndexToday())
.then(() => fetchConceptToday());


// fetchGlobalToday();
