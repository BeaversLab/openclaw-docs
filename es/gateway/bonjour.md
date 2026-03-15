---
summary: "Descubrimiento y depuración de Bonjour/mDNS (balizas de Gateway, clientes y modos de fallo comunes)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Descubrimiento de Bonjour"
---

# Descubrimiento de Bonjour / mDNS

OpenClaw utiliza Bonjour (mDNS / DNS‑SD) como una **comodidad solo para LAN** para descubrir
un Gateway activo (endpoint WebSocket). Se hace con el mejor esfuerzo posible y **no** reemplaza la conectividad SSH o
basada en Tailnet.

## Bonjour de área amplia (Unicast DNS‑SD) a través de Tailscale

Si el nodo y el gateway están en diferentes redes, el mDNS multicast no cruzará la
frontera. Puede mantener la misma experiencia de usuario de descubrimiento cambiando a **DNS‑SD unicast**
("Bonjour de área amplia") a través de Tailscale.

Pasos de alto nivel:

1. Ejecute un servidor DNS en el host del gateway (accesible a través de Tailnet).
2. Publique registros DNS‑SD para `_openclaw-gw._tcp` bajo una zona dedicada
   (ejemplo: `openclaw.internal.`).
3. Configure el **DNS dividido** (split DNS) de Tailscale para que su dominio elegido se resuelva a través de ese
   servidor DNS para los clientes (incluido iOS).

OpenClaw soporta cualquier dominio de descubrimiento; `openclaw.internal.` es solo un ejemplo.
Los nodos iOS/Android exploran tanto `local.` como su dominio de área amplia configurado.

### Configuración del Gateway (recomendado)

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### Configuración única del servidor DNS (host del gateway)

```bash
openclaw dns setup --apply
```

Esto instala CoreDNS y lo configura para:

- escuchar en el puerto 53 solo en las interfaces de Tailscale del gateway
- servir su dominio elegido (ejemplo: `openclaw.internal.`) desde `~/.openclaw/dns/<domain>.db`

Valide desde una máquina conectada a tailnet:

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Configuración de DNS de Tailscale

En la consola de administración de Tailscale:

- Añada un servidor de nombres que apunte a la IP de tailnet del gateway (UDP/TCP 53).
- Añada DNS dividido (split DNS) para que su dominio de descubrimiento utilice ese servidor de nombres.

Una vez que los clientes aceptan el DNS de tailnet, los nodos iOS pueden explorar
`_openclaw-gw._tcp` en su dominio de descubrimiento sin multicast.

### Seguridad del escucha del Gateway (recomendado)

El puerto WS del Gateway (predeterminado `18789`) se enlaza a loopback de forma predeterminada. Para el acceso a LAN/tailnet,
enlace explícitamente y mantenga la autenticación habilitada.

Para configuraciones solo de tailnet:

- Establezca `gateway.bind: "tailnet"` en `~/.openclaw/openclaw.json`.
- Reinicie el Gateway (o reinicie la aplicación de la barra de menús de macOS).

## Qué anuncia

Solo el Gateway anuncia `_openclaw-gw._tcp`.

## Tipos de servicio

- `_openclaw-gw._tcp` — baliza de transporte de gateway (utilizada por nodos macOS/iOS/Android).

## Claves TXT (pistas no secretas)

El Gateway anuncia pequeñas pistas no secretas para hacer que los flujos de la interfaz de usuario sean convenientes:

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (solo cuando TLS está habilitado)
- `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
- `canvasPort=<port>` (solo cuando el host del lienzo está habilitado; actualmente igual que `gatewayPort`)
- `sshPort=<port>` (el valor predeterminado es 22 si no se anula)
- `transport=gateway`
- `cliPath=<path>` (opcional; ruta absoluta a un punto de entrada ejecutable `openclaw`)
- `tailnetDns=<magicdns>` (pista opcional cuando Tailnet está disponible)

Notas de seguridad:

- Los registros TXT Bonjour/mDNS son **no autenticados**. Los clientes no deben tratar TXT como un enrutamiento autoritativo.
- Los clientes deben enrutar utilizando el punto de conexión del servicio resuelto (SRV + A/AAAA). Trate `lanHost`, `tailnetDns`, `gatewayPort` y `gatewayTlsSha256` solo como pistas.
- El anclaje de TLS nunca debe permitir que un `gatewayTlsSha256` anunciado anule un anclaje almacenado previamente.
- Los nodos iOS/Android deben tratar las conexiones directas basadas en descubrimiento como **solo TLS** y requerir confirmación explícita del usuario antes de confiar en una huella digital por primera vez.

## Depuración en macOS

Herramientas integradas útiles:

- Explorar instancias:

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- Resolver una instancia (reemplace `<instance>`):

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

Si la exploración funciona pero la resolución falla, generalmente se encuentra con una política de LAN
o un problema con el solucionador mDNS.

## Depuración en los registros del Gateway

El Gateway escribe un archivo de registro rotativo (impreso al inicio como
`gateway log file: ...`). Busque las líneas `bonjour:`, especialmente:

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Depuración en el nodo iOS

El nodo iOS usa `NWBrowser` para descubrir `_openclaw-gw._tcp`.

Para capturar registros:

- Configuración → Gateway → Avanzado → **Registros de depuración de descubrimiento**
- Configuración → Gateway → Avanzado → **Registros de descubrimiento** → reproducir → **Copiar**

El registro incluye transiciones de estado del navegador y cambios en el conjunto de resultados.

## Modos de error comunes

- **Bonjour no cruza redes**: use Tailnet o SSH.
- **Multidifusión bloqueada**: algunas redes Wi‑Fi deshabilitan mDNS.
- **Suspensión / cambio de interfaz**: macOS puede descartar temporalmente los resultados de mDNS; inténtelo de nuevo.
- **La navegación funciona pero la resolución falla**: mantenga los nombres de las máquinas simples (evite emojis o signos de puntuación), luego reinicie el Gateway. El nombre de la instancia de servicio se deriva del nombre del host, por lo que los nombres excesivamente complejos pueden confundir a algunos resolvedores.

## Nombres de instancia escapados (`\032`)

Bonjour/DNS‑SD a menudo escapa bytes en los nombres de instancia de servicio como `\DDD`
secuencias decimales (por ejemplo, los espacios se convierten en `\032`).

- Esto es normal a nivel de protocolo.
- Las interfaces de usuario deben decodificar para su visualización (iOS usa `BonjourEscapes.decode`).

## Deshabilitación / configuración

- `OPENCLAW_DISABLE_BONJOUR=1` deshabilita la publicidad (legado: `OPENCLAW_DISABLE_BONJOUR`).
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace del Gateway.
- `OPENCLAW_SSH_PORT` anula el puerto SSH anunciado en TXT (legado: `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publica una sugerencia de MagicDNS en TXT (legado: `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` anula la ruta CLI anunciada (legado: `OPENCLAW_CLI_PATH`).

## Documentos relacionados

- Política de descubrimiento y selección de transporte: [Descubrimiento](/es/gateway/discovery)
- Emparejamiento de nodos + aprobaciones: [Emparejamiento de Gateway](/es/gateway/pairing)

import es from "/components/footer/es.mdx";

<es />
