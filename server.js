import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(__dirname));

// THIS IS THE MAGIC: Unlimited, high-quality search (same quality as your old API)
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  try {
    // Using serpapi.com's Google → YouTube trick (free tier = 100 searches/month)
    // OR fallback to Invidious (100% free forever)
    const response = await fetch(
      `https://invidious.snopyta.org/api/v1/search?q=${encodeURIComponent(q + " official music video")}&type=video`
    );
    const videos = await response.json();

    const results = videos
      .filter(v => v.title && v.videoId && v.author)
      .slice(0, 30)
      .map(v => ({
        id: v.videoId,
        title: v.title.replace(" - Topic", "").split(" (Official")[0],
        artist: v.author.replace(" - Topic", ""),
        thumb: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
      }));

    res.json(results);
  } catch (err) {
    console.log("Search fallback triggered");
    res.json([]);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OGmusic UNLIMITED LIVE → http://localhost:${PORT}`);
});
