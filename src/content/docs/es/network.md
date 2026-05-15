---
summary: "Concentrador de red: superficies de puerta de enlace, emparejamiento, descubrimiento y seguridad"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "Red"
---

Este centro vincula la documentación principal sobre cómo OpenClaw conecta, empareja y protege dispositivos a través de localhost, LAN y tailnet.

## Modelo principal

La mayoría de las operaciones fluyen a través del Gateway (`openclaw gateway`), un único proceso de larga ejecución que posee las conexiones de canal y el plano de control WebSocket.

- **Loopback primero**: el WS del Gateway predeterminado es `ws://127.0.0.1:18789`.
  Los enlaces no loopback requieren una ruta de autenticación de gateway válida: autenticación de token/contraseña de secreto compartido
  o un despliegue `trusted-proxy` no loopback configurado correctamente.
- **Se recomienda un Gateway por host**. Para el aislamiento, ejecute múltiples gateways con perfiles y puertos aislados ([Multiple Gateways](/es/gateway/multiple-gateways)).
- **Canvas host** se sirve en el mismo puerto que el Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protegido por la autenticación del Gateway cuando se enlaza más allá del loopback.
- **Acceso remoto** es típicamente túnel SSH o VPN Tailscale ([Remote Access](/es/gateway/remote)).

Referencias clave:

- [Gateway architecture](/es/concepts/architecture)
- [Gateway protocol](/es/gateway/protocol)
- [Gateway runbook](/es/gateway)
- [Web surfaces + bind modes](/es/web)

## Emparejamiento + identidad

- [Pairing overview (DM + nodes)](/es/channels/pairing)
- [Gateway-owned node pairing](/es/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/es/cli/devices)
- [Pairing CLI (DM approvals)](/es/cli/pairing)

Confianza local:

- Las conexiones directas de loopback local pueden aprobarse automáticamente para el emparejamiento y mantener
  la UX del mismo host fluida.
- OpenClaw también tiene una ruta estrecha de autoconexión de backend/container-local para
  flujos de ayuda de secreto compartido de confianza.
- Los clientes de Tailnet y LAN, incluidos los enlaces tailnet del mismo host, aún requieren
  aprobación de emparejamiento explícita.

## Descubrimiento + transportes

- [Discovery and transports](/es/gateway/discovery)
- [Bonjour / mDNS](/es/gateway/bonjour)
- [Remote access (SSH)](/es/gateway/remote)
- [Tailscale](/es/gateway/tailscale)

## Nodos + transportes

- [Nodes overview](/es/nodes)
- [Bridge protocol (legacy nodes, historical)](/es/gateway/bridge-protocol)
- [Manual del nodo: iOS](/es/platforms/ios)
- [Manual del nodo: Android](/es/platforms/android)

## Seguridad

- [Descripción general de seguridad](/es/gateway/security)
- [Referencia de configuración de Gateway](/es/gateway/configuration)
- [Solución de problemas](/es/gateway/troubleshooting)
- [Doctor](/es/gateway/doctor)

## Relacionado

- [Manual de Gateway](/es/gateway)
- [Acceso remoto](/es/gateway/remote)
