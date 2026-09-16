-- Add column to link email templates to workflow steps
ALTER TABLE public.email_templates 
ADD COLUMN workflow_etapa_id uuid REFERENCES public.workflow_etapas(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.email_templates.workflow_etapa_id IS 'Links email template to a specific workflow step for automated sending';