---
summary: "Cómo se conectan el Gateway, los nodos y el host del canvas."
read_when:
  - You want a concise view of the Gateway networking model
title: "Modelo de red"
---

La mayoría de las operaciones fluyen a través del Gateway (`openclaw gateway`), un único proceso de larga duración que posee las conexiones del canal y el plano de control WebSocket.

## Reglas principales

- Se recomienda un Gateway por host. Es el único proceso al que se le permite ser propietario de la sesión de WhatsApp Web. Para bots de rescate o aislamiento estricto, ejecute múltiples gateways con perfiles y puertos aislados. Consulte [Múltiples gateways](/es/gateway/multiple-gateways).
- Primero el bucle local (loopback): el WS del Gateway tiene por defecto `ws://127.0.0.1:18789`. El asistente genera un token de gateway de forma predeterminada, incluso para el bucle local. Para el acceso a tailnet, ejecute `openclaw gateway --bind tailnet --token ...` porque se requieren tokens para enlaces que no son de bucle local.
- Los nodos se conectan al WS del Gateway a través de LAN, tailnet o SSH según sea necesario. El puente TCP heredado está obsoleto.
- El host del canvas es servido por el servidor HTTP del Gateway en el **mismo puerto** que el Gateway (predeterminado `18789`):
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Cuando `gateway.auth` está configurado y el Gateway se enlaza más allá del bucle local, estas rutas están protegidas por la autenticación del Gateway. Los clientes de nodo utilizan URLs de capacidad con ámbito de nodo vinculadas a su sesión WS activa. Consulte [Configuración del Gateway](/es/gateway/configuration) (`canvasHost`, `gateway`).
- El uso remoto suele ser un túnel SSH o VPN de tailnet. Consulte [Acceso remoto](/es/gateway/remote) y [Descubrimiento](/es/gateway/discovery).

import es from "/components/footer/es.mdx";

<es />
