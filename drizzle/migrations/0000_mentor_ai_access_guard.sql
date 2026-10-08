CREATE TABLE public.ai_access_guard (id text PRIMARY KEY, status integer NOT NULL, message text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_access_guard TO service_role;
ALTER TABLE public.ai_access_guard ENABLE ROW LEVEL SECURITY;