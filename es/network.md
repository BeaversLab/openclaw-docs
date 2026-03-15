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

- [Arquitectura de puerta de enlace](/es/concepts/architecture)
- [Protocolo de puerta de enlace](/es/gateway/protocol)
- [Manual de procedimientos de puerta de enlace](/es/gateway)
- [Superficies web + modos de enlace](/es/web)

## Emparejamiento + identidad

- [Descripción general del emparejamiento (DM + nodos)](/es/channels/pairing)
- [Emparejamiento de nodos propiedad de la puerta de enlace](/es/gateway/pairing)
- [CLI de dispositivos (emparejamiento + rotación de tokens)](/es/cli/devices)
- [CLI de emparejamiento (aprobaciones de DM)](/es/cli/pairing)

Confianza local:

- Las conexiones locales (loopback o la dirección tailnet propia del host de la puerta de enlace) pueden ser
  aprobadas automáticamente para el emparejamiento para mantener fluida la UX en el mismo host.
- Los clientes de tailnet/LAN no locales aún requieren aprobación explícita de emparejamiento.

## Descubrimiento + transportes

- [Descubrimiento y transportes](/es/gateway/discovery)
- [Bonjour / mDNS](/es/gateway/bonjour)
- [Acceso remoto (SSH)](/es/gateway/remote)
- [Tailscale](/es/gateway/tailscale)

## Nodos + transportes

- [Descripción general de nodos](/es/nodes)
- [Protocolo de puente (nodos heredados)](/es/gateway/bridge-protocol)
- [Manual de procedimientos de nodo: iOS](/es/platforms/ios)
- [Manual de procedimientos de nodo: Android](/es/platforms/android)

## Seguridad

- [Descripción general de seguridad](/es/gateway/security)
- [Referencia de configuración de puerta de enlace](/es/gateway/configuration)
- [Solución de problemas](/es/gateway/troubleshooting)
- [Doctor](/es/gateway/doctor)

import es from "/components/footer/es.mdx";

<es />
