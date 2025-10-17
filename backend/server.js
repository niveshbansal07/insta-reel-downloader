import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.static(path.join(process.cwd(), "public")));

// Simple rate limiter — adjust as needed
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/download", limiter);

// Helper: create temp filename
function tmpFileName(ext = ".mp4") {
  const id = crypto.randomBytes(12).toString("hex");
  return path.join(os.tmpdir(), `reel_${id}${ext}`);
}

// Basic validate instagram url
function isInstagramUrl(u) {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.hostname.includes("instagram.com") || url.hostname.includes("www.instagram.com");
  } catch (e) {
    return false;
  }
}

// Download endpoint
app.get("/download", async (req, res) => {
  const url = req.query.url;
  if (!isInstagramUrl(url)) {
    return res.status(400).json({ error: "Please provide a valid instagram.com reel/video URL." });
  }

  // prepare temp file
  const outPath = tmpFileName(".mp4");

  // command: yt-dlp -f "bestvideo+bestaudio/best" --merge-output-format mp4 -o "<outPath>" <url>
  const args = [
    "-f", "bestvideo+bestaudio/best",
    "--merge-output-format", "mp4",
    "-o", outPath,
    url
  ];

  // spawn yt-dlp (installed in container)
  const ytdlp = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });

  // Set a timeout to prevent forever-hanging jobs (e.g., 2 minutes)
  const KILL_TIMEOUT_MS = 2 * 60 * 1000;
  const killTimer = setTimeout(() => {
    try { ytdlp.kill("SIGKILL"); } catch (e) {}
  }, KILL_TIMEOUT_MS);

  let stderr = "";
  ytdlp.stderr.on("data", (d) => { stderr += d.toString(); });
  ytdlp.stdout.on("data", (d) => { /* optional: collect for logs */ });

  ytdlp.on("close", (code) => {
    clearTimeout(killTimer);
    if (code !== 0) {
      console.error("yt-dlp failed:", stderr);
      // cleanup if partial file
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (e) {}
      return res.status(500).json({ error: "Failed to download video. Try again or update yt-dlp." });
    }

    // stream file to client and then delete
    res.download(outPath, path.basename(outPath), (err) => {
      // always try to delete file after sending (or on error)
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (e) {}
      if (err) {
        console.error("Send file error:", err);
      }
    });
  });

  ytdlp.on("error", (err) => {
    clearTimeout(killTimer);
    console.error("yt-dlp spawn error:", err);
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (e) {}
    return res.status(500).json({ error: "Internal error executing downloader." });
  });
});

// health check
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
