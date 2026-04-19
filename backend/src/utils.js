const { nanoid } = require('nanoid');

function generateShortCode() {
  return nanoid(7);
}

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { generateShortCode, isValidUrl };