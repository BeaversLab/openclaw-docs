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
- **Puente TCP heredado (eliminado)**: transporte de nodo antiguo (ver
  [Protocolo de puente](/en/gateway/bridge-protocol)); ya no se anuncia para
  el descubrimiento y ya no es parte de las compilaciones actuales.

Detalles del protocolo:

- [Protocolo de puerta de enlace](/en/gateway/protocol)
- [Protocolo de puente (heredado)](/en/gateway/bridge-protocol)

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

### 1) Descubrimiento mediante Bonjour / DNS-SD

El Bonjar multidifusión (multicast) es de mejor esfuerzo y no cruza redes. OpenClaw también puede examinar el
mismo beacon de puerta de enlace a través de un dominio DNS-SD de área amplia configurado, por lo que el descubrimiento puede cubrir:

- `local.` en la misma LAN
- un dominio DNS-SD de unidifusión (unicast) configurado para el descubrimiento entre redes

Dirección de destino:

- La **puerta de enlace** anuncia su punto final WS mediante Bonjour.
- Los clientes examinan y muestran una lista de "elegir una puerta de enlace", luego almacenan el punto final elegido.

Solución de problemas y detalles del beacon: [Bonjour](/en/gateway/bonjour).

#### Detalles del beacon de servicio

- Tipos de servicio:
  - `_openclaw-gw._tcp` (beacon de transporte de puerta de enlace)
- Claves TXT (no secretas):
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (nombre de visualización configurado por el operador)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (solo cuando TLS está habilitado)
  - `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
  - `canvasPort=<port>` (puerto del host del lienzo; actualmente el mismo que `gatewayPort` cuando el host del lienzo está habilitado)
  - `tailnetDns=<magicdns>` (pista opcional; autodetectado cuando Tailscale está disponible)
  - `sshPort=<port>` (solo modo mDNS completo; DNS-SD de área amplia puede omitirlo, en cuyo caso los valores predeterminados de SSH se mantienen en `22`)
  - `cliPath=<path>` (solo modo mDNS completo; DNS-SD de área amplia aún lo escribe como una pista de instalación remota)

Notas de seguridad:

- Los registros TXT de Bonjour/mDNS son **sin autenticar**. Los clientes deben tratar los valores TXT solo como pistas de UX.
- El enrutamiento (host/puerto) debe preferir el **punto final de servicio resuelto** (SRV + A/AAAA) sobre el `lanHost`, `tailnetDns` o `gatewayPort` proporcionado por TXT.
- La fijación de TLS nunca debe permitir que un `gatewayTlsSha256` anunciado anule un pin almacenado previamente.
- Los nodos iOS/Android deben requerir una confirmación explícita de "confiar en esta huella digital" antes de almacenar un pin por primera vez (verificación fuera de banda) siempre que la ruta elegida sea segura/basada en TLS.

Desactivar/sobrescribir:

- `OPENCLAW_DISABLE_BONJOUR=1` desactiva la publicidad.
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace del Gateway.
- `OPENCLAW_SSH_PORT` sobrescribe el puerto SSH anunciado cuando se emite `sshPort`.
- `OPENCLAW_TAILNET_DNS` publica una sugerencia `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` sobrescribe la ruta CLI anunciada.

### 2) Tailnet (entre redes)

Para configuraciones de estilo Londres/Viena, Bonjour no ayudará. El objetivo "directo" recomendado es:

- Nombre MagicDNS de Tailscale (preferido) o una IP estable de tailnet.

Si el gateway puede detectar que se está ejecutando bajo Tailscale, publica `tailnetDns` como una sugerencia opcional para los clientes (incluidos los balizas de área amplia).

La aplicación de macOS ahora prefiere los nombres MagicDNS sobre las IPs de Tailscale sin procesar para el descubrimiento del gateway. Esto mejora la confiabilidad cuando las IPs del tailnet cambian (por ejemplo, después de reiniciar el nodo o la reasignación de CGNAT), ya que los nombres MagicDNS se resuelven automáticamente a la IP actual.

Para el emparejamiento de nodos móviles, las sugerencias de descubrimiento no relajan la seguridad del transporte en las rutas tailnet/públicas:

- iOS/Android aún requieren una ruta de conexión tailnet/pública segura por primera vez (`wss://` o Tailscale Serve/Funnel).
- Una IP de tailnet sin procesar descubierta es una sugerencia de enrutamiento, no un permiso para usar `ws://` remoto en texto plano.
- La conexión directa `ws://` de LAN privada sigue siendo compatible.
- Si desea la ruta más simple de Tailscale para los nodos móviles, use Tailscale Serve para que tanto el descubrimiento como el código de configuración se resuelvan en el mismo punto final MagicDNS seguro.

### 3) Objetivo manual / SSH

Cuando no hay una ruta directa (o la directa está desactivada), los clientes siempre pueden conectarse mediante SSH reenviando el puerto de loopback del gateway.

Consulte [Acceso remoto](/en/gateway/remote).

## Selección de transporte (política del cliente)

Comportamiento recomendado del cliente:

1. Si se configura y se puede alcanzar un extremo directo emparejado, úselo.
2. De lo contrario, si el descubrimiento encuentra una puerta de enlace en `local.` o en el dominio de área amplia configurado, ofrezca una opción de "Usar esta puerta de enlace" con un toque y guárdela como el extremo directo.
3. De lo contrario, si se configura una DNS/IP de tailnet, intente el modo directo.
   Para nodos móviles en rutas tailnet/públicas, directo significa un extremo seguro, no `ws://` remoto en texto plano.
4. De lo contrario, recurra a SSH.

## Emparejamiento + autenticación (transporte directo)

La puerta de enlace es la fuente de verdad para la admisión de nodos/clientes.

- Las solicitudes de emparejamiento se crean/aprueban/rechazan en la puerta de enlace (consulte [Emparejamiento de puerta de enlace](/en/gateway/pairing)).
- La puerta de enlace hace cumplir:
  - autenticación (token / par de claves)
  - alcances/ACL (la puerta de enlace no es un proxy sin procesar para cada método)
  - límites de velocidad

## Responsabilidades por componente

- **Gateway**: anuncia balizas de descubrimiento, posee las decisiones de emparejamiento y aloja el extremo WS.
- **Aplicación macOS**: le ayuda a elegir una puerta de enlace, muestra indicaciones de emparejamiento y usa SSH solo como respaldo.
- **Nodos iOS/Android**: exploran Bonjour por conveniencia y se conectan al WS de la puerta de enlace emparejada.
