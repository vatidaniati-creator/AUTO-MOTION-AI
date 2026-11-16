
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    app: "AUTO MOTION AI",
    version: "V3"
  });
});

app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Video belum dipilih" });
  }

  res.json({
    success: true,
    message: "Video berhasil diunggah",
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

app.post("/api/voice", async (req, res) => {
  res.status(501).json({
    error: "AI Voice belum dikonfigurasi",
    message: "Integrasi penyedia AI Voice akan ditambahkan berikutnya"
  });
});

app.post("/api/broll", async (req, res) => {
  res.status(501).json({
    error: "AI B-roll belum dikonfigurasi",
    message: "Integrasi AI B-roll akan ditambahkan berikutnya"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("AUTO MOTION AI berjalan pada port " + PORT);
});
