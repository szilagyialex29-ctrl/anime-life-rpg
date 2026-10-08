CREATE TABLE IF NOT EXISTS public.ai_access_guard (
  id TEXT PRIMARY KEY,
  status INTEGER NOT NULL,
  message TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_access_guard TO service_role;

ALTER TABLE public.ai_access_guard ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ai_access_guard IS 'Service-only circuit breaker for AI gateway access blocks (402/403). No user access.';