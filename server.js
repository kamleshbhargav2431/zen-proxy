const express = require('express')
const { HttpsProxyAgent } = require('https-proxy-agent')

const app  = express()
const PORT = process.env.PORT || 3000

const PROXY    = 'http://qijlkvsz-rotate:viryx2zv5njj@p.webshare.io:80'
const RESOLVE  = 'https://animex-one.jeannefrankli-n2-7-2-0-5.workers.dev'
const API_BASE = 'https://api-amixeone.yilogag600-048.workers.dev'

function proxyFetch(url, extraHeaders = {}) {
  const agent = new HttpsProxyAgent(PROXY)
  return fetch(url, {
    agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://animex.one/',
      'Origin': 'https://animex.one',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      ...extraHeaders
    }
  })
}

// /:slug/sub/:episode  or  /:slug/dub/:episode
app.get('/:slug/:type(sub|dub)/:episode', async (req, res) => {
  const { slug: numericSlug, type, episode } = req.params

  try {
    // Step 1: Resolve numericSlug -> real slug (plain fetch, no proxy needed)
    const resolveRes = await fetch(`${RESOLVE}/?id=${encodeURIComponent(numericSlug)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!resolveRes.ok) throw new Error(`Slug resolve failed: ${resolveRes.status}`)
    const resolveData = await resolveRes.json()
    const slug = resolveData.slug
    if (!slug) throw new Error('No slug returned from resolve API')

    // Step 2: Fetch sources using real slug via rotating proxy
    const sourcesUrl = `${API_BASE}/rest/api/sources?id=${encodeURIComponent(slug)}&epNum=${episode}&type=${type}&providerId=zen`
    const sourcesRes = await proxyFetch(sourcesUrl, {
      'Referer': `${API_BASE}/`,
      'Origin': API_BASE,
    })
    if (!sourcesRes.ok) {
      const errText = await sourcesRes.text()
      throw new Error(`Sources API ${sourcesRes.status}: ${errText}`)
    }
    const sourcesData = await sourcesRes.json()

    const sources = sourcesData.sources || []
    const tracks  = sourcesData.tracks  || []
    if (!sources.length) throw new Error('No sources found')

    const mainSource =
      sources.find(s => s.quality === 'auto') ||
      sources.find(s => s.quality === '1080p') ||
      sources[0]

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(generatePlayerPage(mainSource.url, tracks, type, numericSlug, parseInt(episode)))

  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(500).send(generateErrorPage(err.message))
  }
})


// Debug: /debug/witch-hat-atelier-147105/sub/1
app.get('/debug/:slug/:type(sub|dub)/:episode', async (req, res) => {
  const { slug: numericSlug, type, episode } = req.params
  const log = []
  try {
    const resolveUrl = RESOLVE + '/?id=' + encodeURIComponent(numericSlug)
    log.push('STEP 1 URL: ' + resolveUrl)
    const resolveRes = await fetch(resolveUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const resolveText = await resolveRes.text()
    log.push('STEP 1 STATUS: ' + resolveRes.status)
    log.push('STEP 1 BODY: ' + resolveText)
    const resolveData = JSON.parse(resolveText)
    const slug = resolveData.slug
    log.push('SLUG: ' + slug)
    const sourcesUrl = API_BASE + '/rest/api/sources?id=' + encodeURIComponent(slug) + '&epNum=' + episode + '&type=' + type + '&providerId=zen'
    log.push('STEP 2 URL: ' + sourcesUrl)
    const sourcesRes = await proxyFetch(sourcesUrl, { 'Referer': API_BASE + '/', 'Origin': API_BASE })
    const sourcesText = await sourcesRes.text()
    log.push('STEP 2 STATUS: ' + sourcesRes.status)
    log.push('STEP 2 BODY: ' + sourcesText)
  } catch(e) {
    log.push('ERROR: ' + e.message)
  }
  const lines = log.map(l => '<div class="line">' + l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>').join('')
  res.send('<html><head><style>body{font-family:monospace;background:#0d0d0d;color:#eee;padding:2em;}h2{color:#E6B800;}.line{background:#1a1a1a;border-left:3px solid #E6B800;padding:8px 12px;margin-bottom:6px;border-radius:4px;white-space:pre-wrap;word-break:break-all;font-size:13px;}</style></head><body><h2>Debug</h2>' + lines + '</body></html>')
})
app.get('/', (req, res) => {
  res.send(generateInfoPage())
})

app.listen(PORT, () => {
  console.log(`Anime player running on port ${PORT}`)
})

// ── Player HTML ────────────────────────────────────────────────────

function generatePlayerPage(streamUrl, tracks, type, slug, episode) {
  const themeColor = '#E6B800'
  const tracksJson = JSON.stringify(tracks)
  const forceAudio = type === 'dub' ? 'english' : 'native'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Player</title>
  <script type="module" src="https://cdn.vidstack.io/player"></script>
  <link rel="stylesheet" href="https://cdn.vidstack.io/player/theme.css" />
  <link rel="stylesheet" href="https://cdn.vidstack.io/player/video.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #player-container { width: 100%; height: 100%; }
    media-player { width: 100%; height: 100%; --media-brand: ${themeColor}; --media-focus-ring-color: ${themeColor}; }
    #next-episode-overlay {
      position: fixed; bottom: 70px; right: 15px; z-index: 999999;
      background: linear-gradient(135deg, rgba(28,28,28,0.98), rgba(20,20,20,0.98));
      backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px; overflow: hidden; display: none;
      box-shadow: 0 10px 40px rgba(0,0,0,0.7);
      animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1);
      width: min(360px, calc(100vw - 30px)); color: #fff;
    }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .neo-content { display: flex; padding: 14px; gap: 12px; align-items: center; }
    .neo-thumb { width: min(120px,35vw); height: min(68px,20vw); border-radius: 8px; object-fit: cover; background: #222; flex-shrink: 0; }
    .neo-info { flex: 1; overflow: hidden; min-width: 0; }
    .neo-subtitle { font-size: 11px; color: #999; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
    .neo-title { font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .neo-footer { background: rgba(0,0,0,0.3); padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .neo-timer { font-size: 13px; color: #ddd; }
    .neo-timer span { color: ${themeColor}; font-weight: bold; }
    .neo-buttons { display: flex; gap: 8px; }
    .neo-btn { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #aaa; font-size: 12px; cursor: pointer; padding: 6px 12px; border-radius: 8px; transition: all 0.2s; font-weight: 500; }
    .neo-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .neo-btn.primary { background: linear-gradient(135deg, ${themeColor}, #d4a600); color: #000; font-weight: 700; border: none; }
    .neo-btn.primary:hover { background: linear-gradient(135deg, #f5c800, ${themeColor}); }
    @media (max-width: 480px) {
      #next-episode-overlay { bottom: 50px; right: 5px; left: 5px; width: calc(100% - 10px); }
    }
  </style>
</head>
<body>
  <div id="player-container">
    <media-player id="player" title="Player" src="" crossorigin playsinline storage="player-storage">
      <media-provider></media-provider>
      <media-video-layout></media-video-layout>
    </media-player>
  </div>

  <div id="next-episode-overlay">
    <div class="neo-content">
      <img class="neo-thumb" id="neo-img" src="" alt="">
      <div class="neo-info">
        <span class="neo-subtitle">Coming Up Next</span>
        <div class="neo-title" id="neo-title"></div>
      </div>
    </div>
    <div class="neo-footer">
      <div class="neo-timer">Playing in <span id="neo-count">10</span>s</div>
      <div class="neo-buttons">
        <button class="neo-btn" id="neo-cancel">Cancel</button>
        <button class="neo-btn primary" id="neo-now">Play Now</button>
      </div>
    </div>
  </div>

  <script type="module">
    const STREAM_URL  = ${JSON.stringify(streamUrl)};
    const TRACKS      = ${tracksJson};
    const TYPE        = ${JSON.stringify(type)};
    const FORCE_AUDIO = ${JSON.stringify(forceAudio)};
    const SLUG        = ${JSON.stringify(slug)};
    const EPISODE     = ${episode};
    const storageKey  = \`vids-pos-\${SLUG}-\${TYPE}-\${EPISODE}\`;

    let player, nextEpTimer = null, nextEpInfo = null;

    function postMsg(obj) {
      window.parent.postMessage(obj, '*');
      window.parent.postMessage(JSON.stringify(obj), '*');
    }

    function goToNextEpisode(ep) {
      postMsg({ type: 'VIDEO_ENDED', slug: SLUG, type: TYPE, episode: ep });
      window.location.href = \`/\${SLUG}/\${TYPE}/\${ep}\`;
    }

    async function checkNextEpisode() {
      try {
        const res = await fetch(\`/\${SLUG}/\${TYPE}/\${EPISODE + 1}\`, { method: 'HEAD' });
        if (res.ok) return { episode: EPISODE + 1 };
      } catch(e) {}
      return null;
    }

    function showNextEpisode(info) {
      document.getElementById('neo-title').textContent = \`Episode \${info.episode}\`;
      document.getElementById('next-episode-overlay').style.display = 'block';
      let countdown = 10;
      document.getElementById('neo-count').textContent = countdown;
      if (nextEpTimer) clearInterval(nextEpTimer);
      nextEpTimer = setInterval(() => {
        countdown--;
        document.getElementById('neo-count').textContent = countdown;
        if (countdown <= 0) { clearInterval(nextEpTimer); goToNextEpisode(info.episode); }
      }, 1000);
    }

    document.getElementById('neo-now').addEventListener('click', () => {
      if (nextEpTimer) clearInterval(nextEpTimer);
      if (nextEpInfo) goToNextEpisode(nextEpInfo.episode);
    });
    document.getElementById('neo-cancel').addEventListener('click', () => {
      if (nextEpTimer) clearInterval(nextEpTimer);
      document.getElementById('next-episode-overlay').style.display = 'none';
    });

    async function selectAudioTrack() {
      await new Promise(resolve => {
        const check = () => {
          if (player.audioTracks && player.audioTracks.length > 0) resolve();
          else setTimeout(check, 300);
        };
        check();
      });
      const audioTracks = player.audioTracks;
      if (!audioTracks || !audioTracks.length) return;
      let preferred = null;
      if (FORCE_AUDIO === 'english') {
        preferred = [...audioTracks].find(t =>
          t.language === 'eng' || t.language === 'en' ||
          (t.label && t.label.toLowerCase().includes('english'))
        );
      } else {
        preferred = [...audioTracks].find(t =>
          t.language === 'jpn' || t.language === 'ja' ||
          (t.label && (t.label.toLowerCase().includes('native') || t.label.toLowerCase().includes('japanese')))
        );
      }
      if (preferred) preferred.selected = true;
    }

    async function initPlayer() {
      postMsg({ event: 'player_ready' });
      nextEpInfo = await checkNextEpisode();

      player = document.getElementById('player');
      player.title = \`Episode \${EPISODE} [\${TYPE.toUpperCase()}]\`;
      document.title = player.title;
      player.src = STREAM_URL;

      const provider = player.querySelector('media-provider');
      TRACKS.forEach(track => {
        if (track.kind === 'thumbnails') return;
        const el = document.createElement('track');
        el.src     = track.url;
        el.label   = track.label || track.lang;
        el.srclang = track.lang || 'und';
        el.kind    = track.kind || 'subtitles';
        if (track.default) el.default = true;
        provider.appendChild(el);
      });

      const thumbTrack = TRACKS.find(t => t.kind === 'thumbnails');
      if (thumbTrack) player.setAttribute('preview', thumbTrack.url);

      const savedTime = localStorage.getItem(storageKey);
      if (savedTime) player.currentTime = parseFloat(savedTime);

      player.addEventListener('can-play', () => {
        player.play().catch(() => {});
        selectAudioTrack();
      }, { once: true });

      player.addEventListener('loaded-metadata', () => selectAudioTrack());

      player.addEventListener('time-update', () => {
        const currentTime = player.currentTime;
        const duration    = player.duration;
        if (duration > 0 && currentTime > 10 && currentTime < duration - 30)
          localStorage.setItem(storageKey, currentTime);
        if (duration > 0) postMsg({ event: 'time', time: currentTime, duration });
        if (nextEpInfo && duration > 0) {
          const timeLeft = duration - currentTime;
          if (timeLeft <= 30 && timeLeft > 0 && !nextEpTimer) showNextEpisode(nextEpInfo);
        }
      });

      player.addEventListener('ended', () => {
        postMsg({ event: 'complete' });
        if (nextEpInfo) showNextEpisode(nextEpInfo);
      });

      player.addEventListener('error', () => {
        postMsg({ event: 'player_error', reason: 'stream_error' });
      });
    }

    if (customElements.get('media-player')) initPlayer();
    else customElements.whenDefined('media-player').then(initPlayer);
  </script>
</body>
</html>`
}

function generateErrorPage(detail) {
  const safe = detail.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return `<html><head><title>Error</title>
  <style>
    body { font-family: monospace; background: #0d0d0d; color: #eee; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #1a1a1a; border: 1px solid #333; padding: 2em 3em; border-radius: 12px; text-align: center; max-width: 500px; }
    h4 { color: #ff4444; margin-top: 0; }
    .hint { color: #ffaa00; font-weight: bold; margin-top: 1em; }
    code { background: #333; padding: 4px 8px; border-radius: 4px; color: #ff8888; display: block; margin-top: 1em; word-break: break-all; font-size: 12px; }
  </style></head>
  <body><div class="box">
    <h4>Playback Error</h4>
    <p class="hint">Please try switching to another server</p>
    <code>${safe}</code>
  </div>
  <script>window.parent.postMessage({ event: 'player_error', reason: 'api_error' }, '*');<\/script>
  </body></html>`
}

function generateInfoPage() {
  return `<html><head><title>Anime Player</title>
  <style>body{font-family:sans-serif;background:#111;color:#eee;padding:2em;}code{background:#222;padding:2px 6px;border-radius:4px;}h2{color:#E6B800;}</style></head>
  <body>
    <h2>Anime Player</h2>
    <p>Usage:</p>
    <ul style="margin-top:1em;line-height:2">
      <li><code>/:slug/sub/:episode</code> — Sub with native audio</li>
      <li><code>/:slug/dub/:episode</code> — Dub with English audio forced</li>
    </ul>
    <p style="margin-top:1em">Example: <code>/witch-hat-atelier-147105/sub/1</code></p>
  </body></html>`
}
