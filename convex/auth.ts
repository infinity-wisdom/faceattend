import { v } from 'convex/values';
import { action, internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';

function makeToken() {
  // Random 32-byte hex token
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const register = action({
  args: {
    studentId: v.string(),
    fullName: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const existing = await ctx.runQuery(internal.auth._findByStudentId, {
      studentId: args.studentId,
    });
    if (existing) {
      throw new Error('A student with this ID already has an account.');
    }
    const passwordHash: string = await ctx.runAction(internal.crypto.hashPassword, {
      password: args.password,
    });
    const { token } = await ctx.runMutation(internal.auth._createStudentAndToken, {
      studentId: args.studentId,
      fullName: args.fullName,
      email: args.email,
      passwordHash,
    });
    return { token };
  },
});

export const login = action({
  args: { studentId: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const student = await ctx.runQuery(internal.auth._findByStudentId, {
      studentId: args.studentId,
    });
    if (!student) {
      throw new Error('No account found for that student ID.');
    }
    const valid: boolean = await ctx.runAction(internal.crypto.comparePassword, {
      password: args.password,
      hash: student.passwordHash,
    });
    if (!valid) {
      throw new Error('Incorrect password.');
    }
    const token = await ctx.runMutation(internal.auth._createToken, {
      studentId: student._id,
    });
    return { token };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const authToken = await ctx.db
      .query('authTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!authToken) return null;
    const student = await ctx.db.get(authToken.studentId);
    if (!student) return null;
    return {
      _id: student._id,
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      faceEnrolled: student.faceEnrolled,
    };
  },
});

// --- internal helpers ---

export const _findByStudentId = internalQuery({
  args: { studentId: v.string() },
  handler: async (ctx, { studentId }) => {
    return ctx.db
      .query('students')
      .withIndex('by_studentId', (q) => q.eq('studentId', studentId))
      .unique();
  },
});

export const _createStudentAndToken = internalMutation({
  args: {
    studentId: v.string(),
    fullName: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const studentDocId = await ctx.db.insert('students', {
      studentId: args.studentId,
      fullName: args.fullName,
      email: args.email,
      passwordHash: args.passwordHash,
      faceEnrolled: false,
    });

    // Auto-enroll into all existing courses (the preloaded demo courses, plus
    // any real ones an admin has added) so the student sees them right away.
    const courses = await ctx.db.query('courses').collect();
    for (const course of courses) {
      await ctx.db.insert('enrollments', { courseId: course._id, studentId: studentDocId });
    }

    const token = makeToken();
    await ctx.db.insert('authTokens', {
      studentId: studentDocId,
      token,
      createdAt: Date.now(),
    });
    return { token };
  },
});

export const _createToken = internalMutation({
  args: { studentId: v.id('students') },
  handler: async (ctx, { studentId }) => {
    const token = makeToken();
    await ctx.db.insert('authTokens', { studentId, token, createdAt: Date.now() });
    return token;
  },
});
