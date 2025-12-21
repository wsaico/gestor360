# Cómo Desplegar la Función (Edge Function)

El error "Failed to send a request" ocurre porque el código que escribimos está en tu computadora (y en GitHub), pero **no se ha subido a los servidores de Supabase**.

Tienes dos opciones para solucionarlo:

## Opción 1: Copiar y Pegar en el Dashboard (Más fácil)
1.  Ve a tu **Supabase Dashboard** > **Edge Functions**.
2.  Haz clic en tu función `send-email-alerts`.
3.  Ve a la pestaña o sección de **"Details"** o **"Source"** (si lo permite) o simplemente elimina la función y créala de nuevo con el mismo nombre `send-email-alerts`.
4.  Copia TODO el contenido del archivo local `supabase/functions/send-email-alerts/index.ts` y pégalo en el editor online de Supabase.
5.  Despliega (Save/Deploy).

## Opción 2: Usar la Terminal (Recomendado si tienes CLI)
Si tienes el `supabase` CLI instalado y logueado, ejecuta este comando en la terminal de VS Code:

```powershell
npx supabase functions deploy send-email-alerts --no-verify-jwt
```

*(Nota: `--no-verify-jwt` es necesario si la función es pública o si quieres saltar la verificación de firma JWT en el despliegue, aunque para esta función interna es mejor omitirlo si ya tienes el login hecho).*

Comando estándar:
```powershell
npx supabase functions deploy send-email-alerts
```

## Opción 3: Probar Local (Solo Desarrolladores Avanzados)
Si estás corriendo `supabase start` localmente, la función corre en tu Docker local. Pero tu Frontend está apuntando a la URL de producción (`ohbwsuktgmnycsokqdja.supabase.co`). Para probar local tendrías que cambiar las variables de entorno.

**RECOMENDACIÓN:** Usa la **Opción 1** si no tienes el CLI configurado.
