-- Create wishes table
CREATE TABLE wishes (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table (updated with client_id for per-device likes)
CREATE TABLE votes (
  id BIGSERIAL PRIMARY KEY,
  wish_id BIGINT REFERENCES wishes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upvote', 'downvote')),
  client_id TEXT NOT NULL, -- This tracks which device/browser liked the wish
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wish_id, client_id) -- Prevent duplicate votes per device
);

-- Create comments table
CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  wish_id BIGINT REFERENCES wishes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_wishes_created_at ON wishes(created_at DESC);
CREATE INDEX idx_votes_wish_id ON votes(wish_id);
CREATE INDEX idx_votes_client_id ON votes(client_id);
CREATE INDEX idx_comments_wish_id ON comments(wish_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write (for now)
-- You can make these more restrictive later
CREATE POLICY "Allow public read access on wishes" ON wishes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on wishes" ON wishes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on votes" ON votes FOR DELETE USING (true);

CREATE POLICY "Allow public read access on comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on comments" ON comments FOR INSERT WITH CHECK (true);

-- Create functions to get vote counts
CREATE OR REPLACE FUNCTION get_wish_stats(wish_id_param BIGINT)
RETURNS TABLE(upvotes BIGINT, downvotes BIGINT, comments BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(upvote_count.count, 0) as upvotes,
    COALESCE(downvote_count.count, 0) as downvotes,
    COALESCE(comment_count.count, 0) as comments
  FROM 
    (SELECT COUNT(*) as count FROM votes WHERE wish_id = wish_id_param AND type = 'upvote') upvote_count,
    (SELECT COUNT(*) as count FROM votes WHERE wish_id = wish_id_param AND type = 'downvote') downvote_count,
    (SELECT COUNT(*) as count FROM comments WHERE wish_id = wish_id_param) comment_count;
END;
$$ LANGUAGE plpgsql;
