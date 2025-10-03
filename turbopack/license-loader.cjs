module.exports = function licenseLoader(source) {
  const text = typeof source === "string" ? source : source.toString("utf-8");
  return `export default ${JSON.stringify(text)};`;
};

module.exports.raw = true;
