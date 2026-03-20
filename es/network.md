---
summary: "Concentrador de red: superficies de la puerta de enlace, emparejamiento, descubrimiento y seguridad"
read_when:
  - Necesitas la descripción general de la arquitectura de red + seguridad
  - Estás depurando el acceso local frente a tailnet o el emparejamiento
  - Quieres la lista canónica de documentos de red
title: "Red"
---

# Concentrador de red

Este centro vincula los documentos principales sobre cómo OpenClaw conecta, empareja y asegura
dispositivos a través de localhost, LAN y tailnet.

## Modelo principal

- [Arquitectura de la puerta de enlace](/es/concepts/architecture)
- [Protocolo de puerta de enlace](/es/gateway/protocol)
- [Manual de procedimientos de la puerta de enlace](/es/gateway)
- [Superficies web + modos de enlace](/es/web)

## Emparejamiento + identidad

- [Descripción general del emparejamiento (DM + nodos)](/es/channels/pairing)
- [Emparejamiento de nodos propiedad de la puerta de enlace](/es/gateway/pairing)
- [CLI de dispositivos (emparejamiento + rotación de tokens)](/es/cli/devices)
- [CLI de emparejamiento (aprobaciones DM)](/es/cli/pairing)

Confianza local:

- Las conexiones locales (bucle o la propia dirección de tailnet del host de la puerta de enlace) pueden ser
  aprobadas automáticamente para el emparejamiento para mantener la UX del mismo host fluida.
- Los clientes de tailnet/LAN no locales aún requieren una aprobación de emparejamiento explícita.

## Descubrimiento + transportes

- [Descubrimiento y transportes](/es/gateway/discovery)
- [Bonjour / mDNS](/es/gateway/bonjour)
- [Acceso remoto (SSH)](/es/gateway/remote)
- [Tailscale](/es/gateway/tailscale)

## Nodos + transportes

- [Descripción general de los nodos](/es/nodes)
- [Protocolo puente (nodos heredados)](/es/gateway/bridge-protocol)
- [Manual de procedimientos del nodo: iOS](/es/platforms/ios)
- [Manual de procedimientos del nodo: Android](/es/platforms/android)

## Seguridad

- [Descripción general de seguridad](/es/gateway/security)
- [Referencia de configuración de la puerta de enlace](/es/gateway/configuration)
- [Solución de problemas](/es/gateway/troubleshooting)
- [Doctor](/es/gateway/doctor)

import en from "/components/footer/en.mdx";

<en />
