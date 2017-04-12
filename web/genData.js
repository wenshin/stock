const fs = require('fs');
const path = require('path');
const glob = require('glob');

const DEFAULT_PERIOD = 180;
const gFileCache = {};
const gResultCache = {};

const json = {
  dates: [],
  indexes: {
  },
  industry: {
  },
  concept: {
  }
};

function genData(dir, sortDay = 2) {
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
    let day = DEFAULT_PERIOD;
    while(day >= 0) {
      const filepath = files[day];
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
      day--;
    }
  });
}
