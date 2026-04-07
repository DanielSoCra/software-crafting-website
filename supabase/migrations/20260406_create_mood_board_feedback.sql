-- Create mood_board_feedback table
CREATE TABLE IF NOT EXISTS mood_board_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL,
  client_id UUID NOT NULL,
  variant_name TEXT NOT NULL, -- e.g. "Variante 1"
  vote TEXT, -- 'like' | 'dislike' | 'favorite' | null
  is_favorite BOOLEAN DEFAULT false,
  comment_negative TEXT, -- "Was gefällt dir nicht?"
  comment_positive TEXT, -- "Was ist gut?"
  comment_very_good TEXT, -- "Was ist sehr gut?"
  status TEXT DEFAULT 'editing', -- 'editing' | 'submitted'
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(deliverable_id, client_id, variant_name)
);

-- Constraint: only one is_favorite per deliverable+client
CREATE UNIQUE INDEX idx_mood_board_favorite
ON mood_board_feedback(deliverable_id, client_id)
WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE mood_board_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view/edit their own feedback
CREATE POLICY "Clients can view own feedback"
ON mood_board_feedback FOR SELECT
USING (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Clients can insert feedback"
ON mood_board_feedback FOR INSERT
WITH CHECK (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Clients can update own feedback if editing"
ON mood_board_feedback FOR UPDATE
USING (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1)
  AND status = 'editing'
);

-- RLS Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON mood_board_feedback FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policy: Admins can update status
CREATE POLICY "Admins can unlock feedback"
ON mood_board_feedback FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Index for queries
CREATE INDEX idx_mood_board_deliverable ON mood_board_feedback(deliverable_id);
CREATE INDEX idx_mood_board_client ON mood_board_feedback(client_id);

-- Enable Supabase Realtime for unlock notifications
ALTER PUBLICATION "supabase_realtime" ADD TABLE mood_board_feedback;
