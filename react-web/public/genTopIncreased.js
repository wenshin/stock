const fs = require("fs");
const path = require("path");
const glob = require("glob");
const util = require("../../util");
const conceptData = require("../../concept-id.json");

function getData(filepath) {
  const dataStr = fs.readFileSync(filepath, "utf-8");
  return util.parseFileJSON(dataStr);
}

const ignoreConcepts = ["融资融券"];

glob(`../../top-increase/*.json`, (err, files) => {
  console.log(files);
  const dates = [];
  const conceptsByName = {};
  for (const filepath of files) {
    const data = getData(filepath);
    const { name: date } = path.parse(filepath);
    dates.push(date);
    for (const info of data) {
      const concepts = info.concepts.split(/[,，]\s*/);
      concepts.forEach((c) => {
        if (!c) return;
        const conceptMeta = conceptData.find((v) => v.name === c);
        if (!conceptMeta || ignoreConcepts.includes(conceptMeta.name)) {
          console.log("概念不存在", c);
          return;
        }
        conceptsByName[c] = conceptsByName[c] || {
          id: conceptMeta.id,
          name: c,
          data: new Array(files.length).fill(0),
          stocks: [],
        };
        conceptsByName[c].data[dates.length - 1] =
          (conceptsByName[c].data[dates.length - 1] || 0) + 1;
        conceptsByName[c].stocks[dates.length - 1] =
          conceptsByName[c].stocks[dates.length - 1] || [];
        conceptsByName[c].stocks[dates.length - 1].push(info);
      });
    }
  }
  fs.writeFileSync(
    "./top-increased.json",
    JSON.stringify({ dates, concepts: Object.values(conceptsByName) }, null, 2)
  );
});
