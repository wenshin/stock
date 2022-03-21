const puppeteer = require("puppeteer");
const {
  parseTopIncreasedBody,
  // fetchStockConcepts,
} = require("./crawl-top-increase");
const { sleep } = require("./util");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  // const page = await browser.newPage();
  // await page.setCacheEnabled(false);
  // await page.setUserAgent(
  //   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
  // );
  // await page.goto(
  //   `http://q.10jqka.com.cn/index/index/board/all/field/zdf/order/desc/page/1/ajax/1/`
  // );
  // const a = await page.evaluate(() => {
  //   return {
  //     innerHTML: document.documentElement.innerHTML,
  //   };
  // });
  // console.log("11111", a);
  async function fetchTopIncreasedPage(pg = 1) {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
    );

    await page.goto(`http://q.10jqka.com.cn`);
    await page.waitForNavigation();
    const a1 = await page.evaluate(() => {
      return {
        innerHTML: document.documentElement.innerHTML,
      };
    });
    console.log("第", 1, "页", parseTopIncreasedBody(a1.innerHTML)[0]);

    let arr = [];
    // const stocks = parseTopIncreasedBody(a.innerHTML);
    // if (stocks.length === 0) {
    //   console.log("请求失败", a.innerHTML);
    // } else {
    //   arr = arr.concat(stocks);
    // }
    await page.waitForSelector(`#m-page a.changePage[page="2"]`);
    await page.click(`#m-page a.changePage[page="2"]`);
    await page.waitForTimeout(30000);
    const a2 = await page.evaluate(() => {
      return {
        innerHTML: document.documentElement.innerHTML,
      };
    });
    console.log("第", 2, "页", parseTopIncreasedBody(a2.innerHTML)[0]);
    await page.close();
    return arr;
  }

  async function fetchTopIncreased() {
    let isFinish = false;
    let pg = 1;
    while (!isFinish) {
      const stocks = await fetchTopIncreasedPage(pg);
      // await fetchStockConcepts(stocks);
      if (stocks.length < 20) {
        isFinish = true;
      }
      pg++;
      await sleep(2);
    }
  }

  await fetchTopIncreasedPage();
  // await fetchTopIncreased();
  await browser.close();
})();
