---
summary: "Cómo se conectan el Gateway, los nodos y el host del canvas."
read_when:
  - You want a concise view of the Gateway networking model
title: "Modelo de red"
---

# Modelo de red

> Este contenido se ha fusionado en [Network](/en/network#core-model). Consulte esa página para obtener la guía actual.

La mayoría de las operaciones fluyen a través del Gateway (`openclaw gateway`), un único proceso de larga duración que posee las conexiones del canal y el plano de control de WebSocket.

## Reglas principales

- Se recomienda un Gateway por host. Es el único proceso al que se le permite ser propietario de la sesión de WhatsApp Web. Para bots de rescate o aislamiento estricto, ejecute múltiples gateways con perfiles y puertos aislados. Consulte [Multiple gateways](/en/gateway/multiple-gateways).
- Primero el bucle local: el Gateway WS predeterminado es `ws://127.0.0.1:18789`. El asistente crea autenticación de secreto compartido de forma predeterminada y generalmente genera un token, incluso para el bucle local. Para el acceso que no sea de bucle local, use una ruta de autenticación de gateway válida: autenticación de token/contraseña de secreto compartido o una implementación `trusted-proxy` que no sea de bucle local correctamente configurada. Las configuraciones de Tailnet/móviles generalmente funcionan mejor a través de Tailscale Serve u otro punto final `wss://` en lugar de `ws://` de tailnet sin procesar.
- Los nodos se conectan al Gateway WS a través de LAN, tailnet o SSH según sea necesario. El puente TCP heredado se ha eliminado.
- El host de Canvas es servido por el servidor HTTP del Gateway en el **mismo puerto** que el Gateway (predeterminado `18789`):
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    Cuando `gateway.auth` está configurado y el Gateway se enlaza más allá del bucle local, estas rutas están protegidas por la autenticación del Gateway. Los clientes de nodo usan URL de capacidad con alcance de nodo vinculadas a su sesión WS activa. Consulte [Gateway configuration](/en/gateway/configuration) (`canvasHost`, `gateway`).
- El uso remoto es típicamente un túnel SSH o una VPN de tailnet. Consulte [Remote access](/en/gateway/remote) y [Discovery](/en/gateway/discovery).
