-- Add deleted_by_receiver column for soft deletes in inbox
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_by_receiver BOOLEAN DEFAULT FALSE;

-- Update RLS if needed (Allow users to update this specific column on their received messages)
-- Currently existing policy is: CREATE POLICY "Users view own inbox" ON messages FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
-- We need an UPDATE policy for receivers to mark as deleted.

CREATE POLICY "Receivers can mark messages as deleted" ON public.messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);
