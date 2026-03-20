---
summary: "Descubrimiento de nodos y transportes (Bonjour, Tailscale, SSH) para encontrar la puerta de enlace"
read_when:
  - Implementar o cambiar el descubrimiento/publicidad de Bonjour
  - Ajustar los modos de conexión remota (directo vs SSH)
  - Diseñar el descubrimiento de nodos + emparejamiento para nodos remotos
title: "Descubrimiento y transportes"
---

# Descubrimiento y transportes

OpenClaw tiene dos problemas distintos que parecen similares en la superficie:

1. **Control remoto del operador**: la aplicación de la barra de menús de macOS que controla una puerta de enlace que se ejecuta en otro lugar.
2. **Emparejamiento de nodos**: iOS/Android (y futuros nodos) encuentran una puerta de enlace y se emparejan de forma segura.

El objetivo de diseño es mantener todo el descubrimiento/publicidad de red en el **Node Gateway** (`openclaw gateway`) y mantener los clientes (aplicación Mac, iOS) como consumidores.

## Términos

- **Gateway**: un único proceso de puerta de enlace de larga duración que posee el estado (sesiones, emparejamiento, registro de nodos) y ejecuta canales. La mayoría de las configuraciones usan una por host; son posibles configuraciones aisladas de múltiples puertas de enlace.
- **Gateway WS (plano de control)**: el endpoint WebSocket en `127.0.0.1:18789` de forma predeterminada; se puede vincular a LAN/tailnet a través de `gateway.bind`.
- **Transporte WS directo**: un endpoint Gateway WS orientado a LAN/tailnet (sin SSH).
- **Transporte SSH (fallback)**: control remoto reenviando `127.0.0.1:18789` a través de SSH.
- **Puente TCP heredado (en desuso/eliminado)**: transporte de nodo antiguo (ver [Bridge protocol](/es/gateway/bridge-protocol)); ya no se anuncia para el descubrimiento.

Detalles del protocolo:

- [Gateway protocol](/es/gateway/protocol)
- [Bridge protocol (legacy)](/es/gateway/bridge-protocol)

## Por qué mantenemos tanto "directo" como SSH

- **Direct WS** es la mejor experiencia de usuario en la misma red y dentro de una tailnet:
  - descubrimiento automático en LAN a través de Bonjour
  - tokens de emparejamiento + ACLs propiedad de la puerta de enlace
  - no se requiere acceso al shell; la superficie del protocolo puede mantenerse estrecha y auditable
- **SSH** sigue siendo el fallback universal:
  - funciona en cualquier lugar donde tenga acceso SSH (incluso a través de redes no relacionadas)
  - sobrevive a problemas de multidifusión/mDNS
  - no requiere nuevos puertos de entrada además de SSH

## Entradas de descubrimiento (cómo aprenden los clientes dónde está la puerta de enlace)

### 1) Bonjour / mDNS (solo LAN)

Bonjour es de mejor esfuerzo y no cruza redes. Solo se usa por comodidad en la "misma LAN".

Dirección de destino:

- El **gateway** anuncia su punto de conexión WS a través de Bonjour.
- Los clientes buscan y muestran una lista de "elegir un gateway", luego almacenan el punto de conexión elegido.

Solución de problemas y detalles del beacon: [Bonjour](/es/gateway/bonjour).

#### Detalles del beacon de servicio

- Tipos de servicio:
  - `_openclaw-gw._tcp` (beacon de transporte del gateway)
- Claves TXT (no secretas):
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (o lo que se anuncie)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (solo cuando TLS está habilitado)
  - `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
  - `canvasPort=<port>` (puerto del host del canvas; actualmente el mismo que `gatewayPort` cuando el host del canvas está habilitado)
  - `cliPath=<path>` (opcional; ruta absoluta a un punto de entrada o binario `openclaw` ejecutable)
  - `tailnetDns=<magicdns>` (pista opcional; autodetectado cuando Tailscale está disponible)

Notas de seguridad:

- Los registros TXT de Bonjour/mDNS son **no autenticados**. Los clientes deben tratar los valores TXT solo como pistas de UX.
- El enrutamiento (host/puerto) debe preferir el **punto de conexión del servicio resuelto** (SRV + A/AAAA) sobre los `lanHost`, `tailnetDns` o `gatewayPort` proporcionados por TXT.
- El fijado de TLS nunca debe permitir que un `gatewayTlsSha256` anunciado anule un pin almacenado previamente.
- Los nodos iOS/Android deben tratar las conexiones directas basadas en descubrimiento como **solo TLS** y requerir una confirmación explícita de "confiar en esta huella digital" antes de almacenar un pin por primera vez (verificación fuera de banda).

Deshabilitar/sobrescribir:

- `OPENCLAW_DISABLE_BONJOUR=1` deshabilita el anuncio.
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace del Gateway.
- `OPENCLAW_SSH_PORT` sobrescribe el puerto SSH anunciado en TXT (el valor predeterminado es 22).
- `OPENCLAW_TAILNET_DNS` publica una pista de `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` sobrescribe la ruta del CLI anunciada.

### 2) Tailnet (entre redes)

Para configuraciones de estilo Londres/Viena, Bonjour no ayudará. El objetivo "directo" recomendado es:

- Nombre MagicDNS de Tailscale (preferido) o una IP de tailnet estable.

Si la puerta de enlace puede detectar que se está ejecutando bajo Tailscale, publica `tailnetDns` como una sugerencia opcional para los clientes (incluidos los balizas de área amplia).

### 3) Manual / destino SSH

Cuando no hay una ruta directa (o está deshabilitada), los clientes siempre pueden conectarse a través de SSH reenviando el puerto de la puerta de enlace de loopback.

Consulte [Acceso remoto](/es/gateway/remote).

## Selección de transporte (política del cliente)

Comportamiento recomendado del cliente:

1. Si se configura y se puede alcanzar un endpoint directo emparejado, úselo.
2. De lo contrario, si Bonjour encuentra una puerta de enlace en la LAN, ofrezca una elección de "Usar esta puerta de enlace" con un toque y guárdela como el endpoint directo.
3. De lo contrario, si se configura una DNS/IP de tailnet, intente el acceso directo.
4. De lo contrario, recurra a SSH.

## Emparejamiento + autenticación (transporte directo)

La puerta de enlace es la fuente de verdad para la admisión de nodos/clientes.

- Las solicitudes de emparejamiento se crean/aprueban/rechazan en la puerta de enlace (consulte [Emparejamiento de puerta de enlace](/es/gateway/pairing)).
- La puerta de enlace hace cumplir:
  - autenticación (token / par de claves)
  - ámbitos/ACL (la puerta de enlace no es un proxy sin procesar para todos los métodos)
  - límites de frecuencia

## Responsabilidades por componente

- **Gateway**: anuncia balizas de descubrimiento, posee decisiones de emparejamiento y aloja el endpoint WS.
- **macOS app**: le ayuda a elegir una puerta de enlace, muestra indicaciones de emparejamiento y usa SSH solo como respaldo.
- **iOS/Android nodes**: exploran Bonjour como una comodidad y se conectan al WS de la puerta de enlace emparejada.

import es from "/components/footer/es.mdx";

<es />
