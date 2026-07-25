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

    const response = await fetch(`${faceApiUrl}/verify-liveness`, {
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Face verification service error (${response.status}): ${text}`);
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
