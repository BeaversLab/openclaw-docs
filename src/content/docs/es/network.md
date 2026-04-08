---
summary: "Concentrador de red: superficies de puerta de enlace, emparejamiento, descubrimiento y seguridad"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "Red"
---

# Concentrador de red

Este concentrador vincula los documentos principales sobre cómo OpenClaw conecta, empareja y asegura dispositivos a través de localhost, LAN y tailnet.

## Modelo principal

La mayoría de las operaciones fluyen a través del Gateway (`openclaw gateway`), un único proceso de larga ejecución que posee las conexiones de los canales y el plano de control WebSocket.

- **Primero loopback**: el Gateway WS por defecto es `ws://127.0.0.1:18789`.
  Los enlaces no loopback requieren una ruta de autenticación de gateway válida: token de secreto compartido/autenticación de contraseña, o un despliegue `trusted-proxy` no loopback configurado correctamente.
- Se recomienda **un Gateway por host**. Para el aislamiento, ejecute múltiples gateways con perfiles y puertos aislados ([Multiple Gateways](/en/gateway/multiple-gateways)).
- El **host de Canvas** se sirve en el mismo puerto que el Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protegido por la autenticación del Gateway cuando se enlaza más allá del loopback.
- El **acceso remoto** suele ser mediante túnel SSH o VPN Tailscale ([Remote Access](/en/gateway/remote)).

Referencias clave:

- [Gateway architecture](/en/concepts/architecture)
- [Gateway protocol](/en/gateway/protocol)
- [Gateway runbook](/en/gateway)
- [Web surfaces + bind modes](/en/web)

## Emparejamiento + identidad

- [Pairing overview (DM + nodes)](/en/channels/pairing)
- [Gateway-owned node pairing](/en/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/en/cli/devices)
- [Pairing CLI (DM approvals)](/en/cli/pairing)

Confianza local:

- Las conexiones directas de loopback local pueden ser aprobadas automáticamente para el emparejamiento y mantener
  la UX del mismo host fluida.
- OpenClaw también tiene una ruta estrecha de autoconexión local de backend/contenedor para
  flujos de ayuda de secreto compartido de confianza.
- Los clientes de tailnet y LAN, incluidos los enlaces tailnet del mismo host, todavía requieren
  aprobación de emparejamiento explícita.

## Descubrimiento + transportes

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Remote access (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodos + transportes

- [Nodes overview](/en/nodes)
- [Bridge protocol (legacy nodes, historical)](/en/gateway/bridge-protocol)
- [Node runbook: iOS](/en/platforms/ios)
- [Node runbook: Android](/en/platforms/android)

## Seguridad

- [Security overview](/en/gateway/security)
- [Gateway config reference](/en/gateway/configuration)
- [Troubleshooting](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
