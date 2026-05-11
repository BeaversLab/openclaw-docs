---
summary: "Descubrimiento y depuración de Bonjour/mDNS (balizas de Gateway, clientes y modos de fallo comunes)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Descubrimiento de Bonjour"
---

# Descubrimiento de Bonjour / mDNS

OpenClaw utiliza Bonjour (mDNS / DNS-SD) para descubrir un Gateway activo (endpoint WebSocket).
La navegación multicast `local.` es una **comodidad solo de LAN**. El complemento `bonjour`
incluido se encarga de la publicidad en LAN y está habilitado de forma predeterminada. Para el descubrimiento entre redes,
la misma baliza también puede publicarse a través de un dominio DNS-SD de área amplia configurado.
El descubrimiento sigue siendo de mejor esfuerzo y **no** reemplaza la conectividad basada en SSH o Tailnet.

## Bonjour de área amplia (DNS‑SD unicast) a través de Tailscale

Si el nodo y el gateway están en diferentes redes, el mDNS multicast no cruzará la
frontera. Puede mantener la misma experiencia de usuario de descubrimiento cambiando a **DNS‑SD unicast**
("Bonjour de área amplia") a través de Tailscale.

Pasos de alto nivel:

1. Ejecute un servidor DNS en el host del gateway (accesible a través de Tailnet).
2. Publique registros DNS-SD para `_openclaw-gw._tcp` bajo una zona dedicada
   (ejemplo: `openclaw.internal.`).
3. Configure el **DNS dividido** (split DNS) de Tailscale para que su dominio elegido se resuelva a través de ese
   servidor DNS para los clientes (incluido iOS).

OpenClaw admite cualquier dominio de descubrimiento; `openclaw.internal.` es solo un ejemplo.
Los nodos iOS/Android exploran tanto `local.` como su dominio de área amplia configurado.

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
- sirva su dominio elegido (ejemplo: `openclaw.internal.`) desde `~/.openclaw/dns/<domain>.db`

Valide desde una máquina conectada a tailnet:

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Configuración de DNS de Tailscale

En la consola de administración de Tailscale:

- Añada un servidor de nombres que apunte a la IP de tailnet del gateway (UDP/TCP 53).
- Añada DNS dividido (split DNS) para que su dominio de descubrimiento utilice ese servidor de nombres.

Una vez que los clientes aceptan el DNS de tailnet, los nodos iOS y el descubrimiento de CLI pueden explorar
`_openclaw-gw._tcp` en su dominio de descubrimiento sin multicast.

### Seguridad del escucha del Gateway (recomendado)

El puerto WS del Gateway (predeterminado `18789`) se enlaza a loopback de forma predeterminada. Para el acceso a LAN/tailnet,
enlace explícitamente y mantenga la autenticación habilitada.

Para configuraciones solo de tailnet:

- Establezca `gateway.bind: "tailnet"` en `~/.openclaw/openclaw.json`.
- Reinicie el Gateway (o reinicie la aplicación de la barra de menús de macOS).

## Qué anuncia

Solo el Gateway anuncia `_openclaw-gw._tcp`. La publicidad multicast LAN es
proporcionada por el complemento `bonjour` incluido; la publicación DNS-SD de área amplia sigue
siendo propiedad del Gateway.

## Tipos de servicio

- `_openclaw-gw._tcp` — baliza de transporte de gateway (utilizada por nodos macOS/iOS/Android).

## Claves TXT (sugerencias no secretas)

El Gateway anuncia pequeñas pistas no secretas para hacer que los flujos de la interfaz de usuario sean convenientes:

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (solo cuando TLS está habilitado)
- `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
- `canvasPort=<port>` (solo cuando el host del canvas está habilitado; actualmente igual que `gatewayPort`)
- `transport=gateway`
- `tailnetDns=<magicdns>` (solo modo mDNS completo, pista opcional cuando Tailnet está disponible)
- `sshPort=<port>` (solo modo mDNS completo; DNS-SD de área amplia puede omitirlo)
- `cliPath=<path>` (solo modo mDNS completo; DNS-SD de área amplia aún lo escribe como una pista de instalación remota)

Notas de seguridad:

- Los registros TXT Bonjour/mDNS son **no autenticados**. Los clientes no deben tratar TXT como un enrutamiento autoritativo.
- Los clientes deben enrutar utilizando el punto de conexión del servicio resuelto (SRV + A/AAAA). Trate `lanHost`, `tailnetDns`, `gatewayPort` y `gatewayTlsSha256` solo como pistas.
- El autoenrutamiento SSH también debe usar el host del servicio resuelto, no solo sugerencias TXT.
- El anclaje TLS nunca debe permitir que un `gatewayTlsSha256` anunciado anule un anclaje almacenado previamente.
- Los nodos de iOS/Android deben tratar las conexiones directas basadas en descubrimiento como **solo TLS** y requieren confirmación explícita del usuario antes de confiar en una huella digital por primera vez.

## Depuración en macOS

Herramientas integradas útiles:

- Examinar instancias:

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- Resuelva una instancia (reemplace `<instance>`):

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

Si la exploración funciona pero la resolución falla, generalmente estás encontrando una política de LAN o un problema con el solucionador mDNS.

## Depuración en los registros de Gateway

El Gateway escribe un archivo de registro rotativo (impreso al inicio como
`gateway log file: ...`). Busque líneas `bonjour:`, especialmente:

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

Bonjour utiliza el nombre de host del sistema para el host `.local` anunciado cuando es una
etiqueta DNS válida. Si el nombre de host del sistema contiene espacios, guiones bajos u otro
carácter de etiqueta DNS no válido, OpenClaw recurre a `openclaw.local`. Establezca
`OPENCLAW_MDNS_HOSTNAME=<name>` antes de iniciar el Gateway cuando necesite una
etiqueta de host explícita.

## Depuración en el nodo iOS

El nodo iOS usa `NWBrowser` para descubrir `_openclaw-gw._tcp`.

Para capturar registros:

- Ajustes → Gateway → Avanzado → **Registros de depuración de descubrimiento**
- Ajustes → Gateway → Avanzado → **Registros de descubrimiento** → reproducir → **Copiar**

El registro incluye transiciones de estado del navegador y cambios en el conjunto de resultados.

## Cuándo desactivar Bonjour

Desactive Bonjour solo cuando la publicidad multidifusión de LAN no esté disponible o sea dañina.
El caso común es un Gateway que se ejecuta detrás de la red de puente Docker, WSL, o una
política de red que descarta la multidifusión mDNS. En esos entornos, el Gateway sigue
siendo accesible a través de su URL publicada, SSH, Tailnet o DNS-SD de área amplia,
pero el autodescubrimiento de LAN no es confiable.

Prefiera la anulación de entorno existente cuando el problema esté limitado al despliegue:

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

Eso desactiva la publicidad multicast de LAN sin cambiar la configuración del complemento.
Es seguro para imágenes de Docker, archivos de servicio, scripts de inicio y depuraciones
puntuales porque la configuración desaparece cuando el entorno no existe.

Use la configuración del complemento solo cuando intencionalmente quiera desactivar el
complemento de descubrimiento de LAN incluido para esa configuración de OpenClaw:

```bash
openclaw plugins disable bonjour
```

## Problemas de Docker

El complemento Bonjour incluido desactiva automáticamente la publicidad multicast de LAN en los
contenedores detectados cuando `OPENCLAW_DISABLE_BONJOUR` no está establecido. Las redes puente de Docker
usualmente no reenvían el multicast mDNS (`224.0.0.251:5353`) entre el contenedor
y la LAN, por lo que la publicidad desde el contenedor rara vez hace que el descubrimiento funcione.

Problemas importantes:

- Desactivar Bonjour no detiene el Gateway. Solo detiene la publicidad
  multicast de LAN.
- Desactivar Bonjour no cambia `gateway.bind`; Docker todavía usa por defecto
  `OPENCLAW_GATEWAY_BIND=lan` para que el puerto de host publicado pueda funcionar.
- Desactivar Bonjour no desactiva el DNS-SD de área amplia. Use el descubrimiento de área amplia
  o Tailnet cuando el Gateway y el nodo no estén en la misma LAN.
- Reutilizar el mismo `OPENCLAW_CONFIG_DIR` fuera de Docker no persiste la
  política de desactivación automática del contenedor.
- Establezca `OPENCLAW_DISABLE_BONJOUR=0` solo para redes de host, macvlan u otra
  red donde se sepa que el multicast mDNS pasa; establézcalo en `1` para forzar la desactivación.

## Solución de problemas de Bonjour desactivado

Si un nodo ya no descubre automáticamente el Gateway después de la configuración de Docker:

1. Confirme si el Gateway se está ejecutando en modo automático, forzado activado o forzado desactivado:

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. Confirme que el Gateway en sí es accesible a través del puerto publicado:

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. Use un objetivo directo cuando Bonjour esté desactivado:
   - Interfaz de control o herramientas locales: `http://127.0.0.1:18789`
   - Clientes de LAN: `http://<gateway-host>:18789`
   - Clientes entre redes: MagicDNS de Tailnet, IP de Tailnet, túnel SSH o
     DNS-SD de área amplia

4. Si habilitó deliberadamente Bonjour en Docker con
   `OPENCLAW_DISABLE_BONJOUR=0`, pruebe el multicast desde el host:

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   Si la exploración está vacía o los registros del Gateway muestran cancelaciones repetidas
   del watchdog ciao, restaure `OPENCLAW_DISABLE_BONJOUR=1` y use una ruta directa o
   de Tailnet.

## Modos de fallo comunes

- **Bonjour no cruza redes**: use Tailnet o SSH.
- **Multidifusión bloqueada**: algunas redes Wi‑Fi deshabilitan mDNS.
- **Anunciador atascado en sondeo/anuncio**: los hosts con multidifusión bloqueada,
  puentes de contenedores, WSL, o cambios de interfaz pueden dejar al anunciador ciao en un
  estado sin anunciar. OpenClaw reintenta unas pocas veces y luego deshabilita Bonjour
  para el proceso del Gateway actual en lugar de reiniciar el anunciador para siempre.
- **Redes de puente Docker**: Bonjour se deshabilita automáticamente en contenedores detectados.
  Establezca `OPENCLAW_DISABLE_BONJOUR=0` solo para host, macvlan, u otra
  red compatible con mDNS.
- **Suspensión / cambios de interfaz**: macOS puede descartar temporalmente los resultados mDNS; reintente.
- **La exploración funciona pero la resolución falla**: mantenga los nombres de máquina simples (evite emojis o
  puntuación), luego reinicie el Gateway. El nombre de la instancia de servicio se deriva del
  nombre de host, por lo que los nombres excesivamente complejos pueden confundir a algunos resolutores.

## Nombres de instancia con escape (`\032`)

Bonjour/DNS‑SD a menudo escapa bytes en los nombres de instancia de servicio como secuencias `\DDD`
decimales (ej. los espacios se convierten en `\032`).

- Esto es normal a nivel de protocolo.
- Las interfaces de usuario deben decodificar para su visualización (iOS usa `BonjourEscapes.decode`).

## Deshabilitar / configuración

- `openclaw plugins disable bonjour` deshabilita la publicidad de multidifusión LAN al deshabilitar el complemento incluido.
- `openclaw plugins enable bonjour` restaura el complemento de descubrimiento LAN predeterminado.
- `OPENCLAW_DISABLE_BONJOUR=1` deshabilita la publicidad de multidifusión LAN sin cambiar la configuración del complemento; los valores verdaderos aceptados son `1`, `true`, `yes`, y `on` (legado: `OPENCLAW_DISABLE_BONJOUR`).
- `OPENCLAW_DISABLE_BONJOUR=0` fuerza la activación de la publicidad de multidifusión LAN, incluso dentro de contenedores detectados; los valores falsos aceptados son `0`, `false`, `no`, y `off`.
- Cuando `OPENCLAW_DISABLE_BONJOUR` no está establecido, Bonjour anuncia en hosts normales y se deshabilita automáticamente dentro de contenedores detectados.
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace del Gateway.
- `OPENCLAW_SSH_PORT` anula el puerto SSH cuando se anuncia `sshPort` (legacy: `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publica un consejo de MagicDNS en TXT cuando el modo completo mDNS está activado (legacy: `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` anula la ruta del CLI anunciada (legacy: `OPENCLAW_CLI_PATH`).

## Documentos relacionados

- Política de descubrimiento y selección de transporte: [Descubrimiento](/es/gateway/discovery)
- Emparejamiento de nodos + aprobaciones: [Emparejamiento de Gateway](/es/gateway/pairing)
