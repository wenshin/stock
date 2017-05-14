const fs = require('fs');
const path = require('path');
const glob = require('glob');
const util = require('../util');

const DEFAULT_PERIOD = 90;
const gFileCache = {};
const gResultCache = {};

const json = {
  dates: [],
  indexes: [],
  industry: [],
  concept: []
};

function genData(dir) {
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

  glob(`../${dir}/*.json`, (err, files) => {
    const dates = [];
    for (const filepath of files) {
      if (!filepath) break;
      const {name: date} = path.parse(filepath);
      const data = getData(filepath);
      for (const item of data) {
        const unique = unsorted[item.id] || {
          id: item.id,
          name: item.name,
          data: []
        };
        unique.data.push(item.increase + (unique.data[unique.data.length - 1] || 0));
        unsorted[item.id] = unique;
      }
      dates.push(date);
    }
    json.dates = json.dates.length > dates.length ? json.dates : dates;
    json[dir] = Object.keys(unsorted).map(key => unsorted[key]);
    if (json.indexes.length && json.industry.length && json.concept.length) {
      fs.writeFileSync('data.json', JSON.stringify(json, null, 2));
    }
  });
}

genData('indexes');
genData('industry');
genData('concept');
