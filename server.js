import express from "express";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Cache setup (for Deezer + YouTube bridge)
const CACHE_FILE = './cache.json';
let cache = {};

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

// Serve static files
app.use(express.static(path.dirname(new URL(import.meta.url).pathname)));

// Deezer Search (free, no quota – metadata only)
app.get("/api/deezer-search", async (req, res) => {
  const q = req.query.q;
  const cacheKey = `deezer_${q.toLowerCase()}`;
  
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return res.json(cache[cacheKey].results);
  }

  const url = `https://api.deezer.com/search/track?q=${encodeURIComponent(q)}&limit=20`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const results = data.data.map(track => ({
      deezerId: track.id,
      title: track.title_short || track.title,
      artist: track.artist.name,
      album: track.album.title,
      thumb: track.album.cover_medium,
      preview: track.preview, // unused, but here if needed
      popularity: track.rank // for sorting
    }));

    cache[cacheKey] = { results, timestamp: Date.now() };
    saveCache();
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Deezer search error" });
  }
});

// YouTube Bridge: Get video ID for a Deezer track (cached)
app.get("/api/youtube-bridge", async (req, res) => {
  const title = req.query.title;
  const artist = req.query.artist;
  const query = `${title} ${artist} official music video`;
  const cacheKey = `yt_${title}_${artist}`.toLowerCase();
  
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return res.json(cache[cacheKey].videoId);
  }

  // Your existing YouTube key (replace if needed)
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

// Existing YouTube search (fallback or for recommendations)
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}+music+official&type=video&videoCategoryId=10&maxResults=10&key=AIzaSyAMmMh2xRotnCthmKrZut9QjVd47qQ_7_o`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const results = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumb: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "YouTube API error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve(path.dirname(new URL(import.meta.url).pathname), "index.html"));
});

app.listen(PORT, () => {
  console.log(`OGmusic running → http://localhost:${PORT}`);
});
