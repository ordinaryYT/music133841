import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(__dirname));

// 8 bulletproof public instances (if one dies, next one works instantly)
const PROXIES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyawesomemoments.com",
  "https://api.piped.privacydev.net",
  "https://pipedapi-libre.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.mint.lgbt",
  "https://watchapi.leptons.xyz"
];

app.get("/api/search", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  for (const base of PROXIES) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(q + " official music video")}&filter=videos`;
      const response = await fetch(url, { 
        headers: { "User-Agent": "OGmusic/1.0" },
        signal: AbortSignal.timeout(8000) // 8 sec timeout
      });

      if (!response.ok) continue;

      const data = await response.json();

      const results = data
        .filter(v => v.duration && v.duration > 90 && v.uploaderName)
        .slice(0, 30)
        .map(v => ({
          id: v.url.split("v=")[1],
          title: v.title.split(" (Official")[0].replace(" - Topic", "").trim(),
          artist: v.uploaderName.replace(" - Topic", "").trim(),
          thumb: v.thumbnail
        }));

      if (results.length > 0) {
        console.log(`Search success via ${base}`);
        return res.json(results);
      }
    } catch (err) {
      console.log(`Proxy failed: ${base}`);
      continue; // try next proxy
    }
  }

  // Final fallback: use yt-search (super reliable)
  try {
    const { default: ytSearch } = await import("yt-search");
    const { videos } = await ytSearch(q + " official");
    const results = videos.slice(0, 20).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name,
      thumb: v.thumbnail
    }));
    console.log("Fallback to yt-search worked");
    res.json(results);
  } catch (e) {
    res.json([]);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OGmusic 100% UNBREAKABLE → http://localhost:${PORT}`);
});
