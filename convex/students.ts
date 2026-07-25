import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';

async function studentFromToken(ctx: any, token: string) {
  const authToken = await ctx.db
    .query('authTokens')
    .withIndex('by_token', (q: any) => q.eq('token', token))
    .unique();
  if (!authToken) throw new Error('Not authenticated.');
  const student = await ctx.db.get(authToken.studentId);
  if (!student) throw new Error('Not authenticated.');
  return student;
}

// Called after the enrollment photo has been uploaded via the URL from files.generateUploadUrl
export const completeFaceEnrollment = mutation({
  args: { token: v.string(), storageId: v.id('_storage') },
  handler: async (ctx, { token, storageId }) => {
    const student = await studentFromToken(ctx, token);
    await ctx.db.patch(student._id, { faceImageId: storageId, faceEnrolled: true });
    return { success: true };
  },
});

export const getReferenceImageUrl = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const student = await studentFromToken(ctx, token);
    if (!student.faceImageId) return null;
    return ctx.storage.getUrl(student.faceImageId);
  },
});

// --- internal, used by the faceVerification action ---

export const _getStudentByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const authToken = await ctx.db
      .query('authTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!authToken) return null;
    return ctx.db.get(authToken.studentId);
  },
});

export const _getReferenceImageUrl = internalQuery({
  args: { studentId: v.id('students') },
  handler: async (ctx, { studentId }) => {
    const student = await ctx.db.get(studentId);
    if (!student?.faceImageId) return null;
    return ctx.storage.getUrl(student.faceImageId);
  },
});
