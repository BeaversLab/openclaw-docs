---
summary: "Cómo se conectan el Gateway, los nodos y el host del canvas."
read_when:
  - You want a concise view of the Gateway networking model
title: "Modelo de red"
---

# Modelo de red

> Este contenido se ha fusionado en [Network](/en/network#core-model). Consulte esa página para ver la guía actual.

La mayoría de las operaciones fluyen a través del Gateway (`openclaw gateway`), un único proceso de larga duración que posee las conexiones del canal y el plano de control de WebSocket.

## Reglas principales

- Se recomienda un Gateway por host. Es el único proceso al que se le permite poseer la sesión de WhatsApp Web. Para bots de rescate o aislamiento estricto, ejecute múltiples gateways con perfiles y puertos aislados. Consulte [Multiple gateways](/en/gateway/multiple-gateways).
- Primero el bucle local (loopback): el Gateway WS utiliza por defecto `ws://127.0.0.1:18789`. El asistente genera un token de gateway por defecto, incluso para el bucle local. Para el acceso a tailnet, ejecute `openclaw gateway --bind tailnet --token ...` porque se requieren tokens para enlaces que no sean de bucle local.
- Los nodos se conectan al Gateway WS a través de LAN, tailnet o SSH según sea necesario. El puente TCP heredado está obsoleto.
- El host de Canvas es servido por el servidor HTTP del Gateway en el **mismo puerto** que el Gateway (por defecto `18789`):
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Cuando `gateway.auth` está configurado y el Gateway se enlaza más allá del bucle local, estas rutas están protegidas por la autenticación del Gateway. Los clientes de los nodos utilizan URLs de capacidad con ámbito de nodo vinculadas a su sesión WS activa. Consulte [Gateway configuration](/en/gateway/configuration) (`canvasHost`, `gateway`).
- El uso remoto es típicamente un túnel SSH o una VPN tailnet. Consulte [Remote access](/en/gateway/remote) y [Discovery](/en/gateway/discovery).
