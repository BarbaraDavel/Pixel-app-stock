# Pixel Mail Club V12 — acceso por enlace de email (base Spark)

## Qué funciona al configurarlo
- La página pública mantiene el diseño de V11.3.
- El formulario «Tu acceso al Mail Club» permite enviar un enlace de acceso usando Firebase Authentication.
- El enlace permite iniciar sesión sin contraseña, una vez activado Email/Password + Email link en Firebase Console y autorizado el dominio donde se publica la página.
- La página pública **NO** crea reservas, **NO** cobra, **NO** promete cupos y **NO** envía confirmaciones de pago.

## Cómo probar
1. En Firebase Console > Authentication > Sign-in method, habilitar Email/Password y Email link (passwordless).
2. En Authentication > Settings > Authorized domains, agregar el dominio público real (p.ej. el dominio de Firebase Hosting). `localhost` puede requerir alta explícita.
3. Publicar `docs/mail-club` en Firebase Hosting o probar desde un dominio autorizado. Enlaces enviados desde 127.0.0.1 pueden no ser válidos.
4. En la página, escribir email, solicitar enlace, abrirlo desde el mismo navegador y comprobar la sesión.
5. Si abrís el enlace en otro dispositivo, se pedirá confirmar el email nuevamente (sin confiar en datos incluidos en el enlace).

## Reserva de cupo durante 48 horas: siguiente paso obligatorio
No se puede garantizar un cupo de 48 horas simplemente escribiendo `expiresAt` desde JavaScript: varios usuarios podrían reservar el último cupo a la vez y el cliente podría alterar precio/cantidad. Para habilitar inscripciones **reales** necesitamos una operación atómica que valide edición, precio, disponibilidad y vencimiento, y un mecanismo que libere las reservas vencidas. La autenticación y las reglas de Firestore son necesarias, pero por sí solas no implementan correctamente ese inventario. No abrir reglas de escritura pública en `pixel_mail_pedidos`.

## Costos
Esta versión usa servicios que pueden utilizarse en Spark dentro de sus cuotas. Verificá en Firebase Console los límites y condiciones actuales antes de publicar. Para la reserva atómica podemos evaluar transacciones Firestore con reglas rigurosas y liberación perezosa, o un backend con nivel gratuito externo; se debe probar concurrencia antes de recibir dinero.

## Seguridad
No publicar reglas `allow read, write: if true`. No guardar claves privadas de Mercado Pago en el frontend. No confundir email verificado con pago confirmado.
