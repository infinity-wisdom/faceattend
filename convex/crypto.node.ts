'use node';

import bcrypt from 'bcryptjs';
import { internalAction } from './_generated/server';
import { v } from 'convex/values';

export const hashPassword = internalAction({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => {
    return bcrypt.hash(password, 10);
  },
});

export const comparePassword = internalAction({
  args: { password: v.string(), hash: v.string() },
  handler: async (_ctx, { password, hash }) => {
    return bcrypt.compare(password, hash);
  },
});
