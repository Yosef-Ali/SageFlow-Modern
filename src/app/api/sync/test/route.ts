// Test ODBC Connection API Route
// POST /api/sync/test - Test Peachtree ODBC connection

import { NextRequest, NextResponse } from 'next/server';
import { PeachtreeHybridSync } from '@/lib/peachtree/hybrid-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const sync = new PeachtreeHybridSync(companyId);
    const result = await sync.testConnection();

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    );
  }
}
