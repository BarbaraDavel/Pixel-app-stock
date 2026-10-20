# Pixel Mail Club V13.1 — correo en español y bienvenida

- Se establece `auth.languageCode = 'es'` antes de solicitar el enlace por correo.
- Cuando Firebase confirma la sesión, se oculta el formulario de solicitud de enlace y aparece una bienvenida compacta con el correo verificado.
- Cerrar sesión pasa a ser un botón secundario discreto.
- La landing, la demo de opiniones y el formulario de inscripción sin envío real permanecen sin cambios.

## Publicación
Subir el contenido del ZIP al mismo repositorio, conservando la carpeta `docs/`. GitHub Pages publica `/docs` desde `main`. Forzar recarga del navegador luego del despliegue.

## Prueba
1. Cerrar sesión en la landing.
2. Solicitar un enlace nuevo y revisar el idioma del correo recibido.
3. Abrir el enlace y confirmar correo si es necesario.
4. Verificar bienvenida compacta y botón de cierre de sesión.

Nota: `auth.languageCode` solicita español, pero el formato/remitente final dependen de Firebase y de su configuración global. La plantilla de verificación de email no es necesariamente la de inicio de sesión por enlace.

No se habilitan reservas, pagos ni opiniones reales. No subir secretos de administración al repositorio.
