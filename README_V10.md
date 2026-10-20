# Pixel Mail Club V10 — inscripción pública (etapa de integración)

## Qué incluye
- Página pública con edición y precio consultados desde backend, cálculo automático y aviso de envío a cargo del comprador.
- Backend Firebase Functions v2 para registrar solicitudes por transferencia en `pixel_mail_pedidos` con `PENDIENTE_PAGO` y `origen=web-publica`; las ve el panel administrativo existente.
- Datos de los clientes generales de Pixel separados. La web pública no consulta ni escribe Firestore directamente.
- Protección básica de duplicados por edición/email. El precio nunca se acepta del navegador.

## Antes de activar
1. Desplegar `backend/index.js` como función `mailClubApi` en el proyecto Firebase correcto, con Node 22 y dependencias de `backend/package.json`. Requiere proyecto con facturación habilitada para Functions.
2. Configurar parámetros `MAILCLUB_PUBLIC_ORIGIN` (origen exacto de la web pública, sin barra final), `MAILCLUB_ACTIVE_EDITION` (ej. 001) y `MAILCLUB_TRANSFER_INSTRUCTIONS` (datos bancarios oficiales, sin secretos).
3. Crear/configurar la edición 001 en `pixel_mail_ediciones` desde Pixel Gestión, con precio mayor a 0.
4. Configurar `MAILCLUB_API_URL` en `docs/mail-club/public-config.js` con la URL desplegada de `mailClubApi`.
5. Verificar reglas de Firestore: solamente administración puede leer/modificar `pixel_mail_pedidos` desde cliente. La función usa Admin SDK.
6. Probar la inscripción con datos ficticios, comprobar que aparezca `PENDIENTE_PAGO` en el panel.

## Pendientes deliberados (NO habilitados)
- Checkout Mercado Pago y webhook firmado de confirmación. La opción aparece en la página, pero el servidor la rechaza hasta integrarla.
- Subida segura del comprobante y verificación manual de transferencias.
- Email automático de confirmación tras verificar pago.
- Enlace mágico para volver a entrar: requiere configurar Firebase Authentication (email link), dominios autorizados, protección contra enumeración y una vista privada para consultar reservas.
- Rate limiting antiabuso, CAPTCHA, controles de cupos transaccionales y protección adicional antes de lanzar públicamente.

**No publicar como sistema de cobro completo hasta terminar estas integraciones y las pruebas de seguridad.**
