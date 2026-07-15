-- Blindar `muro_comments` contra escrituras abusivas con la anon key publica.
--
-- La anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) viaja en el navegador de cualquier
-- visitante. Sin RLS restrictiva, cualquiera puede via PostgREST:
--   - insertar spam saltandose la moderacion de /api/muro
--   - insertar con is_nadie=true (hacerse pasar por Nadie)
--   - borrar o editar comentarios ajenos
--
-- Estado deseado tras esta migracion:
--   - SELECT publico  -> el muro es de lectura abierta (la web lo pinta desde el cliente)
--   - INSERT publico SOLO con is_nadie=false -> los fans escriben, pero NADIE puede
--     insertar mensajes marcados como Nadie con la anon key
--   - Sin UPDATE ni DELETE para anon -> nadie edita ni borra desde el cliente
--
-- Las respuestas de Nadie (is_nadie=true) las inserta la Edge Function
-- nadie-processor con SUPABASE_SERVICE_ROLE_KEY, que ignora RLS: no se ve
-- afectada. El cron de limpieza tambien usa service role.

ALTER TABLE public.muro_comments ENABLE ROW LEVEL SECURITY;

-- Partimos de cero: eliminar TODAS las policies actuales (nombres desconocidos)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'muro_comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.muro_comments', pol.policyname);
  END LOOP;
END $$;

-- Lectura publica
CREATE POLICY "muro public select"
  ON public.muro_comments
  FOR SELECT
  USING (true);

-- Insercion publica, pero jamas como Nadie
CREATE POLICY "muro public insert non-nadie"
  ON public.muro_comments
  FOR INSERT
  WITH CHECK (is_nadie = false);

-- Sin policies de UPDATE/DELETE: quedan denegadas para anon.
-- El service role (Edge Function, cron) ignora RLS y sigue funcionando.
