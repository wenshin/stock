const fs = require('fs');
const glob = require('glob');
const util = require('./util');

const days = [1, 2, 3, 4, 5, 10, 20, 40];
const gFileCache = {};
const gResultCache = {};

const titlesByDir = {
  indexes: '大盘指数',
  industry: '同花顺行业',
  concept: '同花顺概念'
};

function printStrongWeak(dir, sortDay = 2) {
  function getData(filepath) {
    let data = gFileCache[filepath];
    if (!data) {
      const dataStr = fs.readFileSync(filepath, 'utf-8');
      data = util.parseFileJSON(dataStr);
      gFileCache[filepath] = data;
    }
    return data;
  }

  const unsorted = gResultCache[dir] = gResultCache[dir] || {};

  glob(`./${dir}/*.json`, (err, files) => {
    let day = 1;
    const maxDay = Math.max(...days);
    while(day <= maxDay + 1) {
      const filepath = files[files.length - day];
      if (!filepath) break;
      const data = getData(filepath);
      for (const item of data) {
        let unique = unsorted[item.id] || item;
        unique.increaseTotal = item.increase + (unique.increaseTotal || 0);
        if (days.indexOf(day) > -1) {
          unique['increase' + day] = unique.increaseTotal;
          if (dir !== 'indexes') {
            unique['delta' + day] = unique['increase' + day] -
              gResultCache.indexes['399300']['increase' + day];
          }
        }
        unsorted[item.id] = unique;
      }
      day++;
    }

    const key = dir === 'indexes' ? 'increase' : 'delta';
    const sortKey = `${key}${sortDay}`;
    const desc = util.sortByKey(Object.values(unsorted), sortKey);
    const asc = util.sortByKey(Object.values(unsorted), sortKey, true);

    console.log(`\n\n${titlesByDir[dir]}`);
    console.log(`\n=========== ${sortDay}日降序\n`)
    console.log('，'.repeat(10) + util.getPrintHeader(days));
    desc.slice(0, 15)
      .map((item) => util.print(item, key, days));

    console.log(`\n=========== ${sortDay}日升序\n`)
    console.log('，'.repeat(10) + util.getPrintHeader(days));
    asc.slice(0, 15)
      .map((item) => util.print(item, key, days));
  });
}


printStrongWeak('indexes', process.argv[2]);

console.log('\n\n');

printStrongWeak('industry', process.argv[2]);

console.log('\n\n');

printStrongWeak('concept', process.argv[2]);

console.log(`
炒股纪律：
1. 大盘明显阻力位清仓止损观望
2. k线形态 -> boll 位置 -> 主力买卖 -> 成交量 -> 有无解禁
2. RSI 低于 30 大部分都有二次探底
`);
