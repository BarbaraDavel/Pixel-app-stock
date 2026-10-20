# Pixel Mail Club V11 — vista pública y preparación de hosting gratuito

## Incluye
- Página pública adaptable a la edición: nombre, descripción, contenido, ilustración y tema (navidad, lluvia, primavera, otoño) mediante `docs/mail-club/edition-preview.json`.
- `firebase.json` para desplegar **solo** `docs/mail-club/` a Firebase Hosting; el panel `docs/app/` NO se publica con este despliegue.
- Corrección del buscador del panel: filtra opciones por nombre, apodo, teléfono y email, ignorando tildes.
- Panel de V10 conservado. No se borran datos de Firestore.

## Probar localmente
Abrir `docs/mail-club/index.html` con Live Server. El sitio mostrará la edición de ejemplo, pero el botón de inscripción queda deshabilitado hasta que exista backend seguro. `precio: 0` es intencional: no inventamos el precio.

## Publicar sin contratar hosting
1. Confirmar proyecto correcto con `firebase projects:list` y seleccionar `pixel-stock` mediante `firebase use --add` (se requiere Firebase CLI).
2. Verificar en la consola Firebase que Hosting esté disponible para el proyecto y dentro de la cuota gratuita Spark.
3. Desde la raíz de este ZIP ejecutar `firebase deploy --only hosting --project pixel-stock`. **Antes de hacerlo**, comprobar si `pixel-stock.web.app` ya aloja otro sitio: desplegar allí puede reemplazar su contenido. Si ya está en uso, crear un sitio de Hosting separado en la consola y configurar `site` en firebase.json.
4. Probar en el dominio de Hosting asignado. No divulgar el enlace como sitio listo para comprar: aún no acepta pedidos.

## Lo que NO se puede habilitar aún con este paquete
- No hay registro público real, ni pagos ni carga de comprobantes. El backend de V10 requiere Firebase Functions con facturación habilitada y NO está desplegado.
- El enlace mágico por email requiere configurar Firebase Authentication, dominios autorizados y reglas de acceso por usuario. No basta con mostrar un botón de login.
- Para publicar inscripciones reales en Spark necesitamos elegir y probar una alternativa de backend gratuito con controles antiabuso, autorización, validación de precios y cupos. **No** abrir escrituras anónimas a `pixel_mail_pedidos` ni publicar claves de servicio.
- Mercado Pago requiere integración de backend y validación de webhooks; no habilitar cobros desde el frontend solamente.

## Cambiar estética para futuras ediciones
Editar `edition-preview.json`: `tema` admite `navidad`, `lluvia`, `primavera`, `otono`; `imagen` debe ser un recurso local publicado. En la integración final, esos datos vendrán de la edición activa mediante API segura, no del JSON estático.
