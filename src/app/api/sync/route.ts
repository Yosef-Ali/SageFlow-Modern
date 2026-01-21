// Peachtree Sync API Routes
// POST /api/sync - Start a sync job
// GET /api/sync - Get sync history

import { NextRequest, NextResponse } from 'next/server';
import { PeachtreeHybridSync, runHybridSync, type SyncOptions, type SyncableEntity } from '@/lib/peachtree/hybrid-sync';
import { db } from '@/db';
import { syncJobs, syncConfigs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// Start a new sync job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      entities,
      dateRangeStart,
      dateRangeEnd,
      forceUpdate,
      dryRun,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const options: SyncOptions = {
      entities: entities as SyncableEntity[],
      dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
      dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
      forceUpdate: forceUpdate ?? false,
      dryRun: dryRun ?? false,
    };

    const result = await runHybridSync(companyId, options);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Get sync history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const history = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.companyId, companyId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit);

    const stats = await PeachtreeHybridSync.getMappingStats(companyId);

    return NextResponse.json({
      history,
      stats,
    });
  } catch (error) {
    console.error('Get sync history error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sync history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
