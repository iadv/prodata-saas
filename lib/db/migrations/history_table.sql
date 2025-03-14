-- Function to create the historical table in each user's schema
CREATE OR REPLACE FUNCTION create_historical_table(schema_name TEXT) 
RETURNS VOID AS $$
BEGIN
  -- Create the historical table in the user's schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.historical (
      id SERIAL PRIMARY KEY,
      prompt TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    
    -- Create an index on created_at for faster sorting when retrieving recent history
    CREATE INDEX IF NOT EXISTS idx_historical_created_at ON %I.historical(created_at DESC);
  ', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- This function will be called during user creation to set up the historical table