import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// --- Simple admin/lecturer setup functions (call these once from the Convex dashboard
// or a temporary script to seed data — see README for instructions) ---

export const createCourse = mutation({
  args: { code: v.string(), title: v.string(), lecturer: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.insert('courses', args);
  },
});

export const openClassSession = mutation({
  args: { courseId: v.id('courses'), title: v.string() },
  handler: async (ctx, { courseId, title }) => {
    return ctx.db.insert('classSessions', {
      courseId,
      title,
      date: Date.now(),
      isOpen: true,
    });
  },
});

export const closeClassSession = mutation({
  args: { classSessionId: v.id('classSessions') },
  handler: async (ctx, { classSessionId }) => {
    await ctx.db.patch(classSessionId, { isOpen: false });
  },
});

export const enrollStudentInCourse = mutation({
  args: { courseId: v.id('courses'), studentId: v.id('students') },
  handler: async (ctx, args) => {
    return ctx.db.insert('enrollments', args);
  },
});

// --- Queries used by the app ---

async function studentFromToken(ctx: any, token: string) {
  const authToken = await ctx.db
    .query('authTokens')
    .withIndex('by_token', (q: any) => q.eq('token', token))
    .unique();
  if (!authToken) throw new Error('Not authenticated.');
  return ctx.db.get(authToken.studentId);
}

// Open class sessions for courses the logged-in student is enrolled in
export const getOpenSessionsForStudent = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const student = await studentFromToken(ctx, token);
    if (!student) return [];
    const enrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_student', (q) => q.eq('studentId', student._id))
      .collect();

    const results = [];
    for (const e of enrollments) {
      const course = await ctx.db.get(e.courseId);
      if (!course) continue;
      const sessions = await ctx.db
        .query('classSessions')
        .withIndex('by_course', (q) => q.eq('courseId', course._id))
        .filter((q) => q.eq(q.field('isOpen'), true))
        .collect();
      for (const s of sessions) {
        results.push({ session: s, course });
      }
    }
    return results;
  },
});
