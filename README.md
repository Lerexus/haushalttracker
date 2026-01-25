# 💰 Haushaltskosten Tracker
 
Eine moderne, mobile-optimierte Web-Anwendung zur gemeinsamen Verwaltung von Haushaltskosten mit Cloud-Synchronisation über Firebase.
 
## 🚀 Features
 
### 📱 Mobile-First Design
- Responsive Dark Mode Design mit Glasmorphism-Effekten
- Touch-optimierte Buttons und Navigation
- Perfekt optimiert für Smartphones (getestet auf Google Pixel 8)
- **NEU**: Icon-Only Buttons mit Tooltips für kompakte Darstellung
- **NEU**: Horizontales Scrollen mit sticky Actions-Spalte (~80px)
 
### 🔐 Sichere Authentifizierung
- Firebase Authentication mit E-Mail/Passwort
- Vollständige Datentrennung zwischen Accounts
- Verschlüsselte Datenübertragung (HTTPS)
- Sichere Firestore-Regeln
 
### ☁️ Cloud-Synchronisation
- Echtzeit-Datensynchronisation zwischen allen Geräten
- Automatisches Backup in Firebase Cloud
- Offline-Funktionalität mit Sync bei Internetverbindung
- Keine Datenverluste durch Browser-Cache-Löschung
 
### 👥 Multi-User Support
- Jeder Account hat seine eigenen, privaten Daten
- Individuelle Personennamen pro Account
- Bekannte können eigene Accounts erstellen
- Vollständige Datentrennung zwischen Benutzern
 
### 💰 Ausgaben-Management
- Kategorien: Einkauf Haushalt, Online Takeout/Takeaway, Auswärts Essen/Drinks, Sonstiges
- Währung: Schweizer Franken (CHF) mit 0.05 CHF Schritten
- Status-Tracking: Offen/Bezahlt mit Ein-Klick-Toggle
- Bemerkungen: Optionale Notizen zu jeder Ausgabe
- Automatische Summenberechnung pro Person
- **NEU**: Intelligente Filter-Funktionen (Status + Zeit)
- **NEU**: Smart Pagination mit "Weitere 20 Einträge laden"
 
### ⚙️ Intelligente Benutzeroberfläche
- Klappbares Einstellungen-Widget (platzsparend)
- Personalisierbare Namen für Person 1 und Person 2
- Automatische Datumsvorauswahl (heute)
- **NEU**: Klickbare Summary-Cards mit Scroll-Navigation zu Personen-Gruppen
- **NEU**: Ein-/ausklappbare Personen-Gruppen für bessere Übersicht
- **NEU**: Kompakte Icon-Buttons (✅ bezahlt, 🔄 wieder öffnen, 🗑️ löschen)
- **NEU**: Glassmorphism-Tooltips mit perfekter Mobile-Positionierung
- Intuitive Benachrichtigungen für alle Aktionen
 
## 🛠️ Technische Details
 
### Frontend
- **HTML5** - Semantische Struktur
- **CSS3** - Modern CSS mit Flexbox/Grid, Animationen, Media Queries
- **JavaScript ES6+** - Modulare Klassenstruktur, Async/Await
 
### Backend & Database
- **Firebase Authentication** - Benutzer-Management
- **Cloud Firestore** - NoSQL-Datenbank mit Echtzeit-Sync
- **Firebase Hosting** - Über GitHub Pages deployed
 
### Architektur
```
haushaltskosten-tracker/
├── index.html          # HTML-Struktur mit Filter-System
├── styles.css          # Komplettes Styling & Responsive Design
├── app.js              # JavaScript-Logik & Firebase-Integration
└── README.md           # Dokumentation
```
 
## 🚀 Live Demo
**URL**: https://lerexus.github.io/haushalttracker/
 
## 📱 Installation als Web-App
 
### iPhone (Safari)
1. App-URL öffnen
2. Teilen-Button → "Zum Home-Bildschirm"
3. Namen eingeben → "Hinzufügen"
 
### Android (Chrome)
1. App-URL öffnen
2. Menü (⋮) → "App installieren"
3. "Installieren" bestätigen
 
## 🔧 Setup & Deployment
 
### Voraussetzungen
- GitHub Account
- Firebase Account (kostenlos)
- Moderne Browser mit JavaScript-Unterstützung
 
### 1. Repository Setup
```bash
# Repository erstellen auf GitHub
# Dateien hochladen: index.html, styles.css, app.js
```
 
### 2. Firebase Konfiguration
1. **Firebase Console**: https://console.firebase.google.com/
2. **Projekt erstellen**: "haushaltskosten-tracker"
3. **Web-App hinzufügen**: `<script>`-Tag Methode wählen
4. **Authentication aktivieren**: E-Mail/Passwort
5. **Firestore Database**: Im Testmodus starten
6. **Firestore-Regeln konfigurieren**:
 
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Ausgaben - nur eigene Daten sichtbar
    match /expenses/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Einstellungen - nur eigene Einstellungen
    match /settings/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```
 
### 3. Firebase-Konfiguration in App einbauen
In `app.js` die Firebase-Config ersetzen:
 
```javascript
const firebaseConfig = {
    apiKey: "IHR_API_KEY",
    authDomain: "ihr-projekt.firebaseapp.com",
    projectId: "ihr-projekt-id",
    storageBucket: "ihr-projekt.appspot.com",
    messagingSenderId: "123456789",
    appId: "ihre-app-id"
};
```
 
### 4. GitHub Pages aktivieren
1. Repository → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: "main", Folder: "/ (root)"
4. Save
 
## 📊 Datenbank-Struktur
 
### Collections
```
expenses/
├── {document-id}
│   ├── person: "Person 1" | "Person 2"
│   ├── category: string
│   ├── amount: number
│   ├── remarks: string
│   ├── date: string (YYYY-MM-DD)
│   ├── status: "paid" | "unpaid"
│   ├── timestamp: Date
│   └── userId: string
 
settings/
├── {user-id}
│   ├── person1Name: string
│   └── person2Name: string
```
 
## 🔒 Sicherheit
 
### Implementierte Sicherheitsmaßnahmen
- ✅ **Firestore-Regeln**: Nur authentifizierte Benutzer, nur eigene Daten
- ✅ **HTTPS-Verschlüsselung**: Automatisch über GitHub Pages
- ✅ **Input-Validierung**: Client- und serverseitig
- ✅ **XSS-Schutz**: Sichere DOM-Manipulation
- ✅ **Datentrennung**: Vollständige Isolation zwischen Accounts
 
### Firebase-Sicherheit
- API-Keys sind öffentlich (Frontend-Keys, nicht geheim)
- Sicherheit durch Firestore-Regeln (serverseitig)
- Authentication erforderlich für alle Datenbankoperationen
 
## 🎯 Nutzung
 
### Erste Schritte
1. **Registrierung**: E-Mail + Passwort (min. 6 Zeichen)
2. **Personennamen**: Einstellungen → Namen anpassen
3. **Erste Ausgabe**: Formular ausfüllen → Hinzufügen
4. **Status ändern**: Icon-Buttons verwenden (✅/🔄/🗑️)
 
### Neue Features nutzen
- **Filter verwenden**: Offen/Bezahlt/Alle + Zeitfilter für bessere Übersicht
- **Navigation**: Auf Summary-Cards klicken → automatischer Scroll zur Person
- **Personen-Gruppen**: Ein-/ausklappen für kompakte Darstellung
- **Pagination**: "Weitere 20 Einträge laden" bei vielen Ausgaben
 
### Tipps
- **Mobile Nutzung**: Als Web-App zum Homescreen hinzufügen
- **Gemeinsame Nutzung**: Beide Partner können denselben Account nutzen
- **Kategorien**: Wählen Sie passende Kategorien für bessere Übersicht
- **Bemerkungen**: Nutzen Sie das Feld für Details (Geschäft, Zweck, etc.)
- **Filter**: Standard zeigt nur offene Einträge → weniger Unordnung
 
## 🔄 Updates & Wartung
 
### App-Updates
1. Dateien in GitHub Repository aktualisieren
2. 2-3 Minuten warten (GitHub Pages Sync)
3. Browser-Cache leeren (Strg+F5)
 
### Backup
- **Automatisch**: Alle Daten in Firebase Cloud
- **Manuell**: Firebase Console → Firestore → Export
 
## 📞 Support & Troubleshooting
 
### Häufige Probleme
- **App lädt nicht**: Browser-Cache leeren, JavaScript aktiviert?
- **Anmeldung fehlschlägt**: E-Mail/Passwort korrekt? Internet verfügbar?
- **Daten nicht sichtbar**: Firestore-Regeln korrekt? Richtiger Account?
- **Mobile Layout**: Browser aktualisieren, Zoom auf 100%
- **Filter funktionieren nicht**: Vollständige HTML-Datei hochgeladen?
 
### Debug-Informationen
- **Browser-Konsole**: F12 → Console (Fehlermeldungen)
- **Firebase Console**: Authentifizierung & Datenbank prüfen
- **GitHub Pages**: Repository → Settings → Pages (Deployment-Status)
 
## 📈 Roadmap
 
### Geplante Features
- 🔮 Export-Funktionen (CSV, PDF)
- 🔮 Erweiterte Kategorien (benutzerdefiniert)
- 🔮 Statistiken & Charts (monatliche Übersichten)
- 🔮 Währungsauswahl (EUR, USD, etc.)
- 🔮 Recurring Expenses (wiederkehrende Ausgaben)
- 🔮 Budget-Limits mit Benachrichtigungen
 
## 🤝 Entwicklung
 
### Code-Struktur
- **Modular**: Getrennte Dateien für HTML, CSS, JavaScript
- **ES6+ Features**: Classes, Modules, Async/Await
- **Responsive Design**: Mobile-First Approach
- **Clean Code**: Kommentierte, wartbare Struktur
 
### Entwicklungsumgebung
- Keine Build-Tools erforderlich
- Direkte Bearbeitung der Dateien möglich
- Live-Testing über GitHub Pages
- Browser DevTools für Debugging
 
## 📄 Lizenz
Dieses Projekt ist für private Nutzung entwickelt.
 
## 👨‍💻 Entwickelt mit
- ❤️ Leidenschaft für sauberen Code
- ☕ Kaffee und gute Musik
- 🚀 Moderne Web-Technologien
- 📱 Mobile-First Mindset
 
---
 
**Version**: 1.0.1  
**Letztes Update**: Januar 2025  
**Status**: ✅ Produktionsbereit
 
### 🆕 Changelog v1.0.1
- ✅ **Icon-Only Buttons**: Kompakte Darstellung mit Tooltips
- ✅ **Filter-System**: Status- und Zeitfilter für bessere Übersicht
- ✅ **Smart Pagination**: "Weitere 20 Einträge laden" Funktionalität
- ✅ **Navigation**: Klickbare Summary-Cards mit Scroll-zu-Person
- ✅ **Kollapsible Gruppen**: Ein-/ausklappbare Personen-Bereiche
- ✅ **Horizontales Scrollen**: Optimierte Tabellen-Darstellung
- ✅ **Mobile Optimierung**: Verbesserte Touch-Targets und Tooltips
- 🔧 **Bug Fixes**: JavaScript-Fehler behoben, Design wiederhergestellt
 
