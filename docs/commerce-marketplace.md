# Marketplace LUFA y Mercado Pago

## Modelo operativo

LUFA es el único cobrador ante Mercado Pago. Los vendedores asociados administran exclusivamente sus publicaciones y ventas mediante membresías de vendedor; no reciben credenciales de Mercado Pago ni pueden consultar datos de otros vendedores. Cada checkout contiene artículos de un solo vendedor. LUFA liquida a los vendedores por fuera de esta integración.

El checkout usa Checkout Pro mediante Orders API, en UYU. El navegador recibe únicamente `checkout_url`; el Access Token y el secreto de Webhooks permanecen en `apps/api`. Los torneos son pagos únicos. El vendedor elige un campeonato activo o próximo y una de sus divisiones en `/vender`. El checkout exige que el comprador tenga un perfil de jugador en esa división. Al acreditar una inscripción, el backend marca al jugador y la inscripción como preaprobados y extiende o emite su ID digital por los 6 o 12 meses definidos en la publicación. El comprador puede abrirla desde `/mi-id`.

## Configuración por ambiente

Definir en el proyecto API los valores documentados en `apps/api/.env.example`. Preview usa credenciales de prueba, `MERCADOPAGO_EXPECTED_LIVE_MODE=false`, base PostgreSQL de prueba y la URL pública de Preview. Production usa credenciales productivas, el collector real de LUFA, `MERCADOPAGO_EXPECTED_LIVE_MODE=true`, PostgreSQL productivo y `https://lufa.com.uy` como origen de retorno.

En **Tus integraciones → Webhooks**, registrar una URL HTTPS por ambiente con este formato:

`https://<api-host>/api/webhooks/mercado-pago`

Seleccionar el evento **Order (Mercado Pago)** y copiar su clave en `MERCADOPAGO_WEBHOOK_SECRET`. El endpoint exige firma `x-signature`, `x-request-id`, coincidencia entre `data.id` firmado y el cuerpo, y el `live_mode` esperado.

## Puesta en marcha

1. Desplegar la migración PostgreSQL `20260917150000_add_commerce_marketplace`.
2. Configurar credenciales y Webhooks de Preview; simular la notificación desde Mercado Pago. Mantener `COMMERCE_ENABLED=false` hasta completar esta prueba.
3. Dar acceso creando un vendedor con `POST /api/admin/commerce/sellers` y asociando un usuario con `POST /api/admin/commerce/sellers/:id/members`. La migración crea el vendedor LUFA.
4. Publicar productos desde `/vender`. Para una inscripción, seleccionar el campeonato, su división y la vigencia del Mi ID; los cupos son opcionales.
5. Probar aprobación, rechazo, evento duplicado, retorno antes del webhook y reconciliación. El cron recupera órdenes pendientes cada diez minutos.
6. Repetir la configuración con credenciales productivas, activar `COMMERCE_ENABLED=true` y ejecutar una compra real de bajo importe antes de habilitar el catálogo completo.

La URL de retorno nunca acredita una compra. La acreditación se produce al consultar la orden canónica, validar merchant, aplicación, moneda, total y referencia local, y confirmar los efectos en una transacción.
