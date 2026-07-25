import { mutation } from './_generated/server';

const DEMO_COURSES = [
  { code: 'CSC 301', title: 'Data Structures & Algorithms', lecturer: 'Dr. Adeyemi' },
  { code: 'MTH 204', title: 'Linear Algebra', lecturer: 'Prof. Chukwu' },
  { code: 'PHY 210', title: 'Electromagnetism', lecturer: 'Dr. Balogun' },
  { code: 'ENG 105', title: 'Technical Writing', lecturer: 'Mrs. Okafor' },
];

// Idempotent: safe to call every time the app opens. Only inserts demo
// courses + an open "today" session the first time it runs (i.e. when the
// courses table is empty).
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('courses').first();
    if (existing) return { seeded: false };

    const courseIds = [];
    for (const c of DEMO_COURSES) {
      const courseId = await ctx.db.insert('courses', c);
      courseIds.push(courseId);
      await ctx.db.insert('classSessions', {
        courseId,
        title: "Today's Session",
        date: Date.now(),
        isOpen: true,
      });
    }

    // Auto-enroll any students who registered before courses existed
    const students = await ctx.db.query('students').collect();
    for (const student of students) {
      for (const courseId of courseIds) {
        await ctx.db.insert('enrollments', { courseId, studentId: student._id });
      }
    }

    return { seeded: true };
  },
});
