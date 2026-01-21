// Sync Configuration API Routes
// GET /api/sync/config - Get sync configuration
// POST /api/sync/config - Save sync configuration
// POST /api/sync/config/test - Test ODBC connection

import { NextRequest, NextResponse } from 'next/server';
import { PeachtreeHybridSync } from '@/lib/peachtree/hybrid-sync';
import { db } from '@/db';
import { syncConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Get sync configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const [config] = await db
      .select()
      .from(syncConfigs)
      .where(eq(syncConfigs.companyId, companyId))
      .limit(1);

    if (!config) {
      return NextResponse.json({
        config: null,
        message: 'No sync configuration found',
      });
    }

    // Don't return password in response
    return NextResponse.json({
      config: {
        ...config,
        password: config.password ? '********' : null,
      },
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Save sync configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      connectionType,
      dsn,
      username,
      password,
      autoSyncEnabled,
      autoSyncInterval,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Check if config exists
    const [existing] = await db
      .select()
      .from(syncConfigs)
      .where(eq(syncConfigs.companyId, companyId))
      .limit(1);

    const configData = {
      connectionType: connectionType || 'ODBC',
      dsn: dsn || null,
      username: username || null,
      password: password || null,
      autoSyncEnabled: autoSyncEnabled ?? false,
      autoSyncInterval: autoSyncInterval || 'DAILY',
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing - only update password if provided
      const updateData = { ...configData };
      if (!password || password === '********') {
        delete (updateData as any).password;
      }

      await db
        .update(syncConfigs)
        .set(updateData)
        .where(eq(syncConfigs.companyId, companyId));
    } else {
      // Create new
      await db.insert(syncConfigs).values({
        companyId,
        ...configData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved',
    });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
