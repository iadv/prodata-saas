'use server';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define the user's schema name
    const schemaName = `user_${user.id}`;
    await createConversationsTableIfNotExists(schemaName);

    // Get conversation ID from URL parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (conversationId) {
      // Check if the conversation exists first
      const checkResult = await sql.query(
        `SELECT id FROM "${schemaName}".conversations WHERE id = $1`,
        [conversationId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Fetch specific conversation and messages
      const conversationQuery = `
        SELECT id, title, created_at, updated_at
        FROM "${schemaName}".conversations
        WHERE id = $1
      `;

      const messagesQuery = `
        SELECT id, type, content, timestamp, table_data, chart_data, raw_query
        FROM "${schemaName}".messages
        WHERE conversation_id = $1
        ORDER BY timestamp ASC
      `;

      const [conversationResult, messagesResult] = await Promise.all([
        sql.query(conversationQuery, [conversationId]),
        sql.query(messagesQuery, [conversationId])
      ]);

      const conversation = conversationResult.rows[0];
      const messages = messagesResult.rows.map(row => ({
        id: row.id,
        type: row.type,
        content: row.content,
        timestamp: row.timestamp,
        tableData: row.table_data ? JSON.parse(row.table_data) : null,
        chartData: row.chart_data ? JSON.parse(row.chart_data) : null,
        rawQuery: row.raw_query
      }));

      return NextResponse.json({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messages
      });
    } else {
      // Fetch all conversations if no ID is provided
      const query = `
        SELECT id, title, created_at, updated_at
        FROM "${schemaName}".conversations
        ORDER BY updated_at DESC
      `;

      const result = await sql.query(query);
      return NextResponse.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define the user's schema name
    const schemaName = `user_${user.id}`;
    
    // Create the necessary tables if they don't exist
    await createConversationsTableIfNotExists(schemaName);
    
    const body = await request.json();
    const { message, conversationId, generateTitle } = body;
    
    // If no conversation ID provided, create a new conversation
    if (!conversationId) {
      const defaultTitle = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
      
      const insertConversationQuery = `
        INSERT INTO "${schemaName}".conversations (title, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id, title, created_at, updated_at
      `;
      
      const result = await sql.query(insertConversationQuery, [defaultTitle]);
      const newConversation = result.rows[0];
      
      // Insert the initial message
      await insertMessage(schemaName, {
        ...message,
        conversation_id: newConversation.id
      });
      
      return NextResponse.json({
        id: newConversation.id,
        title: newConversation.title,
        createdAt: newConversation.created_at,
        updatedAt: newConversation.updated_at,
        messages: [message]
      });
    } else {
      // Update existing conversation's last updated time
      const updateConversationQuery = `
        UPDATE "${schemaName}".conversations
        SET updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, created_at, updated_at
      `;
      
      // Check if conversation exists
      const checkResult = await sql.query(
        `SELECT id FROM "${schemaName}".conversations WHERE id = $1`,
        [conversationId]
      );
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      
      // Insert the new message
      await insertMessage(schemaName, {
        ...message,
        conversation_id: conversationId
      });
      
      // Update conversation
      const result = await sql.query(updateConversationQuery, [conversationId]);
      const updatedConversation = result.rows[0];
      
      // If this is an assistant message and we need to generate a title
      if (generateTitle && message.type === 'assistant' && updatedConversation.title.includes('...')) {
        const generateTitleQuery = `
          UPDATE "${schemaName}".conversations
          SET title = $1
          WHERE id = $2
          RETURNING title
        `;
        
        // Generate a better title from the first message exchange
        const firstMessagesQuery = `
          SELECT content FROM "${schemaName}".messages
          WHERE conversation_id = $1
          ORDER BY timestamp ASC
          LIMIT 2
        `;
        
        const messagesResult = await sql.query(firstMessagesQuery, [conversationId]);
        
        if (messagesResult.rows.length >= 2) {
          const userMessage = messagesResult.rows[0].content;
          const betterTitle = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
          await sql.query(generateTitleQuery, [betterTitle, conversationId]);
          updatedConversation.title = betterTitle;
        }
      }
      
      return NextResponse.json({
        id: updatedConversation.id,
        title: updatedConversation.title,
        createdAt: updatedConversation.created_at,
        updatedAt: updatedConversation.updated_at,
        message: message
      });
    }
  } catch (error) {
    console.error('Error creating/updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define the user's schema name
    const schemaName = `user_${user.id}`;
    
    // Get conversation ID from URL parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }
    
    // Delete the messages first (due to foreign key constraints)
    const deleteMessagesQuery = `
      DELETE FROM "${schemaName}".messages
      WHERE conversation_id = $1
    `;
    
    // Then delete the conversation
    const deleteConversationQuery = `
      DELETE FROM "${schemaName}".conversations
      WHERE id = $1
      RETURNING id
    `;
    
    await sql.query(deleteMessagesQuery, [conversationId]);
    const result = await sql.query(deleteConversationQuery, [conversationId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

// Helper function to create the conversations and messages tables if they don't exist
async function createConversationsTableIfNotExists(schemaName: string) {
  // Create schema if it doesn't exist
  await sql.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  
  // Create conversations table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".conversations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);
  
  // Create messages table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES "${schemaName}".conversations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      table_data JSONB,
      chart_data JSONB,
      raw_query TEXT
    )
  `);
}

// Helper function to insert a message
async function insertMessage(schemaName: string, message: any) {
  const insertMessageQuery = `
    INSERT INTO "${schemaName}".messages (
      conversation_id, type, content, timestamp, table_data, chart_data, raw_query
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;
  
  return await sql.query(insertMessageQuery, [
    message.conversation_id,
    message.type,
    message.content,
    new Date(),
    message.tableData ? JSON.stringify(message.tableData) : null,
    message.chartData ? JSON.stringify(message.chartData) : null,
    message.rawQuery || null
  ]);
}