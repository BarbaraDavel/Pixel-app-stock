# Pixel Mail Club V13 — Acceso por email conectado a Firebase

## Cambios
- Usa la configuración pública existente de `pixel-stock` y Firebase Authentication por enlace de correo.
- Solicita el enlace desde la landing de GitHub Pages.
- Completa la autenticación al abrir el enlace; si se abre en otra pestaña/dispositivo, solicita confirmar el correo dentro de la página (sin `prompt` del navegador).
- Mensajes de estado y errores, bloqueo del botón mientras se envía, cierre de sesión y limpieza de la URL al completar.
- No modifica Pixel Gestión ni habilita inscripciones, pagos, acceso a datos de suscriptores u opiniones reales.

## Antes de probar
1. En Firebase Authentication > Método de acceso, habilitar Correo electrónico/contraseña y Vínculo del correo electrónico.
2. En Authentication > Configuración > Dominios autorizados, incluir `barbaradavel.github.io`.
3. En GitHub Pages, publicar `docs` desde `main`; acceder a `https://barbaradavel.github.io/Pixel-app-stock/mail-club/`.
4. Escribir un email propio y solicitar un enlace. Abrir el correo y verificar que regrese a la landing y permita cerrar sesión.
5. Si el enlace abre en otra pestaña o dispositivo, confirmar manualmente el mismo correo.

## Límites y seguridad
- La autenticación confirma el control de un email, NO que la persona sea suscriptora. Todavía no se leen datos de Firestore.
- No abrir reglas de Firestore a lectura/escritura pública. El inventario con reservas de 48 horas requiere validación de servidor o diseño transaccional auditado.
- Los enlaces de correo están sujetos a cuotas de envío de Firebase Authentication, que pueden ser reducidas en Spark.
- El email de Firebase puede tener branding genérico hasta configurar sus plantillas.
- La URL de retorno debe mantenerse en la lista de dominios autorizados.
