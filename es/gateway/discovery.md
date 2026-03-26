---
summary: "Descubrimiento de nodos y transportes (Bonjour, Tailscale, SSH) para encontrar la puerta de enlace"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Descubrimiento y transportes"
---

# Descubrimiento y transportes

OpenClaw tiene dos problemas distintos que parecen similares en la superficie:

1. **Control remoto del operador**: la aplicación de la barra de menús de macOS que controla una puerta de enlace que se ejecuta en otro lugar.
2. **Emparejamiento de nodos**: iOS/Android (y nodos futuros) encuentran una puerta de enlace y se emparejan de forma segura.

El objetivo de diseño es mantener todo el descubrimiento/publicidad de red en el **Node Gateway** (`openclaw gateway`) y mantener los clientes (aplicación Mac, iOS) como consumidores.

## Términos

- **Gateway**: un único proceso de puerta de enlace de larga duración que posee el estado (sesiones, emparejamiento, registro de nodos) y ejecuta canales. La mayoría de las configuraciones utilizan uno por host; son posibles configuraciones de múltiples puertas de enlace aisladas.
- **Gateway WS (plano de control)**: el punto final WebSocket en `127.0.0.1:18789` de forma predeterminada; se puede vincular a LAN/tailnet mediante `gateway.bind`.
- **Transporte WS directo**: un punto final de Gateway WS orientado a LAN/tailnet (sin SSH).
- **Transporte SSH (alternativo)**: control remoto mediante el reenvío de `127.0.0.1:18789` a través de SSH.
- **Puente TCP heredado (obsoleto/eliminado)**: transporte de nodo antiguo (consulte [Bridge protocol](/es/gateway/bridge-protocol)); ya no se anuncia para el descubrimiento.

Detalles del protocolo:

- [Gateway protocol](/es/gateway/protocol)
- [Bridge protocol (legacy)](/es/gateway/bridge-protocol)

## Por qué mantenemos tanto "direct" como SSH

- **WS directo** es la mejor experiencia de usuario en la misma red y dentro de una tailnet:
  - descubrimiento automático en LAN mediante Bonjour
  - tokens de emparejamiento + ACLs propiedad de la puerta de enlace
  - no requiere acceso al shell; la superficie del protocolo puede permanecer cerrada y auditable
- **SSH** sigue siendo la alternativa universal:
  - funciona en cualquier lugar donde tenga acceso SSH (incluso a través de redes no relacionadas)
  - sobrevive a problemas de multidifusión/mDNS
  - no requiere nuevos puertos de entrada además de SSH

## Entradas de descubrimiento (cómo saben los clientes dónde está la puerta de enlace)

### 1) Bonjour / mDNS (solo LAN)

Bonjour es de mejor esfuerzo y no cruza redes. Solo se usa por conveniencia de “misma LAN”.

Dirección de destino:

- La **puerta de enlace** anuncia su punto final WS a través de Bonjour.
- Los clientes exploran y muestran una lista de "elegir una puerta de enlace", y luego almacenan el punto de conexión elegido.

Solución de problemas y detalles de la baliza: [Bonjour](/es/gateway/bonjour).

#### Detalles de la baliza de servicio

- Tipos de servicio:
  - `_openclaw-gw._tcp` (baliza de transporte de puerta de enlace)
- Claves TXT (no secretas):
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (o lo que se anuncie)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (solo cuando TLS está habilitado)
  - `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
  - `canvasPort=<port>` (puerto del host del lienzo; actualmente el mismo que `gatewayPort` cuando el host del lienzo está habilitado)
  - `cliPath=<path>` (opcional; ruta absoluta a un punto de entrada o binario ejecutable `openclaw`)
  - `tailnetDns=<magicdns>` (pista opcional; autodetectado cuando Tailscale está disponible)

Notas de seguridad:

- Los registros TXT Bonjour/mDNS **no están autenticados**. Los clientes deben tratar los valores TXT solo como pistas de UX.
- El enrutamiento (host/puerto) debe preferir el **punto de conexión del servicio resuelto** (SRV + A/AAAA) sobre los `lanHost`, `tailnetDns` o `gatewayPort` proporcionados por TXT.
- El anclaje TLS nunca debe permitir que un `gatewayTlsSha256` anunciado anule un anclaje previamente almacenado.
- Los nodos iOS/Android deben tratar las conexiones directas basadas en descubrimiento como **solo TLS** y requerir una confirmación explícita de "confiar en esta huella digital" antes de almacenar un anclaje por primera vez (verificación fuera de banda).

Desactivar/sobrescribir:

- `OPENCLAW_DISABLE_BONJOUR=1` desactiva la publicidad.
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace de la puerta de enlace.
- `OPENCLAW_SSH_PORT` sobrescribe el puerto SSH anunciado en TXT (por defecto es 22).
- `OPENCLAW_TAILNET_DNS` publica una pista `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` sobrescribe la ruta CLI anunciada.

### 2) Tailnet (entre redes)

Para configuraciones estilo Londres/Viena, Bonjour no ayudará. El objetivo "directo" recomendado es:

- Nombre MagicDNS de Tailscale (preferido) o una IP tailnet estable.

Si la puerta de enlace puede detectar que se está ejecutando bajo Tailscale, publica `tailnetDns` como una pista opcional para los clientes (incluidos los faros de área amplia).

### 3) Manual / destino SSH

Cuando no hay una ruta directa (o la directa está deshabilitada), los clientes siempre pueden conectarse a través de SSH reenviando el puerto de la puerta de enlace de loopback.

Consulte [Acceso remoto](/es/gateway/remote).

## Selección de transporte (política del cliente)

Comportamiento recomendado del cliente:

1. Si se configura y se puede alcanzar un endpoint directo emparejado, úselo.
2. De lo contrario, si Bonjour encuentra una puerta de enlace en la LAN, ofrezca una opción de "Usar esta puerta de enlace" con un solo toque y guárdela como el endpoint directo.
3. De lo contrario, si se configura un DNS/IP de tailnet, intente una conexión directa.
4. De lo contrario, recurra a SSH.

## Emparejamiento + autenticación (transporte directo)

La puerta de enlace es la fuente de verdad para la admisión de nodos/clientes.

- Las solicitudes de emparejamiento se crean/aprueban/rechazan en la puerta de enlace (consulte [Emparejamiento de puerta de enlace](/es/gateway/pairing)).
- La puerta de enlace hace cumplir:
  - autenticación (token / par de claves)
  - ámbitos/ACL (la puerta de enlace no es un proxy sin procesar para todos los métodos)
  - límites de velocidad

## Responsabilidades por componente

- **Puerta de enlace (Gateway)**: anuncia faros de descubrimiento, posee las decisiones de emparejamiento y aloja el endpoint WS.
- **aplicación macOS**: le ayuda a elegir una puerta de enlace, muestra indicaciones de emparejamiento y usa SSH solo como alternativa.
- **nodos iOS/Android**: exploran Bonjour por comodidad y se conectan al WS de la puerta de enlace emparejada.

import es from "/components/footer/es.mdx";

<es />
