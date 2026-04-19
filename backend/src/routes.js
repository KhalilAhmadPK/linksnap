const express = require('express');
const router  = express.Router();
const { pool }                        = require('./db');
const { generateShortCode, isValidUrl } = require('./utils');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

// POST /api/shorten
router.post('/shorten', async (req, res) => {
  const { url, custom_code } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Valid http/https URL required' });
  }

  if (custom_code && !/^[a-zA-Z0-9_-]{3,20}$/.test(custom_code)) {
    return res.status(400).json({ error: 'Custom code: 3-20 alphanumeric chars only' });
  }

  const shortCode = custom_code || generateShortCode();

  try {
    const result = await pool.query(
      `INSERT INTO urls (short_code, original_url)
       VALUES ($1, $2)
       ON CONFLICT (short_code) DO NOTHING
       RETURNING *`,
      [shortCode, url]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Short code already taken, try another' });
    }

    const row = result.rows[0];
    res.status(201).json({
      id:           row.id,
      short_code:   row.short_code,
      short_url:    `${BASE_URL}/${row.short_code}`,
      original_url: row.original_url,
      click_count:  row.click_count,
      created_at:   row.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/urls
router.get('/urls', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, short_code, original_url, click_count, created_at
       FROM urls ORDER BY created_at DESC LIMIT 20`
    );
    const urls = result.rows.map(row => ({
      ...row,
      short_url: `${BASE_URL}/${row.short_code}`
    }));
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/urls/:code
router.delete('/urls/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM urls WHERE short_code = $1 RETURNING short_code',
      [req.params.code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/health
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', postgres: '', uptime: `${Math.floor(process.uptime())}s` });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

module.exports = router;