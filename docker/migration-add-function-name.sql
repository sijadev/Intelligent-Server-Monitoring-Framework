-- Migration to add missing columns to database tables
-- This fixes PostgresErrors: column "function_name" and "source_directories" do not exist

-- Add function_name column to code_issues table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='code_issues' 
        AND column_name='function_name'
    ) THEN
        ALTER TABLE code_issues ADD COLUMN function_name TEXT;
        RAISE NOTICE 'Added function_name column to code_issues table';
    ELSE
        RAISE NOTICE 'Column function_name already exists in code_issues table';
    END IF;
END $$;

-- Add source_directories column to code_analysis_runs table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='code_analysis_runs' 
        AND column_name='source_directories'
    ) THEN
        ALTER TABLE code_analysis_runs ADD COLUMN source_directories TEXT[];
        RAISE NOTICE 'Added source_directories column to code_analysis_runs table';
    ELSE
        RAISE NOTICE 'Column source_directories already exists in code_analysis_runs table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'code_issues' 
ORDER BY ordinal_position;