-- --- Step 1: Drop the subscribers table if it exists ---
DROP TABLE IF EXISTS subscribers;

-- --- Step 2: Create the subscribers table ---
CREATE TABLE subscribers (
    id SERIAL PRIMARY KEY,         -- Unique ID for each subscriber
    email VARCHAR(255) UNIQUE NOT NULL,  -- Email address of the subscriber
    date_subscribed TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Timestamp when the user subscribed
);

-- --- Step 3: Check if the table exists and show its structure ---
-- Check if the subscribers table exists in the public schema
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'subscribers'
);

-- If the table exists, show its structure
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'subscribers';

-- --- Step 4: Insert some sample data into the subscribers table (Optional) ---
-- This is for testing purposes; you can remove this if not needed.
INSERT INTO subscribers (email)
VALUES
    ('example1@test.com'),
    ('example2@test.com'),
    ('example3@test.com');
