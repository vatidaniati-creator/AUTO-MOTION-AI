
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");

const app = express();
const PORT = process.env.PORT || 3000;
const sleep = promisify(setTimeout);

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
    version: "V3",
    ai: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Video belum dipilih"
    });
  }

  res.json({
    success: true,
    message: "Video berhasil diunggah",
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

// ANALISIS VIDEO DENGAN GEMINI
app.post("/api/analyze", upload.single("video"), async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY belum dipasang di Railway"
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: "Silakan pilih video terlebih dahulu"
    });
  }

  try {
    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        error: "File harus berupa video"
      });
    }

    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: "v1beta"
});
    let videoFile = await ai.files.upload({
      file: req.file.path,
      config: {
        mimeType: req.file.mimetype
      }
    });

    let attempts = 0;

    while (
      String(videoFile.state).toUpperCase() === "PROCESSING" &&
      attempts < 120
    ) {
      await sleep(5000);

      videoFile = await ai.files.get({
        name: videoFile.name
      });

      attempts++;
    }

    if (String(videoFile.state).toUpperCase() !== "ACTIVE") {
      throw new Error("Pemrosesan video oleh Gemini gagal atau terlalu lama.");
    }

    const result = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          type: "video",
          uri: videoFile.uri,
          mime_type: videoFile.mimeType
        },
        {
          type: "text",
          text: `
Analisis video ini untuk aplikasi AUTO MOTION AI.

Buat hasil dalam bahasa Indonesia dengan format:

1. JUDUL VIDEO
2. JENIS KONTEN
3. DESKRIPSI ADEGAN
4. URUTAN ADEGAN BERDASARKAN WAKTU
5. SARAN NARASI
6. SARAN TEKS SUBTITLE
7. SARAN MUSIK DAN EFEK
8. SARAN B-ROLL YANG SESUAI

Buat hasil yang menarik, jelas, dan cocok untuk video pendek.
Jangan mengarang kejadian yang tidak terlihat dalam video.
`
        }
      ]
    });

    res.json({
      success: true,
      message: "Analisis video berhasil",
      analysis: result.output_text
    });

  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Gagal menganalisis video. Periksa konfigurasi Gemini dan coba lagi."
    });

  } finally {
    if (req.file && req.file.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
});

app.post("/api/voice", async (req, res) => {
  res.status(501).json({
    error: "AI Voice belum dikonfigurasi"
  });
});

app.post("/api/broll", async (req, res) => {
  res.status(501).json({
    error: "AI B-roll belum dikonfigurasi"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("AUTO MOTION AI berjalan pada port " + PORT);
});
