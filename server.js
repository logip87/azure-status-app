const path = require("path");
const express = require("express");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

// Serwuj statyczne pliki z /public
app.use(express.static(path.join(__dirname, "public")));

// Strona główna
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload.html"));
});

// Status (żeby UI i testy miały "Online" + czas)
app.get("/status", (req, res) => {
  res.json({
    status: "Online",
    serverTime: new Date().toISOString(),
  });
});

function getConnString() {
  return (
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    process.env.CUSTOMCONNSTR_AZURE_STORAGE_CONNECTION_STRING
  );
}

function getContainerClient() {
  const conn = getConnString();
  const containerName = process.env.AZURE_STORAGE_CONTAINER || "uploads";

  if (!conn) {
    throw new Error("Missing storage connection string env var");
  }

  const service = BlobServiceClient.fromConnectionString(conn);
  return service.getContainerClient(containerName);
}

function isSafeBlobName(name) {
  if (!name) return false;
  if (name.includes("..")) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  if (name.length > 300) return false;
  return true;
}

// Upload pliku
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded. Use form field: file");
    }

    const container = getContainerClient();
    await container.createIfNotExists();

    const original = path.basename(req.file.originalname || "file");
    const blobName = `${Date.now()}-${original}`;
    const blob = container.getBlockBlobClient(blobName);

    await blob.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    res.redirect("/");
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Lista plików
app.get("/files", async (req, res) => {
  try {
    const container = getContainerClient();
    const files = [];

    for await (const b of container.listBlobsFlat()) {
      files.push(b.name);
    }

    res.json({ files });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Pobranie/wyświetlenie pliku
app.get("/file/:name", async (req, res) => {
  try {
    const name = req.params.name;

    if (!isSafeBlobName(name)) {
      return res.status(400).json({ error: "Invalid file name" });
    }

    const container = getContainerClient();
    const blob = container.getBlockBlobClient(name);

    const exists = await blob.exists();
    if (!exists) return res.status(404).json({ error: "File not found" });

    const props = await blob.getProperties();
    const contentType = props.contentType || "application/octet-stream";

    const download = await blob.download();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    // dla obrazów wyświetl inline, dla reszty też może być inline
    res.setHeader("Content-Disposition", `inline; filename="${name}"`);

    if (!download.readableStreamBody) {
      return res.status(500).json({ error: "No stream returned from blob" });
    }

    download.readableStreamBody.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));
