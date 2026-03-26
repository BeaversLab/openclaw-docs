---
summary: "Cómo la aplicación de macOS informa los estados de salud de la puerta de enlace/Baileys"
read_when:
  - Debugging mac app health indicators
title: "Comprobaciones de estado (macOS)"
---

# Verificaciones de Estado en macOS

Cómo ver si el canal vinculado está sano desde la aplicación de la barra de menús.

## Barra de menús

- El punto de estado ahora refleja el estado de Baileys:
  - Verde: vinculado + socket abierto recientemente.
  - Naranja: conectando/reintentando.
  - Rojo: sesión cerrada o sondeo fallido.
- La línea secundaria muestra "vinculado · auth 12m" o muestra el motivo del fallo.
- El elemento de menú "Ejecutar verificación de estado" activa un sondeo a petición.

## Configuración

- La pestaña General obtiene una tarjeta de Estado que muestra: antigüedad de autenticación vinculada, ruta/recuento del almacén de sesiones, hora de la última verificación, último error/código de estado y botones para Ejecutar verificación de estado / Revelar registros.
- Utiliza una instantánea en caché para que la interfaz se cargue al instante y degrade con elegancia cuando está sin conexión.
- La **Pestaña Canales** muestra el estado del canal + controles para WhatsApp/Telegram (código QR de inicio de sesión, cierre de sesión, sondeo, última desconexión/error).

## Cómo funciona el sondeo

- La aplicación ejecuta `openclaw health --json` a través de `ShellExecutor` cada ~60s y bajo demanda. El sondeo carga las credenciales e informa el estado sin enviar mensajes.
- Caché de la última buena instantánea y del último error por separado para evitar parpadeos; mostrar la marca de tiempo de cada uno.

## En caso de duda

- Todavía puede usar el flujo de CLI en [Salud de la puerta de enlace](/es/gateway/health) (`openclaw status`, `openclaw status --deep`, `openclaw health --json`) y hacer seguimiento de `/tmp/openclaw/openclaw-*.log` para `web-heartbeat` / `web-reconnect`.

import es from "/components/footer/es.mdx";

<es />
