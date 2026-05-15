---
summary: "Descubrimiento y depuración de Bonjour/mDNS (balizas de Gateway, clientes y modos de fallo comunes)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Descubrimiento de Bonjour"
---

OpenClaw puede utilizar Bonjour (mDNS / DNS-SD) para descubrir un Gateway activo (extremo WebSocket).
La navegación multidifusión `local.` es una **comodidad solo para LAN**. El complemento `bonjour`
incluido se encarga de la publicidad en LAN. Se inicia automáticamente en hosts macOS y es opcional en
las implementaciones de Gateway en Linux, Windows y contenedores. Para el descubrimiento entre redes, la misma
baliza también se puede publicar a través de un dominio DNS-SD de área amplia configurado. El descubrimiento
sigue siendo mejor esfuerzo y no **reemplaza** la conectividad basada en SSH o Tailnet.

## Bonjour de área amplia (Unicast DNS-SD) a través de Tailscale

Si el nodo y el gateway están en diferentes redes, el mDNS multidifusión no cruzará el
límite. Puede mantener la misma experiencia de usuario de descubrimiento cambiando a **DNS-SD unidifusión**
("Bonjour de área amplia") a través de Tailscale.

Pasos de alto nivel:

1. Ejecute un servidor DNS en el host del gateway (accesible a través de Tailnet).
2. Publique registros DNS-SD para `_openclaw-gw._tcp` bajo una zona dedicada
   (ejemplo: `openclaw.internal.`).
3. Configure el **DNS dividido** de Tailscale para que su dominio elegido se resuelva a través de ese
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

### Configuración única del servidor DNS (host del gateway)

```bash
openclaw dns setup --apply
```

Esto instala CoreDNS y lo configura para:

- escuchar en el puerto 53 solo en las interfaces Tailscale del gateway
- servir su dominio elegido (ejemplo: `openclaw.internal.`) desde `~/.openclaw/dns/<domain>.db`

Valide desde una máquina conectada a tailnet:

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Configuración de DNS de Tailscale

En la consola de administración de Tailscale:

- Agregue un servidor de nombres que apunte a la IP tailnet del gateway (UDP/TCP 53).
- Agregue DNS dividido para que su dominio de descubrimiento use ese servidor de nombres.

Una vez que los clientes aceptan el DNS de tailnet, los nodos iOS y el descubrimiento CLI pueden explorar
`_openclaw-gw._tcp` en su dominio de descubrimiento sin multidifusión.

### Seguridad del listener del Gateway (recomendado)

El puerto WS del Gateway (por defecto `18789`) se vincula a loopback por defecto. Para el acceso a LAN/tailnet, vincúlelo explícitamente y mantenga la autenticación habilitada.

Para configuraciones exclusivas de tailnet:

- Establezca `gateway.bind: "tailnet"` en `~/.openclaw/openclaw.json`.
- Reinicie el Gateway (o reinicie la aplicación de la barra de menús de macOS).

## Qué se anuncia

Solo el Gateway anuncia `_openclaw-gw._tcp`. La publicidad de multidifusión LAN es proporcionada por el complemento incluido `bonjour` cuando el complemento está habilitado; la publicación de DNS-SD de área amplia sigue siendo propiedad del Gateway.

## Tipos de servicio

- `_openclaw-gw._tcp` - baliza de transporte del gateway (utilizada por nodos macOS/iOS/Android).

## Claves TXT (sugerencias no secretas)

El Gateway anuncia pequeñas sugerencias no secretas para facilitar los flujos de la interfaz de usuario:

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (solo cuando TLS está habilitado)
- `gatewayTlsSha256=<sha256>` (solo cuando TLS está habilitado y la huella digital está disponible)
- `canvasPort=<port>` (solo cuando el host del lienzo está habilitado; actualmente es el mismo que `gatewayPort`)
- `transport=gateway`
- `tailnetDns=<magicdns>` (solo modo mDNS completo, sugerencia opcional cuando Tailnet está disponible)
- `sshPort=<port>` (solo modo mDNS completo; DNS-SD de área amplia puede omitirlo)
- `cliPath=<path>` (solo modo mDNS completo; DNS-SD de área amplia aún lo escribe como una sugerencia de instalación remota)

Notas de seguridad:

- Los registros TXT de Bonjour/mDNS son **sin autenticar**. Los clientes no deben tratar TXT como un enrutamiento autoritativo.
- Los clientes deben enrutar utilizando el punto final del servicio resuelto (SRV + A/AAAA). Trate `lanHost`, `tailnetDns`, `gatewayPort` y `gatewayTlsSha256` solo como sugerencias.
- El autodireccionamiento SSH también debe usar el host de servicio resuelto, no sugerencias solo de TXT.
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

Si la navegación funciona pero la resolución falla, generalmente se trata de una política de LAN o
un problema con el solucionador mDNS.

## Depuración en los registros del Gateway

El Gateway escribe un archivo de registro rotativo (impreso al inicio como
`gateway log file: ...`). Busque líneas `bonjour:`, especialmente:

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

Bonjour utiliza el nombre de host del sistema para el host `.local` anunciado cuando es una
etiqueta DNS válida. Si el nombre de host del sistema contiene espacios, guiones bajos u otro
carácter de etiqueta DNS no válido, OpenClaw recurre a `openclaw.local`. Establezca
`OPENCLAW_MDNS_HOSTNAME=<name>` antes de iniciar el Gateway cuando necesite
una etiqueta de host explícita.

## Depuración en el nodo iOS

El nodo iOS utiliza `NWBrowser` para descubrir `_openclaw-gw._tcp`.

Para capturar registros:

- Ajustes → Gateway → Avanzado → **Registros de depuración de descubrimiento**
- Ajustes → Gateway → Avanzado → **Registros de descubrimiento** → reproducir → **Copiar**

El registro incluye transiciones de estado del navegador y cambios en el conjunto de resultados.

## Cuándo habilitar Bonjour

Bonjour se inicia automáticamente al iniciar el Gateway con configuración vacía en hosts macOS porque la
aplicación local y los nodos iOS/Android cercanos generalmente dependen del descubrimiento en la misma LAN.

Habilite Bonjour explícitamente cuando el autodescubrimiento en la misma LAN sea útil en Linux,
Windows u otro host que no sea macOS:

```bash
openclaw plugins enable bonjour
```

Cuando está habilitado, Bonjour utiliza `discovery.mdns.mode` para decidir cuántos metadatos TXT
publicar. El modo predeterminado es `minimal`; use `full` solo cuando los clientes locales necesiten
sugerencias `cliPath` o `sshPort`, y use `off` para suprimir el multicast de LAN sin
cambiar la habilitación del complemento.

## Cuándo deshabilitar Bonjour

Deje Bonjour deshabilitado cuando la publicidad multicast de LAN sea innecesaria, no disponible
o dañina. Los casos comunes son servidores que no son macOS, redes puente Docker,
WSL, o una política de red que descarta el multicast mDNS. En esos entornos el
Gateway sigue siendo accesible a través de su URL publicada, SSH, Tailnet o DNS-SD de área amplia,
pero el autodescubrimiento de LAN no es confiable.

Prefiera la anulación de entorno existente cuando el problema esté relacionado con el despliegue:

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

Eso deshabilita la publicidad multicast de LAN sin cambiar la configuración del complemento. Es seguro para las imágenes de Docker, archivos de servicio, scripts de inicio y depuraciones únicas porque la configuración desaparece cuando lo hace el entorno.

Use la configuración del complemento cuando intencionalmente desee desactivar el complemento de descubrimiento LAN incluido para esa configuración de OpenClaw:

```bash
openclaw plugins disable bonjour
```

## Problemas de Docker

El complemento Bonjour incluido deshabilita automáticamente la publicidad multicast de LAN en los contenedores detectados cuando `OPENCLAW_DISABLE_BONJOUR` no está establecido. Las redes puente de Docker generalmente no reenvían el multicast mDNS (`224.0.0.251:5353`) entre el contenedor y la LAN, por lo que la publicidad desde el contenedor rara vez hace que el descubrimiento funcione.

Problemas importantes:

- Bonjour se inicia automáticamente en los hosts de macOS y es opcional en otros lugares. Dejarlo deshabilitado no detiene el Gateway; solo omite la publicidad multicast de LAN.
- Deshabilitar Bonjour no cambia `gateway.bind`; Docker todavía usa por defecto `OPENCLAW_GATEWAY_BIND=lan` para que el puerto del host publicado pueda funcionar.
- Deshabilitar Bonjour no deshabilita DNS-SD de área amplia. Use el descubrimiento de área amplia o Tailnet cuando el Gateway y el nodo no estén en la misma LAN.
- Reutilizar el mismo `OPENCLAW_CONFIG_DIR` fuera de Docker no persiste la política de deshabilitación automática del contenedor.
- Establezca `OPENCLAW_DISABLE_BONJOUR=0` solo para redes host, macvlan u otra red donde se sepa que pasa el multicast mDNS; establézcalo en `1` para forzar la desactivación.

## Solución de problemas de Bonjour deshabilitado

Si un nodo ya no descubre automáticamente el Gateway después de la configuración de Docker:

1. Confirme si el Gateway se está ejecutando en modo automático, forzado activado o forzado desactivado:

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. Confirme que el Gateway en sí es accesible a través del puerto publicado:

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. Use un destino directo cuando Bonjour esté deshabilitado:
   - Interfaz de usuario de control o herramientas locales: `http://127.0.0.1:18789`
   - Clientes de LAN: `http://<gateway-host>:18789`
   - Clientes entre redes: Tailnet MagicDNS, IP de Tailnet, túnel SSH o DNS-SD de área amplia

4. Si habilitó deliberadamente el complemento Bonjour en Docker y forzó la publicidad con `OPENCLAW_DISABLE_BONJOUR=0`, pruebe el multicast desde el host:

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   Si la exploración está vacía o los registros del Gateway muestran cancelaciones repetidas del watchdog ciao, restaure `OPENCLAW_DISABLE_BONJOUR=1` y use una ruta directa o de Tailnet.

## Modos de fallo comunes

- **Bonjour no cruza redes**: use Tailnet o SSH.
- **Multidifusión bloqueada**: algunas redes Wi-Fi deshabilitan mDNS.
- **Anunciador atascado en sondeo/anuncio**: los hosts con multidifusión bloqueada,
  puentes de contenedor, WSL, o cambios de interfaz pueden dejar al anunciador ciao en un
  estado de no anuncio. OpenClaw reintenta unas cuantas veces y luego deshabilita Bonjour
  para el proceso Gateway actual en lugar de reiniciar el anunciador para siempre.
- **Redes de puente Docker**: Bonjour se deshabilita automáticamente en contenedores detectados.
  Establezca `OPENCLAW_DISABLE_BONJOUR=0` solo para host, macvlan u otra
  red capaz de mDNS.
- **Suspensión / cambios de interfaz**: macOS puede descartar temporalmente los resultados mDNS; reintente.
- **La exploración funciona pero la resolución falla**: mantenga los nombres de máquina simples (evite emojis o
  signos de puntuación), luego reinicie el Gateway. El nombre de la instancia de servicio se deriva del
  nombre del host, por lo que los nombres excesivamente complejos pueden confundir a algunos resolutores.

## Nombres de instancia escapados (`\032`)

Bonjour/DNS-SD a menudo escapa bytes en los nombres de instancia de servicio como secuencia decimal `\DDD`
(por ejemplo, los espacios se convierten en `\032`).

- Esto es normal a nivel de protocolo.
- Las interfaces de usuario deben decodificar para mostrar (iOS usa `BonjourEscapes.decode`).

## Habilitar / deshabilitar / configuración

- Los hosts macOS inician automáticamente el complemento de descubrimiento LAN incluido de forma predeterminada.
- `openclaw plugins enable bonjour` habilita el complemento de descubrimiento LAN incluido en hosts donde no está habilitado de forma predeterminada.
- `openclaw plugins disable bonjour` deshabilita la publicidad de multidifusión LAN al deshabilitar el complemento incluido.
- `OPENCLAW_DISABLE_BONJOUR=1` deshabilita la publicidad de multidifusión LAN sin cambiar la configuración del complemento; los valores verdaderos aceptados son `1`, `true`, `yes`, y `on` (legado: `OPENCLAW_DISABLE_BONJOUR`).
- `OPENCLAW_DISABLE_BONJOUR=0` fuerza la activación de la publicidad de multidifusión LAN, incluso dentro de contenedores detectados; los valores falsos aceptados son `0`, `false`, `no`, y `off`.
- Cuando el complemento Bonjour está habilitado y `OPENCLAW_DISABLE_BONJOUR` no está establecido, Bonjour anuncia en hosts normales y se deshabilita automáticamente dentro de contenedores detectados.
- `gateway.bind` en `~/.openclaw/openclaw.json` controla el modo de enlace del Gateway.
- `OPENCLAW_SSH_PORT` anula el puerto SSH cuando se anuncia `sshPort` (legado: `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publica una sugerencia de MagicDNS en TXT cuando el modo completo mDNS está habilitado (legado: `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` anula la ruta CLI anunciada (legado: `OPENCLAW_CLI_PATH`).

## Documentos relacionados

- Política de descubrimiento y selección de transporte: [Descubrimiento](/es/gateway/discovery)
- Emparejamiento de nodos + aprobaciones: [Emparejamiento de Gateway](/es/gateway/pairing)
