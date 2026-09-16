
-- Fix audit trigger function to handle tables without cliente_id column
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_data JSONB;
  new_data JSONB;
  record_id UUID;
  cliente_id_value UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    record_id := OLD.id;
    cliente_id_value := NULL;
    -- Try to get cliente_id if column exists
    IF old_data ? 'cliente_id' THEN
      cliente_id_value := (old_data->>'cliente_id')::UUID;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    record_id := NEW.id;
    cliente_id_value := NULL;
    IF new_data ? 'cliente_id' THEN
      cliente_id_value := (new_data->>'cliente_id')::UUID;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    record_id := NEW.id;
    cliente_id_value := NULL;
    IF new_data ? 'cliente_id' THEN
      cliente_id_value := (new_data->>'cliente_id')::UUID;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    tabela,
    registro_id,
    acao,
    dados_antigos,
    dados_novos,
    user_id,
    cliente_id
  ) VALUES (
    TG_TABLE_NAME,
    record_id,
    TG_OP,
    old_data,
    new_data,
    auth.uid(),
    cliente_id_value
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
