---
summary: "Cómo se conectan la Gateway, los nodos y el host del lienzo."
read_when:
  - Deseas una vista concisa del modelo de red de la Gateway
title: "Modelo de red"
---

La mayoría de las operaciones fluyen a través de la Gateway (`openclaw gateway`), un proceso único de larga ejecución que posee las conexiones del canal y el plano de control de WebSocket.

## Reglas principales

- Se recomienda una Gateway por host. Es el único proceso permitido para poseer la sesión de WhatsApp Web. Para bots de rescate o aislamiento estricto, ejecuta múltiples gateways con perfiles y puertos aislados. Consulta [Múltiples gateways](/es/gateway/multiple-gateways).
- Primero el bucle de retorno (loopback): el WS de la Gateway predetermina a `ws://127.0.0.1:18789`. El asistente genera un token de gateway de forma predeterminada, incluso para el bucle de retorno. Para el acceso a tailnet, ejecuta `openclaw gateway --bind tailnet --token ...` porque se requieren tokens para enlaces que no son de bucle de retorno.
- Los nodos se conectan al WS del Gateway a través de LAN, tailnet o SSH según sea necesario. El puente TCP heredado está obsoleto.
- El host del lienzo es servido por el servidor HTTP de la Gateway en el **mismo puerto** que la Gateway (predeterminado `18789`):
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Cuando `gateway.auth` está configurado y la Gateway se enlaza más allá del bucle de retorno, estas rutas están protegidas por la autenticación de la Gateway. Los clientes de nodo usan URLs de capacidad con ámbito de nodo vinculadas a su sesión WS activa. Consulta [Configuración de la Gateway](/es/gateway/configuration) (`canvasHost`, `gateway`).
- El uso remoto es típicamente mediante túnel SSH o VPN tailnet. Consulta [Acceso remoto](/es/gateway/remote) y [Descubrimiento](/es/gateway/discovery).

import es from "/components/footer/es.mdx";

<es />
