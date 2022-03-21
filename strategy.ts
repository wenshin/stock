/**
 * 优质公司或者 ETF 抄底策略（切忌使用在基本面不 OK 的公司）
 * @param startPrice
 * @param currentPrice
 * @param allMoney
 * @returns
 *
 * # 长期下跌过程中，购买策略
 * 1. -20%，总资金 3%
 * 2. -30%，总资金 8%
 * 3. -40%，总资金 13% 24
 * 4. -50%，总资金 18% 42
 * 5. -60%，总资金 18% 60
 * 5. -70%，总资金 18% 78
 * 6. -80%，总资金 18% 96
 *
 * # 二次触底，购买策略
 * 1. 二次触底反弹第三天（连续两天反弹），剩余资金的 50%
 * 2. 二次触底反弹站稳 60 日均线，剩余资金的 50%
 *
 * # 止盈策略
 * 1. 收盘价跌破 5 日均线，5%
 * 2. 收盘价跌破 10 日均线，10%
 * 3. 收盘价跌破 20 日均线，30%
 * 4. 收盘价跌破 30 日均线，55%
 */
function decreaseStrategy(startPrice: number, allMoney: number) {
  const ret = {
    longbuy: [
      { price: startPrice * 0.8, money: allMoney * 0.05 },
      { price: startPrice * 0.7, money: allMoney * 0.06 },
      { price: startPrice * 0.6, money: allMoney * 0.11 },
      { price: startPrice * 0.5, money: allMoney * 0.17 },
      { price: startPrice * 0.4, money: allMoney * 0.28 },
      { price: startPrice * 0.3, money: allMoney * 0.28 },
      { price: startPrice * 0.2, money: allMoney * 0.22 },
    ],
    sell: [],
  };
  return ret;
}

const ret = decreaseStrategy(Number(process.argv[2]), Number(process.argv[3]));
console.log("11111", ret);
