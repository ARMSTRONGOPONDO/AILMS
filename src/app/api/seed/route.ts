import { NextResponse } from 'next/server';
import { seed } from '@/utils/seed-data';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async () => {
  await seed();
  return { success: true, message: 'Database seeded successfully' };
});
