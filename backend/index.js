const express    = require('express');
const cors       = require('cors');
const { initDB, pool } = require('./src/db');
const apiRoutes  = require('./src/routes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// Redirect route
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      'SELECT original_url FROM urls WHERE short_code = $1',
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    await pool.query(
      'UPDATE urls SET click_count = click_count + 1 WHERE short_code = $1',
      [code]
    );
    res.redirect(302, result.rows[0].original_url);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function start() {
  await initDB();
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

start();