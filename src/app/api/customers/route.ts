import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, and, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';

// Schema validation
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddress: z.any().optional(),
  shippingAddress: z.any().optional(),
  creditLimit: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/customers - List all customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Build where conditions
    const conditions = [eq(customers.isActive, true)];
    
    if (search) {
      conditions.push(
        ilike(customers.name, `%${search}%`)
      );
    }

    // Get customers with pagination
    const result = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      customers: result,
      pagination: {
        page,
        limit,
        total: result.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    // TODO: Get companyId from session
    const companyId = 'company-123'; // Replace with actual session

    // Generate customer number
    const lastCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, companyId))
      .orderBy(desc(customers.customerNumber))
      .limit(1);

    const customerNumber = lastCustomer.length > 0
      ? `CUST${(parseInt(lastCustomer[0].customerNumber.slice(4)) + 1).toString().padStart(4, '0')}`
      : 'CUST0001';

    // Create customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        companyId,
        customerNumber,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        billingAddress: validatedData.billingAddress,
        shippingAddress: validatedData.shippingAddress,
        creditLimit: validatedData.creditLimit,
        taxId: validatedData.taxId,
        notes: validatedData.notes,
        balance: '0',
        isActive: true,
      })
      .returning();

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { errors: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to create customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
