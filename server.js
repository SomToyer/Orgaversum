const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Erhöht für große Bild/Video-Dateien
app.use(express.static(__dirname)); // Serviert statische Dateien (HTML, CSS, JS)

// Datei-basierte Speicherung (einfacher als SQLite, keine Build-Tools nötig!)
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'current-state.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// Initialisierung
async function initDataStorage() {
  try {
    // Erstelle Verzeichnisse falls nicht vorhanden
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    console.log(`✓ Datenspeicher initialisiert: ${DATA_DIR}`);
  } catch (error) {
    console.error('Fehler beim Initialisieren:', error);
  }
}

// Hilfsfunktionen
async function readState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null; // Datei existiert noch nicht
  }
}

async function writeState(state) {
  const timestamp = new Date().toISOString();
  const stateWithMeta = {
    ...state,
    updated_at: timestamp
  };

  // Speichere aktuellen Zustand
  await fs.writeFile(STATE_FILE, JSON.stringify(stateWithMeta, null, 2));

  // Speichere Kopie in History
  const historyFile = path.join(HISTORY_DIR, `state-${Date.now()}.json`);
  await fs.writeFile(historyFile, JSON.stringify(stateWithMeta, null, 2));

  // Bereinige alte History-Dateien (nur die letzten 10 behalten)
  await cleanupHistory();

  return stateWithMeta;
}

async function cleanupHistory() {
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const stateFiles = files.filter(f => f.startsWith('state-') && f.endsWith('.json'));

    if (stateFiles.length > 10) {
      // Sortiere nach Datum (im Dateinamen enthalten)
      stateFiles.sort().reverse();

      // Lösche alle außer den neuesten 10
      const toDelete = stateFiles.slice(10);
      for (const file of toDelete) {
        await fs.unlink(path.join(HISTORY_DIR, file));
      }
    }
  } catch (error) {
    console.error('Fehler beim Bereinigen der History:', error);
  }
}

async function getHistory(limit = 10) {
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const stateFiles = files.filter(f => f.startsWith('state-') && f.endsWith('.json'));

    // Sortiere nach Datum (neueste zuerst)
    stateFiles.sort().reverse();

    const history = [];
    for (const file of stateFiles.slice(0, limit)) {
      const filePath = path.join(HISTORY_DIR, file);
      const stats = await fs.stat(filePath);
      const data = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(data);

      history.push({
        id: file,
        updated_at: state.updated_at || stats.mtime.toISOString(),
        size_bytes: stats.size
      });
    }

    return history;
  } catch (error) {
    return [];
  }
}

// API Endpunkte

/**
 * GET /api/state - Lädt den aktuellen Zustand
 */
app.get('/api/state', async (req, res) => {
  try {
    const state = await readState();

    if (state) {
      res.json({
        success: true,
        data: {
          suns: state.suns || [],
          planets: state.planets || [],
          moons: state.moons || [],
          connections: state.connections || [],
          nextId: state.nextId || 1
        },
        updated_at: state.updated_at
      });
    } else {
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
app.post('/api/state', async (req, res) => {
  try {
    const { suns, planets, moons, connections, nextId } = req.body;

    // Validierung
    if (!Array.isArray(suns) || !Array.isArray(planets) || !Array.isArray(moons) || !Array.isArray(connections)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Datenstruktur'
      });
    }

    const state = {
      suns,
      planets,
      moons,
      connections,
      nextId: nextId || 1
    };

    const savedState = await writeState(state);

    res.json({
      success: true,
      message: 'Zustand erfolgreich gespeichert',
      updated_at: savedState.updated_at
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
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await getHistory(limit);

    res.json({
      success: true,
      data: history
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
app.get('/api/state/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filePath = path.join(HISTORY_DIR, id);

    const data = await fs.readFile(filePath, 'utf8');
    const state = JSON.parse(data);

    res.json({
      success: true,
      data: {
        suns: state.suns || [],
        planets: state.planets || [],
        moons: state.moons || [],
        connections: state.connections || [],
        nextId: state.nextId || 1
      },
      updated_at: state.updated_at
    });
  } catch (error) {
    console.error('Fehler beim Laden:', error);
    res.status(404).json({
      success: false,
      error: 'Zustand nicht gefunden'
    });
  }
});

/**
 * DELETE /api/state - Löscht alle gespeicherten Zustände
 */
app.delete('/api/state', async (req, res) => {
  try {
    // Lösche aktuellen Zustand
    try {
      await fs.unlink(STATE_FILE);
    } catch (e) {
      // Datei existiert nicht, ist OK
    }

    // Lösche History
    const files = await fs.readdir(HISTORY_DIR);
    for (const file of files) {
      await fs.unlink(path.join(HISTORY_DIR, file));
    }

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
initDataStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                   ORGAVERSUM SERVER                        ║
╠════════════════════════════════════════════════════════════╣
║  Server läuft auf: http://localhost:${PORT}                 ║
║  Datenspeicher: ${DATA_DIR.split(path.sep).pop().padEnd(40)} ║
║                                                            ║
║  API Endpunkte:                                            ║
║  - GET    /api/state      - Aktuellen Zustand laden       ║
║  - POST   /api/state      - Zustand speichern             ║
║  - GET    /api/history    - Speicher-Historie anzeigen    ║
║  - GET    /api/state/:id  - Bestimmten Zustand laden      ║
║  - DELETE /api/state      - Alle Zustände löschen         ║
║                                                            ║
║  💡 Daten werden als JSON-Dateien gespeichert             ║
║     Kein SQLite, keine Build-Tools nötig!                 ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nServer wird beendet...');
  process.exit(0);
});
