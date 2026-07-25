<h1 align="center">SyncWareApp</h1>

<p align="center">
  <strong>Offline-first mobile app for field sales and logistics — built for salespeople who lose signal halfway through the route.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native">
  <img src="https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/AsyncStorage-3178C6?style=flat-square" alt="AsyncStorage">
  <img src="https://img.shields.io/badge/Profit_Plus_ERP-CC2927?style=flat-square" alt="Profit Plus ERP">
  <img src="https://img.shields.io/badge/Bitrix24-2FC7F7?style=flat-square" alt="Bitrix24">
</p>

---

## The problem

Field sales teams work where connectivity is worst: rural routes, warehouses, basements, industrial zones. An app that requires a connection to log a client visit doesn't get used — the salesperson writes it on paper and types it in that night, if they remember.

SyncWareApp assumes there is no signal. Every action works locally first and synchronizes with the ERP and the CRM when the connection comes back, without the user having to think about it.

<!-- CAPTURA — Pantalla principal / lista de visitas del día. Ponla aquí si quieres una imagen ancha de apertura. -->

---

## Features

<!-- CAPTURAS MÓVILES — Como son verticales, van en tabla para que se vean lado a lado y no ocupen media pantalla cada una. -->
<table>
  <tr>
    <td width="25%"><img src="assets/visitas.png" alt="Visit logging"></td>
    <td width="25%"><img src="assets/escaneo.png" alt="Barcode scanning"></td>
    <td width="25%"><img src="assets/guias.png" alt="Loading manifests"></td>
    <td width="25%"><img src="assets/sync.png" alt="Sync status"></td>
  </tr>
  <tr>
    <td align="center"><sub>Geolocated visits</sub></td>
    <td align="center"><sub>Barcode scanning</sub></td>
    <td align="center"><sub>Digital manifests</sub></td>
    <td align="center"><sub>Sync status</sub></td>
  </tr>
</table>

**Geolocated visit logging.** Every client visit records coordinates and timestamp at the moment it happens, so the route is verifiable rather than self-reported.

**Barcode scanning.** Products and manifests are scanned with the device camera, removing manual entry errors in the field.

**Digital loading manifests.** Loading and delivery documents that previously lived on paper, now generated and confirmed on the device.

**ERP and CRM synchronization.** Data flows both ways with the Profit Plus ERP (SQL Server) and Bitrix24 CRM — clients and inventory come down, visits and orders go up.

**Full offline operation.** The app is usable end to end with no connection. Sync is a background concern, not a precondition.

---

## Technical notes

**Offline-first is an architecture, not a feature flag.** The app never waits on the network to complete a user action. Writes go to local storage immediately and the UI updates from local state; a separate queue handles pushing those changes upstream. This means the interface never blocks on a request that may never resolve.

**A sync queue instead of ad-hoc requests.** Pending operations are queued locally and drained when connectivity returns. Failed operations stay in the queue rather than being silently dropped — the failure mode is "not yet synced," never "lost."

**Geolocation captured at the event, not at sync time.** Coordinates and timestamps are recorded when the visit happens. If the record syncs six hours later from a different location, the data still reflects where and when the visit actually occurred.

**Context API over a heavier state library.** For this app's state surface, Context plus AsyncStorage covered the requirement without adding a dependency and its conventions. The tradeoff is manual optimization of re-renders, which was acceptable at this scale.

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Framework** | React Native, Expo |
| **State** | Context API |
| **Local storage** | AsyncStorage |
| **Device APIs** | Expo Camera, Expo Location |
| **Integrations** | Profit Plus ERP (SQL Server), Bitrix24 CRM |

---

## Getting started

```bash
# Clone the repository
git clone https://github.com/JoseAGalviz/SyncWareApp.git
cd SyncWareApp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the Expo development server
npx expo start
```

Scan the QR code with the Expo Go app, or press `a` / `i` to launch an Android or iOS emulator.

### Environment variables

| Variable | Description |
|---|---|
| `API_BASE_URL` | Base URL of the integration API |
| `BITRIX_WEBHOOK_URL` | Bitrix24 inbound webhook endpoint |

---

## Project structure

```
SyncWareApp/
├── src/
│   ├── screens/       # Application screens
│   ├── components/    # Reusable UI
│   ├── context/       # Global state
│   ├── services/      # API clients and sync queue
│   └── storage/       # AsyncStorage layer
├── assets/            # Screenshots and static assets
└── app.json           # Expo configuration
```

---

## Notes

This repository contains the mobile client. The integration layer that connects it to the Profit Plus ERP and Bitrix24 is proprietary and not published — the architecture is described on my [portfolio](https://portafolio-six-alpha-13.vercel.app/#proyectos).

---

## Author

**Jose Alberto Araque Galviz** — Full Stack Developer, ERP/CRM integrations

[Portfolio](https://portafolio-six-alpha-13.vercel.app) · [LinkedIn](https://www.linkedin.com/in/joseagalviz/) · [GitHub](https://github.com/JoseAGalviz)