const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// SEARCH — now 100% working
app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  try {
    const { videos } = await yts(q);
    const results = videos.slice(0, 20).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name || "Unknown Artist",
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`
    }));
    res.json(results);
  } catch (e) {
    console.log("Search error:", e.message);
    res.json([]);
  }
});

// STREAM — direct audio URL
app.get('/stream/:id', async (req, res) => {
  try {
    const info = await ytdl.getInfo('https://youtube.com/watch?v=' + req.params.id);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    res.json({ url: format.url });
  } catch (e) {
    res.status(500).json({ error: "Stream failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OGmusic running on port ${PORT}`));
