import { ConvexReactClient } from 'convex/react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL is not set. Add it to your .env file (see README.md).'
  );
}

export const convex = new ConvexReactClient(convexUrl);
