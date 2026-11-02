import { NextResponse, type NextRequest } from 'next/server';
import { GET } from '@/app/api/sync/route';
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase admin client and syncShop
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  })
}));

// Mock the syncShop function
vi.mock('@/lib/shopify/sync', () => ({
  syncShop: vi.fn().mockResolvedValue(undefined)
}));

// Mock the env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    CRON_SECRET: 'test-secret'
  })
}));

// Mock safeEqual from @/lib/crypto
vi.mock('@/lib/crypto', () => ({
  safeEqual: (a: unknown, b: unknown) => a === b
}));

describe('GET /api/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with sync results when authorized', async () => {
    const request = {
      headers: {
        get: (key: string) => {
          if (key === 'authorization') {
            return 'Bearer test-secret';
          }
          return null;
        }
      },
      // Add missing NextRequest properties with dummy values
      cookies: () => ({}),
      nextUrl: {},
      page: () => ({}),
      ua: () => ({}),
      // Add any other properties if needed, but the handler only uses headers.get
    } as unknown as NextRequest; // We'll cast to Request to satisfy TS, but we need to match NextRequest

    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('ok');
    expect(json.ok).toBe(0);
    expect(json.failed).toBe(0);
  });

  it('should return 401 when unauthorized', async () => {
    const request = {
      headers: {
        get: (key: string) => {
          if (key === 'authorization') {
            return 'Bearer wrong-secret';
          }
          return null;
        }
      },
      cookies: () => ({}),
      nextUrl: {},
      page: () => ({}),
      ua: () => ({}),
    } as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toBe('Unauthorized.');
  });
});