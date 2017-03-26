const fs = require('fs');
const glob = require('glob');
const util = require('./util');

const days = [1, 3, 5, 10, 20, 40];
const gFileCache = {};
const gResultCache = {};

function printStrongWeak(dir, sortDay = 3) {
  function getData(filepath) {
    let data = gFileCache[filepath];
    if (!data) {
      const dataStr = fs.readFileSync(filepath, 'utf-8');
      data = parseJSON(dataStr);
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
          if (dir === 'industry') {
            unique['delta' + day] = unique['increase' + day] - gResultCache.indexes['399300']['increase' + day];
          }
        }
        unsorted[item.id] = unique;
      }
      day++;
    }

    const key = dir === 'industry' ? 'delta' : 'increase';
    const sortKey = `${key}${sortDay}`;
    const desc3day = util.sortByKey(Object.values(unsorted), sortKey);
    const asc3day = util.sortByKey(Object.values(unsorted), sortKey, true);

    console.log(dir === 'industry' ? '\n\n同花顺行业' : '\n\n大盘指数');
    console.log(`\n=========== ${sortDay}日降序\n`)
    console.log('，'.repeat(10) + util.getPrintHeader(days));
    desc3day.slice(0, 15)
      .map((item) => util.print(item, key, days));

    console.log(`\n=========== ${sortDay}日升序\n`)
    console.log('，'.repeat(10) + util.getPrintHeader(days));
    asc3day.slice(0, 15)
      .map((item) => util.print(item, key, days));
  });
}


function parseJSON(str) {
  return JSON.parse('[' + str.replace(/,\n?$/, '') + ']');
}

printStrongWeak('indexes', process.argv[2]);

console.log('\n\n');

printStrongWeak('industry', process.argv[2]);
