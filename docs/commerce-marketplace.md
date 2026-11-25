# Marketplace LUFA y Botón de Pago Handy

## Modelo operativo

LUFA es el único cobrador ante Handy. Los vendedores asociados administran solo sus publicaciones y ventas mediante membresías de vendedor. No reciben credenciales de Handy ni pueden consultar datos de otros vendedores. Cada checkout contiene artículos de un solo vendedor. LUFA liquida a los vendedores por fuera de esta integración.

El checkout usa el Botón de Pago Handy (API v2, manual v2.0 de septiembre de 2025) en UYU (ISO 4217 `858`). El backend crea un link de pago de un solo uso con `POST {base}/payments`. El navegador recibe solo esa URL; el merchant secret queda en `apps/api`. El comprador elige el medio de pago en Handy:

- tarjetas, con cuotas si su tarjeta lo permite;
- Redpagos;
- transferencia bancaria.

La API no permite fijar cuotas ni restringir medios.

Los torneos son pagos únicos. El vendedor elige un campeonato activo o próximo y una de sus divisiones en `/vender`. El checkout exige que el comprador tenga un perfil de jugador en esa división. Cuando se acredita una inscripción, el backend:

- marca al jugador y la inscripción como preaprobados;
- extiende o emite su ID digital por los 6 o 12 meses de la publicación.

El comprador abre su ID desde `/mi-id`.

## IVA

Cada publicación indica el IVA incluido en su precio: 22% (básico), 10% (mínimo) o exento. El valor se copia en cada línea de la orden al reservar. A Handy se le informa:

- `Amount`: el precio unitario con IVA;
- `TaxedAmount`: el gravado unitario, `precio / (1 + tasa)`, o `0` si es exento;
- en el carrito, la suma de ambos.

`InvoiceNumber` es el número correlativo `commerce_orders.invoice_number`.

Lo que se comprobó en el ambiente de testing (nov-2026):

- Handy responde JSON doblemente codificado (el cuerpo es un string con JSON adentro); el provider acepta ambas formas.
- La página de pago muestra un único renglón con los nombres de los productos y el total, sin mostrar `Quantity`. Por eso el nombre de cada producto incluye ` xN` cuando la cantidad es mayor a 1.

## Notificaciones (callbacks)

Handy no consulta pagos por API ni firma sus webhooks. Cada pago se crea con su propia `CallbackUrl`:

`https://<api-host>/api/webhooks/handy/<orderId>?token=<hmac>`

El token es `HMAC-SHA256(HANDY_CALLBACK_SECRET, "commerce-callback:<orderId>")` y solo LUFA puede generarlo. Además del token, el endpoint exige que coincidan con la orden local:

- `TransactionExternalId` (GUID generado por LUFA al reservar);
- la moneda;
- el total.

Las notificaciones repetidas se descartan por `commerce_webhook_events.delivery_key`. No hace falta configurar nada en un panel de Handy.

| Estado Handy | Efecto en LUFA |
| --- | --- |
| `0` Iniciado | Solo se registra. |
| `1` Exitoso | La orden pasa a `paid` y se aplican sus beneficios. Si la reserva ya había vencido, pasa a `payment_review` para revisión manual. |
| `2` Fallido | Se cancela y se libera el stock. |
| `3` Pendiente (Redpagos) | La reserva se extiende hasta `InstrumentData.Expiration`, que se muestra al comprador. |

El cron `/api/cron/commerce-reconcile` (cada diez minutos) libera las reservas vencidas. La página de retorno (`SiteUrl`) nunca acredita una compra; solo muestra el estado local.

## Devoluciones

Handy admite una única devolución **total** por venta y **solo con tarjeta**. Si el pago ya se acreditó en la cuenta Handy, el tope es UYU 10.000 / USD 250. El flujo:

1. El vendedor propone el reembolso desde `/vender` (siempre por el total).
2. Un admin lo ejecuta con `POST /api/admin/commerce/refunds/:id/execute`. La solicitud pasa a `processing` y se llama a `DELETE {base}/payments`.
3. El callback de devolución resuelve la solicitud:
   - `Success: true`: `completed`. La orden queda `refunded` y se anulan las membresías que pagó.
   - `Success: false`: `failed`, con el mensaje de Handy en `provider_message`. Se puede reintentar, por ejemplo después de cargar saldo.

## Configuración por ambiente

Definir en el proyecto API los valores documentados en `apps/api/.env.example`.

| Variable | Preview | Production |
| --- | --- | --- |
| `HANDY_ENVIRONMENT` | `testing` (`https://api.payments.arriba.uy/api/v2`) | `production` (`https://api.payments.handy.uy/api/v2`) |
| `HANDY_MERCHANT_SECRET` | Secreto de pruebas publicado en el manual | Secreto entregado por Handy |
| `HANDY_CALLBACK_SECRET` | Valor aleatorio largo propio | Valor aleatorio largo propio, distinto al de Preview |
| `HANDY_CALLBACK_BASE_URL` | URL pública del API de Preview | `https://<api-host>` (https obligatorio) |
| `LUFA_PUBLIC_APP_URL` | URL pública del sitio de Preview | `https://lufa.com.uy` |

## Puesta en marcha

1. Desplegar la migración `20261125120000_handy_payments`. Elimina las columnas de cuotas y agrega IVA, número de factura, vencimiento y mensaje de devolución.
2. Configurar Preview y mantener `COMMERCE_ENABLED=false` hasta completar la prueba.
3. Probar en Preview con la tarjeta de test del manual (Mastercard `5203948100023450`, vencimiento `12/26`, CVV `045`):
   - pago aprobado;
   - pago con 2 unidades de un mismo producto;
   - callback repetido;
   - callback con token inválido (debe responder 401);
   - devolución.
4. Dar acceso creando un vendedor con `POST /api/admin/commerce/sellers` y asociando un usuario con `POST /api/admin/commerce/sellers/:id/members`.
5. Publicar productos desde `/vender` indicando el IVA. Para una inscripción, seleccionar el campeonato, su división y la vigencia del Mi ID.
6. Repetir la configuración con el secreto productivo, activar `COMMERCE_ENABLED=true` y hacer una compra real de bajo importe antes de habilitar el catálogo completo.
