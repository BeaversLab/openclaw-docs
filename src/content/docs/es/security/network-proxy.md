---
summary: "Cómo enrutar el tráfico HTTP y WebSocket en tiempo de ejecución de OpenClaw a través de un proxy de filtrado administrado por el operador"
title: "Proxy de red"
read_when:
  - You want defense-in-depth against SSRF and DNS rebinding attacks
  - Configuring an external forward proxy for OpenClaw runtime traffic
---

OpenClaw puede enrutar el tráfico HTTP y WebSocket en tiempo de ejecución a través de un proxy de reenvío administrado por el operador. Esta es una defensa en profundidad opcional para implementaciones que desean un control de salida centralizado, una protección SSRF más sólida y una mejor auditoría de red.

OpenClaw no envía, descarga, inicia, configura ni certifica un proxy. Usted ejecuta la tecnología de proxy que se adapte a su entorno y OpenClau enruta los clientes HTTP y WebSocket normales locales del proceso a través de él.

## Por qué usar un proxy

Un proxy proporciona a los operadores un punto de control de red para el tráfico HTTP y WebSocket de salida. Esto puede ser útil incluso fuera del endurecimiento SSRF:

- Política central: mantenga una política de salida en lugar de confiar en que cada sitio de llamada HTTP de la aplicación cumpla correctamente con las reglas de red.
- Verificaciones en el momento de la conexión: evaluar el destino después de la resolución DNS e inmediatamente antes de que el proxy abra la conexión ascendente.
- Defensa contra el reenvío de DNS: reducir la brecha entre una verificación de DNS a nivel de aplicación y la conexión de salida real.
- Cobertura de JavaScript más amplia: enrutar clientes `fetch`, `node:http`, `node:https`, WebSocket, axios, got, node-fetch y similares a través de la misma ruta.
- Capacidad de auditoría: registrar los destinos permitidos y denegados en el límite de salida.
- Control operativo: aplicar reglas de destino, segmentación de red, límites de velocidad o listas de permitidos de salida sin reconstruir OpenClaw.

El enrutamiento de proxy es una barrera de protección a nivel de proceso para la salida HTTP y WebSocket normal. Proporciona a los operadores una ruta de cierre seguro para enrutar los clientes HTTP de JavaScript compatibles a través de su propio proxy de filtrado, pero no es un sandbox de red a nivel de sistema operativo y no hace que OpenClaw certifique la política de destino del proxy.

## Cómo OpenClaw enruta el tráfico

Cuando se `proxy.enabled=true` y se configura una URL de proxy, los procesos de tiempo de ejecución protegidos como `openclaw gateway run`, `openclaw node run` y `openclaw agent --local` enrutan el tráfico de salida HTTP y WebSocket normal a través del proxy configurado:

```text
OpenClaw process
  fetch                  -> operator-managed filtering proxy -> public internet
  node:http and https    -> operator-managed filtering proxy -> public internet
  WebSocket clients      -> operator-managed filtering proxy -> public internet
```

El contrato público es el comportamiento de enrutamiento, no los enlaces internos de Node utilizados para implementarlo. Los clientes WebSocket del plano de control de OpenClaw Gateway usan una ruta directa estrecha para el tráfico RPC de Gateway de bucle local cuando la URL de Gateway usa `localhost` o una IP de bucle local literal como `127.0.0.1` o `[::1]`. Esa ruta del plano de control debe poder alcanzar los Gateways de bucle local incluso cuando el proxy del operador bloquea los destinos de bucle local. Las solicitudes HTTP y WebSocket normales en tiempo de ejecución todavía usan el proxy configurado.

Internamente, OpenClaw instala Proxyline como el tiempo de ejecución de enrutamiento a nivel de proceso para esta función. Proxyline cubre `fetch`, clientes respaldados por undici, llamantes del núcleo de Node `node:http` / `node:https`, clientes WebSocket comunes y túneles CONNECT creados por asistentes. El modo de proxy administrado reemplaza los agentes HTTP de Node proporcionados por el llamante para que los agentes explícitos no omitan accidentalmente el proxy del operador.

Algunos complementos poseen transportes personalizados que necesitan una conexión explícita al proxy incluso cuando existe el enrutamiento a nivel de proceso. Por ejemplo, el transporte de la API de Bot de Telegram usa su propio despachador undici HTTP/1 y, por lo tanto, respeta el entorno de proxy del proceso más la reserva `OPENCLAW_PROXY_URL` administrada en esa ruta de transporte específica del propietario.

La URL del proxy en sí puede usar `http://` o `https://`. Estos esquemas describen la conexión desde OpenClaw hasta el punto final del proxy:

- `http://proxy.example:3128`: OpenClaw abre una conexión TCP simple al proxy de reenvío y envía solicitudes de proxy HTTP, incluyendo `CONNECT` para destinos HTTPS.
- `https://proxy.example:8443`: OpenClaw abre TLS hacia el endpoint del proxy, verifica el certificado del proxy y luego envía solicitudes de proxy HTTP dentro de esa sesión TLS.

El HTTPS de destino es independiente del TLS del endpoint del proxy. Para un destino HTTPS, OpenClaw aún le solicita al proxy un túnel HTTP `CONNECT` y luego inicia el TLS de destino a través de ese túnel.

Mientras el proxy está activo, OpenClaw borra `no_proxy` y `NO_PROXY`. Esas listas de omisión se basan en el destino, por lo que dejar `localhost` o `127.0.0.1` allí permitiría que objetivos SSRF de alto riesgo omitieran el proxy de filtrado.

Al apagarse, OpenClaw restaura el entorno de proxy anterior y restablece el estado de enrutamiento del proceso en caché.

## Términos relacionados con el proxy

- `proxy.enabled` / `proxy.proxyUrl`: enrutamiento de proxy de reenvío saliente para el tráfico de salida del tiempo de ejecución de OpenClaw. Esta página documenta esa función.
- `gateway.auth.mode: "trusted-proxy"`: autenticación de proxy inverso con conocimiento de identidad de entrada para el acceso a Gateway. Consulte [Trusted proxy auth](/es/gateway/trusted-proxy-auth).
- `openclaw proxy`: proxy de depuración local e inspector de captura para desarrollo y soporte. Consulte [openclaw proxy](/es/cli/proxy).
- `tools.web.fetch.useTrustedEnvProxy`: participación voluntaria para `web_fetch` para permitir que un proxy de entorno HTTP(S) controlado por el operador resuelva DNS mientras se mantiene la fijación estricta de DNS y la política de nombre de host predeterminadas. Consulte [Web fetch](/es/tools/web-fetch#trusted-env-proxy).
- Configuraciones de proxy específicas del canal o proveedor: anulaciones específicas del propietario para un transporte en particular. Prefiera el proxy de red administrado cuando el objetivo sea el control central de salida a través del tiempo de ejecución.

## Configuración

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

Para un endpoint de proxy HTTPS con una CA de proxy privada:

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

También puede proporcionar la URL a través del entorno, manteniendo `proxy.enabled=true` en la configuración:

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` tiene prioridad sobre `OPENCLAW_PROXY_URL`.

### Modo de bucle invertido de Gateway

Los clientes del plano de control del Gateway local generalmente se conectan a un WebSocket de bucle local como `ws://127.0.0.1:18789`. Use `proxy.loopbackMode` para elegir cómo se comportan las excepciones del proxy administrado de bucle local mientras el proxy administrado está activo:

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

- `gateway-only` (predeterminado): OpenClaw registra la autoridad de bucle local del Gateway en la política de omisión administrada de Proxyline para que el tráfico WebSocket del Gateway local pueda conectarse directamente. Los puertos de bucle local personalizados del Gateway funcionan porque se registran el host y el puerto de la URL del Gateway activo. El complemento del navegador incluido también puede registrar los puntos finales exactos de WebSocket de preparación de CDP local y DevTools para navegadores administrados iniciados por OpenClaw, y el proveedor de incrustación de memoria Ollama incluido puede usar su propia ruta directa protegida más estrecha para el origen de incrustación de bucle local y host específico configurado.
- `proxy`: OpenClaw no registra omisiones de bucle local de Gateway ni de Ollama, por lo que el tráfico de bucle local se envía a través del proxy administrado. Si el proxy es remoto, debe proporcionar enrutamiento especial para el servicio de bucle local del host de OpenClaw, como mapearlo a un nombre de host, IP o túnel accesible por el proxy. Los proxies remotos estándar resuelven `127.0.0.1` y `localhost` desde el host del proxy, no desde el host de OpenClaw.
- `block`: OpenClaw deniega las conexiones del plano de control de bucle local del Gateway y las conexiones de bucle local de incrustación host-local de Ollama protegidas antes de abrir un socket.

Si `enabled=true` pero no se configura ninguna URL de proxy válida, los comandos protegidos fallan al iniciarse en lugar de recurrir al acceso directo a la red.

Para los servicios de gateway administrados iniciados con `openclaw gateway start`, se prefiere almacenar la URL en la configuración:

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

La alternativa de entorno es mejor para ejecuciones en primer plano. Si la usa con un servicio instalado, coloque `OPENCLAW_PROXY_URL` en el entorno duradero del servicio, como `$OPENCLAW_STATE_DIR/.env` o `~/.openclaw/.env`, y luego reinstale el servicio para que launchd, systemd o Tareas programadas inicie el gateway con ese valor.

Para los comandos `openclaw --container ...`, OpenClaw reenvía `OPENCLAW_PROXY_URL` al CLI secundario destinado al contenedor cuando está configurado. La URL debe ser accesible desde dentro del contenedor; `127.0.0.1` se refiere al contenedor mismo, no al host. OpenClaw rechaza las URL de proxy de bucle local para los comandos destinados al contenedor a menos que anule explícitamente esa verificación de seguridad.

## Requisitos del proxy

La política del proxy es el límite de seguridad. OpenClaw no puede verificar que el proxy bloquee los objetivos correctos.

Configure el proxy para:

- Enlazar solo al loopback o a una interfaz privada de confianza.
- Restringir el acceso para que solo el proceso, host, contenedor o cuenta de servicio de OpenClaw pueda utilizarlo.
- Resolver los destinos por sí mismo y bloquear las IPs de destino después de la resolución DNS.
- Aplicar la política en el momento de la conexión tanto para las solicitudes HTTP simples como para los túneles `CONNECT` HTTPS.
- Rechazar las omisiones basadas en el destino para rangos de loopback, privados, de enlace local, metadatos, multidifusión, reservados o documentación.
- Evitar listas de permitidos de nombres de host a menos que confíe completamente en la ruta de resolución DNS.
- Registrar el destino, la decisión, el estado y el motivo sin registrar los cuerpos de la solicitud, los encabezados de autorización, las cookies u otros secretos.
- Mantener la política del proxy bajo control de versiones y revisar los cambios como una configuración sensible a la seguridad.

## Destinos bloqueados recomendados

Use esta lista de bloqueo como punto de partida para cualquier proxy de reenvío, firewall o política de salida.

La lógica del clasificador a nivel de aplicación de OpenClaw reside en `src/infra/net/ssrf.ts` y `packages/net-policy/src/ip.ts`. Los ganchos de paridad relevantes son `BLOCKED_HOSTNAMES`, `BLOCKED_IPV4_SPECIAL_USE_RANGES`, `BLOCKED_IPV6_SPECIAL_USE_RANGES`, `RFC2544_BENCHMARK_PREFIX`, y el manejo integrado del centinela IPv4 para NAT64, 6to4, Teredo, ISATAP y formas mapeadas a IPv4. Esos archivos son referencias útiles al mantener una política de proxy externo, pero OpenClaw no exporta ni hace cumplir automáticamente esas reglas en su proxy.

| Rango o host                                                                         | Por qué bloquear                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | Loopback IPv4                                                       |
| `::1/128`                                                                            | Loopback IPv6                                                       |
| `0.0.0.0/8`, `::/128`                                                                | Direcciones no especificadas y de esta red                          |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | Redes privadas RFC1918                                              |
| `169.254.0.0/16`, `fe80::/10`                                                        | Direcciones de enlace local y rutas comunes de metadatos en la nube |
| `169.254.169.254`, `metadata.google.internal`                                        | Servicios de metadatos en la nube                                   |
| `100.64.0.0/10`                                                                      | Espacio de direcciones compartidas NAT de grado operador            |
| `198.18.0.0/15`, `2001:2::/48`                                                       | Rangos de evaluación comparativa                                    |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | Rangos de uso especial y documentación                              |
| `224.0.0.0/4`, `ff00::/8`                                                            | Multidifusión                                                       |
| `240.0.0.0/4`                                                                        | IPv4 reservada                                                      |
| `fc00::/7`, `fec0::/10`                                                              | Rangos locales/privados de IPv6                                     |
| `100::/64`, `2001:20::/28`                                                           | Rangos de descarte IPv6 y ORCHIDv2                                  |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | Prefijos NAT64 con IPv4 integrada                                   |
| `2002::/16`, `2001::/32`                                                             | 6to4 y Teredo con IPv4 integrada                                    |
| `::/96`, `::ffff:0:0/96`                                                             | IPv6 compatible con IPv4 y asignada a IPv4                          |

Si su proveedor de servicios en la nube o plataforma de red documenta hosts de metadatos adicionales o rangos reservados, agréguelos también.

## Validación

Valide el proxy desde el mismo host, contenedor o cuenta de servicio que ejecuta OpenClaw:

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

Para un endpoint de proxy HTTPS firmado por una CA privada:

```bash
openclaw proxy validate --proxy-url https://proxy.corp.example:8443 --proxy-ca-file /etc/openclaw/proxy-ca.pem
```

De forma predeterminada, cuando no se proporcionan destinos personalizados, el comando verifica que `https://example.com/` tenga éxito e inicia un canary de loopback temporal que el proxy no debe alcanzar. La verificación de denegación predeterminada pasa cuando el proxy devuelve una respuesta de denegación que no sea 2xx o bloquea el canary con un fallo de transporte; falla si una respuesta exitosa alcanza el canary. Si no hay ningún proxy habilitado y configurado, la validación informa de un problema de configuración; use `--proxy-url` para un chequeo previo único antes de cambiar la configuración. Use `--allowed-url` y `--denied-url` para probar expectativas específicas del despliegue. Agregue `--apns-reachable` para verificar también que la entrega HTTP/2 directa de APNs pueda abrir un túnel CONNECT a través del proxy y recibir una respuesta de APNs de sandbox; la sonda usa un token de proveedor intencionalmente no válido, por lo que se espera `403 InvalidProviderToken` y cuenta como accesible. Los destinos de denegación personalizados son de cierre fallido (fail-closed): cualquier respuesta HTTP significa que el destino era accesible a través del proxy, y cualquier error de transporte se informa como inconcluso porque OpenClaw no puede probar que el proxy bloqueó un origen accesible. Ante el fallo de la validación, el comando sale con el código 1.

Use `--json` para la automatización. La salida JSON contiene el resultado general, el origen de la configuración de proxy efectiva, cualquier error de configuración y cada verificación de destino. Las credenciales de URL del proxy se redactan en la salida de texto y JSON:

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "proxyUrl": "http://127.0.0.1:3128/",
    "source": "override",
    "errors": []
  },
  "checks": [
    {
      "kind": "allowed",
      "url": "https://example.com/",
      "ok": true,
      "status": 200
    },
    {
      "kind": "apns",
      "url": "https://api.sandbox.push.apple.com",
      "ok": true,
      "status": 403
    }
  ]
}
```

También puede validar manualmente con `curl`:

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

La solicitud pública debe tener éxito. Las solicitudes de loopback y metadatos deben ser bloqueadas por el proxy. Para `openclaw proxy validate`, el canary de loopback integrado puede distinguir una denegación del proxy de un origen accesible. Las verificaciones `--denied-url` personalizadas no tienen ese canary, por lo que trate tanto las respuestas HTTP como los fallos de transporte ambiguos como fallos de validación, a menos que su proxy exponga una señal de denegación específica del despliegue que pueda verificar por separado.

## Confianza de la CA del proxy

Use `proxy.tls.caFile` administrado cuando el punto final del proxy en sí use un certificado firmado por una CA privada:

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

Esa CA se utiliza para la verificación TLS del extremo del proxy. No es una configuración de confianza de MITM de destino, un certificado de cliente ni un reemplazo de la política de destino del proxy.

Use `NODE_EXTRA_CA_CERTS` solo cuando todo el proceso de Node deba confiar en una CA adicional desde el inicio del proceso, como cuando un sistema de inspección TLS empresarial vuelve a firmar los certificados de destino para cada cliente HTTPS en el proceso. `NODE_EXTRA_CA_CERTS` es global para el proceso y debe estar presente antes de que Node se inicie. Prefiera `proxy.tls.caFile` para la confianza del extremo del proxy HTTPS porque está limitado al enrutamiento del proxy administrado.

Luego habilite el enrutamiento del proxy de OpenClaw:

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl https://proxy.corp.example:8443
openclaw config set proxy.tls.caFile /etc/openclaw/proxy-ca.pem
openclaw gateway run
```

o configure:

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

## Límites

- El proxy mejora la cobertura para los clientes HTTP y WebSocket de JavaScript locales al proceso, pero no es un sand-box de red a nivel de sistema operativo.
- El tráfico del plano de control de bucle invertido de Gateway (Gateway loopback) utiliza por defecto un desvío local directo a través de `proxy.loopbackMode: "gateway-only"`. OpenClaw implementa ese desvío registrando la autoridad de bucle invertido de Gateway activa en la política de desvío administrada de Proxyline. Los operadores pueden establecer `proxy.loopbackMode: "proxy"` para enviar el tráfico de bucle invertido de Gateway a través del proxy administrado, o `proxy.loopbackMode: "block"` para denegar las conexiones de bucle invertido de Gateway. Consulte [Gateway Loopback Mode](#gateway-loopback-mode) para conocer la advertencia sobre el proxy remoto.
- Los sockets `net`, `tls` y `http2` sin procesar, los complementos nativos y los procesos secundarios que no son de OpenClaw pueden omitir el enrutamiento del proxy a nivel de Node a menos que hereden y respeten las variables de entorno del proxy. Los procesos secundarios CLI bifurcados de OpenClaw heredan la URL del proxy administrado y el estado de `proxy.loopbackMode`.
- IRC es un canal TCP/TLS sin procesar fuera del enrutamiento del proxy de reenvío administrado por el operador. En las implementaciones que requieren que todo el tráfico de salida pase a través de ese proxy de reenvío, configure `channels.irc.enabled=false` a menos que se apruebe explícitamente el tráfico de salida IRC directo.
- El proxy de depuración local es una herramienta de diagnóstico y su reenvío directo ascendente para solicitudes de proxy y túneles CONNECT está deshabilitado de forma predeterminada mientras el modo de proxy administrado está activo; habilite el reenvío directo solo para diagnósticos locales aprobados.
- Las WebUI locales del usuario y los servidores de modelos locales deben incluirse en la lista de permitidos (allowlisted) en la política del proxy del operador cuando sea necesario; OpenClaw no expone un desvío de red local general para ellos. El proveedor de incrustaciones de memoria de Ollama incluido es más estricto: puede usar una ruta directa protegida solo para el origen de incrustación de bucle invertido local exacto derivado de `baseUrl` configurado, para que las incrustaciones locales sigan funcionando cuando el proxy administrado no pueda alcanzar el bucle invertido del host. Los hosts de incrustación de Ollama de LAN, tailnet, red privada y pública siguen utilizando la ruta del proxy administrado. `proxy.loopbackMode: "proxy"` envía este tráfico de bucle invertido de Ollama a través del proxy administrado y `proxy.loopbackMode: "block"` lo deniega antes de abrir una conexión.
- El desvío del proxy del plano de control de Gateway está limitado intencionalmente a `localhost` y URL de IP de bucle invertido literal. Use `ws://127.0.0.1:18789`, `ws://[::1]:18789` o `ws://localhost:18789` para conexiones directas locales del plano de control de Gateway; otros nombres de host se enrutan como el tráfico ordinario basado en nombres de host.
- OpenClaw no inspecciona, prueba ni certifica su política de proxy.
- Trate los cambios en la política del proxy como cambios operativos sensibles a la seguridad.

| Superficie                                                     | Estado del proxy administrado                                                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `fetch`, `node:http`, `node:https`, clientes WebSocket comunes | Enrutado a través de enlaces del proxy administrado cuando se configura.                                                            |
| HTTP/2 directo de APNs                                         | Enrutado a través del asistente CONNECT administrado de APNs.                                                                       |
| Bucle de retorno del plano de control de Gateway               | Solo directo para la URL de Gateway de bucle de retorno local configurada.                                                          |
| Reenvío ascendente del proxy de depuración                     | Deshabilitado mientras el modo de proxy administrado está activo a menos que se habilite explícitamente para diagnósticos locales.  |
| IRC                                                            | TCP/TLS sin procesar; no proxy por el modo de proxy HTTP administrado. Deshabilite a menos que se apruebe la salida directa de IRC. |
| Otras llamadas de cliente `net`, `tls` o `http2` sin procesar  | Deben ser clasificados por el guardia de socket sin procesar antes de aterrizar.                                                    |
