const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Erhöht für große Bild/Video-Dateien
app.use(express.static(__dirname)); // Serviert statische Dateien (HTML, CSS, JS)

// Datenbank initialisieren
const dbPath = path.join(__dirname, 'orgaversum.db');
const db = new Database(dbPath);

// Tabellen erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS universe_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Index für schnelleren Zugriff
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_updated_at ON universe_state(updated_at DESC)
`);

console.log(`✓ Datenbank initialisiert: ${dbPath}`);

// API Endpunkte

/**
 * GET /api/state - Lädt den aktuellen Zustand
 */
app.get('/api/state', (req, res) => {
  try {
    const stmt = db.prepare('SELECT state_data, updated_at FROM universe_state ORDER BY id DESC LIMIT 1');
    const row = stmt.get();

    if (row) {
      const state = JSON.parse(row.state_data);
      res.json({
        success: true,
        data: state,
        updated_at: row.updated_at
      });
    } else {
      // Kein gespeicherter Zustand vorhanden
      res.json({
        success: true,
        data: null,
        message: 'Kein gespeicherter Zustand vorhanden'
      });
    }
  } catch (error) {
    console.error('Fehler beim Laden:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Zustands'
    });
  }
});

/**
 * POST /api/state - Speichert den aktuellen Zustand
 */
app.post('/api/state', (req, res) => {
  try {
    const { suns, planets, moons, connections, nextId } = req.body;

    // Validierung
    if (!Array.isArray(suns) || !Array.isArray(planets) || !Array.isArray(moons) || !Array.isArray(connections)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Datenstruktur'
      });
    }

    const stateData = JSON.stringify({
      suns,
      planets,
      moons,
      connections,
      nextId: nextId || 1
    });

    // Speichern in Datenbank
    const stmt = db.prepare(`
      INSERT INTO universe_state (state_data, updated_at)
      VALUES (?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(stateData);

    // Alte Einträge bereinigen (nur die letzten 10 behalten)
    db.prepare('DELETE FROM universe_state WHERE id NOT IN (SELECT id FROM universe_state ORDER BY id DESC LIMIT 10)').run();

    res.json({
      success: true,
      message: 'Zustand erfolgreich gespeichert',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern des Zustands'
    });
  }
});

/**
 * GET /api/history - Zeigt die letzten gespeicherten Zustände
 */
app.get('/api/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const stmt = db.prepare(`
      SELECT id, updated_at,
             length(state_data) as size_bytes
      FROM universe_state
      ORDER BY id DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der History:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der History'
    });
  }
});

/**
 * GET /api/state/:id - Lädt einen bestimmten Zustand aus der History
 */
app.get('/api/state/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stmt = db.prepare('SELECT state_data, updated_at FROM universe_state WHERE id = ?');
    const row = stmt.get(id);

    if (row) {
      const state = JSON.parse(row.state_data);
      res.json({
        success: true,
        data: state,
        updated_at: row.updated_at
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Zustand nicht gefunden'
      });
    }
  } catch (error) {
    console.error('Fehler beim Laden:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Zustands'
    });
  }
});

/**
 * DELETE /api/state - Löscht alle gespeicherten Zustände
 */
app.delete('/api/state', (req, res) => {
  try {
    db.prepare('DELETE FROM universe_state').run();
    res.json({
      success: true,
      message: 'Alle Zustände gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen'
    });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   ORGAVERSUM SERVER                        ║
╠════════════════════════════════════════════════════════════╣
║  Server läuft auf: http://localhost:${PORT}                 ║
║  Datenbank: ${dbPath.substring(dbPath.lastIndexOf('/') + 1).padEnd(43)} ║
║                                                            ║
║  API Endpunkte:                                            ║
║  - GET    /api/state      - Aktuellen Zustand laden       ║
║  - POST   /api/state      - Zustand speichern             ║
║  - GET    /api/history    - Speicher-Historie anzeigen    ║
║  - GET    /api/state/:id  - Bestimmten Zustand laden      ║
║  - DELETE /api/state      - Alle Zustände löschen         ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nServer wird beendet...');
  db.close();
  process.exit(0);
});
