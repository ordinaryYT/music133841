import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.dirname(new URL(import.meta.url).pathname)));

//
// SEARCH WITHOUT API KEY — scrape YouTube page results
//
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " music")}`;

  try {
    const html = await fetch(url).then(r => r.text());

    // Extract video entries
    const matches = [...html.matchAll(/"videoId":"(.*?)".*?"title":{"runs":\[\{"text":"(.*?)"/gs)]
      .map(m => ({
        id: m[1],
        title: m[2],
        artist: "Unknown",
        thumb: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`
      }));

    res.json(matches.slice(0, 25)); // return up to 25 matches
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

//
// NO need for similar endpoint — handled CLIENT-SIDE by YouTube
//

app.get("*", (req, res) => {
  res.sendFile(path.resolve(path.dirname(new URL(import.meta.url).pathname), "index.html"));
});

app.listen(PORT, () => {
  console.log(`OGmusic running → http://localhost:${PORT}`);
});
