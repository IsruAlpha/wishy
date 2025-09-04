-- Create wishes table
CREATE TABLE IF NOT EXISTS wishes (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table (for likes)
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  wish_id BIGINT REFERENCES wishes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  wish_id BIGINT REFERENCES wishes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON wishes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_wish_id ON votes(wish_id);
CREATE INDEX IF NOT EXISTS idx_comments_wish_id ON comments(wish_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write
CREATE POLICY IF NOT EXISTS "Allow public read access on wishes" ON wishes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public insert on wishes" ON wishes FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public read access on votes" ON votes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public insert on votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow public delete on votes" ON votes FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access on comments" ON comments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public insert on comments" ON comments FOR INSERT WITH CHECK (true);

