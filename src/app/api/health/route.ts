import { NextResponse } from 'next/server';

/**
 * نقطة فحص صحة الواجهة — يستخدمها docker-compose والمراقبة (EP-10).
 */
export function GET(): NextResponse {
  return NextResponse.json({ status: 'ok', service: 'frontend' });
}
