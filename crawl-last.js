const fs = require("fs");
const { throttle, requestJSONP } = require("./util");
const { INDEXES } = require("./consts");
const { industries, concepts } = require("./ths-base.json");
const conceptIdMaps = require("./concept-id.json");

// 同花顺概念板块存在两套id，
// 一套是 3开头的id，concepts 中的id 为该id。
// 一套是8开头clid，请求数据时使用该 id
const cidLidMap = {};

function crawlConceptLast(limitPeriod = {}) {
  throttle({
    data: concepts,
    interval: 3000,
    doIt(item) {
      let id = getConceptId(item.id);
      if (!id) {
        return Promise.reject(`${item.id}-${item.name} 不存在查询数据ID`);
      }
      item.lid = id;
      const url = `http://d.10jqka.com.cn/v4/line/bk_${id}/01/last.js`;
      item.lastUrl = url;
      return requestJSONP({ url });
    },
    cb(err, result) {
      return handleResult(err, result, "concept", limitPeriod);
    },
  });
}

function getConceptId(cid) {
  let id = cidLidMap[cid];
  if (!id) {
    const idMap = conceptIdMaps.find((idMap) => idMap.id === cid);
    if (idMap) {
      id = idMap.clid;
      cidLidMap[cid] = id;
    }
  }
  return id;
}

// eslint-disable-next-line no-unused-vars
function crawlIndexLast(limitPeriod = {}) {
  throttle({
    data: INDEXES,
    interval: 3000,
    doIt(item) {
      const url = `http://d.10jqka.com.cn/v4/line/zs_${item.id}/01/last.js`;
      item.lastUrl = url;
      return requestJSONP({ url });
    },
    cb(err, result) {
      return handleResult(err, result, "indexes", limitPeriod);
    },
  });
}

// eslint-disable-next-line no-unused-vars
function crawlIndustryLast(limitPeriod = {}) {
  throttle({
    data: industries,
    interval: 3000,
    doIt(item) {
      const url = `http://d.10jqka.com.cn/v4/line/bk_${item.id}/01/last.js`;
      item.lastUrl = url;
      return requestJSONP({ url });
    },
    cb(err, result) {
      return handleResult(err, result, "industry", limitPeriod);
    },
  });
}

function handleResult(err, result, path, limitPeriod) {
  if (!err && result && result.data && result.data.data) {
    const dataStr = result.data.data;
    const item = result.srcData;
    const data = dataStr.split(";");
    let cursor = data.length - 1;
    while (cursor >= 0) {
      const increase = calcIncrease(data, cursor);
      const date = data[cursor][0];
      if (
        (limitPeriod.start && Number(date) < limitPeriod.start) ||
        (limitPeriod.end && Number(date) > limitPeriod.end)
      ) {
        cursor--;
        continue;
      }
      const filepath = `./${path}/${date}.json`;
      // const filepath = `./test/${date}.json`;
      fs.appendFile(
        filepath,
        JSON.stringify(
          {
            id: item.id,
            name: item.name,
            increase,
          },
          null,
          2
        ) + ",\n",
        (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log(`写入${date}日，${item.name}`);
          }
        }
      );
      cursor--;
    }
    return true;
  } else {
    console.log(`No data ${result.srcData.id} ${result.srcData.name}`);
    return false;
  }
}

function calcIncrease(data, cursor) {
  if (typeof data[cursor] === "string") {
    data[cursor] = data[cursor].split(",");
  }
  if (typeof data[cursor - 1] === "string") {
    data[cursor - 1] = data[cursor - 1].split(",");
  }

  if (cursor <= 0) return 0;

  const cur = Number(data[cursor][4]);
  const last = Number(data[cursor - 1][4]);
  const percentage = ((cur - last) / last) * 100;
  return Number(percentage.toFixed(2));
}

// crawlIndexLast({ start: 20211201, end: 20220228 });
// crawlIndustryLast({ start: 20211201, end: 20220228 });
crawlConceptLast({ start: 20211201, end: 20220228 });
