import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("."));

// Search endpoint
app.get("/api/search", async (req, res) => {
  const q = req.query.q || "";
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=30&q=${encodeURIComponent(q)}&key=AIzaSyAMmMh2xRotnCthmKrZut9QjVd47qQ_7_o`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json({ error: "API error" });
    }
    const d = await r.json();
    if (d.error) {
      return res.status(400).json({ error: d.error.message });
    }
    const results = d.items ? d.items.map(i => ({
      id: i.id.videoId,
      title: i.snippet.title,
      artist: i.snippet.channelTitle,
      thumb: i.snippet.thumbnails.high?.url || i.snippet.thumbnails.medium.url
    })) : [];
    res.json(results);
  } catch (e) {
    console.error("Search error:", e);
    res.status(500).json([]);
  }
});

// Related endpoint with fallback
app.get("/api/related", async (req, res) => {
  const id = req.query.videoId;
  if (!id) return res.json([]);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${id}&type=video&videoCategoryId=10&maxResults=20&key=AIzaSyAMmMh2xRotnCthmKrZut9QjVd47qQ_7_o`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json([]);
    }
    const d = await r.json();
    if (d.error) {
      return res.status(400).json([]);
    }
    const results = d.items ? d.items.map(i => ({
      id: i.id.videoId,
      title: i.snippet.title,
      artist: i.snippet.channelTitle,
      thumb: i.snippet.thumbnails.high?.url || i.snippet.thumbnails.medium.url
    })) : [];
    res.json(results);
  } catch (e) {
    console.error("Related error:", e);
    res.json([]);
  }
});

app.get("*", (req, res) => res.sendFile(path.resolve("index.html")));

app.listen(PORT, () => console.log(`OGmusic running → http://localhost:${PORT}`));
