// purpose of this code is to In Page.tsx, the TableSelector dropdown shows an “All” option as well as individual table names from the user’s schema. 
// The selected tables are passed into the SQL query generator so that any query limits its scope.

import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';
import { getUser } from '@/lib/db/queries';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.NEXT_PUBLIC_POSTGRES_URL_NON_POOLING) {
  throw new Error('Database connection URL is not configured');
}

const DATABASE_URL = process.env.NEXT_PUBLIC_POSTGRES_URL_NON_POOLING;
const sql = neon(DATABASE_URL);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getUser(); // Retrieve the user session based on cookie
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const schemaName = `user_${user.id}`;
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
    `;
    const tables = await sql(query, [schemaName]);
    // Map results to an array of table names
    const tableNames = tables.map((row: any) => row.table_name);
    res.status(200).json(tableNames);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
