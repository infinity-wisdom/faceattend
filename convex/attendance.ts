import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';

async function studentFromToken(ctx: any, token: string) {
  const authToken = await ctx.db
    .query('authTokens')
    .withIndex('by_token', (q: any) => q.eq('token', token))
    .unique();
  if (!authToken) throw new Error('Not authenticated.');
  return ctx.db.get(authToken.studentId);
}

// Used internally by the faceVerification action once a match has been scored
export const _recordAttendance = internalMutation({
  args: {
    classSessionId: v.id('classSessions'),
    studentId: v.id('students'),
    status: v.union(v.literal('present'), v.literal('rejected')),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    // Avoid duplicate "present" records for the same session
    const existing = await ctx.db
      .query('attendanceRecords')
      .withIndex('by_session_and_student', (q) =>
        q.eq('classSessionId', args.classSessionId).eq('studentId', args.studentId)
      )
      .filter((q) => q.eq(q.field('status'), 'present'))
      .unique();
    if (existing) return existing._id;

    return ctx.db.insert('attendanceRecords', {
      ...args,
      verifiedAt: Date.now(),
    });
  },
});

// Dashboard: this student's attendance history across all courses
export const getMyAttendanceHistory = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const student = await studentFromToken(ctx, token);
    if (!student) return [];
    const records = await ctx.db
      .query('attendanceRecords')
      .withIndex('by_student', (q) => q.eq('studentId', student._id))
      .order('desc')
      .collect();

    const enriched = [];
    for (const r of records) {
      const session = await ctx.db.get(r.classSessionId);
      const course = session ? await ctx.db.get(session.courseId) : null;
      enriched.push({ record: r, session, course });
    }
    return enriched;
  },
});

// Dashboard summary stats: total sessions attended vs total held, per course
export const getMyAttendanceSummary = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const student = await studentFromToken(ctx, token);
    if (!student) return [];

    const enrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_student', (q) => q.eq('studentId', student._id))
      .collect();

    const summary = [];
    for (const e of enrollments) {
      const course = await ctx.db.get(e.courseId);
      if (!course) continue;
      const allSessions = await ctx.db
        .query('classSessions')
        .withIndex('by_course', (q) => q.eq('courseId', course._id))
        .collect();
      let present = 0;
      for (const s of allSessions) {
        const rec = await ctx.db
          .query('attendanceRecords')
          .withIndex('by_session_and_student', (q) =>
            q.eq('classSessionId', s._id).eq('studentId', student._id)
          )
          .filter((q) => q.eq(q.field('status'), 'present'))
          .unique();
        if (rec) present += 1;
      }
      summary.push({
        course,
        totalSessions: allSessions.length,
        attended: present,
        percentage: allSessions.length > 0 ? Math.round((present / allSessions.length) * 100) : 0,
      });
    }
    return summary;
  },
});
