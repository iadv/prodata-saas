import Papa from 'papaparse';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// check if the POSTGRES_URL environment variable is set
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
  // Remove null/undefined/empty values for type inference
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) {
    return 'text';
  }

  // Check if all values are numbers
  const allNumbers = nonNullValues.every(v => !isNaN(v) && v.toString().trim() !== '');
  if (allNumbers) {
    // Check if any value has decimal point
    const hasDecimals = nonNullValues.some(v => v.toString().includes('.'));
    return hasDecimals ? 'numeric' : 'integer';
  }

  // Check if all values match date format
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

      const values = batch.flatMap(row => 
        columns.map(col => {
          const value = row[col.name];
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
          
          // Get all column names from the first row
          const columnNames = Object.keys(results.data[0]);
          
          // Infer column types by analyzing all values in each column
          const columns: ColumnInfo[] = columnNames.map(key => {
            const columnValues = results.data.map(row => row[key]);
            return {
              name: sanitizeColumnName(key),
              type: inferColumnType(columnValues),
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

async function processPDFFile(
  file: File,
  updateProgress: (progress: number) => void,
  updateStatus: (message: string) => void
): Promise<void> {
  updateStatus('PDF processing not implemented yet');
  throw new Error('PDF processing not implemented yet');
}

export async function processFiles(
  files: File[],
  updateProgress: (progress: number) => void,
  updateStatus: (message: string) => void
): Promise<void> {
  updateStatus('Initializing file processing');

  const totalFiles = files.length;
  let processedFiles = 0;

  try {
    // Test database connection before processing
    updateStatus('Testing database connection');
    await sql`SELECT 1`;
    updateStatus('Database connection successful');

    for (const file of files) {
      try {
        updateStatus(`Processing file ${processedFiles + 1}/${totalFiles}: ${file.name}`);
        
        if (file.type === 'text/csv') {
          await processCSVFile(file, (fileProgress) => {
            const overallProgress = Math.round(
              ((processedFiles + fileProgress / 100) / totalFiles) * 100
            );
            updateProgress(overallProgress);
          }, updateStatus);
        } else if (file.type === 'application/pdf') {
          await processPDFFile(file, (fileProgress) => {
            const overallProgress = Math.round(
              ((processedFiles + fileProgress / 100) / totalFiles) * 100
            );
            updateProgress(overallProgress);
          }, updateStatus);
        }
        processedFiles++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        throw new Error(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    updateStatus('All files processed successfully');
  } catch (error) {
    console.error('Fatal error during file processing:', error);
    throw error;
  }
}