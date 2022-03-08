const moment = require("moment");
const request = require("request");
const cheerio = require("cheerio");
const fs = require("fs");
const iconv = require("iconv-lite");
const { sleep } = require("./util");

const headers = {
  Referer: "http://q.10jqka.com.cn/",
  Accept: "text/html, */*; q=0.01",
  // "Accept-Encoding": "gzip, deflate",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  Cookie:
    "user=MDpteF8zMDU0ODczOTg6Ok5vbmU6NTAwOjMxNTQ4NzM5ODo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjMwNTQ4NzM5ODoxNjQ2MTQ1NDAxOjo6MTQ0NjYxNTY2MDo2MDQ4MDA6MDoxMWY2YTJhZTVhZjM0NzAzNWRhN2FkNjc0MjBkNjMzMDk6ZGVmYXVsdF80OjA%3D; userid=305487398; u_name=mx_305487398; escapename=mx_305487398; ticket=64ac0844b866523bab05211bea89dc4a; user_status=0; utk=e113b5fd65c303fce88312380733ac7f; spversion=20130314; searchGuide=sg; historystock=001234%7C*%7C301218%7C*%7C301078%7C*%7C300584; Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1646149540,1646149573,1646465252,1646674242; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1646674242; v=A5KX-fkjJD5sLlh21byzrHfB5VNxo5bkyKaLNVzovxkxRTzNRDPmTZg32JAv",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
};

function fetchTopIncreasedPage(page = 1) {
  const url = `http://q.10jqka.com.cn/index/index/board/all/field/zdf/order/desc/page/${page}/ajax/1/`;
  return new Promise((resolve, reject) => {
    request(
      {
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
        const stocks = parseTopIncreasedBody(bodystr);
        console.log("第", page, "页", stocks.length);
        resolve(stocks);
      }
    );
  });
}

function parseTopIncreasedBody(body) {
  const stocks = [];
  const $ = cheerio.load(body);
  // http://q.10jqka.com.cn/index/index/board/all/field/zdf/order/desc/page/1/ajax/1/
  $("table tbody tr").each((idx, elem) => {
    const info = {
      url: "",
      code: "",
      name: "",
      increased: 0,
      exchange: 0,
      moneyVolumn: 0,
      PE: 0,
    };
    let tdIdx = 0;
    for (let i = 0; i < elem.children.length; i++) {
      const e = elem.children[i];
      if (e.name !== "td") {
        continue;
      }
      switch (tdIdx) {
        case 1:
          info.code = getText(e);
          info.url = `http://stockpage.10jqka.com.cn/${info.code}/`;
          break;
        case 2:
          info.name = getText(e);
          break;
        case 4:
          info.increased = Number(getText(e));
          break;
        case 7:
          info.exchange = Number(getText(e));
          break;
        case 10:
          info.moneyVolumn = getText(e);
          break;
        case 13:
          info.PE = getText(e);
          break;
        default:
          break;
      }
      tdIdx++;
    }
    if (info.increased >= 7) {
      stocks.push(info);
    }
  });
  return stocks;
}

function getText(elem) {
  let textNode = elem.children[0];
  if (textNode && textNode.type !== "text" && textNode.children.length) {
    textNode = textNode.children[0];
  }
  return textNode.data;
}

async function fetchStockConcepts(stocks) {
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log("111111", stock);
    const url = `http://stockpage.10jqka.com.cn/${stock.code}/`;
    await new Promise((resolve, reject) => {
      request(
        {
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

          const bodystr = iconv.decode(body, "utf-8");
          const data = parseStockConceptsBody(bodystr);
          stock.concepts = data.concepts;
          stock.ipcDate = data.ipcDate;
          saveFile(stock);
          resolve();
        }
      );
    });
    await sleep(2);
  }
  return stocks;
}

function parseStockConceptsBody(body) {
  let concepts = "";
  let ipcdate = "";
  const $ = cheerio.load(body);
  // http://q.10jqka.com.cn/index/index/board/all/field/zdf/order/desc/page/1/ajax/1/
  $(".company_details dd").each((idx, elem) => {
    if (idx === 1 && elem.name === "dd" && elem.attribs.title) {
      concepts = elem.attribs.title;
    }
    if (idx === 4 && elem.name === "dd") {
      ipcdate = getText(elem);
    }
  });
  return {
    concepts,
    ipcDate: ipcdate,
  };
}

function saveFile(stock) {
  const dateStr = moment().format("YYYYMMDD");
  const filepath = `./top-increase/${dateStr}.json`;
  // try {
  //   fs.unlinkSync(filepath);
  // } catch (err) {
  //   console.log(err);
  // }

  fs.appendFile(filepath, JSON.stringify(stock, null, 2) + ",\n", (err) => {
    err && console.log(err);
    console.log("写入涨停数据");
  });
}

async function fetchTopIncreased() {
  let isFinish = false;
  let page = 1;
  while (!isFinish) {
    const stocks = await fetchTopIncreasedPage(page);
    await fetchStockConcepts(stocks);
    if (stocks.length < 20) {
      isFinish = true;
    }
    page++;
    await sleep(2);
  }
}

fetchTopIncreased();

const body = `
<table class="m-table m-pager-table">
                <thead>
                <tr>
                    <th style="width:4%">序号</th>
                    <th style="width:6%">代码</th>
                    <th style="width:8%">名称</th>
                    <th style="width:6%" ><a href="javascript:void(0)" field="xj" >现价<i></i></a></th>
                    <th style="width:8%"  class="cur"><a href="javascript:void(0)" field="zdf" order="desc"  class="desc">涨跌幅(%)<i></i></a></th>
                    <th style="width:6%" ><a href="javascript:void(0)" field="zd" >涨跌<i></i></a></th>
                    <th style="width:8%" ><a href="javascript:void(0)" field="zs" >涨速(%)<i></i></a></th>
                    <th style="width:8%" ><a href="javascript:void(0)" field="hs" >换手(%)<i></i></a></th>
                    <th style="width:6%" ><a href="javascript:void(0)" field="lb" >量比<i></i></a></th>
                    <th style="width:6%" ><a href="javascript:void(0)" field="zf" >振幅(%)<i></i></a></th>
                    <th style="width:7%" ><a href="javascript:void(0)" field="cje" >成交额<i></i></a></th>
                    <th style="width:8%" ><a href="javascript:void(0)" field="ltg" >流通股<i></i></a></th>
                    <th style="width:8%" ><a href="javascript:void(0)" field="ltsz" >流通市值<i></i></a></th>
                    <th style="width:7%" ><a href="javascript:void(0)" field="syl" >市盈率<i></i></a></th>
                    <!--th>概念题材</th-->
                    <th style="width:4%">加自选</th>
                </tr>
                </thead>
                <tbody>
                                <tr>
                    <td>1</td>
                    <td><a href="http://stockpage.10jqka.com.cn/301218/" target="_blank">301218</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/301218/" target="_blank">N华是</a></td>
                    <td class="c-rise">59.80</td>
                    <td class="c-rise">80.23</td>
                    <td class="c-rise">26.62</td>
                    <td class="c-rise">0.03</td>
                    <td>64.29</td>
                    <td class="">--</td>
                    <td class="c-rise">21.07</td>
                    <td>7.52亿</td>
                    <td>1900.67万</td>
                    <td>11.37亿</td>
                    <td>75.78</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>2</td>
                    <td><a href="http://stockpage.10jqka.com.cn/688281/" target="_blank">688281</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/688281/" target="_blank">N华秦</a></td>
                    <td class="c-rise">260.00</td>
                    <td class="c-rise">37.20</td>
                    <td class="c-rise">70.50</td>
                    <td class="c-rise">0.54</td>
                    <td>75.88</td>
                    <td class="">--</td>
                    <td class="c-rise">22.91</td>
                    <td>29.63亿</td>
                    <td>1541.79万</td>
                    <td>40.09亿</td>
                    <td>74.34</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>3</td>
                    <td><a href="http://stockpage.10jqka.com.cn/301004/" target="_blank">301004</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/301004/" target="_blank">嘉益股份</a></td>
                    <td class="c-rise">27.46</td>
                    <td class="c-rise">20.02</td>
                    <td class="c-rise">4.58</td>
                    <td class="">0.00</td>
                    <td>45.58</td>
                    <td class="c-rise">3.94</td>
                    <td class="c-rise">21.68</td>
                    <td>2.94亿</td>
                    <td>2500.00万</td>
                    <td>6.87亿</td>
                    <td>33.47</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>4</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300966/" target="_blank">300966</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300966/" target="_blank">共同药业</a></td>
                    <td class="c-rise">60.82</td>
                    <td class="c-rise">20.01</td>
                    <td class="c-rise">10.14</td>
                    <td class="">0.00</td>
                    <td>58.79</td>
                    <td class="c-rise">2.97</td>
                    <td class="c-rise">18.73</td>
                    <td>9.63亿</td>
                    <td>2900.00万</td>
                    <td>17.64亿</td>
                    <td>97.26</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>5</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300584/" target="_blank">300584</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300584/" target="_blank">海辰药业</a></td>
                    <td class="c-rise">84.04</td>
                    <td class="c-rise">20.01</td>
                    <td class="c-rise">14.01</td>
                    <td class="">0.00</td>
                    <td>30.64</td>
                    <td class="c-rise">1.48</td>
                    <td class="c-rise">17.22</td>
                    <td>15.83亿</td>
                    <td>6404.53万</td>
                    <td>53.82亿</td>
                    <td>267.90</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>6</td>
                    <td><a href="http://stockpage.10jqka.com.cn/301078/" target="_blank">301078</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/301078/" target="_blank">孩子王</a></td>
                    <td class="c-rise">27.18</td>
                    <td class="c-rise">20.00</td>
                    <td class="c-rise">4.53</td>
                    <td class="">0.00</td>
                    <td>73.12</td>
                    <td class="c-rise">2.77</td>
                    <td class="c-rise">25.43</td>
                    <td>13.21亿</td>
                    <td>7413.63万</td>
                    <td>20.15亿</td>
                    <td>93.66</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>7</td>
                    <td><a href="http://stockpage.10jqka.com.cn/301126/" target="_blank">301126</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/301126/" target="_blank">达嘉维康</a></td>
                    <td class="c-rise">36.44</td>
                    <td class="c-rise">19.99</td>
                    <td class="c-rise">6.07</td>
                    <td class="">0.00</td>
                    <td>12.29</td>
                    <td class="c-rise">0.52</td>
                    <td class="">--</td>
                    <td>2.19亿</td>
                    <td>4896.39万</td>
                    <td>17.84亿</td>
                    <td>112.37</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>8</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300279/" target="_blank">300279</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300279/" target="_blank">和晶科技</a></td>
                    <td class="c-rise">7.99</td>
                    <td class="c-rise">19.97</td>
                    <td class="c-rise">1.33</td>
                    <td class="">0.00</td>
                    <td>8.17</td>
                    <td class="c-rise">4.02</td>
                    <td class="c-rise">13.36</td>
                    <td>2.81亿</td>
                    <td>4.40亿</td>
                    <td>35.13亿</td>
                    <td>103.18</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>9</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300703/" target="_blank">300703</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300703/" target="_blank">创源股份</a></td>
                    <td class="c-rise">11.69</td>
                    <td class="c-rise">16.90</td>
                    <td class="c-rise">1.69</td>
                    <td class="c-fall">-0.26</td>
                    <td>20.12</td>
                    <td class="c-rise">10.08</td>
                    <td class="c-rise">20.50</td>
                    <td>3.88亿</td>
                    <td>1.72亿</td>
                    <td>20.11亿</td>
                    <td>82.02</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>10</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300753/" target="_blank">300753</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300753/" target="_blank">爱朋医疗</a></td>
                    <td class="c-rise">20.17</td>
                    <td class="c-rise">13.51</td>
                    <td class="c-rise">2.40</td>
                    <td class="c-rise">0.05</td>
                    <td>12.08</td>
                    <td class="c-rise">5.10</td>
                    <td class="c-rise">17.84</td>
                    <td>1.76亿</td>
                    <td>7494.07万</td>
                    <td>15.12亿</td>
                    <td>47.03</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>11</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300208/" target="_blank">300208</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300208/" target="_blank">青岛中程</a></td>
                    <td class="c-rise">15.55</td>
                    <td class="c-rise">12.85</td>
                    <td class="c-rise">1.77</td>
                    <td class="">0.00</td>
                    <td>9.34</td>
                    <td class="c-rise">1.82</td>
                    <td class="c-rise">15.89</td>
                    <td>9.73亿</td>
                    <td>6.87亿</td>
                    <td>106.89亿</td>
                    <td>亏损</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>12</td>
                    <td><a href="http://stockpage.10jqka.com.cn/300096/" target="_blank">300096</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/300096/" target="_blank">易联众</a></td>
                    <td class="c-rise">8.53</td>
                    <td class="c-rise">11.80</td>
                    <td class="c-rise">0.90</td>
                    <td class="c-rise">0.24</td>
                    <td>10.58</td>
                    <td class="c-rise">5.56</td>
                    <td class="c-rise">16.51</td>
                    <td>3.28亿</td>
                    <td>3.77亿</td>
                    <td>32.12亿</td>
                    <td>亏损</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>13</td>
                    <td><a href="http://stockpage.10jqka.com.cn/002269/" target="_blank">002269</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/002269/" target="_blank">美邦服饰</a></td>
                    <td class="c-rise">2.48</td>
                    <td class="c-rise">10.22</td>
                    <td class="c-rise">0.23</td>
                    <td class="">0.00</td>
                    <td>3.23</td>
                    <td class="c-rise">2.32</td>
                    <td class="c-rise">10.67</td>
                    <td>1.96亿</td>
                    <td>25.12亿</td>
                    <td>62.31亿</td>
                    <td>亏损</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>14</td>
                    <td><a href="http://stockpage.10jqka.com.cn/600077/" target="_blank">600077</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/600077/" target="_blank">宋都股份</a></td>
                    <td class="c-rise">4.02</td>
                    <td class="c-rise">10.14</td>
                    <td class="c-rise">0.37</td>
                    <td class="">0.00</td>
                    <td>7.05</td>
                    <td class="c-rise">1.27</td>
                    <td class="c-rise">13.97</td>
                    <td>3.62亿</td>
                    <td>13.40亿</td>
                    <td>53.87亿</td>
                    <td>66.39</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>15</td>
                    <td><a href="http://stockpage.10jqka.com.cn/002599/" target="_blank">002599</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/002599/" target="_blank">盛通股份</a></td>
                    <td class="c-rise">6.00</td>
                    <td class="c-rise">10.09</td>
                    <td class="c-rise">0.55</td>
                    <td class="">0.00</td>
                    <td>11.56</td>
                    <td class="c-rise">3.86</td>
                    <td class="c-rise">10.64</td>
                    <td>2.68亿</td>
                    <td>4.01亿</td>
                    <td>24.03亿</td>
                    <td>34.64</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>16</td>
                    <td><a href="http://stockpage.10jqka.com.cn/000150/" target="_blank">000150</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/000150/" target="_blank">宜华健康</a></td>
                    <td class="c-rise">3.93</td>
                    <td class="c-rise">10.08</td>
                    <td class="c-rise">0.36</td>
                    <td class="">0.00</td>
                    <td>12.70</td>
                    <td class="c-rise">2.52</td>
                    <td class="c-rise">13.16</td>
                    <td>3.80亿</td>
                    <td>8.06亿</td>
                    <td>31.68亿</td>
                    <td>亏损</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>17</td>
                    <td><a href="http://stockpage.10jqka.com.cn/000530/" target="_blank">000530</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/000530/" target="_blank">冰山冷热</a></td>
                    <td class="c-rise">5.24</td>
                    <td class="c-rise">10.08</td>
                    <td class="c-rise">0.48</td>
                    <td class="">0.00</td>
                    <td>16.50</td>
                    <td class="c-rise">1.50</td>
                    <td class="c-rise">11.13</td>
                    <td>4.94亿</td>
                    <td>5.99亿</td>
                    <td>31.36亿</td>
                    <td>亏损</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>18</td>
                    <td><a href="http://stockpage.10jqka.com.cn/002678/" target="_blank">002678</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/002678/" target="_blank">珠江钢琴</a></td>
                    <td class="c-rise">7.65</td>
                    <td class="c-rise">10.07</td>
                    <td class="c-rise">0.70</td>
                    <td class="">0.00</td>
                    <td>2.81</td>
                    <td class="c-rise">15.46</td>
                    <td class="c-rise">10.50</td>
                    <td>2.87亿</td>
                    <td>13.57亿</td>
                    <td>103.83亿</td>
                    <td>48.81</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>19</td>
                    <td><a href="http://stockpage.10jqka.com.cn/002699/" target="_blank">002699</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/002699/" target="_blank">美盛文化</a></td>
                    <td class="c-rise">5.91</td>
                    <td class="c-rise">10.06</td>
                    <td class="c-rise">0.54</td>
                    <td class="">0.00</td>
                    <td>17.76</td>
                    <td class="c-rise">2.73</td>
                    <td class="c-rise">6.52</td>
                    <td>9.43亿</td>
                    <td>9.10亿</td>
                    <td>53.76亿</td>
                    <td>76.27</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                <tr>
                    <td>20</td>
                    <td><a href="http://stockpage.10jqka.com.cn/002051/" target="_blank">002051</a></td>
                    <td><a href="http://stockpage.10jqka.com.cn/002051/" target="_blank">中工国际</a></td>
                    <td class="c-rise">8.54</td>
                    <td class="c-rise">10.05</td>
                    <td class="c-rise">0.78</td>
                    <td class="">0.00</td>
                    <td>3.01</td>
                    <td class="c-rise">1.84</td>
                    <td class="c-rise">10.70</td>
                    <td>2.76亿</td>
                    <td>11.12亿</td>
                    <td>95.00亿</td>
                    <td>34.20</td>
                    <td><a class="j_addStock" title="加自选" href="javascript:void(0);"><img src="http://i.thsi.cn/images/q/plus_logo.png" alt=""></a></td>
                </tr>
                                </tbody>
            </table>
`;

// const stocks = parseBody(body);
// console.log(stocks);

const conceptBody = `<div class="sub_cont_3">
<h2 class="m_title_4">公司简介</h2>
<dl class="company_details">
  <!-- <dt>公司名称：</dt>
  <dd>泰慕士</dd> -->
  <dt>所属地域：</dt>
  <dd>江苏省</dd>
  <dt>涉及概念：</dt>
  <dd title="三胎概念，核准制次新股，新股与次新股">三胎概念，核准制次新股，新股与次...</dd>
  <dt>主营业务：</dt>
  <dd><a href="/001234/operate/" target="_blank" class="jyfx stat" stat="f10_spgd_jyfx">经营分析</a></dd>
  <dd title="　　服装的设计、生产、销售；印绣花生产、加工及销售；高档织物面料的研发、生产、销售；自营和代理各类商品及技术的进出口业务（国家限定企业经营或禁止进出口的商品和技术除外。）（依法须经批准的项目，经相关部门批准后方可开展经营活动）许可项目：道路货物运输（不含危险货物）（依法须经批准的项目，经相关部门批准后方可开展经营活动，具体经营项目以审批结果为准）">服装的设计、生产、销售；印绣花生产、加工及销...</dd>
  <dt>上市日期：</dt>
  <dd>2022-01-11</dd>
  <dt>每股净资产：</dt>
  <dd>5.74元</dd>
  <dt>每股收益：</dt>
  <dd>1.01元</dd>
  <dt>净利润：</dt>
  <dd>0.81亿元</dd>
  <dt>净利润增长率：</dt>
  <dd>29.91%</dd>
  <dt>营业收入：</dt>
  <dd>6.54亿元</dd>
  <dt>每股现金流：</dt>
  <dd>0.80元</dd>
  <dt>每股公积金：</dt>
  <dd>2.19元</dd>
  <dt>每股未分配利润：</dt>
  <dd>2.33元</dd>
  <dt>总股本：</dt>
  <dd>1.07亿</dd>
  <dt>流通股：</dt>
  <dd>0.27亿</dd>
</dl>
</div>`;
// const data = parseStockConceptsBody(conceptBody);
// console.log(data);

// fetchStockConcepts([
//   {
//     url: "http://stockpage.10jqka.com.cn/001234/",
//     code: "001234",
//     name: "泰慕士",
//     increased: 10,
//     exchange: 46.35,
//     moneyVolumn: "3.78亿",
//     PE: "31.47",
//   },
//   {
//     url: "http://stockpage.10jqka.com.cn/603176/",
//     code: "603176",
//     name: "汇通集团",
//     increased: 10,
//     exchange: 26.36,
//     moneyVolumn: "3.20亿",
//     PE: "51.15",
//     concepts: "PPP概念，雄安新区，核准制次新股，新股与次新股",
//     ipcDate: "2021-12-31",
//   },
// ]);
