import express from "express";
import path from "path";
import { YouTube } from "youtube-sr";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.dirname(new URL(import.meta.url).pathname)));

//
// 🔍 SEARCH SONGS (NO API KEY)
//
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;

    const results = await YouTube.search(q, {
      type: "video",
      limit: 25,
      safeSearch: false
    });

    const clean = results
      .filter(v => !v.live)         // block livestreams
      .filter(v => v.duration >= 60) // block shorts
      .map(v => ({
        id: v.id,
        title: v.title,
        artist: v.channel?.name || "Unknown",
        thumb: v.thumbnail?.url
      }));

    res.json(clean);
  } catch (err) {
    console.error("Search error:", err);
    res.json([]);
  }
});

//
// 🎵 RELATED SONGS (NO API KEY)
//
app.get("/api/related", async (req, res) => {
  try {
    const id = req.query.id;

    const video = await YouTube.getVideo(id);
    const related = video.related;

    const clean = related
      .filter(v => !v.live)
      .filter(v => v.duration >= 60)
      .slice(0, 25)
      .map(v => ({
        id: v.id,
        title: v.title,
        artist: v.channel?.name || "YouTube",
        thumb: v.thumbnail?.url
      }));

    res.json(clean);
  } catch (err) {
    console.error("Related error:", err);
    res.json([]);
  }
});

// Serve index.html last
app.get("*", (req, res) => {
  res.sendFile(path.resolve(path.dirname(new URL(import.meta.url).pathname), "index.html"));
});

app.listen(PORT, () => {
  console.log(`OGmusic running → http://localhost:${PORT}`);
});
