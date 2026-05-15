---
summary: "Descubrimiento de nodos y transportes (Bonjour, Tailscale, SSH) para encontrar la puerta de enlace"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Descubrimiento y transportes"
---

OpenClaw tiene dos problemas distintos que parecen similares en la superficie:

1. **Control remoto del operador**: la aplicación de la barra de menús de macOS que controla una puerta de enlace que se ejecuta en otro lugar.
2. **Emparejamiento de nodos**: iOS/Android (y nodos futuros) encuentran una puerta de enlace y se emparejan de forma segura.

El objetivo de diseño es mantener todo el descubrimiento/publicación de red en el **Node Gateway** (`openclaw gateway`) y mantener los clientes (aplicación Mac, iOS) como consumidores.

## Términos

- **Gateway (Puerta de enlace)**: un único proceso de puerta de enlace de larga duración que posee el estado (sesiones, emparejamiento, registro de nodos) y ejecuta canales. La mayoría de las configuraciones usan una por host; las configuraciones de múltiples puertas de enlace aisladas son posibles.
- **Gateway WS (plano de control)**: el endpoint de WebSocket en `127.0.0.1:18789` de manera predeterminada; se puede vincular a LAN/tailnet a través de `gateway.bind`.
- **Transporte WS directo**: un endpoint Gateway WS orientado a LAN/tailnet (sin SSH).
- **Transporte SSH (alternativo)**: control remoto reenviando `127.0.0.1:18789` a través de SSH.
- **Puente TCP heredado (eliminado)**: transporte de nodo antiguo (ver
  [Bridge protocol](/es/gateway/bridge-protocol)); ya no se anuncia para
  el descubrimiento y ya no es parte de las compilaciones actuales.

Detalles del protocolo:

- [Gateway protocol](/es/gateway/protocol)
- [Bridge protocol (legacy)](/es/gateway/bridge-protocol)

## Por qué mantenemos ambos, directo y SSH

- **WS directo** ofrece la mejor experiencia de usuario (UX) en la misma red y dentro de una tailnet:
  - autodescubrimiento en LAN a través de Bonjour
  - tokens de emparejamiento + ACLs propiedad de la puerta de enlace
  - no requiere acceso al shell; la superficie del protocolo puede mantenerse ajustada y auditable
- **SSH** sigue siendo la alternativa universal:
  - funciona en cualquier lugar donde tenga acceso SSH (incluso a través de redes no relacionadas)
  - sobrevive a problemas de multidifusión/mDNS
  - no requiere nuevos puertos de entrada además de SSH

## Entradas de descubrimiento (cómo aprenden los clientes dónde está la puerta de enlace)

### 1) Descubrimiento Bonjour / DNS-SD

La multidifusión Bonjour es de mejor esfuerzo y no cruza redes. OpenClaw también puede explorar la misma baliza de puerta de enlace a través de un dominio DNS-SD de área amplia configurado, por lo que el descubrimiento puede cubrir:

- `local.` en la misma LAN
- un dominio DNS-SD de unidifusión configurado para el descubrimiento entre redes

Dirección de destino:

- El **gateway** anuncia su punto de conexión WS a través de Bonjour cuando el complemento incluido
  `bonjour` está habilitado. El complemento se inicia automáticamente en hosts macOS y es opcional en otros lugares.
- Los clientes navegan y muestran una lista "elegir un gateway", luego almacenan el punto de conexión elegido.

Solución de problemas y detalles del beacon: [Bonjour](/es/gateway/bonjour).

#### Detalles del beacon de servicio

- Tipos de servicio:
  - `_openclaw-gw._tcp` (beacon de transporte del gateway)
- Claves TXT (no secretas):
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (nombre para mostrar configurado por el operador)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (solo cuando TLS está habilitado)
  - `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
  - `canvasPort=<port>` (puerto del host del canvas; actualmente el mismo que `gatewayPort` cuando el host del canvas está habilitado)
  - `tailnetDns=<magicdns>` (sugerencia opcional; detectado automáticamente cuando Tailscale está disponible)
  - `sshPort=<port>` (solo modo mDNS completo; DNS-SD de área amplia puede omitirlo, en cuyo caso los valores predeterminados de SSH se mantienen en `22`)
  - `cliPath=<path>` (solo modo mDNS completo; DNS-SD de área amplia aún lo escribe como una sugerencia de instalación remota)

Notas de seguridad:

- Los registros TXT Bonjour/mDNS son **sin autenticar**. Los clientes deben tratar los valores TXT solo como sugerencias de UX.
- El enrutamiento (host/puerto) debe preferir el **punto de conexión del servicio resuelto** (SRV + A/AAAA) sobre los `lanHost`, `tailnetDns` o `gatewayPort` proporcionados por TXT.
- El fijado de TLS nunca debe permitir que un `gatewayTlsSha256` anunciado anule un pin almacenado previamente.
- Los nodos iOS/Android deben requerir una confirmación explícita de "confiar en esta huella digital" antes de almacenar un pin por primera vez (verificación fuera de banda) siempre que la ruta elegida sea segura/basada en TLS.

Habilitar/deshabilitar/anular:

- `openclaw plugins enable bonjour` habilita la publicidad multidifusión de LAN.
- `OPENCLAW_DISABLE_BONJOUR=1` deshabilita la publicidad.
- Cuando el complemento Bonjour está habilitado y `OPENCLAW_DISABLE_BONJOUR` no está configurado,
  Bonjour anuncia en hosts normales y se deshabilita automáticamente dentro de contenedores detectados.
  El inicio de Gateway en macOS con configuración vacía habilita el complemento automáticamente; Linux,
  Windows y las implementaciones en contenedores requieren habilitación explícita.
  Use `0` solo en el host, macvlan u otra red compatible con mDNS; use `1` para
  forzar la deshabilitación.
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace del Gateway.
- `OPENCLAW_SSH_PORT` anula el puerto SSH anunciado cuando se emite `sshPort`.
- `OPENCLAW_TAILNET_DNS` publica una sugerencia de `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` anula la ruta de CLI anunciada.

### 2) Tailnet (entre redes)

Para configuraciones de estilo Londres/Viena, Bonjour no ayudará. El objetivo "directo" recomendado es:

- Nombre MagicDNS de Tailscale (preferido) o una IP tailnet estable.

Si el gateway puede detectar que se está ejecutando bajo Tailscale, publica `tailnetDns` como una sugerencia opcional para los clientes (incluidos los balizas de área amplia).

La aplicación de macOS ahora prefiere los nombres MagicDNS sobre las IPs de Tailscale sin procesar para el descubrimiento de la puerta de enlace. Esto mejora la confiabilidad cuando las IPs del tailnet cambian (por ejemplo, después de reiniciar el nodo o la reasignación de CGNAT), porque los nombres MagicDNS se resuelven a la IP actual automáticamente.

Para el emparejamiento de nodos móviles, las sugerencias de descubrimiento no relajan la seguridad del transporte en rutas tailnet/públicas:

- iOS/Android aún requieren una ruta de conexión segura por primera vez a la tailnet/pública (`wss://` o Tailscale Serve/Funnel).
- Una IP de tailnet descubierta es una sugerencia de enrutamiento, no un permiso para usar `ws://` remoto en texto sin cifrar.
- La conexión directa `ws://` de LAN privada sigue siendo compatible.
- Si desea la ruta más sencilla de Tailscale para nodos móviles, use Tailscale Serve para que tanto el descubrimiento como el código de configuración resuelvan al mismo punto final seguro de MagicDNS.

### 3) Manual / destino SSH

Cuando no hay una ruta directa (o la directa está deshabilitada), los clientes siempre pueden conectarse a través de SSH reenviando el puerto de puerta de enlace de bucle local (loopback).

Consulte [Acceso remoto](/es/gateway/remote).

## Selección de transporte (política de cliente)

Comportamiento recomendado del cliente:

1. Si se configura y es accesible un punto final directo emparejado, úselo.
2. De lo contrario, si el descubrimiento encuentra un gateway en `local.` o el dominio de área amplia configurado, ofrezca una elección de "Usar este gateway" con un toque y guárdelo como el endpoint directo.
3. De lo contrario, si se configura un DNS/IP de tailnet, intente el modo directo.
   Para nodos móviles en rutas tailnet/públicas, directo significa un endpoint seguro, no `ws://` remoto en texto sin cifrar.
4. De lo contrario, recurra a SSH.

## Emparejamiento + autenticación (transporte directo)

La puerta de enlace es la fuente de verdad para la admisión de nodos/clientes.

- Las solicitudes de emparejamiento se crean/aprueban/rechazan en el gateway (consulte [Emparejamiento del gateway](/es/gateway/pairing)).
- La puerta de enlace cumple:
  - autenticación (token / par de claves)
  - ámbitos/ACL (la puerta de enlace no es un proxy sin procesar para todos los métodos)
  - límites de velocidad

## Responsabilidades por componente

- **Gateway**: anuncia balizas de descubrimiento, es propietario de las decisiones de emparejamiento y aloja el punto final WS.
- **app de macOS**: le ayuda a elegir una puerta de enlace, muestra mensajes de emparejamiento y usa SSH solo como alternativa.
- **nodos iOS/Android**: exploran Bonjour por comodidad y se conectan al WS de la puerta de enlace emparejada.

## Relacionado

- [Acceso remoto](/es/gateway/remote)
- [Tailscale](/es/gateway/tailscale)
- [Descubrimiento de Bonjour](/es/gateway/bonjour)
