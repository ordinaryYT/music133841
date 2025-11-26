const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// Home + static files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Search
app.get('/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const { videos } = await yts(q);
    res.json(videos.slice(0, 30).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name,
      thumbnail: v.thumbnails[0]?.url || v.thumbnail,
      duration: v.duration.timestamp || v.seconds
    })));
  } catch (e) {
    res.json([]);
  }
});

// Trending for home page
app.get('/trending', async (req, res) => {
  const queries = ['blinding lights', 'shape of you', 'bohemian rhapsody', 'hotline bling', 'someone you loved', 'perfect ed sheeran'];
  const results = [];
  for (const q of queries) {
    const { videos } = await yts(q + ' official');
    if (videos[0]) results.push(videos[0]);
  }
  res.json(results.map(v => ({
    id: v.videoId,
    title: v.title,
    artist: v.author.name,
    thumbnail: v.thumbnail
  })));
});

// Stream URL
app.get('/stream/:id', async (req, res) => {
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=' + req.params.id);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    res.json({ url: format.url });
  } catch (e) {
    res.status(500).json({ error: 'Not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OGmusic live on port ${PORT}`));
