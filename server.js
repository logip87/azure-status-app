const express = require("express");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

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

app.get("/", (req, res) => {
  res.send(`System Status: Online<br/>Server time: ${new Date().toISOString()}`);
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded. Use form-data field: file" });

    const container = getContainerClient();
    await container.createIfNotExists();

    const blobName = `${Date.now()}-${req.file.originalname}`;
    const blob = container.getBlockBlobClient(blobName);

    await blob.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });

    res.json({ ok: true, blobName });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/files", async (req, res) => {
  try {
    const container = getContainerClient();
    const files = [];
    for await (const b of container.listBlobsFlat()) files.push(b.name);
    res.json({ files });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/file/:name", async (req, res) => {
  try {
    const container = getContainerClient();
    const blob = container.getBlockBlobClient(req.params.name);

    const download = await blob.download();
    const contentType = download.contentType || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    download.readableStreamBody.pipe(res);
  } catch (e) {
    res.status(404).json({ error: "File not found" });
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));
