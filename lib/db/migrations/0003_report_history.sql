CREATE TABLE IF NOT EXISTS "report_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "prompt" TEXT NOT NULL,
  "report_content" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
); 