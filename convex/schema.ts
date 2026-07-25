import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // A student account. Password is hashed (never store plaintext).
  students: defineTable({
    studentId: v.string(), // e.g. matric/registration number, used to log in
    fullName: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    faceEnrolled: v.boolean(),
    faceImageId: v.optional(v.id('_storage')), // reference/enrollment photo
  })
    .index('by_studentId', ['studentId'])
    .index('by_email', ['email']),

  // Login sessions (simple bearer-token auth, not to be confused with class sessions below)
  authTokens: defineTable({
    studentId: v.id('students'),
    token: v.string(),
    createdAt: v.number(),
  }).index('by_token', ['token']),

  courses: defineTable({
    code: v.string(), // e.g. "CSC 301"
    title: v.string(),
    lecturer: v.string(),
  }).index('by_code', ['code']),

  // A course can have many enrolled students
  enrollments: defineTable({
    courseId: v.id('courses'),
    studentId: v.id('students'),
  })
    .index('by_course', ['courseId'])
    .index('by_student', ['studentId']),

  // A single class meeting during which attendance can be marked
  classSessions: defineTable({
    courseId: v.id('courses'),
    title: v.string(), // e.g. "Week 5 Lecture"
    date: v.number(), // ms timestamp of the session start
    isOpen: v.boolean(), // whether check-in is currently accepted
  }).index('by_course', ['courseId']),

  attendanceRecords: defineTable({
    classSessionId: v.id('classSessions'),
    studentId: v.id('students'),
    status: v.union(v.literal('present'), v.literal('rejected')),
    confidence: v.number(), // similarity score returned by the face-verification API
    verifiedAt: v.number(),
  })
    .index('by_session', ['classSessionId'])
    .index('by_student', ['studentId'])
    .index('by_session_and_student', ['classSessionId', 'studentId']),
});
