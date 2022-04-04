const fs = require("fs");
const request = require("request");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const conceptIds = require("./concept-id.json");
const { sleep } = require("./util");
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
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
};

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    request(
      {
        // url: 'http://q.10jqka.com.cn/gn/',
        url,
        encoding: null,
        headers,
      },
      (err, res, body) => {
        if (err) reject(err);
        resolve(parseData(body));
      }
    );
  });
}

function fetchConceptCLID(url) {
  return new Promise((resolve, reject) => {
    request(
      {
        // url: 'http://q.10jqka.com.cn/gn/',
        url,
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
        let clid = "";
        $(".board-hq h3 span").each((idx, elem) => {
          // http://q.10jqka.com.cn/gn/detail/code/301416/
          const textNode = elem.children[0];
          if (textNode && textNode.type === "text") {
            clid = textNode.data;
          }
        });
        resolve(clid);
      }
    );
  });
}

function parseData(bodyBuf) {
  if (!bodyBuf) {
    console.log("WARNING no body");
    return null;
  }

  const body = iconv.decode(bodyBuf, "gbk");
  const $ = cheerio.load(body);
  const list = [];
  $(".cate_items a").each((idx, elem) => {
    // http://q.10jqka.com.cn/gn/detail/code/301416/
    if (!elem.attribs.href) return;

    const idMatch = elem.attribs.href.match(/code\/(\d+)/);
    const id = idMatch && idMatch[1];
    const textNode = elem.children[0];
    let name;
    if (textNode && textNode.type === "text") {
      name = textNode.data;
    }
    if (name && id) {
      list.push({ name, id, href: elem.attribs.href });
    }
  });
  return list;
}

// 补全 concepts 元数据
async function fetchConcepts(concepts) {
  const data = [];
  for (const c of concepts) {
    if (!conceptIds.find((i) => i.id === c.id)) {
      const clid = await fetchConceptCLID(
        `http://q.10jqka.com.cn/gn/detail/code/${c.id}/`
      );
      await sleep();
      if (clid) {
        data.push({ ...c, clid });
      } else {
        console.log("err update concept id", c);
      }
    }
  }
  console.log("补充概念", JSON.stringify(data, null, 2));
  return data;
}

// 补充 concepts 数据
// fetchConcepts(require("./ths-base.json").concepts);

(function () {
  Promise.all([
    fetchPage("http://q.10jqka.com.cn/gn/"),
    fetchPage("http://q.10jqka.com.cn/thshy/"),
  ])
    .then(([concepts, industries]) => {
      return fetchConcepts(concepts).then((add) => {
        return [concepts.concat(add), industries];
      });
    })
    .then(([concepts, industries]) => {
      fs.writeFileSync(
        "ths-base.json",
        JSON.stringify({ concepts, industries }, null, 2)
      );
    })
    .catch((err) => console.log(err));
})();
