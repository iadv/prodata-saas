'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using your existing method
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { messageId, conversationId, chartData } = await request.json();
    
    if (!messageId || !conversationId || !chartData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Update the message with chart data
    const schemaName = `user_${user.id}`;
    
    // Use the text casting for both IDs to avoid type issues
    const updateMessageQuery = `
      UPDATE "${schemaName}".messages
      SET chart_data = $1
      WHERE id::text = $2 AND conversation_id::text = $3
      RETURNING id
    `;
    
    try {
      const result = await sql.query(updateMessageQuery, [
        JSON.stringify(chartData),
        messageId,
        conversationId
      ]);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true });
    } catch (sqlError) {
      console.error('SQL Error in chart update:', sqlError);
    
      const errorMessage = sqlError instanceof Error ? sqlError.message : 'Unknown database error';
    
      return NextResponse.json(
        { error: `Database error: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating chart:', error);
  
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
    return NextResponse.json(
      { error: `Failed to generate chart: ${errorMessage}` },
      { status: 500 }
    );
  }
}