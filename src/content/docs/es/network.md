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

- [Arquitectura de puerta de enlace](/en/concepts/architecture)
- [Protocolo de puerta de enlace](/en/gateway/protocol)
- [Manual de procedimientos de puerta de enlace](/en/gateway)
- [Superficies web + modos de enlace](/en/web)

## Emparejamiento + identidad

- [Descripción general del emparejamiento (DM + nodos)](/en/channels/pairing)
- [Emparejamiento de nodos propiedad de la puerta de enlace](/en/gateway/pairing)
- [CLI de dispositivos (emparejamiento + rotación de tokens)](/en/cli/devices)
- [CLI de emparejamiento (aprobaciones de DM)](/en/cli/pairing)

Confianza local:

- Las conexiones locales (loopback o la dirección tailnet propia del host de la puerta de enlace) pueden ser
  aprobadas automáticamente para el emparejamiento para mantener fluida la UX en el mismo host.
- Los clientes de tailnet/LAN no locales aún requieren aprobación explícita de emparejamiento.

## Descubrimiento + transportes

- [Descubrimiento y transportes](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Acceso remoto (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodos + transportes

- [Descripción general de nodos](/en/nodes)
- [Protocolo de puente (nodos heredados)](/en/gateway/bridge-protocol)
- [Manual de procedimientos de nodo: iOS](/en/platforms/ios)
- [Manual de procedimientos de nodo: Android](/en/platforms/android)

## Seguridad

- [Descripción general de seguridad](/en/gateway/security)
- [Referencia de configuración de puerta de enlace](/en/gateway/configuration)
- [Solución de problemas](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
