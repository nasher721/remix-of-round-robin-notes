-- Add DELETE policy to phrase_usage_log so users can remove their own usage history
CREATE POLICY "Users can delete their own usage logs" 
ON public.phrase_usage_log 
FOR DELETE 
USING (auth.uid() = user_id);