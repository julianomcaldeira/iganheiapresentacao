-- Add column for multiple CTAs in email templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS ctas JSONB DEFAULT '[]'::jsonb;

-- Comment explaining the structure
COMMENT ON COLUMN public.email_templates.ctas IS 'Array of CTAs: [{texto: string, url: string, cor?: string}]';