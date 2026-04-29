-- Enable Realtime publication for muro_comments so the browser can subscribe
-- to INSERT events and react instantly to new messages and Nadie's replies.
ALTER PUBLICATION supabase_realtime ADD TABLE muro_comments;
