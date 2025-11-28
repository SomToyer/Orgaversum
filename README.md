# Orgaversum - Todo Planeten Abenteuer

Ein interaktives Todo-Management-System als galaktisches Universum mit persistenter Datenspeicherung auf deinem PC.

## 🚀 Features

- **Persistente Datenspeicherung**: Alle Daten werden in einer SQLite-Datenbank auf deinem PC gespeichert
- **Automatisches Speichern**: Jede Änderung wird automatisch gespeichert
- **Offline-Fallback**: Funktioniert auch ohne Server mit localStorage
- **REST API**: Vollständige API für Daten-Management
- **Versionsverwaltung**: Speichert die letzten 10 Zustände als Backup

## 📦 Installation

### Voraussetzungen

- Node.js (Version 14 oder höher)
- npm (kommt mit Node.js)

### Schritt 1: Abhängigkeiten installieren

```bash
npm install
```

### Schritt 2: Server starten

```bash
npm start
```

Oder für Entwicklung mit Auto-Reload:

```bash
npm run dev
```

### Schritt 3: Anwendung öffnen

Öffne deinen Browser und navigiere zu:

```
http://localhost:3000
```

## 💾 Datenbank

Die Daten werden in `orgaversum.db` im Projektverzeichnis gespeichert. Diese Datei enthält:

- Alle Sonnen, Planeten und Monde
- Alle Verbindungen zwischen Objekten
- Alle Raumstationen mit ihren Inhalten (Bilder, Videos, Audio, Notizen)

**WICHTIG**: Die Datenbank bleibt erhalten, auch wenn:
- Der PC heruntergefahren wird
- Der Browser geschlossen wird
- Der Server neu gestartet wird

## 🔌 API Endpunkte

### Zustand speichern
```bash
POST http://localhost:3000/api/state
Content-Type: application/json

{
  "suns": [...],
  "planets": [...],
  "moons": [...],
  "connections": [...],
  "nextId": 1
}
```

### Aktuellen Zustand laden
```bash
GET http://localhost:3000/api/state
```

### Speicher-Historie anzeigen
```bash
GET http://localhost:3000/api/history?limit=10
```

### Bestimmten Zustand aus Historie laden
```bash
GET http://localhost:3000/api/state/:id
```

### Alle Zustände löschen
```bash
DELETE http://localhost:3000/api/state
```

## 🛠️ Technologie-Stack

- **Frontend**: Vanilla JavaScript mit Canvas API
- **Backend**: Node.js + Express
- **Datenbank**: SQLite3 (better-sqlite3)
- **Datenformat**: JSON

## 📂 Projektstruktur

```
Orgaversum/
├── server.js           # Backend-Server
├── app.js             # Frontend-Logik
├── index.html         # HTML-Struktur
├── styles.css         # Styling
├── package.json       # Projekt-Konfiguration
├── orgaversum.db      # SQLite-Datenbank (wird automatisch erstellt)
└── README.md          # Diese Datei
```

## 🔧 Fehlerbehebung

### Server startet nicht
- Stelle sicher, dass Port 3000 nicht bereits belegt ist
- Prüfe, ob Node.js installiert ist: `node --version`
- Führe `npm install` erneut aus

### Daten werden nicht gespeichert
- Prüfe die Browser-Konsole auf Fehler
- Stelle sicher, dass der Server läuft
- Als Fallback wird localStorage verwendet

### Datenbank beschädigt
- Stoppe den Server
- Benenne `orgaversum.db` um oder lösche sie
- Starte den Server neu (neue Datenbank wird erstellt)

## 🔐 Datensicherheit

- Alle Daten bleiben lokal auf deinem PC
- Keine Cloud-Synchronisation
- Keine externen Dienste
- Du hast vollständige Kontrolle über deine Daten

## 📝 Backup

Um ein Backup zu erstellen, kopiere einfach die Datei `orgaversum.db`:

```bash
cp orgaversum.db orgaversum.backup.db
```

Um ein Backup wiederherzustellen:

```bash
cp orgaversum.backup.db orgaversum.db
```

## 🎮 Verwendung

1. **Objekte erstellen**: Klicke auf die Buttons in der Toolbar
2. **Objekte verschieben**: Ziehe sie mit der Maus
3. **Objekte bearbeiten**: Doppelklick auf ein Objekt
4. **Verbindungen erstellen**: Aktiviere den Verbindungsmodus und klicke zwei Objekte
5. **Raumstationen hinzufügen**: Doppelklick auf einen Mond → Stationen-Buttons
6. **Dateien hinzufügen**: Ziehe Dateien direkt auf Monde

Alle Änderungen werden **automatisch** in der Datenbank gespeichert!

## 📜 Lizenz

MIT

## 🤝 Beitragen

Dieses Projekt ist ein persönliches Todo-Management-System. Du kannst es nach Belieben anpassen!

---

**Viel Spaß beim Organisieren deines Universums! 🌟**
