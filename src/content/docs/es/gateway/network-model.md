---
summary: "Cómo se conectan el Gateway, los nodos y el host del canvas."
read_when:
  - You want a concise view of the Gateway networking model
title: "Modelo de red"
---

> Este contenido se ha fusionado en [Network](/es/network#core-model). Consulte esa página para obtener la guía actualizada.

La mayoría de las operaciones fluyen a través del Gateway (`openclaw gateway`), un proceso único de larga duración
que posee las conexiones de los canales y el plano de control de WebSocket.

## Reglas principales

- Se recomienda un Gateway por host. Es el único proceso al que se le permite poseer la sesión de WhatsApp Web. Para bots de rescate o aislamiento estricto, ejecute múltiples gateways con perfiles y puertos aislados. Consulte [Multiple gateways](/es/gateway/multiple-gateways).
- Primero el bucle local (loopback): el Gateway WS usa por defecto `ws://127.0.0.1:18789`. El asistente crea autenticación de secreto compartido de forma predeterminada y generalmente genera un token, incluso para el bucle local. Para el acceso que no sea de bucle local, use una ruta de autenticación de gateway válida: token/contraseña de secreto compartido, o un despliegue `trusted-proxy` que no sea de bucle local correctamente configurado. Las configuraciones de Tailnet/móvil generalmente funcionan mejor a través de Tailscale Serve u otro punto final `wss://` en lugar de un `ws://` de tailnet sin procesar.
- Los nodos se conectan al Gateway WS a través de LAN, tailnet o SSH según sea necesario. Se ha eliminado el puente TCP heredado.
- El host de Canvas es servido por el servidor HTTP del Gateway en el **mismo puerto** que el Gateway (por defecto `18789`):
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Cuando `gateway.auth` está configurado y el Gateway se vincula más allá del bucle local, estas rutas están protegidas por la autenticación del Gateway. Los clientes de los nodos utilizan URLs de capacidades con ámbito de nodo vinculadas a su sesión WS activa. Consulte [Gateway configuration](/es/gateway/configuration) (`canvasHost`, `gateway`).
- El uso remoto suele ser un túnel SSH o una VPN tailnet. Consulte [Remote access](/es/gateway/remote) y [Discovery](/es/gateway/discovery).

## Relacionado

- [Remote access](/es/gateway/remote)
- [Trusted proxy auth](/es/gateway/trusted-proxy-auth)
- [Gateway protocol](/es/gateway/protocol)
