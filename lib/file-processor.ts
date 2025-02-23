import Papa from 'papaparse';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Check if the POSTGRES_URL environment variable is set
if (!process.env.NEXT_PUBLIC_POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// Use the non-pooling URL for direct connections
const DATABASE_URL = process.env.NEXT_PUBLIC_POSTGRES_URL_NON_POOLING;

if (!DATABASE_URL) {
  throw new Error('Database connection URL is not configured');
}

// Initialize the neon client
const sql = neon(DATABASE_URL);

interface ColumnInfo {
  originalName: string; // Original header from CSV
  name: string;         // Sanitized name used in the DB
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
  // Remove null/undefined/empty values for type inference
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) {
    return 'text';
  }

  // Check if all values are numbers
  const allNumbers = nonNullValues.every(v => !isNaN(v) && v.toString().trim() !== '');
  if (allNumbers) {
    // Check if any value has a decimal point
    const hasDecimals = nonNullValues.some(v => v.toString().includes('.'));
    return hasDecimals ? 'numeric' : 'integer';
  }

  // Check if all values match date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const allDates = nonNullValues.every(v => dateRegex.test(v.toString()));
  if (allDates) {
    return 'date';
  }

  return 'text';
}

async function createTableFromData(
  tableName: string,
  columns: ColumnInfo[],
  data: any[],
  updateStatus: (message: string) => void
): Promise<void> {
  updateStatus(`Creating table: ${tableName}`);

  try {
    // Create table
    const columnDefinitions = columns
      .map(col => `"${col.name}" ${col.type}${col.nullable ? '' : ' NOT NULL'}`)
      .join(', ');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id SERIAL PRIMARY KEY,
        ${columnDefinitions},
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    updateStatus(`Creating table structure for ${tableName}`);
    await sql(createTableQuery);

    // Insert data in batches
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      updateStatus(`Inserting batch ${currentBatch}/${totalBatches} for ${tableName}`);

      if (batch.length === 0) continue;

      const placeholders = batch.map((_, rowIndex) =>
        `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
      ).join(', ');

      // Use the original CSV header (col.originalName) to fetch values from the row
      const values = batch.flatMap((row: Record<string, any>) =>
        columns.map(col => {
          const value = row[col.originalName];
          if (value === null || value === undefined || value === '') {
            return null;
          }
          // Convert to appropriate type
          switch (col.type) {
            case 'integer':
              return parseInt(value, 10);
            case 'numeric':
              return parseFloat(value);
            case 'date':
              return value;
            default:
              return value.toString();
          }
        })
      );

      const insertQuery = `
        INSERT INTO "${tableName}" (${columns.map(col => `"${col.name}"`).join(', ')})
        VALUES ${placeholders}
      `;

      await sql(insertQuery, values);
    }

    updateStatus(`Completed processing ${tableName}`);
  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to create/populate table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processCSVFile(
  file: File,
  updateProgress: (progress: number) => void,
  updateStatus: (message: string) => void
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
            .replace('.csv', '')
            .replace(/[^a-z0-9_]/g, '_');

          updateStatus(`Inferring column types for ${file.name}`);

          // Assuming 'results.data' is an array of objects with a known structure
          const firstRow = results.data[0] as Record<string, any>; // Assert the type

          // Get all column names from the first row (original headers)
          const columnNames = Object.keys(firstRow);

          // Build columns array with both original and sanitized names
          const columns: ColumnInfo[] = columnNames.map(key => {
            const sanitized = sanitizeColumnName(key);
            return {
              originalName: key,
              name: sanitized,
              type: inferColumnType(results.data.map((row: Record<string, any>) => row[key])),
              nullable: true
            };
          });

          console.log('Inferred column types:', columns);

          await createTableFromData(tableName, columns, results.data, updateStatus);
          updateProgress(100);
          resolve();
        } catch (error) {
          console.error(`Error processing CSV file ${file.name}:`, error);
          reject(error);
        }
      },
      error: (error) => {
        console.error(`CSV parsing error for ${file.name}:`, error);
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

export { processCSVFile };
