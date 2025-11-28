import express from "express";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Spotify Config (REPLACE WITH YOUR CREDENTIALS from developer.spotify.com)
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const SPOTIFY_CLIENT_SECRET = 'YOUR_SPOTIFY_CLIENT_SECRET';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Cache setup
const CACHE_FILE = './cache.json';
let cache = {};
let spotifyToken = null;
let tokenExpiry = 0;

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (e) {}
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

loadCache();

// Get/Refresh Spotify Token (cached for 1h)
async function getSpotifyToken() {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;

  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await axios.post(SPOTIFY_TOKEN_URL, 'grant_type=client_credentials', {
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  spotifyToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000; // Refresh 1min early
  return spotifyToken;
}

// Serve static files
app.use(express.static(path.dirname(new URL(import.meta.url).pathname)));

// Spotify Search (rich metadata)
app.get("/api/spotify-search", async (req, res) => {
  const q = req.query.q;
  const cacheKey = `spotify_search_${q.toLowerCase()}`;
  
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return res.json(cache[cacheKey].results);
  }

  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=20`;
  
  try {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    const results = data.tracks.items.map(track => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      thumb: track.album.images[0]?.url || '',
      popularity: track.popularity,
      genres: track.artists[0].genres || [] // For smart recs
    }));

    cache[cacheKey] = { results, timestamp: Date.now() };
    saveCache();
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Spotify search error" });
  }
});

// Spotify Recommendations (for Next button)
app.get("/api/spotify-recommend", async (req, res) => {
  const trackId = req.query.trackId; // Seed from current track
  const cacheKey = `spotify_rec_${trackId}`;
  
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 1 * 60 * 60 * 1000) { // 1h cache
    return res.json(cache[cacheKey].results);
  }

  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}&limit=20`;
  
  try {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    const results = data.tracks.map(track => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      thumb: track.album.images[0]?.url || '',
      popularity: track.popularity,
      genres: track.artists[0].genres || []
    }));

    cache[cacheKey] = { results, timestamp: Date.now() };
    saveCache();
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Spotify recommend error" });
  }
});

// YouTube Bridge (for playback)
app.get("/api/youtube-bridge", async (req, res) => {
  const title = req.query.title;
  const artist = req.query.artist;
  const query = `${title} ${artist} official music video`;
  const cacheKey = `yt_${title}_${artist}`.toLowerCase();
  
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return res.json(cache[cacheKey].videoId);
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=1&key=AIzaSyAMmMh2xRotnCthmKrZut9QjVd47qQ_7_o`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const videoId = data.items[0]?.id?.videoId || null;

    cache[cacheKey] = { videoId, timestamp: Date.now() };
    saveCache();
    
    res.json({ videoId });
  } catch (err) {
    res.status(500).json({ error: "YouTube bridge error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve(path.dirname(new URL(import.meta.url).pathname), "index.html"));
});

app.listen(PORT, () => {
  console.log(`OGmusic running → http://localhost:${PORT}`);
});
