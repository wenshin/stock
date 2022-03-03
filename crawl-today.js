/* eslint-disable no-unused-vars */
const fs = require("fs");
const request = require("request");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const moment = require("moment");
const { requestGBK } = require("./util");
const { INDEXES } = require("./consts");
const conceptIds = require("./concept-id.json");

function fetchConceptToday(date) {
  return requestGBK({ url: "http://q.10jqka.com.cn/gn/" }).then(($) => {
    const elem = $("#gnSection")[0];
    const dateStr = date || moment().format("YYYYMMDD");
    if (elem && elem.attribs && elem.attribs.value) {
      const data = JSON.parse(elem.attribs.value);
      console.log("写入概念数据");
      const ids = [];
      for (const key of Object.keys(data)) {
        const concept = data[key];
        const increase = Number(concept["199112"]);
        const increasePercent = Number(concept.zfl);
        const moneyTrack = Number(concept.zjjlr);
        ids.push(concept.cid);
        appendConceptFile(dateStr, {
          id: concept.cid,
          clid: concept.platecode,
          name: concept.platename,
          increase,
          increasePercent,
          moneyTrack,
        });
      }
      return fillAllConcept(dateStr, ids);
    }
  });
}

function appendConceptFile(dateStr, data) {
  fs.appendFile(
    `./concept/${dateStr}.json`,
    JSON.stringify(data, null, 2) + ",\n",
    (err) => {
      err && console.log(err);
    }
  );
}

function sleep(time = 2) {
  return new Promise((resolve) => {
    setTimeout(resolve, time * 1000);
  });
}

async function fillAllConcept(dateStr, existIds) {
  for (const needId of conceptIds) {
    if (!existIds.find((v) => v === needId.id)) {
      const data = await fetchConceptOfDetail(needId);
      await sleep();
      appendConceptFile(dateStr, data);
    }
  }
}

const headers = {
  // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  // 'Accept-Encoding': 'gzip, deflate, sdch',
  // 'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
  // Host: 'd.10jqka.com.cn',
  // Referer: 'http://stock.10jqka.com.cn/market.shtml',
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
};

function fetchConceptOfDetail(info) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: `http://q.10jqka.com.cn/gn/detail/code/${info.id}/`,
        encoding: null,
        headers,
      },
      (err, res, body) => {
        if (err) reject(err);
        if (!body) {
          console.log("WARNING no body");
          return null;
        }

        const bodystr = iconv.decode(body, "gbk");
        const $ = cheerio.load(bodystr);
        let data = {
          id: info.id,
          clid: info.clid,
          name: info.name,
          increase: null,
          increasePercent: null,
          moneyTrack: null,
        };
        // http://q.10jqka.com.cn/gn/detail/code/301416/
        $(".board-infos dl dd").each((idx, elem) => {
          const textNode = elem.children[0];
          if (textNode && textNode.type === "text") {
            if (idx === 5) {
              data.increase = parseFloat(textNode.data);
            }
            if (idx === 8) {
              data.moneyTrack = parseFloat(textNode.data);
            }
          }
        });
        console.log("fill concept success", data);
        resolve(data);
      }
    );
  });
}

async function crawlIndexToday(date, indexes = INDEXES) {
  const dateStr = date || moment().format("YYYYMMDD");
  const filepath = `./indexes/${dateStr}.json`;
  try {
    fs.unlinkSync(filepath);
  } catch (err) {
    console.log(err);
  }
  for (const idx of indexes) {
    const url = `http://q.10jqka.com.cn/zs/detail/code/${idx.id}`;
    await requestGBK({ url }).then(($) => {
      $(".board-infos dl:nth-child(6) dd").each((index, elem) => {
        const increase = Number(elem.children[0].data.replace("%", ""));
        console.log("写入" + idx.name);
        fs.appendFile(
          `./indexes/${dateStr}.json`,
          JSON.stringify(
            {
              id: idx.id,
              name: idx.name,
              increase,
            },
            null,
            2
          ) + ",\n",
          (err) => {
            err && console.log(err);
          }
        );
      });
    });
    await sleep();
  }
  return;
}

async function crawlIndustryToday(date) {
  const dateStr = date || moment().format("YYYYMMDD");
  try {
    fs.unlinkSync(`./industry/${dateStr}.json`);
  } catch (err) {
    console.log(err);
  }
  await fetchData(1, dateStr);
  await sleep();
  await fetchData(2, dateStr);
}

function fetchData(page, dateStr) {
  return requestGBK({
    url: `http://q.10jqka.com.cn/thshy/index/field/199112/order/desc/page/${page}/ajax/1/`,
  }).then(($) => {
    $("tbody tr").each((idx, tr) => {
      const nameTd = tr.children[3];
      const nameA = nameTd.children[0];
      const idMatch = nameA.attribs.href.match(/code\/(\d+)/);
      const id = idMatch && idMatch[1];
      const name = nameA.children[0].data;
      const increaseTd = tr.children[5];
      fs.appendFile(
        `./industry/${dateStr}.json`,
        JSON.stringify(
          {
            id,
            name,
            increase: Number(increaseTd.children[0].data),
          },
          null,
          2
        ) + ",\n",
        (err) => {
          err && console.log(err);
          console.log("写入行业数据");
        }
      );
    });
  });
}

// function fetchGlobalToday(date) {
//   const dateStr = date || moment().format("YYYYMMDD");
//   try {
//     fs.unlinkSync(`./industry/${dateStr}.json`);
//   } catch (err) {
//     console.log(err);
//   }
//   const url = "http://q.10jqka.com.cn/global/index/ajax/1/";
//   return requestGBK({ url }, true)
//     .then((body) => {
//       if (!body) {
//         console.log("返回数据为空！");
//         return;
//       }
//       for (const key of Object.keys(body)) {
//         const item = body[key];
//         if (item.isRun) {
//           continue;
//         }
//         const date = item.time.replace(/-/g, "");
//         if (item && dataArr) {
//           fs.appendFile(
//             `./global/${dateStr}.json`,
//             JSON.stringify(
//               {
//                 id,
//                 name,
//                 increase: Number(increaseTd.children[0].data),
//               },
//               null,
//               2
//             ) + ",\n",
//             (err) => {
//               err && console.log(err);
//             }
//           );
//         }
//       }
//     })
//     .catch((err) => console.error(err));
// }

crawlIndustryToday()
  .then(() => crawlIndexToday())
  .then(() => fetchConceptToday());

// fetchConceptToday();

// fetchConceptOfDetail(conceptIds[0]);

// fetchGlobalToday();
