import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

// Face++ (Megvii) API integration. Set these with:
//   npx convex env set FACEPP_API_KEY <your key>
//   npx convex env set FACEPP_API_SECRET <your secret>
// Optionally override the region (defaults to the US endpoint):
//   npx convex env set FACEPP_API_BASE_URL https://api-us.faceplusplus.com
const FACEPP_BASE_URL = process.env.FACEPP_API_BASE_URL || 'https://api-us.faceplusplus.com';

async function callFacepp(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.FACEPP_API_KEY;
  const apiSecret = process.env.FACEPP_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      'FACEPP_API_KEY / FACEPP_API_SECRET are not configured. Set them with `npx convex env set`.'
    );
  }

  const body = new URLSearchParams({ api_key: apiKey, api_secret: apiSecret, ...params });
  const response = await fetch(`${FACEPP_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json: any = await response.json().catch(() => ({}));
  if (!response.ok || json.error_message) {
    throw new Error(`Face++ error (${response.status}): ${json.error_message || 'unknown error'}`);
  }
  return json;
}

// Interpupillary distance as a fraction of face width — shrinks with head
// yaw due to perspective foreshortening. Used to confirm the person
// actually turned their head between the two captures (basic anti-photo
// liveness check), rather than the same static image being shown twice.
function eyeDistanceRatio(face: any): number | null {
  const landmark = face?.landmark;
  const rect = face?.face_rectangle;
  if (!landmark?.left_eye_pupil || !landmark?.right_eye_pupil || !rect?.width) return null;

  const dx = landmark.left_eye_pupil.x - landmark.right_eye_pupil.x;
  const dy = landmark.left_eye_pupil.y - landmark.right_eye_pupil.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance / rect.width;
}

export const verifyAndMarkAttendance = action({
  args: {
    token: v.string(),
    classSessionId: v.id('classSessions'),
    frame1Base64: v.string(), // frontal capture
    frame2Base64: v.string(), // capture after the user turns their head
    turnDirection: v.union(v.literal('left'), v.literal('right')),
  },
  handler: async (ctx, args): Promise<{ verified: boolean; live: boolean; confidence: number; reason?: string }> => {
    const student = await ctx.runQuery(internal.students._getStudentByToken, {
      token: args.token,
    });
    if (!student) throw new Error('Not authenticated.');
    if (!student.faceEnrolled) {
      return {
        verified: false,
        live: false,
        confidence: 0,
        reason: 'No enrolled face on file. Please complete enrollment first.',
      };
    }

    const referenceUrl: string | null = await ctx.runQuery(
      internal.students._getReferenceImageUrl,
      { studentId: student._id }
    );
    if (!referenceUrl) {
      return { verified: false, live: false, confidence: 0, reason: 'Reference photo not found.' };
    }

    try {
      // --- 1. Liveness: detect facial landmarks in both frames and confirm
      // the head actually turned between them ---
      const [detect1, detect2] = await Promise.all([
        callFacepp('/facepp/v3/detect', { image_base64: args.frame1Base64, return_landmark: '1' }),
        callFacepp('/facepp/v3/detect', { image_base64: args.frame2Base64, return_landmark: '1' }),
      ]);

      const face1 = detect1.faces?.[0];
      const face2 = detect2.faces?.[0];
      if (!face1 || !face2) {
        return {
          verified: false,
          live: false,
          confidence: 0,
          reason: 'Could not locate a clear face in both frames.',
        };
      }

      const ratio1 = eyeDistanceRatio(face1);
      const ratio2 = eyeDistanceRatio(face2);
      if (ratio1 == null || ratio2 == null) {
        return {
          verified: false,
          live: false,
          confidence: 0,
          reason: 'Could not locate a clear face in both frames.',
        };
      }

      const MIN_YAW_DELTA = 0.06; // ~6% relative change in interpupillary distance
      const delta = ratio2 - ratio1;
      if (Math.abs(delta) < MIN_YAW_DELTA) {
        return {
          verified: false,
          live: false,
          confidence: 0,
          reason: 'No head movement detected — please turn your head when prompted.',
        };
      }

      // --- 2. Identity: compare each frame against the enrolled reference photo ---
      const [compare1, compare2] = await Promise.all([
        callFacepp('/facepp/v3/compare', {
          image_base64_1: args.frame1Base64,
          image_url2: referenceUrl,
        }),
        callFacepp('/facepp/v3/compare', {
          image_base64_1: args.frame2Base64,
          image_url2: referenceUrl,
        }),
      ]);

      // Face++ recommends picking a confidence threshold based on your
      // acceptable false-accept-rate; 1e-3 is a reasonable default for a
      // campus attendance app (stricter thresholds are available at 1e-4/1e-5
      // if you want fewer false accepts at the cost of more false rejects).
      const threshold = compare1.thresholds?.['1e-3'] ?? 75;
      const conf1: number = compare1.confidence ?? 0;
      const conf2: number = compare2.confidence ?? 0;
      const verified = conf1 >= threshold && conf2 >= threshold;
      const confidence = Math.round(((conf1 + conf2) / 2) * 10) / 10;

      await ctx.runMutation(internal.attendance._recordAttendance, {
        classSessionId: args.classSessionId,
        studentId: student._id,
        status: verified ? 'present' : 'rejected',
        confidence,
      });

      return {
        verified,
        live: true,
        confidence,
        reason: verified ? undefined : 'Face did not match enrolled record.',
      };
    } catch (err: any) {
      return {
        verified: false,
        live: false,
        confidence: 0,
        reason: err?.message ?? 'Face verification failed. Please try again.',
      };
    }
  },
});