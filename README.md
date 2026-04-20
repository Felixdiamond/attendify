Here's the rewrite:

---

# Attendify

Every semester, across hundreds of lecture halls in Nigerian universities, the same ritual plays out. A sheet of paper passes from hand to hand. Names get signed by people who aren't there. Lecturers have no way to know who actually showed up. And by the time results come out, the attendance record is a fiction.

Attendify fixes that.

---

## What It Does

Attendify is a mobile attendance system that uses **Bluetooth Low Energy** to verify that a student is physically present in a classroom, not just connected to the same WiFi or signed in from a hostel two buildings away.

When a lecturer starts a session, their phone begins broadcasting a BLE signal. Students in range pick it up automatically. Combined with a GPS radius check, the app can confirm with confidence: this person is in this room, right now.

No paper. No proxies. No arguments.

---

## How It Works

**For Lecturers** — Open the app, start a session for your course. Attendify handles the rest. When you're done, you get a real-time breakdown of who showed up, with export options for your records.

**For Students** — Join a session when it goes live. Your presence is verified by BLE proximity and location. Your attendance history lives in the app, always accessible.

**For Heads of Class** — Manage course enrollment, configure automation rules, and keep things running without chasing anyone down.

---

## Tech Stack

| Layer | Tools |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81, TypeScript |
| Routing | Expo Router |
| Styling | NativeWind |
| State | Zustand |
| BLE | react-native-ble-plx |
| Backend | Supabase (Auth + Postgres) |

---

## Project Structure

```
app/          screens and routing
components/   UI and feature components
lib/          business logic and services
stores/       Zustand state
supabase/     SQL migrations
types/        TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo development build (BLE does not work in Expo Go)
- A Supabase project

### 1. Install

```bash
npm install
```

### 2. Set up environment

Create a `.env` file at the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_BLE_SERVICE_UUID=A1B2C3D4-E5F6-7890-1234-567890ABCDEF
EXPO_PUBLIC_HMAC_SECRET_KEY=replace-with-your-value
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=attendify://confirm-email
EXPO_PUBLIC_ALLOW_ANY_EMAIL=false
```

### 3. Supabase redirect

In your Supabase Auth settings, add `attendify://confirm-email` as a redirect URL.

### 4. Run migrations

Apply the SQL files in `supabase/migrations/` in order.

### 5. Start

```bash
npm run start       # dev server
npm run android     # Android
npm run ios         # iOS
```

---

## Notes

- Never commit `.env` or any private keys.
- Use test credentials for demos; rotate anything used in development before going to production.

---

## Status

Active hackathon project. Core attendance flow and role-based experience are implemented and working.