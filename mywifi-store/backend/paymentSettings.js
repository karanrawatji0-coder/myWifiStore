const Settings = require("./models/Settings");

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ key: "payment" });
  if (!settings) {
    settings = await Settings.create({ key: "payment" });
  }
  return settings;
}

module.exports = { getOrCreateSettings };
