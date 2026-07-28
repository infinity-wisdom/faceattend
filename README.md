# FaceAttend

A React Native (Expo) mobile app that lets university students mark
attendance using facial verification, backed by Convex and the Face++
(Megvii) facial recognition API.

## How it fits together

faceattend/
app/ screens (Expo Router)
components/ shared UI pieces
convex/ backend: schema, auth, courses, attendance, face verification

The flow: student opens the camera → the app automatically captures a
frontal selfie, then prompts a head turn and captures a second frame → a
Convex action sends both frames to Face++ for a liveness check (did the
head actually turn?) and an identity check (does the face match the
enrolled reference photo?) → Convex records "present" or "rejected".

Unlike an earlier version of this project, there's **no separate server to
deploy** — Face++ is a hosted API, so Convex talks to it directly. (If
you're coming from the DeepFace/Render setup, that whole piece is gone now.)

---

## 1. Prerequisites

- A phone with the **Expo Go** app installed (App Store / Play Store), or an
  Android/iOS simulator.
- [Node.js](https://nodejs.org) 18+ installed on your computer.
- A [Convex](https://convex.dev) account (free tier is fine).
- A [Face++](https://www.faceplusplus.com) account and API key (free tier
  is fine to start — see step 4).
- A [GitHub](https://github.com) account.

## 2. Install dependencies

```bash
cd faceattend
npm install --legacy-peer-deps
```

## 3. Set up Convex

```bash
npx convex dev
```

The first time, this logs you into Convex, creates a project, and generates
a `.env.local` file with your `CONVEX_DEPLOYMENT` and
`EXPO_PUBLIC_CONVEX_URL`. **Leave this command running** in its own
terminal — it watches your `convex/` folder and deploys changes live.

## 4. Get a Face++ API key

1. Sign up at [console.faceplusplus.com](https://console.faceplusplus.com)
2. Create an API key (their free tier includes Face Detection and Face
   Comparing/Verification at a shared rate limit — plenty for testing and
   likely enough for a single classroom's worth of check-ins)
3. You'll get an **API Key** and an **API Secret** — copy both

## 5. Point Convex at Face++

In a terminal, in the `faceattend` folder:

```bash
npx convex env set FACEPP_API_KEY <your api key>
npx convex env set FACEPP_API_SECRET <your api secret>
```

Face++ has separate US and China endpoints. The app defaults to the US
endpoint (`https://api-us.faceplusplus.com`); if your Face++ console shows
you a different base URL, set it explicitly:

```bash
npx convex env set FACEPP_API_BASE_URL https://api-us.faceplusplus.com
```

Double check both are set:
```bash
npx convex env list
```

## 6. Push to GitHub

Create an empty repository on GitHub first (don't initialize it with a
README, since you already have one), then from the `faceattend` folder:

```bash
git init
git add .
git commit -m "Initial commit: FaceAttend app + Convex backend (Face++ verification)"
git branch -M main
git remote add origin https://github.com/<your-username>/faceattend.git
git push -u origin main
```

## 7. Preloaded courses (automatic)

The app ships with 4 demo courses, each with an open "Today's Session"
attendance window, seeded automatically the first time the app connects to
your Convex backend:

- CSC 301 — Data Structures & Algorithms
- MTH 204 — Linear Algebra
- PHY 210 — Electromagnetism
- ENG 105 — Technical Writing

Every student who registers is auto-enrolled in all of them.

To add real courses instead, use the Convex dashboard's **Functions** tab:
- `courses:createCourse` — `{ "code": "...", "title": "...", "lecturer": "..." }`
- `courses:enrollStudentInCourse` — `{ "courseId": "...", "studentId": "..." }`
- `courses:openClassSession` / `courses:closeClassSession` — open/close a
  live attendance window each class period

## 8. Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android: use Expo Go's scanner; iPhone:
use the Camera app).

Flow to test:
1. **Register** a new student account.
2. **Face Enrollment** — the camera opens and captures your reference photo
   automatically after a couple of seconds; no button press needed.
3. On the **Dashboard**, tap **Check In** on any of the preloaded courses.
4. The **Scanner** screen is fully automatic: it captures you looking
   straight ahead, then prompts a head turn (left or right, picked at
   random) and captures again, then verifies — no taps required.

## Notes on accuracy & security

- **Liveness detection:** the app captures two frames — one frontal, one
  after prompting a head turn — and checks that the eye-distance ratio
  (interpupillary distance relative to face width) shifted enough between
  them to indicate real head movement, using facial landmarks from Face++'s
  Detect API. This defeats the simplest spoofing attempt (holding up a
  static photo), but it is **not** a defense against a video replay attack
  or a 3D mask — Face++ offers a more robust dedicated liveness product as
  a separate paid feature if you want stronger anti-spoofing later.
- **Matching threshold:** identity verification uses Face++'s suggested
  confidence threshold for a 1e-3 false-accept-rate. You can tighten this
  (fewer false accepts, more false rejects) by changing the threshold key in
  `convex/faceVerification.ts` to `1e-4` or `1e-5`.
- Face++ is a third-party service — your students' photos are sent to
  Face++'s servers for processing. Review their data retention and privacy
  policy before using this with real student data, and disclose this to
  students as part of your institution's data handling requirements.
- Face images are stored in Convex file storage, which is private by
  default (URLs are only generated server-side, not exposed to other
  students).
- Enforce HTTPS everywhere (Convex and Face++ both use HTTPS by default).