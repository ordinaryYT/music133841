import express from "express";
import ytdl from "ytdl-core";
import yts from "yt-search";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(__dirname));

// Search — unlimited via yt-search
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  try {
    const { videos } = await yts(q + " official music video");
    const results = videos.slice(0, 30).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name,
      thumb: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
    }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Get direct audio stream URL (no ads, instant play)
app.get("/stream/:id", async (req, res) => {
  try {
    const info = await ytdl.getInfo("https://youtube.com/watch?v=" + req.params.id);
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly"
    });
    res.json({ url: format.url });
  } catch (err) {
    res.status(500).json({ error: "Stream not available" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OGmusic UNLIMITED → https://localhost:${PORT}`);
});
