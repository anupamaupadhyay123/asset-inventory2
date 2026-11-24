const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const router = express.Router();

// Find the database file inside the database folder
const dbDir = path.join(__dirname, '..', 'database');
const dbFiles = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));
const dbName = dbFiles.includes('asset.db') ? 'asset.db' : dbFiles[0];
const db = new sqlite3.Database(path.join(dbDir, dbName));

db.run(`CREATE TABLE IF NOT EXISTS asset_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const uploadDir = path.join(__dirname, '..', 'uploads', 'signed-forms');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeId = String(req.params.assetId).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, safeId + '_' + Date.now() + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.jpg', '.jpeg', '.png'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only PDF, JPG or PNG allowed'), ok);
  }
});

// Serve uploaded files
router.use('/files', express.static(uploadDir));

// Upload signed form for an asset
router.post('/:assetId', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file selected' });
    db.run(
      'INSERT INTO asset_attachments (asset_id, file_name, original_name) VALUES (?, ?, ?)',
      [req.params.assetId, req.file.filename, req.file.originalname],
      function (e) {
        if (e) return res.status(500).json({ success: false, error: e.message });
        res.json({ success: true, id: this.lastID, file_name: req.file.filename });
      }
    );
  });
});

// List attachments of an asset
router.get('/:assetId', (req, res) => {
  db.all(
    'SELECT * FROM asset_attachments WHERE asset_id = ? ORDER BY id DESC',
    [req.params.assetId],
    (e, rows) => {
      if (e) return res.status(500).json({ success: false, error: e.message });
      res.json({ success: true, attachments: rows });
    }
  );
});

module.exports = router;
