// shared/xenforo-api.js
// Lightweight XenForo REST API helpers (thread metadata, character manager, etc.)
//
// Alternate bases used during development (swap XENFORO_API_BASE to point here):
//   http://localhost:3001/api                          (local dev server)
//   https://spherical-worlds.com/tsbeta/api            (beta env)

const XENFORO_API_BASE = 'https://terrarp.com/api';
const XENFORO_API_KEY = 'nY3YHH7VMoIIVj8WgvmFfBG2tLeWyzUj';

async function xfFetch(path) {
  const response = await fetch(`${XENFORO_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'XF-Api-Key': XENFORO_API_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`XenForo API ${path} failed: ${response.status}`);
  }
  return response.json();
}

async function getThreadInfo(threadId) {
  return xfFetch(`/threads/${threadId}`);
}

async function getThreadTitle(threadId) {
  const data = await getThreadInfo(threadId);
  return data?.thread?.title ?? null;
}

// Strip cycle/page suffix and any non-leading-digits so we send a clean
// numeric thread ID to the API. e.g. "510C5" -> "510", "51005c2" -> "51005".
function extractThreadId(rawCode) {
  if (rawCode == null) return null;
  const match = String(rawCode).trim().match(/^\d+/);
  return match ? match[0] : null;
}

// TerraSphere character-manager add-on endpoint: returns the character
// profile (masteries, expertises, equipment, banner, etc.) for a given ID.
async function getCharacterProfile(charId) {
  return xfFetch(`/terrasphere-charactermanager/?id=${encodeURIComponent(charId)}`);
}

window.XenForoAPI = {
  getThreadInfo,
  getThreadTitle,
  extractThreadId,
  getCharacterProfile,
};
