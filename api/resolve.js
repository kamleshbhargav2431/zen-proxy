const PROXY = 'http://qijlkvsz-rotate:viryx2zv5njj@p.webshare.io:80'
const { HttpsProxyAgent } = require('https-proxy-agent')

async function fetchViaProxy(url, headers = {}) {
  const agent = new HttpsProxyAgent(PROXY)
  const res = await fetch(url, { agent, headers })
  return res
}

module.exports = { fetchViaProxy }
