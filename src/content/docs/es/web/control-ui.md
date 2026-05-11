---
summary: "Interfaz de usuario de control basada en navegador para el Gateway (chat, nodos, configuración)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Interfaz de usuario de control"
sidebarTitle: "Interfaz de usuario de control"
---

La interfaz de control es una pequeña aplicación de una sola página (SPA) **Vite + Lit** servida por la Gateway:

- predeterminado: `http://<host>:18789/`
- prefijo opcional: configure `gateway.controlUi.basePath` (por ejemplo, `/openclaw`)

Se comunica **directamente con el WebSocket de la Gateway** en el mismo puerto.

## Apertura rápida (local)

Si la Gateway se está ejecutando en el mismo ordenador, abra:

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (o [http://localhost:18789/](http://localhost:18789/))

Si la página no se carga, inicie el Gateway primero: `openclaw gateway`.

La autenticación se proporciona durante el protocolo de enlace WebSocket a través de:

- `connect.params.auth.token`
- `connect.params.auth.password`
- Encabezados de identidad de Tailscale Serve cuando `gateway.auth.allowTailscale: true`
- encabezados de identidad de proxy de confianza cuando `gateway.auth.mode: "trusted-proxy"`

El panel de configuración del tablero mantiene un token para la sesión actual de la pestaña del navegador y la URL del gateway seleccionada; las contraseñas no se persisten. La incorporación generalmente genera un token de gateway para la autenticación de secreto compartido en la primera conexión, pero la autenticación por contraseña también funciona cuando `gateway.auth.mode` es `"password"`.

## Emparejamiento de dispositivos (primera conexión)

Cuando se conecta a la Interfaz de usuario de control desde un navegador o dispositivo nuevo, el Gateway generalmente requiere una **aprobación de emparejamiento única**. Esta es una medida de seguridad para evitar el acceso no autorizado.

**Lo que verá:** "desconectado (1008): se requiere emparejamiento"

<Steps>
  <Step title="Listar solicitudes pendientes">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="Aprobar por ID de solicitud">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

Si el navegador reintenta el emparejamiento con detalles de autenticación cambiados (rol/alcances/clave pública), la solicitud pendiente anterior es reemplazada y se crea un nuevo `requestId`. Vuelva a ejecutar `openclaw devices list` antes de la aprobación.

Si el navegador ya está emparejado y lo cambia de acceso de lectura a acceso de escritura/administrador, esto se trata como una actualización de aprobación, no como una reconexión silenciosa. OpenClaw mantiene la aprobación antigua activa, bloquea la reconexión más amplia y le pide que apruebe explícitamente el nuevo conjunto de alcances.

Una vez aprobado, el dispositivo se recuerda y no requerirá reprobación a menos que lo revoque con `openclaw devices revoke --device <id> --role <role>`. Consulte [CLI de dispositivos](/es/cli/devices) para la rotación y revocación de tokens.

<Note>
  - Las conexiones directas de bucle local del navegador (`127.0.0.1` / `localhost`) se aprueban automáticamente. - Tailscale Serve puede omitir el viaje de ida y vuelta de emparejamiento para las sesiones del operador de la interfaz de usuario de control cuando `gateway.auth.allowTailscale: true`, la identidad de Tailscale se verifica y el navegador presenta su identidad de dispositivo. - Los
  enlaces directos de Tailnet, las conexiones de navegador de LAN y los perfiles de navegador sin identidad de dispositivo todavía requieren aprobación explícita. - Cada perfil de navegador genera un ID de dispositivo único, por lo que cambiar de navegador o borrar los datos del navegador requerirá volver a emparejar.
</Note>

## Identidad personal (local del navegador)

La interfaz de usuario de control admite una identidad personal por navegador (nombre para mostrar y avatar) adjunta a los mensajes salientes para su atribución en sesiones compartidas. Reside en el almacenamiento del navegador, está limitada al perfil del navegador actual y no se sincroniza con otros dispositivos ni se persiste en el servidor más allá de los metadatos normales de autoría de la transcripción en los mensajes que realmente envía. Borrar los datos del sitio o cambiar de navegador la restablece a vacío.

El mismo patrón local del navegador se aplica a la anulación del avatar del asistente. Los avatares de asistente cargados superponen la identidad resuelta por la puerta de enlace solo en el navegador local y nunca hacen un viaje de ida y vuelta a través de `config.patch`. El campo de configuración compartido `ui.assistant.avatar` todavía está disponible para clientes que no son de la interfaz de usuario que escriben el campo directamente (como puertas de enlace con scripts o paneles personalizados).

## Endpoint de configuración de tiempo de ejecución

La interfaz de usuario de control obtiene su configuración de tiempo de ejecución desde `/__openclaw/control-ui-config.json`. Ese endpoint está protegido por la misma autenticación de puerta de enlace que el resto de la superficie HTTP: los navegadores no autenticados no pueden recuperarlo y una recuperación exitosa requiere un token/contraseña de puerta de enlace ya válido, una identidad de Tailscale Serve o una identidad de proxy confiable.

## Soporte de idioma

La interfaz de usuario de control puede localizarse en la primera carga según la configuración regional de su navegador. Para anularla más tarde, abra **Overview -> Gateway Access -> Language**. El selector de configuración regional se encuentra en la tarjeta Gateway Access, no en Appearance.

- Idiomas admitidos: `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- Las traducciones no inglesas se cargan de forma diferida en el navegador.
- El idioma seleccionado se guarda en el almacenamiento del navegador y se reutiliza en visitas futuras.
- Las claves de traducción faltantes vuelven al inglés.

## Temas de apariencia

El panel de Apariencia mantiene los temas integrados Claw, Knot y Dash, además de una ranura de importación de tweakcn local en el navegador. Para importar un tema, abra [tweakcn themes](https://tweakcn.com/themes), elija o cree un tema, haga clic en **Share** y pegue el enlace del tema copiado en Apariencia. El importador también acepta URLs del registro `https://tweakcn.com/r/themes/<id>`, URLs del editor como `https://tweakcn.com/editor/theme?theme=amethyst-haze`, rutas relativas de `/themes/<id>`, ID de temas sin procesar y nombres de temas predeterminados como `amethyst-haze`.

Los temas importados solo se almacenan en el perfil del navegador actual. No se escriben en la configuración de la puerta de enlace y no se sincronizan entre dispositivos. Reemplazar el tema importado actualiza la única ranura local; borrarlo cambia el tema activo de vuelta a Claw si se había seleccionado el tema importado.

## Lo que puede hacer (hoy)

<AccordionGroup>
  <Accordion title="Chat y Talk">
    - Chatea con el modelo a través de Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`). - Habla a través de sesiones en tiempo real del navegador. OpenAI usa WebRTC directo, Google Live usa un token de navegador de un solo uso restringido a través de WebSocket, y los complementos de voz en tiempo real solo de backend usan el transporte de retransmisión del Gateway. La
    retransmisión mantiene las credenciales del proveedor en el Gateway mientras el navegador transmite PCM del micrófono a través de RPC `talk.realtime.relay*` y envía llamadas a herramientas `openclaw_agent_consult` a través de `chat.send` para el modelo OpenClaw más grande configurado. - Transmite llamadas a herramientas + tarjetas de salida de herramientas en vivo en Chat (eventos de agente).
  </Accordion>
  <Accordion title="Canales, instancias, sesiones, sueños">
    - Canales: estado de los canales integrados más los de complementos incluidos/externos, inicio de sesión con QR y configuración por canal (`channels.status`, `web.login.*`, `config.patch`). - Instancias: lista de presencia + actualizar (`system-presence`). - Sesiones: lista + anulaciones por sesión de modelo/pensamiento/rápido/verbostrastreo/razonamiento (`sessions.list`, `sessions.patch`). -
    Sueños: estado de soñar, interruptor activar/desactivar y lector del Diario de Sueños (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).
  </Accordion>
  <Accordion title="Cron, habilidades, nodos, aprobaciones de ejecución">
    - Trabajos de Cron: lista/agregar/editar/ejecutar/activar/desactivar + historial de ejecución (`cron.*`). - Habilidades: estado, activar/desactivar, instalar, actualizaciones de clave de API (`skills.*`). - Nodos: lista + límites (`node.list`). - Aprobaciones de ejecución: editar listas de permitidos del gateway o de nodos + política de solicitud para `exec host=gateway/node`
    (`exec.approvals.*`).
  </Accordion>
  <Accordion title="Config">
    - Ver/editar `~/.openclaw/openclaw.json` (`config.get`, `config.set`). - Aplicar + reiniciar con validación (`config.apply`) y reactivar la última sesión activa. - Las escrituras incluyen un protector de hash base para evitar sobrescribir ediciones concurrentes. - Las escrituras (`config.set`/`config.apply`/`config.patch`) prefligan la resolución activa de SecretRef para las referencias en el
    payload de configuración enviado; las referencias enviadas activas sin resolver se rechazan antes de la escritura. - Renderizado de esquema + formulario (`config.schema` / `config.schema.lookup`, incluyendo campo `title` / `description`, sugerencias de IU coincidentes, resúmenes de hijos inmediatos, metadatos de documentación en nodos de objeto/comodín/matriz/composición anidados, además de
    esquemas de complemento y canal cuando estén disponibles); el editor JSON sin formato está disponible solo cuando la instantánea tiene un viaje de ida y vuelta sin formato seguro. - Si una instantánea no puede realizar un viaje de ida y vuelta seguro del texto sin formato, la Interfaz de Usuario de Control fuerza el modo Formulario y deshabilita el modo Raw para esa instantánea. - El editor
    JSON sin formato "Restablecer a guardado" preserva la forma creada en sin formato (formato, comentarios, diseño `$include`) en lugar de volver a renderizar una instantánea aplanada, por lo que las ediciones externas sobreviven a un restablecimiento cuando la instantánea puede realizar un viaje de ida y vuelta seguro. - Los valores de objeto SecretRef estructurados se renderizan de solo lectura
    en las entradas de texto del formulario para evitar la corrupción accidental de objeto a cadena.
  </Accordion>
  <Accordion title="Debug, logs, update">
    - Depuración: instantáneas de estado/salud/modelos + registro de eventos + llamadas RPC manuales (`status`, `health`, `models.list`). - Registros: seguimiento en vivo de los registros de archivos de la puerta de enlace con filtro/exportación (`logs.tail`). - Actualización: ejecutar una actualización de paquete/git + reinicio (`update.run`) con un informe de reinicio, y luego sondear
    `update.status` después de reconectar para verificar la versión de la puerta de enlace en ejecución.
  </Accordion>
  <Accordion title="Notas del panel de trabajos de Cron">
    - Para trabajos aislados, la entrega predeterminada es anunciar el resumen. Puede cambiar a ninguno si desea ejecuciones solo internas. - Los campos de canal/destino aparecen cuando se selecciona anunciar. - El modo webhook usa `delivery.mode = "webhook"` con `delivery.to` establecido en una URL de webhook HTTP(S) válida. - Para trabajos de sesión principal, los modos de entrega webhook y
    ninguno están disponibles. - Los controles de edición avanzada incluyen eliminar después de la ejecución, borrar la sobrescritura del agente, opciones de cron exacta/escalonada, sobrescrituras de modelo/pensamiento del agente y alternativas de entrega de mejor esfuerzo. - La validación del formulario está en línea con errores a nivel de campo; los valores no válidos deshabilitan el botón
    guardar hasta que se corrijan. - Establezca `cron.webhookToken` para enviar un token de portador dedicado; si se omite, el webhook se envía sin un encabezado de autenticación. - Respaldo obsoleto: los trabajos heredados almacenados con `notify: true` aún pueden usar `cron.webhook` hasta que se migren.
  </Accordion>
</AccordionGroup>

## Comportamiento del chat

<AccordionGroup>
  <Accordion title="Semántica de envío e historial">
    - `chat.send` es **no bloqueante**: confirma inmediatamente con `{ runId, status: "started" }` y la respuesta se transmite a través de eventos `chat`.
    - Las cargas del chat aceptan imágenes y archivos que no sean de video. Las imágenes mantienen la ruta de imagen nativa; otros archivos se almacenan como medios administrados y se muestran en el historial como enlaces de adjuntos.
    - Reenviar con el mismo `idempotencyKey` devuelve `{ status: "in_flight" }` mientras se ejecuta y `{ status: "ok" }` después de completarse.
    - Las respuestas de `chat.history` tienen un límite de tamaño para la seguridad de la interfaz. Cuando las entradas de la transcripción son demasiado grandes, Gateway puede truncar campos de texto largos, omitir bloques de metadatos pesados y reemplazar mensajes excesivamente grandes con un marcador de posición (`[chat.history omitted: message too large]`).
    - Las imágenes generadas por el asistente se conservan como referencias de medios administrados y se devuelven a través de URL de medios de Gateway autenticadas, por lo que las recargas no dependen de que las cargas de imágenes base64 crudas permanezcan en la respuesta del historial del chat.
    - `chat.history` también elimina las etiquetas de directivas en línea solo para visualización del texto visible del asistente (por ejemplo, `[[reply_to_*]]` y `[[audio_as_voice]]`), las cargas útiles XML de llamadas a herramientas en texto plano (incluidas `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), y los tokens de control de modelo ASCII/anchura completa filtrados, y omite las entradas del asistente cuyo texto visible completo es solo el token silencioso exacto `NO_REPLY` / `no_reply`.
    - Durante un envío activo y la actualización final del historial, la vista de chat mantiene visibles los mensajes optimistas locales de usuario/asistente si `chat.history` devuelve brevemente una instantánea anterior; la transcripción canónica reemplaza esos mensajes locales una vez que el historial de Gateway alcanza el estado actual.
    - `chat.inject` añade una nota del asistente a la transcripción de la sesión y transmite un evento `chat` para actualizaciones solo de la interfaz (sin ejecución de agente, sin entrega al canal).
    - Los selectores de modelo y pensamiento del encabezado del chat aplican parches a la sesión activa inmediatamente a través de `sessions.patch`; son anulaciones persistentes de la sesión, no opciones de envío de un solo turno.
    - Cuando los informes de uso de sesión de Gateway recientes muestran una alta presión de contexto, el área de redacción del chat muestra un aviso de contexto y, en los niveles de compactación recomendados, un botón de compactación que ejecuta la ruta normal de compactación de sesión. Las instantáneas de tokens obsoletas se ocultan hasta que Gateway informa el uso actualizado nuevamente.
  </Accordion>
  <Accordion title="Modo de conversación (tiempo real del navegador)">
    El modo de conversación utiliza un proveedor de voz en tiempo real registrado. Configure OpenAI con `talk.provider: "openai"` más `talk.providers.openai.apiKey`, o configure Google con `talk.provider: "google"` más `talk.providers.google.apiKey`; La configuración del proveedor en tiempo real de Voice Call aún se puede reutilizar como alternativa. El navegador nunca recibe una clave de API de proveedor estándar. OpenAI recibe un secreto de cliente Realtime efímero para WebRTC. Google Live recibe un token de autenticación de API Live restringido de un solo uso para una sesión WebSocket del navegador, con instrucciones y declaraciones de herramientas bloqueadas en el token por el Gateway. Los proveedores que solo exponen un puente en tiempo real de backend se ejecutan a través del transporte de relé del Gateway, por lo que las credenciales y los sockets del proveedor permanecen del lado del servidor mientras el audio del navegador se mueve a través de RPC autenticadas del Gateway. El mensaje de la sesión en tiempo real es ensamblado por el Gateway; `talk.realtime.session` no acepta anulaciones de instrucciones proporcionadas por la persona que llama.

    En el editor de Chat, el control de Talk es el botón de ondas junto al botón de dictado por micrófono. Cuando Talk se inicia, la fila de estado del editor muestra `Connecting Talk...`, luego `Talk live` mientras el audio está conectado, o `Asking OpenClaw...` mientras una llamada a herramienta en tiempo real consulta al modelo más grande configurado a través de `chat.send`.

    Prueba en vivo del mantenedor: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifica el intercambio SDP WebRTC del navegador de OpenAI, la configuración WebSocket del navegador con token restringido de Google Live y el adaptador de navegador de relé del Gateway con medios de micrófono falsos. El comando solo imprime el estado del proveedor y no registra secretos.

  </Accordion>
  <Accordion title="Detener y abortar">
    - Haga clic en **Stop** (llama a `chat.abort`).
    - Mientras una ejecución está activa, las respuestas de seguimiento normales se ponen en cola. Haga clic en **Steer** en un mensaje en cola para inyectar ese seguimiento en el turno en ejecución.
    - Escriba `/stop` (o frases de aborto independientes como `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) para abortar fuera de banda.
    - `chat.abort` admite `{ sessionKey }` (sin `runId`) para abortar todas las ejecuciones activas de esa sesión.
  </Accordion>
  <Accordion title="Retención parcial al abortar">
    - Cuando se aborta una ejecución, el texto parcial del asistente aún puede mostrarse en la interfaz de usuario.
    - Gateway persiste el texto parcial del asistente abortado en el historial de transcripciones cuando existe una salida almacenada en el búfer.
    - Las entradas persistidas incluyen metadatos de aborto para que los consumidores de transcripciones puedan diferenciar los parciales abortados de la salida de finalización normal.
  </Accordion>
</AccordionGroup>

## Instalación de PWA y Web Push

La interfaz de usuario de Control (Control UI) incluye un `manifest.webmanifest` y un service worker, por lo que los navegadores modernos pueden instalarlo como una PWA independiente. Web Push permite que Gateway active la PWA instalada con notificaciones incluso cuando la pestaña o la ventana del navegador no están abiertas.

| Superficie                                                        | Lo que hace                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                                  | Manifiesto de la PWA. Los navegadores ofrecen "Instalar aplicación" una vez que es accesible.     |
| `ui/public/sw.js`                                                 | Service worker que maneja eventos de `push` y clics en notificaciones.                            |
| `push/vapid-keys.json` (bajo el directorio de estado de OpenClaw) | Par de claves VAPID generado automáticamente utilizado para firmar las cargas útiles de Web Push. |
| `push/web-push-subscriptions.json`                                | Puntos finales de suscripción del navegador persistidos.                                          |

Anule el par de claves VAPID a través de variables de entorno en el proceso de Gateway cuando desee fijar las claves (para implementaciones de múltiples hosts, rotación de secretos o pruebas):

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (por defecto es `mailto:openclaw@localhost`)

La interfaz de usuario de Control utiliza estos métodos de Gateway con ámbito limitado para registrar y probar las suscripciones del navegador:

- `push.web.vapidPublicKey` — obtiene la clave pública VAPID activa.
- `push.web.subscribe` — registra un `endpoint` además de `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — elimina un endpoint registrado.
- `push.web.test` — envía una notificación de prueba a la suscripción del autor de la llamada.

<Note>Web Push es independiente de la ruta de relé iOS APNS (consulte [Configuration](/es/gateway/configuration) para push respaldado por relé) y del método `push.test` existente, que apunta al emparejamiento móvil nativo.</Note>

## Incrustaciones alojadas

Los mensajes del asistente pueden mostrar contenido web alojado en línea con el shortcode `[embed ...]`. La política de espacio aislado (sandbox) del iframe se controla mediante `gateway.controlUi.embedSandbox`:

<Tabs>
  <Tab title="strict">Deshabilita la ejecución de scripts dentro de las incrustaciones alojadas.</Tab>
  <Tab title="scripts (default)">Permite incrustaciones interactivas manteniendo el aislamiento de origen; este es el valor predeterminado y generalmente es suficiente para juegos/widgets de navegador independientes.</Tab>
  <Tab title="trusted">Añade `allow-same-origin` sobre `allow-scripts` para documentos del mismo sitio que intencionalmente necesitan privilegios más fuertes.</Tab>
</Tabs>

Ejemplo:

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>Use `trusted` solo cuando el documento incrustado realmente necesite comportamiento del mismo origen. Para la mayoría de los juegos y lienzos interactivos generados por agentes, `scripts` es la opción más segura.</Warning>

Las URL de incrustación externas absolutas `http(s)` permanecen bloqueadas de forma predeterminada. Si intencionalmente desea que `[embed url="https://..."]` cargue páginas de terceros, configure `gateway.controlUi.allowExternalEmbedUrls: true`.

## Acceso a Tailnet (recomendado)

<Tabs>
  <Tab title="Tailscale Serve integrado (preferido)">
    Mantén el Gateway en loopback y deja que Tailscale Sirve actúe como proxy con HTTPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Abre:

    - `https://<magicdns>/` (o tu `gateway.controlUi.basePath` configurado)

    De manera predeterminada, las solicitudes de Control UI/WebSocket Sirve pueden autenticarse a través de los encabezados de identidad de Tailscale (`tailscale-user-login`) cuando `gateway.auth.allowTailscale` es `true`. OpenClaw verifica la identidad resolviendo la dirección `x-forwarded-for` con `tailscale whois` y coincidiéndola con el encabezado, y solo las acepta cuando la solicitud llega al loopback con los encabezados `x-forwarded-*` de Tailscale. Para las sesiones del operador de Control UI con identidad de dispositivo del navegador, esta ruta de Sirve verificada también omite el viaje de ida y vuelta de emparejamiento de dispositivos; los navegadores sin dispositivo y las conexiones de rol de nodo siguen las verificaciones normales de dispositivo. Establece `gateway.auth.allowTailscale: false` si deseas requerir credenciales explícitas de secreto compartido incluso para el tráfico de Sirve. Luego usa `gateway.auth.mode: "token"` o `"password"`.

    Para esa ruta de identidad de Sirve asíncrona, los intentos fallidos de autenticación para la misma IP de cliente y ámbito de autenticación se serializan antes de las escrituras de límite de velocidad. Por lo tanto, los reintentos incorrectos simultáneos desde el mismo navegador pueden mostrar `retry later` en la segunda solicitud en lugar de dos desajustes simples compitiendo en paralelo.

    <Warning>
    La autenticación de Sirve sin token asume que el host de la puerta de enlace es confiable. Si código local no confiable puede ejecutarse en ese host, requiere autenticación por token/contraseña.
    </Warning>

  </Tab>
  <Tab title="Vincular a tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Luego abre:

    - `http://<tailscale-ip>:18789/` (o tu `gateway.controlUi.basePath` configurado)

    Pega el secreto compartido coincidente en la configuración de la interfaz de usuario (enviado como `connect.params.auth.token` o `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP inseguro

Si abres el panel a través de HTTP plano (`http://<lan-ip>` o `http://<tailscale-ip>`), el navegador se ejecuta en un **contexto no seguro** y bloquea WebCrypto. De forma predeterminada, OpenClaw **bloquea** las conexiones de la Interfaz de Control (Control UI) sin identidad del dispositivo.

Excepciones documentadas:

- compatibilidad con HTTP inseguro solo para localhost con `gateway.controlUi.allowInsecureAuth=true`
- autenticación exitosa del operador en la Interfaz de Control a través de `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` de emergencia (break-glass)

**Solución recomendada:** use HTTPS (Tailscale Serve) o abra la interfaz de usuario localmente:

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (en el host de la puerta de enlace)

<AccordionGroup>
  <Accordion title="Comportamiento del interruptor de autenticación insegura">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` es solo un interruptor de compatibilidad local:

    - Permite que las sesiones de la Interfaz de Control en localhost procedan sin identidad del dispositivo en contextos HTTP no seguros.
    - No omite las comprobaciones de emparejamiento.
    - No relaja los requisitos de identidad del dispositivo remota (no localhost).

  </Accordion>
  <Accordion title="Solo de emergencia (break-glass)">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` deshabilita las comprobaciones de identidad del dispositivo de la Interfaz de Control y es una degradación grave de la seguridad. Reviértalo rápidamente después del uso de emergencia.
    </Warning>

  </Accordion>
  <Accordion title="Nota sobre proxy de confianza">
    - La autenticación exitosa de proxy de confianza puede admitir sesiones de la Interfaz de Control de **operador** sin identidad del dispositivo.
    - Esto **no** se extiende a las sesiones de la Interfaz de Control con rol de nodo.
    - Los proxies inversos de bucle invertido del mismo host aún no satisfacen la autenticación de proxy de confianza; consulte [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth).
  </Accordion>
</AccordionGroup>

Consulte [Tailscale](/es/gateway/tailscale) para obtener orientación sobre la configuración de HTTPS.

## Política de seguridad de contenido

El Control UI se envía con una política `img-src` estricta: solo se permiten activos del **mismo origen** (same-origin), URLs `data:` y URLs `blob:` generadas localmente. Las URLs `http(s)` remotas y las URLs de imagen relativas al protocolo son rechazadas por el navegador y no realizan solicitudes de red.

Lo que esto significa en la práctica:

- Los avatares e imágenes servidos bajo rutas relativas (por ejemplo, `/avatars/<id>`) aún se renderizan, incluyendo las rutas de avatar autenticadas que la interfaz de usuario obtiene y convierte en URLs `blob:` locales.
- Las URLs `data:image/...` en línea aún se renderizan (útil para cargas útiles dentro del protocolo).
- Las URLs `blob:` locales creadas por el Control UI aún se renderizan.
- Las URLs de avatar remotas emitidas por los metadatos del canal se eliminan en los asistentes de avatar del Control UI y se reemplazan con el logotipo/insignia integrado, por lo que un canal comprometido o malicioso no puede forzar recuperaciones de imágenes remotas arbitrarias desde el navegador de un operador.

No necesita cambiar nada para obtener este comportamiento; siempre está activo y no es configurable.

## Autenticación de la ruta de avatar

Cuando se configura la autenticación de la puerta de enlace (gateway auth), el punto final de avatar del Control UI requiere el mismo token de puerta de enlace que el resto de la API:

- `GET /avatar/<agentId>` devuelve la imagen del avatar solo a los llamantes autenticados. `GET /avatar/<agentId>?meta=1` devuelve los metadatos del avatar bajo la misma regla.
- Las solicitudes no autenticadas a cualquiera de las dos rutas se rechazan (coincidiendo con la ruta hermana assistant-media). Esto evita que la ruta de avatar filtre la identidad del agente en hosts que, por lo demás, están protegidos.
- El propio Control UI reenvía el token de puerta de enlace como un encabezado de portador (bearer header) al obtener avatares y utiliza URLs de blob autenticadas para que la imagen aún se renderice en los paneles de control.

Si desactiva la autenticación de la puerta de enlace (no recomendado en hosts compartidos), la ruta de avatar también deja de ser autenticada, en línea con el resto de la puerta de enlace.

## Compilar la interfaz de usuario

La puerta de enlace (Gateway) sirve archivos estáticos desde `dist/control-ui`. Compílelos con:

```bash
pnpm ui:build
```

Base absoluta opcional (cuando desea URL de activos fijas):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Para el desarrollo local (servidor de desarrollo independiente):

```bash
pnpm ui:dev
```

Luego, apunte la interfaz de usuario a su URL WS de la puerta de enlace (por ejemplo, `ws://127.0.0.1:18789`).

## Depuración/pruebas: servidor de desarrollo + puerta de enlace remota

La interfaz de Control UI son archivos estáticos; el destino de WebSocket es configurable y puede ser diferente del origen HTTP. Esto es útil cuando deseas el servidor de desarrollo de Vite localmente pero el Gateway se ejecuta en otro lugar.

<Steps>
  <Step title="Iniciar el servidor de desarrollo de la UI">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="Abrir con gatewayUrl">
    ```text
    http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
    ```

    Autenticación de un solo uso opcional (si es necesario):

    ```text
    http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notas">
    - `gatewayUrl` se almacena en localStorage después de la carga y se elimina de la URL.
    - `token` debe pasarse a través del fragmento de la URL (`#token=...`) siempre que sea posible. Los fragmentos no se envían al servidor, lo que evita fugas en los registros de solicitudes y en el Referer. Los parámetros de consulta heredados `?token=` todavía se importan una vez por compatibilidad, pero solo como alternativa, y se eliminan inmediatamente después del arranque.
    - `password` se mantiene solo en la memoria.
    - Cuando `gatewayUrl` está establecido, la interfaz de usuario no recurre a las credenciales de configuración o del entorno. Proporciona `token` (o `password`) explícitamente. La falta de credenciales explícitas es un error.
    - Usa `wss://` cuando el Gateway está detrás de TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` solo se acepta en una ventana de nivel superior (no incrustada) para evitar el secuestro de clics.
    - Las implementaciones de la interfaz de usuario de Control que no son de loopback deben establecer `gateway.controlUi.allowedOrigins` explícitamente (orígenes completos). Esto incluye configuraciones de desarrollo remoto.
    - El inicio del Gateway puede propagar orígenes locales como `http://localhost:<port>` y `http://127.0.0.1:<port>` desde el enlace y puerto de tiempo de ejecución efectivo, pero los orígenes del navegador remoto aún necesitan entradas explícitas.
    - No uses `gateway.controlUi.allowedOrigins: ["*"]` excepto para pruebas locales estrictamente controladas. Significa permitir cualquier origen del navegador, no "coincidir con cualquier host que esté usando".
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de reserva de origen del encabezado Host, pero es un modo de seguridad peligroso.
  </Accordion>
</AccordionGroup>

Ejemplo:

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

Detalles de la configuración de acceso remoto: [Remote access](/es/gateway/remote).

## Relacionado

- [Dashboard](/es/web/dashboard) — panel de control de la puerta de enlace
- [Health Checks](/es/gateway/health) — monitoreo de salud de la puerta de enlace
- [TUI](/es/web/tui) — interfaz de usuario de terminal
- [WebChat](/es/web/webchat) — interfaz de chat basada en navegador
