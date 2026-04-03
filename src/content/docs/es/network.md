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

- **Loopback primero**: el WS del Gateway usa por defecto `ws://127.0.0.1:18789`. Se requieren tokens para enlaces no loopback.
- Se recomienda **un solo Gateway por host**. Para el aislamiento, ejecute múltiples gateways con perfiles y puertos aislados ([Multiple Gateways](/en/gateway/multiple-gateways)).
- El **Canvas host** se sirve en el mismo puerto que el Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protegido por la autenticación del Gateway cuando se enlaza más allá del loopback.
- El **acceso remoto** es típicamente un túnel SSH o VPN Tailscale ([Remote Access](/en/gateway/remote)).

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

- Las conexiones locales (loopback o la propia dirección de tailnet del host del gateway) pueden ser
  auto-aprobadas para el emparejamiento para mantener la UX del mismo host fluida.
- Los clientes de tailnet/LAN no locales todavía requieren aprobación explícita de emparejamiento.

## Descubrimiento + transportes

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Remote access (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodos + transportes

- [Nodes overview](/en/nodes)
- [Bridge protocol (legacy nodes)](/en/gateway/bridge-protocol)
- [Node runbook: iOS](/en/platforms/ios)
- [Node runbook: Android](/en/platforms/android)

## Seguridad

- [Security overview](/en/gateway/security)
- [Gateway config reference](/en/gateway/configuration)
- [Troubleshooting](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
