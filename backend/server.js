import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json()); // JSON body parser
app.use(express.static(path.join(process.cwd(), "public")));

// Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/download", limiter);

// Helper: create temp filename in public/videos
function tmpFileName() {
  const id = crypto.randomBytes(12).toString("hex");
  const dir = path.join(process.cwd(), "public", "videos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `reel_${id}.mp4`);
}

// Validate Instagram URL
function isInstagramUrl(u) {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.hostname.includes("instagram.com");
  } catch (e) {
    return false;
  }
}

// POST download endpoint
app.post("/download", async (req, res) => {
  const { url } = req.body;
  if (!isInstagramUrl(url)) {
    return res.status(400).json({ success: false, message: "Invalid Instagram reel URL." });
  }

  const outPath = tmpFileName();
  const args = [
    "-f", "bestvideo+bestaudio/best",
    "--merge-output-format", "mp4",
    "-o", outPath,
    url
  ];

  const ytdlp = spawn("yt-dlp", args);

  let stderr = "";
  ytdlp.stderr.on("data", (d) => { stderr += d.toString(); });

  // Timeout for hanging processes
  const TIMEOUT = 2 * 60 * 1000; // 2 min
  const timer = setTimeout(() => { try { ytdlp.kill("SIGKILL"); } catch(e){} }, TIMEOUT);

  ytdlp.on("close", (code) => {
    clearTimeout(timer);
    if (code !== 0) {
      console.error("yt-dlp error:", stderr);
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch(e){}
      return res.status(500).json({ success: false, message: "Download failed, try again." });
    }

    // Return public URL for frontend
    const fileName = path.basename(outPath);
    const downloadUrl = `/videos/${fileName}`;
    return res.json({ success: true, downloadUrl });
  });

  ytdlp.on("error", (err) => {
    clearTimeout(timer);
    console.error("yt-dlp spawn error:", err);
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch(e){}
    return res.status(500).json({ success: false, message: "Internal downloader error." });
  });
});

// Health check
app.get("/health", (req,res) => res.json({ ok:true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
