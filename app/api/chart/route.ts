'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { generateChartConfig } from '@/app/(dashboard)/dashboard/vercelchat/actions';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { results, userQuery, messageId, conversationId } = await request.json();
    
    if (!results || !userQuery) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Generate chart configuration
    const chartConfig = await generateChartConfig(results, userQuery);
    
    // If messageId and conversationId are provided, update the message with chart data
    if (messageId && conversationId) {
      const schemaName = `user_${user.id}`;
      
      try {
        // First, inspect the table structure to understand column types
        const tableInfoQuery = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'messages'
        `;
        
        const tableInfo = await sql.query(tableInfoQuery, [schemaName]);
        console.log('Table structure:', tableInfo.rows);
        
        // With the table info, we can now make a type-safe update
        let updateMessageQuery;
        
        // Find the data types of id and conversation_id columns
        const idColumn = tableInfo.rows.find(col => col.column_name === 'id');
        const convIdColumn = tableInfo.rows.find(col => col.column_name === 'conversation_id');
        
        if (!idColumn || !convIdColumn) {
          throw new Error('Could not determine column types');
        }
        
        console.log('ID column type:', idColumn.data_type);
        console.log('Conversation ID column type:', convIdColumn.data_type);
        
        // Generate the appropriate query based on the actual column types
        if (idColumn.data_type.includes('uuid')) {
          // If the columns are UUID type
          updateMessageQuery = `
            UPDATE "${schemaName}".messages
            SET chart_data = $1
            WHERE id = $2::uuid AND conversation_id = $3::uuid
            RETURNING id
          `;
        } else if (idColumn.data_type.includes('int')) {
          // If the columns are integer type
          // Try to parse the UUIDs as integers if possible, or use a different approach
          updateMessageQuery = `
            UPDATE "${schemaName}".messages
            SET chart_data = $1
            WHERE id::text = $2 AND conversation_id::text = $3
            RETURNING id
          `;
        } else {
          // For other types, try a text comparison
          updateMessageQuery = `
            UPDATE "${schemaName}".messages
            SET chart_data = $1
            WHERE id::text = $2 AND conversation_id::text = $3
            RETURNING id
          `;
        }
        
        const updateResult = await sql.query(updateMessageQuery, [
          JSON.stringify({
            config: chartConfig.config,
            data: results
          }),
          messageId,
          conversationId
        ]);
        
        console.log('Update result:', updateResult.rows);
      } catch (sqlError) {
        console.error('SQL Error in chart update:', sqlError);
        throw new Error(`Database error: ${sqlError.message}`);
      }
    }
    
    return NextResponse.json({ chartConfig });
  } catch (error) {
    console.error('Error generating chart:', error);
    return NextResponse.json(
      { error: `Failed to generate chart: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}