
-- ai_processing_logs
CREATE TABLE IF NOT EXISTS public.ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_input INT,
  tokens_output INT,
  latency_ms INT,
  extracted_json JSONB,
  confidence NUMERIC(3,2),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_processing_logs TO authenticated;
GRANT ALL ON public.ai_processing_logs TO service_role;
ALTER TABLE public.ai_processing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_ai_logs ON public.ai_processing_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_date
  ON public.ai_processing_logs(user_id, created_at DESC);

-- usage_metrics
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_month TEXT NOT NULL,
  transactions_count INT NOT NULL DEFAULT 0,
  whatsapp_messages_in INT NOT NULL DEFAULT 0,
  whatsapp_messages_out INT NOT NULL DEFAULT 0,
  ai_parse_calls INT NOT NULL DEFAULT 0,
  api_errors INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_metrics TO authenticated;
GRANT ALL ON public.usage_metrics TO service_role;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_metrics ON public.usage_metrics
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_usage_metrics_updated_at
  BEFORE UPDATE ON public.usage_metrics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price_cents BIGINT,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_subscription ON public.subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
