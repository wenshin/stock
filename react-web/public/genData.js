const fs = require("fs");
const path = require("path");
const glob = require("glob");
const util = require("../../util");

// const DEFAULT_PERIOD = 90;
const gFileCache = {};
const gResultCache = {};

const json = {
  dates: [],
  indexes: [],
  industry: [],
  concept: [],
};

const ignoreConcepts = [
  "308650",
  "301531",
  "300841",
  "301491",
  "300870",
  "301490",
  "301715",
  "301663",
  "301546",
];

function genData(dir, infos) {
  function getData(filepath) {
    let data = gFileCache[filepath];
    if (!data) {
      const dataStr = fs.readFileSync(filepath, "utf-8");
      data = util.parseFileJSON(dataStr);
      gFileCache[filepath] = data;
    }
    return data;
  }

  const unsorted = (gResultCache[dir] = gResultCache[dir] || {});

  glob(`../../${dir}/*.json`, (err, files) => {
    const dates = [];
    for (const filepath of files) {
      if (!filepath) break;
      const { name: date } = path.parse(filepath);
      if (date < "20210101") continue;
      const data = getData(filepath);
      for (const c of infos) {
        if (ignoreConcepts.indexOf(c.id) > -1) continue;
        let item = data.find((v) => v.id === c.id);
        if (!item) {
          item = {
            id: c.id,
            name: c.name,
            increase: 0,
          };
        }
        if (item.id === "885927") {
          console.log("11111", item);
        }
        const unique = unsorted[item.id] || {
          id: item.id,
          name: item.name,
          data: [],
        };
        unique.data.push(
          item.increase + (unique.data[unique.data.length - 1] || 0)
        );
        unsorted[item.id] = unique;
      }
      dates.push(date);
    }
    json.dates = json.dates.length > dates.length ? json.dates : dates;
    json[dir] = Object.keys(unsorted).map((key) => unsorted[key]);
    if (json.indexes.length && json.industry.length && json.concept.length) {
      fs.writeFileSync("data.json", JSON.stringify(json, null, 2));
    }
  });
}

genData("indexes", require("../../consts").INDEXES);
genData("industry", require("../../ths-base.json").industries);
genData("concept", require("../../concept-id.json"));
