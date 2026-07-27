'use node';

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

// FACE_API_URL is set with: npx convex env set FACE_API_URL https://your-service.onrender.com
// It should point at the Flask service in the /face-api folder of this project.
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

    const faceApiUrl = process.env.FACE_API_URL;
    if (!faceApiUrl) {
      throw new Error('FACE_API_URL is not configured. Set it with `npx convex env set FACE_API_URL <url>`.');
    }
    const apiKey = process.env.FACE_API_KEY;

    // Render's free tier puts the service to sleep after inactivity. The
    // first request after a while has to wake the container, reload
    // TensorFlow, and load the face model — which can take longer than
    // Render's own gateway timeout, producing a 502 before the service is
    // actually ready. Retrying a couple of times with a short wait papers
    // over exactly that cold-start window instead of failing the check-in.
    const maxAttempts = 4;
    let lastError: string | null = null;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(`${faceApiUrl}/verify-liveness`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
          },
          body: JSON.stringify({
            frame1: args.frame1Base64,
            frame2: args.frame2Base64,
            turn_direction: args.turnDirection,
            reference_url: referenceUrl,
          }),
        });

        if (res.ok) {
          response = res;
          break;
        }

        // 502/503/504 usually mean the service is still waking up — worth
        // retrying. Anything else (e.g. 401 bad key, 400 bad input) won't
        // fix itself on retry, so fail fast instead.
        if (![502, 503, 504].includes(res.status) || attempt === maxAttempts) {
          const text = await res.text();
          lastError = `Face verification service error (${res.status}): ${text.slice(0, 300)}`;
          break;
        }
      } catch (err: any) {
        lastError = err?.message ?? String(err);
      }

      // Wait a bit longer each retry (3s, 6s, 9s...) to give the service
      // time to finish waking up.
      await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }

    if (!response) {
      return {
        verified: false,
        live: false,
        confidence: 0,
        reason:
          'The verification service is starting up (this can happen after it has been idle) — please try again in a moment.',
      };
    }

    const result = await response.json();
    // Expected shape from face-api/app.py /verify-liveness:
    // { verified: boolean, live: boolean, confidence: number, reason?: string }
    const verified: boolean = !!result.verified;
    const live: boolean = !!result.live;
    const confidence: number = typeof result.confidence === 'number' ? result.confidence : 0;

    await ctx.runMutation(internal.attendance._recordAttendance, {
      classSessionId: args.classSessionId,
      studentId: student._id,
      status: verified && live ? 'present' : 'rejected',
      confidence,
    });

    return { verified, live, confidence, reason: result.reason };
  },
});
