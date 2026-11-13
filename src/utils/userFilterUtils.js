import { supabase } from "../supabase/supabase.config";

let tieneColumnaUsuarioId = null;

/**
 * Aplica el filtro por usuario a una consulta sobre `registros_carga`.
 * Si la columna `usuario_id` existe en la base de datos, filtra por ella (o por foto_referencia).
 * Si no existe, filtra de forma segura por `foto_referencia` donde se guarda el ID del usuario registrador.
 */
export async function filtrarRegistrosPorUsuario(queryBuilder, userId) {
  if (!userId) return queryBuilder;

  if (tieneColumnaUsuarioId === null) {
    try {
      const { error } = await supabase
        .from("registros_carga")
        .select("usuario_id")
        .limit(1);
      tieneColumnaUsuarioId = !error;
    } catch {
      tieneColumnaUsuarioId = false;
    }
  }

  if (tieneColumnaUsuarioId) {
    return queryBuilder.or(`usuario_id.eq.${userId},foto_referencia.eq.${userId}`);
  } else {
    return queryBuilder.eq("foto_referencia", userId);
  }
}

