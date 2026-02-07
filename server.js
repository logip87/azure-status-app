const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload.html"));
});

app.get("/status", (req, res) => {
  res.json({ status: "Online", serverTime: new Date().toISOString() });
});

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
  if (!conn) throw new Error("Missing storage connection string env var");

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

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(String(a || ""), "utf8");
  const bBuf = Buffer.from(String(b || ""), "utf8");
  const max = Math.max(aBuf.length, bBuf.length);
  const aPadded = Buffer.concat([aBuf, Buffer.alloc(max - aBuf.length)]);
  const bPadded = Buffer.concat([bBuf, Buffer.alloc(max - bBuf.length)]);
  const equal = crypto.timingSafeEqual(aPadded, bPadded);
  return equal && aBuf.length === bBuf.length;
}

function passwordConfigured() {
  return !!(process.env.UPLOAD_PASSWORD && process.env.UPLOAD_PASSWORD.trim());
}

function passwordOk(pwFromUser) {
  const expected = process.env.UPLOAD_PASSWORD;
  if (!passwordConfigured()) return false;
  return timingSafeEqualStr(pwFromUser, expected);
}

function getPasswordFromRequest(req) {
  // UI wysyła pw w body
  return (req.body && req.body.pw) || "";
}

app.post("/auth/check", (req, res) => {
  if (!passwordConfigured())
    return res.status(500).json({ ok: false, error: "UPLOAD_PASSWORD not configured" });
  const ok = passwordOk(getPasswordFromRequest(req));
  if (!ok) return res.status(401).json({ ok: false });
  return res.json({ ok: true });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!passwordConfigured()) return res.status(500).send("UPLOAD_PASSWORD is not configured");
    if (!passwordOk(getPasswordFromRequest(req))) return res.status(401).send("Bad password");

    if (!req.file) return res.status(400).send("No file uploaded. Use form field: file");

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
    const name = req.params.name;
    if (!isSafeBlobName(name)) return res.status(400).json({ error: "Invalid file name" });

    const container = getContainerClient();
    const blob = container.getBlockBlobClient(name);

    const exists = await blob.exists();
    if (!exists) return res.status(404).json({ error: "File not found" });

    const props = await blob.getProperties();
    const contentType = props.contentType || "application/octet-stream";

    const download = await blob.download();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", `inline; filename="${name}"`);

    if (!download.readableStreamBody)
      return res.status(500).json({ error: "No stream returned from blob" });
    download.readableStreamBody.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// USUWANIE PLIKU z hasłem
app.delete("/file/:name", async (req, res) => {
  try {
    if (!passwordConfigured())
      return res.status(500).json({ error: "UPLOAD_PASSWORD is not configured" });
    if (!passwordOk(getPasswordFromRequest(req)))
      return res.status(401).json({ error: "Bad password" });

    const name = req.params.name;
    if (!isSafeBlobName(name)) return res.status(400).json({ error: "Invalid file name" });

    const container = getContainerClient();
    const blob = container.getBlockBlobClient(name);

    const deleted = await blob.deleteIfExists();
    if (!deleted) return res.status(404).json({ error: "File not found" });

    res.json({ ok: true, deleted: name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));
