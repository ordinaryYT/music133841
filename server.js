import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (front-end)
app.use(express.static(path.dirname(new URL(import.meta.url).pathname)));

//
// SEARCH VIA PIPED (Unlimited, No API Key)
//
app.get("/api/search", async (req, res) => {
  const q = req.query.q;

  const url = `https://piped.video/api/search?q=${encodeURIComponent(q)}&filter=videos`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const results = data.items.map(item => ({
      id: item.url.split("v=")[1],
      title: item.title,
      artist: item.uploaderName,
      thumb: item.thumbnail
    }));

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search provider failed" });
  }
});

//
// SIMILAR SONGS (Used for next / auto-next)
//
app.get("/api/similar", async (req, res) => {
  const id = req.query.id;

  const url = `https://piped.video/api/suggestions/${id}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const results = data.items.map(item => ({
      id: item.url.split("v=")[1],
      title: item.title,
      artist: item.uploaderName,
      thumb: item.thumbnail
    }));

    res.json(results);
  } catch (err) {
    console.error("Similar error:", err);
    res.status(500).json({ error: "Similar provider failed" });
  }
});

// Catch-all to load front-end
app.get("*", (req, res) => {
  res.sendFile(path.resolve(path.dirname(new URL(import.meta.url).pathname), "index.html"));
});

app.listen(PORT, () => {
  console.log(`OGmusic running → http://localhost:${PORT}`);
});
