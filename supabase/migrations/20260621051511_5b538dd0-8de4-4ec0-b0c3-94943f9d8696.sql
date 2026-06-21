CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT,
  whatsapp_message_id TEXT UNIQUE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  parsing_status TEXT,
  parsing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_wa_msg_select" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wa_messages_user_date
  ON public.whatsapp_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone
  ON public.whatsapp_messages(phone_e164, created_at DESC);