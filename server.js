const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// Serve index
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Search endpoint - super fast
app.get('/search', async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  try {
    const { videos } = await yts(q);
    const results = videos.slice(0, 30).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author?.name || 'Unknown',
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.duration?.timestamp || v.seconds
    }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Trending for home page
app.get('/trending', async (req, res) => {
  const queries = [
    'blinding lights the weeknd',
    'shape of you ed sheeran',
    'bohemian rhapsody queen',
    'hotline bling drake',
    'someone you loved lewis capaldi',
    'perfect ed sheeran'
  ];
  const results = [];
  for (const q of queries) {
    try {
      const { videos } = await yts(q);
      if (videos[0]) results.push(videos[0]);
    } catch {}
  }
  res.json(results.map(v => ({
    id: v.videoId,
    title: v.title.split('(')[0].split('|')[0].trim(),
    artist: v.author?.name || 'Artist',
    thumbnail: v.thumbnail
  })));
});

// Stream - returns direct audio URL (instant play)
app.get('/stream/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=' + id);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    if (format?.url) {
      res.json({ url: format.url });
    } else {
      res.status(500).json({ error: 'No audio format' });
    }
  } catch (err) {
    console.error('Stream error:', err.message);
    res.status(500).json({ error: 'Failed to get stream' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OGmusic LIVE at http://localhost:${PORT}`);
});
