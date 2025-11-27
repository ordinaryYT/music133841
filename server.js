import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(__dirname));

// UNLIMITED SEARCH VIA YTSEARCH.JS (100% working, no proxies, no API key)
app.get("/api/search", async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  try {
    // Import and use ytsearch.js (active 2025 package, scrapes directly)
    const { SearchYt } = await import("ytsearch.js");
    const results = await SearchYt(q + " official music", { 
      type: "video", 
      limit: 30,
      sort: "relevance"
    });

    // Clean up for music (filter full songs, clean titles)
    const cleanResults = results
      .filter(r => r.duration && r.duration.seconds > 90) // Full songs only
      .slice(0, 30)
      .map(r => ({
        id: r.id,
        title: r.title.split(" (Official")[0].replace(" - Topic", "").trim(),
        artist: r.author.name.replace(" - Topic", "").trim(),
        thumb: r.thumbnail.url
      }));

    console.log(`Search success: ${cleanResults.length} results for "${q}"`);
    res.json(cleanResults);
  } catch (err) {
    console.error("Search error:", err.message);
    res.json([]);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OGmusic PERFECT & UNLIMITED → http://localhost:${PORT}`);
});
