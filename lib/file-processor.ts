// pages/api/handle-file.ts

import { NextApiRequest, NextApiResponse } from 'next';
import Papa from 'papaparse';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { getSession } from '@/lib/auth/session';
import { getUser } from '@/lib/db/queries';
// for the library table to work. Imports are below
import fs from "fs";
import csvParser from "csv-parser";
import { Pool } from "pg";
// import { generateContext, generateSampleQuestions } from "@/app/(dashboard)/dashboard/upload/actions";
import { openai } from "@ai-sdk/openai";
// import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";
// import { Configuration, OpenAIApi } from "openai";
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { generateContext } from '@/app/(dashboard)/dashboard/vercelchat/actions';
import { generateSampleQuestions } from '@/app/(dashboard)/dashboard/vercelchat/actions';
import { generateSampleQuestions_mobile } from '@/app/(dashboard)/dashboard/vercelchat/actions';

// Initialize OpenAI API
// const configuration = new Configuration({
 // apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);


//import { getSession } from './auth/session'; // Adjust the import path as needed

dotenv.config();

if (!process.env.NEXT_PUBLIC_POSTGRES_URL_NON_POOLING) {
  throw new Error('Database connection URL is not configured');
}

const DATABASE_URL = process.env.NEXT_PUBLIC_POSTGRES_URL_NON_POOLING;
const sql = neon(DATABASE_URL);

interface ColumnInfo {
  originalName: string;
  name: string;
  type: string;
  nullable: boolean;
}

function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');
}

function inferColumnType(values: any[]): string {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) {
    return 'text';
  }

  const allNumbers = nonNullValues.every(v => !isNaN(v) && v.toString().trim() !== '');
  if (allNumbers) {
    const hasDecimals = nonNullValues.some(v => v.toString().includes('.'));
    return hasDecimals ? 'numeric' : 'integer';
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const allDates = nonNullValues.every(v => dateRegex.test(v.toString()));
  if (allDates) {
    return 'date';
  }

  return 'text';
}

async function createTableFromData(
  schemaName: string,
  tableName: string,
  columns: ColumnInfo[],
  data: any[],
  updateStatus: (message: string) => void
): Promise<void> {
  try {
    updateStatus(`Checking schema existence: ${schemaName}`);
    await createSchemaIfNotExists(schemaName);

    updateStatus(`Creating table: ${schemaName}.${tableName}`);
    
    // Define column names and types
    const columnDefinitions = columns
      .map(col => `"${col.name}" ${col.type}${col.nullable ? '' : ' NOT NULL'}`)
      .join(', ');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (
        id SERIAL PRIMARY KEY,
        ${columnDefinitions},
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    // Log query and execute
    console.log('Creating table with query:', createTableQuery);
    await sql(createTableQuery);

    // Insert data in batches
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      updateStatus(`Inserting batch ${currentBatch}/${totalBatches} for ${schemaName}.${tableName}`);

      const placeholders = batch.map((_, rowIndex) =>
        `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
      ).join(', ');

      const values = batch.flatMap((row: Record<string, any>) =>
        columns.map(col => {
          const value = row[col.originalName];
          return value === null || value === undefined || value === '' ? null : value;
        })
      );

      const insertQuery = `
        INSERT INTO "${schemaName}"."${tableName}" (${columns.map(col => `"${col.name}"`).join(', ')})
        VALUES ${placeholders}
      `;

      console.log('Inserting data with query:', insertQuery);
      await sql(insertQuery, values);
    }

    updateStatus(`Successfully processed ${schemaName}.${tableName}`);
  } catch (error) {
    console.error('Database error:', error);
    updateStatus(`Error processing table ${schemaName}.${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Function to create the library table if it doesn't exist
async function createLibraryTable(schemaName: string): Promise<void> {
  const checkLibraryTableQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1 AND table_name = 'library';
  `;
  const result = await sql(checkLibraryTableQuery, [schemaName]);

  // If the library table doesn't exist, create it
  if (result.length === 0) {
    const createLibraryTableQuery = `
      CREATE TABLE IF NOT EXISTS "${schemaName}".library (
        id SERIAL PRIMARY KEY,
        table_name TEXT NOT NULL,
        column_names TEXT NOT NULL,
        context TEXT NOT NULL,
        sample_question_1 TEXT,
        sample_question_2 TEXT,
        sample_question_3 TEXT,
        sample_question_4 TEXT,
        sample_question_5 TEXT,
        sample_question_6 TEXT,
        sample_question_7 TEXT,
        sample_question_8 TEXT,
        sample_question_9 TEXT,
        sample_question_10 TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql(createLibraryTableQuery);
  }
}

// Function to add a new row to the library table with context
async function addRowToLibraryTable(schemaName: string, tableName: string, columns: ColumnInfo[]): Promise<void> {
  // Generate context based on columns
  const context = await generateContext(columns);

  // Concatenate the column names into a single string
  const columnNames = columns.map(col => col.name).join(' ');

  // Generate sample questions (which returns an array of 5 questions) for web viewing
  const sampleQuestions = await generateSampleQuestions(columns);

    // Generate sample questions (which returns an array of 5 questions) for mobile viewing
    const sampleQuestions_mobile = await generateSampleQuestions_mobile(columns);

  // Insert into the library table
  const insertQuery = `
    INSERT INTO "${schemaName}".library (table_name, column_names, context, sample_question_1, sample_question_2, sample_question_3, sample_question_4, sample_question_5, sample_question_6, sample_question_7, sample_question_8, sample_question_9, sample_question_10)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `;
  await sql(insertQuery, [
    tableName,
    columnNames,
    context,
    sampleQuestions[0],
    sampleQuestions[1],
    sampleQuestions[2],
    sampleQuestions[3],
    sampleQuestions[4],
    sampleQuestions_mobile[0],
    sampleQuestions_mobile[1],
    sampleQuestions_mobile[2],
    sampleQuestions_mobile[3],
    sampleQuestions_mobile[4]
  ]);
}




async function processFiles(
  file: File,
  updateProgress: (progress: number) => void,
  updateStatus: (message: string) => void,
  //context: { req: NextApiRequest }
): Promise<void> {
  updateStatus(`Reading CSV file: ${file.name}`);

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          updateStatus(`Analyzing CSV structure for ${file.name}`);

          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            throw new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`);
          }

          if (results.data.length === 0) {
            throw new Error('CSV file is empty');
          }

          // Sanitize table name
          const tableName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/^[0-9]/, '_$&');

          // Extract columns and infer types
          const columns: ColumnInfo[] = Object.keys(results.data[0]as Record<string, any>).map(header => {
            const sanitizedHeader = sanitizeColumnName(header);
            const columnValues = results.data.map((row: any) => row[header]);
            const inferredType = inferColumnType(columnValues);
            const nullable = columnValues.some((value: any) => value === null || value === undefined || value === '');
            return {
              originalName: header,
              name: sanitizedHeader,
              type: inferredType,
              nullable,
            };
          });

          // Generate context for the table using the column information
          const context = await generateContext(columns);
          updateStatus(`Generated context: ${context}`);

          // Generate sample questions for the table using the column information for web viewing

          const sampleQuestions = await generateSampleQuestions(columns);
          console.log("Sample Questions:", sampleQuestions);

          // Generate sample questions for the table using the column information for mobile viewing
          const sampleQuestions_mobile = await generateSampleQuestions_mobile(columns);
          console.log("Sample Questions:", sampleQuestions_mobile);

          // Retrieve user session
          const user = await getUser();

          if (!user) {
            throw new Error('User session not found');
          }

          // Create schema name based on user ID
          const schemaName = `user_${user.id}`;

          // Create schema if it doesn't exist
          await createSchemaIfNotExists(schemaName);

          // Create the library table if it doesn't exist
          await createLibraryTable(schemaName);

          // Add a new row to the library table for this new CSV table
          await addRowToLibraryTable(schemaName, tableName, columns);

          // Create table and insert data into the user's schema
          await createTableFromData(schemaName, tableName, columns, results.data, updateStatus);


          updateStatus(`Successfully processed CSV for ${schemaName}.${tableName}`);
          resolve();
        } catch (error) {
          console.error('Error processing file:', error);
          updateStatus(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          reject(error);
          
        }
      },
    });
  });
}

async function createSchemaIfNotExists(schemaName: string): Promise<void> {
  const checkSchemaQuery = `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = $1
  `;
  const result = await sql(checkSchemaQuery, [schemaName]);

  if (result.length === 0) {
    const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`;
    await sql(createSchemaQuery);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // Call the processFiles function with request context
      await processFiles(req.body.file, (progress) => { /* update progress */ }, (message) => { /* update status */ }, { req });

      res.status(200).json({ message: 'File processed successfully' });
    } catch (error) {
      console.error('Error in API handler:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Log all incoming request headers
  console.log('Request Headers:', req.headers);

  // Check if the 'cookie' header is present
  if (req.headers.cookie) {
    console.log('Cookies:', req.headers.cookie);
  } else {
    console.log('No cookies found in the request headers.');
  }

}


export { processFiles };