# FaceAttend

A React Native (Expo) mobile app that lets university students mark attendance
using facial verification, backed by Convex and an open-source DeepFace
verification service.

## How it fits together

```
faceattend/                 <- the mobile app (Expo Router + Convex client)
  app/                       screens
  components/                shared UI pieces
  convex/                     backend: schema, auth, courses, attendance, face verification
  face-api/                  Python/Flask service wrapping DeepFace, deployed separately to Render
```

The flow: student opens the camera → app captures a live selfie → Convex
action sends it + the student's enrolled reference photo to the DeepFace
service on Render → DeepFace compares the two faces → Convex records
"present" or "rejected" in the database.

---

## 1. Prerequisites

- A phone with the **Expo Go** app installed (App Store / Play Store), or an
  Android/iOS simulator.
- [Node.js](https://nodejs.org) 18+ installed on your computer.
- A [Convex](https://convex.dev) account (free tier is fine).
- A [Render](https://render.com) account (free tier is fine to start).
- A [GitHub](https://github.com) account.

## 2. Install dependencies

```bash
cd faceattend
npm install
```

## 3. Set up Convex

Convex is your database + backend functions. Run:

```bash
npx convex dev
```

The first time, this will:
- Open a browser to log you into Convex
- Ask you to create a new project (name it `faceattend`)
- Generate a `convex/_generated` folder and a `.env.local` file containing
  your `CONVEX_DEPLOYMENT` and deployment URL

**Leave this command running in a terminal** — it watches your `convex/`
folder and pushes changes live, and it's how your backend functions get
deployed.

Copy the Convex URL it prints (something like
`https://happy-animal-123.convex.cloud`) into a new file called `.env` in the
project root:

```
EXPO_PUBLIC_CONVEX_URL=https://happy-animal-123.convex.cloud
```

(There's a `.env.example` in the repo you can copy: `cp .env.example .env`)

## 4. Deploy the face verification service to Render

This is the DeepFace API. It can't run inside Convex or Expo — it needs its
own server because DeepFace is a Python library, not a hosted API.

1. Push this repo to GitHub first (see step 6 below) — Render deploys from a
   GitHub repo.
2. In the Render dashboard, click **New +** → **Blueprint**.
3. Connect your GitHub account and select your `faceattend` repo.
4. Render will detect `face-api/render.yaml` and set up the service
   automatically (it builds the Dockerfile in `face-api/`).
   - If Render asks for a root directory, set it to `face-api`.
5. Click **Apply** / **Create**. The first build takes a while (5–10 minutes)
   because it downloads the face recognition model weights.
6. Once deployed, Render gives you a URL like
   `https://faceattend-face-api.onrender.com`. Also note the `FACE_API_KEY`
   value Render auto-generated for you (Environment tab on the service).

> **Free tier note:** Render's free web services sleep after 15 minutes of
> inactivity and take ~30–60 seconds to wake up on the next request. That's
> fine for testing; for real classroom use, upgrade the Render plan to
> "Starter" or above so it stays warm.

## 5. Point Convex at the face verification service

Back in your terminal (with `npx convex dev` still running, or in a new
terminal — Convex env vars are set independently of the dev process):

```bash
npx convex env set FACE_API_URL https://faceattend-face-api.onrender.com
npx convex env set FACE_API_KEY <the key Render generated>
```

## 6. Push to GitHub

Create an empty repository on GitHub first (github.com → New repository →
name it `faceattend` → **do not** initialize with a README, since you already
have one).

Then, from the `faceattend` folder:

```bash
git init
git add .
git commit -m "Initial commit: FaceAttend app, Convex backend, DeepFace service"
git branch -M main
git remote add origin https://github.com/<your-username>/faceattend.git
git push -u origin main
```

(If `git` asks for credentials, GitHub no longer accepts your account
password directly — you'll need a **Personal Access Token**: GitHub →
Settings → Developer settings → Personal access tokens → generate one with
`repo` scope, and use that as the password when prompted.)

## 7. Preloaded courses (automatic)

The app now ships with 4 demo courses, each with an open "Today's Session"
attendance window, seeded automatically the first time the app connects to
your Convex backend:

- CSC 301 — Data Structures & Algorithms
- MTH 204 — Linear Algebra
- PHY 210 — Electromagnetism
- ENG 105 — Technical Writing

Every student who registers is auto-enrolled in all of them, so as soon as
you register a test account you'll see all 4 with a **Check In** button on
the dashboard — no manual setup needed.

To add your real courses instead, use the Convex dashboard's **Functions**
tab (dashboard.convex.dev → your project → Functions):
- `courses:createCourse` — `{ "code": "...", "title": "...", "lecturer": "..." }`
- `courses:enrollStudentInCourse` — `{ "courseId": "...", "studentId": "..." }`
- `courses:openClassSession` / `courses:closeClassSession` — to open/close a
  live attendance window for a course each class period

(For a real deployment you'd want an admin/lecturer screen for this instead
of the dashboard — happy to build that next if useful.)

## 8. Run the app

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (Android: use the
Expo Go app's scanner; iOS: use the Camera app, which will open Expo Go).

Flow to test:
1. **Register** a new student account.
2. You'll be sent to **Face Enrollment** — capture a reference photo.
3. On the **Dashboard**, you'll already see 4 preloaded courses with open
   sessions — tap **Check In** on any of them.
4. The **Scanner** screen runs the liveness check: capture yourself looking
   straight ahead, then turn your head left or right when prompted and
   capture again. You'll land on the **Success** or **Mismatch** screen.

## Notes on accuracy & security

- The DeepFace service uses the `Facenet512` model with `retinaface` face
  detection — a good balance of accuracy and speed. You can change this in
  `face-api/app.py` (`MODEL_NAME`).
- **Liveness detection:** the scanner captures two frames — one frontal, one
  after prompting the student to turn their head left or right — and the
  `/verify-liveness` endpoint checks that the eye-distance ratio shifted
  enough between the two frames to indicate real head movement, in addition
  to verifying identity against the enrolled photo in both frames. This
  defeats the simplest spoofing attempt (holding up a single static photo),
  but it is **not** a defense against a video replay attack or a 3D mask —
  that would need a dedicated liveness model, which isn't included here.
- Enforce HTTPS everywhere (Render and Convex both give you HTTPS by
  default).
- Face images are stored in Convex file storage, which is private by default
  (URLs are only generated server-side, not exposed to other students).
