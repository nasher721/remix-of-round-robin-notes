-- Create a security definer function to check team membership
-- This avoids infinite recursion when querying phrase_team_members
CREATE OR REPLACE FUNCTION public.is_phrase_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.phrase_team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.phrase_teams
    WHERE id = _team_id
      AND owner_id = _user_id
  )
$$;

-- Drop the existing policy that allows public sharing
DROP POLICY IF EXISTS "Users can view their own and shared folders" ON public.phrase_folders;

-- Create new policy with team-based access control
-- Users can view:
-- 1. Their own folders
-- 2. Shared folders ONLY if they are a member of the folder's team
CREATE POLICY "Users can view their own and team folders" 
ON public.phrase_folders 
FOR SELECT 
USING (
  -- User owns the folder
  auth.uid() = user_id
  OR
  -- Folder is shared AND user is a member of the team
  (
    is_shared = true 
    AND team_id IS NOT NULL 
    AND public.is_phrase_team_member(team_id, auth.uid())
  )
);