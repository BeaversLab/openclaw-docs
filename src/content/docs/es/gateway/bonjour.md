---
summary: "Descubrimiento y depuración de Bonjour/mDNS (balizas de Gateway, clientes y modos de fallo comunes)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Descubrimiento de Bonjour"
---

# Descubrimiento de Bonjour / mDNS

OpenClaw utiliza Bonjour (mDNS / DNS‑SD) para descubrir un Gateway activo (endpoint WebSocket).
La navegación por multidifusión `local.` es una **comodidad solo para LAN**. Para el descubrimiento entre redes,
el mismo beacon también puede publicarse a través de un dominio DNS-SD de área amplia configurado. El descubrimiento sigue
siendo de mejor esfuerzo y **no** reemplaza la conectividad basada en SSH o Tailnet.

## Bonjour de área amplia (DNS‑SD unicast) a través de Tailscale

Si el nodo y el gateway están en diferentes redes, el mDNS multicast no cruzará la
frontera. Puede mantener la misma experiencia de usuario de descubrimiento cambiando a **DNS‑SD unicast**
("Bonjour de área amplia") a través de Tailscale.

Pasos de alto nivel:

1. Ejecute un servidor DNS en el host del gateway (accesible a través de Tailnet).
2. Publicar registros DNS‑SD para `_openclaw-gw._tcp` bajo una zona dedicada
   (ejemplo: `openclaw.internal.`).
3. Configure el **DNS dividido** (split DNS) de Tailscale para que su dominio elegido se resuelva a través de ese
   servidor DNS para los clientes (incluido iOS).

OpenClaw admite cualquier dominio de descubrimiento; `openclaw.internal.` es solo un ejemplo.
Los nodos iOS/Android navegan tanto por `local.` como por su dominio de área amplia configurado.

### Configuración del Gateway (recomendado)

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### Configuración única del servidor DNS (host de puerta de enlace)

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

Una vez que los clientes aceptan el DNS tailnet, los nodos iOS y el descubrimiento CLI pueden navegar
`_openclaw-gw._tcp` en su dominio de descubrimiento sin multidifusión.

### Seguridad del escucha del Gateway (recomendado)

El puerto WS del Gateway (por defecto `18789`) se enlaza a loopback por defecto. Para el acceso a LAN/tailnet,
enlace explícitamente y mantenga la autenticación habilitada.

Para configuraciones solo de tailnet:

- Establezca `gateway.bind: "tailnet"` en `~/.openclaw/openclaw.json`.
- Reinicie el Gateway (o reinicie la aplicación de la barra de menús de macOS).

## Qué anuncia

Solo el Gateway anuncia `_openclaw-gw._tcp`.

## Tipos de servicio

- `_openclaw-gw._tcp` — beacon de transporte de gateway (utilizado por nodos macOS/iOS/Android).

## Claves TXT (sugerencias no secretas)

El Gateway anuncia pequeñas pistas no secretas para hacer que los flujos de la interfaz de usuario sean convenientes:

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (solo cuando TLS está habilitado)
- `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
- `canvasPort=<port>` (solo cuando el host del lienzo está habilitado; actualmente igual a `gatewayPort`)
- `transport=gateway`
- `tailnetDns=<magicdns>` (sugerencia opcional cuando Tailnet está disponible)
- `sshPort=<port>` (solo modo mDNS completo; DNS-SD de área amplia puede omitirlo)
- `cliPath=<path>` (solo modo mDNS completo; DNS-SD de área amplia aún lo escribe como una sugerencia de instalación remota)

Notas de seguridad:

- Los registros TXT Bonjour/mDNS son **no autenticados**. Los clientes no deben tratar TXT como un enrutamiento autoritativo.
- Los clientes deben enrutar utilizando el punto de conexión del servicio resuelto (SRV + A/AAAA). Trate `lanHost`, `tailnetDns`, `gatewayPort` y `gatewayTlsSha256` solo como pistas.
- El autoenrutamiento SSH también debe usar el host del servicio resuelto, no solo sugerencias TXT.
- TLS pinning nunca debe permitir que un `gatewayTlsSha256` anunciado anule un pin almacenado previamente.
- Los nodos de iOS/Android deben tratar las conexiones directas basadas en descubrimiento como **solo TLS** y requieren confirmación explícita del usuario antes de confiar en una huella digital por primera vez.

## Depuración en macOS

Herramientas integradas útiles:

- Examinar instancias:

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- Resolver una instancia (reemplazar `<instance>`):

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

Si la exploración funciona pero la resolución falla, generalmente estás encontrando una política de LAN o un problema con el solucionador mDNS.

## Depuración en los registros de Gateway

El Gateway escribe un archivo de registro rotativo (impreso al inicio como `gateway log file: ...`). Busque líneas `bonjour:`, especialmente:

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Depuración en el nodo iOS

El nodo iOS usa `NWBrowser` para descubrir `_openclaw-gw._tcp`.

Para capturar registros:

- Configuración → Gateway → Avanzado → **Registros de depuración de descubrimiento**
- Configuración → Gateway → Avanzado → **Registros de descubrimiento** → reproducir → **Copiar**

El registro incluye transiciones de estado del navegador y cambios en el conjunto de resultados.

## Modos de falla comunes

- **Bonjour no cruza redes**: use Tailnet o SSH.
- **Multidifusión bloqueada**: algunas redes Wi‑Fi desactivan mDNS.
- **Suspensión / rotación de interfaz**: macOS puede descartar temporalmente los resultados de mDNS; reintente.
- **La exploración funciona pero la resolución falla**: mantenga los nombres de máquina simples (evite emojis o puntuación), luego reinicie el Gateway. El nombre de la instancia de servicio se deriva del nombre del host, por lo que los nombres excesivamente complejos pueden confundir a algunos solucionadores.

## Nombres de instancia escapados (`\032`)

Bonjour/DNS‑SD a menudo escapa bytes en los de nombres de instancia de servicio como secuencias decimales `\DDD` (por ejemplo, los espacios se convierten en `\032`).

- Esto es normal a nivel de protocolo.
- Las interfaces de usuario deben decodificar para su visualización (iOS usa `BonjourEscapes.decode`).

## Desactivación / configuración

- `OPENCLAW_DISABLE_BONJOUR=1` desactiva la publicidad (legado: `OPENCLAW_DISABLE_BONJOUR`).
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace de Gateway.
- `OPENCLAW_SSH_PORT` anula el puerto SSH cuando se anuncia `sshPort` (legado: `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publica un consejo de MagicDNS en TXT (legado: `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` anula la ruta CLI anunciada (legado: `OPENCLAW_CLI_PATH`).

## Documentación relacionada

- Política de descubrimiento y selección de transporte: [Descubrimiento](/es/gateway/discovery)
- Emparejamiento de nodos + aprobaciones: [Emparejamiento de puerta de enlace](/es/gateway/pairing)
