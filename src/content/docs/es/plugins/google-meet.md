---
summary: "Complemento de Google Meet: unirse a URLs de Meet explícitas a través de Chrome o Twilio con valores predeterminados de voz en tiempo real"
read_when:
  - You want an OpenClaw agent to join a Google Meet call
  - You want an OpenClaw agent to create a new Google Meet call
  - You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport
title: "Complemento de Google Meet"
---

Soporte de participante de Google Meet para OpenClaw: el complemento es explícito por diseño:

- Solo se une a una URL `https://meet.google.com/...` explícita.
- Puede crear un nuevo espacio de Meet a través de la API de Google Meet y luego unirse a la
  URL devuelta.
- La voz `realtime` es el modo predeterminado.
- La voz en tiempo real puede devolver la llamada al agente completo de OpenClaw cuando se necesita
  un razonamiento más profundo o herramientas.
- Los agentes eligen el comportamiento de unión con `mode`: use `realtime` para
  escuchar/responder en vivo, o `transcribe` para unirse/controlar el navegador sin el
  puente de voz en tiempo real.
- La autenticación comienza como Google OAuth personal o un perfil de Chrome ya iniciado.
- No hay ningún anuncio automático de consentimiento.
- El backend de audio de Chrome predeterminado es `BlackHole 2ch`.
- Chrome puede ejecutarse localmente o en un host de nodo emparejado.
- Twilio acepta un número de llamada más un PIN opcional o una secuencia DTMF.
- El comando de CLI es `googlemeet`; `meet` está reservado para flujos de trabajo de
  teleconferencia de agentes más amplios.

## Inicio rápido

Instale las dependencias de audio locales y configure un proveedor de voz en tiempo real
de backend. OpenAI es el predeterminado; Google Gemini Live también funciona con
`realtime.provider: "google"`:

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

`blackhole-2ch` instala el dispositivo de audio virtual `BlackHole 2ch`. El instalador de
Homebrew requiere un reinicio antes de que macOS exponga el dispositivo:

```bash
sudo reboot
```

Después del reinicio, verifique ambas partes:

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

Habilite el complemento:

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Verifique la configuración:

```bash
openclaw googlemeet setup
```

La salida de configuración está diseñada para que la pueda leer un agente. Informa el perfil de Chrome, el puente de audio, la fijación de nodos, la introducción en tiempo real retrasada y, cuando se configura la delegación de Twilio, si el complemento `voice-call` y las credenciales de Twilio están listos. Trate cualquier comprobación `ok: false` como un bloqueo antes de pedir a un agente que se una. Use `openclaw googlemeet setup --json` para secuencias de comandos o salida legible por máquina. Use `--transport chrome`, `--transport chrome-node` o `--transport twilio` para realizar una verificación previa de un transporte específico antes de que un agente lo intente.

Unirse a una reunión:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

O deje que un agente se una a través de la herramienta `google_meet`:

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

Crear una nueva reunión y unirse a ella:

```bash
openclaw googlemeet create --transport chrome-node --mode realtime
```

Crear solo la URL sin unirse:

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` tiene dos rutas:

- Creación mediante API: se utiliza cuando están configuradas las credenciales OAuth de Google Meet. Esta es la ruta más determinista y no depende del estado de la interfaz de usuario del navegador.
- Alternativa del navegador: se usa cuando faltan las credenciales OAuth. OpenClaw usa el nodo Chrome fijado, abre `https://meet.google.com/new`, espera a que Google redirija a una URL de código de reunión real y luego devuelve esa URL. Esta ruta requiere que el perfil de Chrome de OpenClaw en el nodo ya haya iniciado sesión en Google. La automatización del navegador maneja el propio mensaje del micrófono de primera ejecución de Meet; ese mensaje no se trata como un error de inicio de sesión de Google. Los flujos de unión y creación también intentan reutilizar una pestaña de Meet existente antes de abrir una nueva. La coincidencia ignora cadenas de consulta de URL inofensivas como `authuser`, por lo que un reintento del agente debería centrarse en la reunión ya abierta en lugar de crear una segunda pestaña de Chrome.

La salida del comando/herramienta incluye un campo `source` (`api` o `browser`) para que los agentes puedan explicar qué ruta se usó. `create` se une a la nueva reunión de forma predeterminada y devuelve `joined: true` más la sesión de unión. Para generar solo la URL, use `create --no-join` en la CLI o pase `"join": false` a la herramienta.

O dile a un agente: "Crea un Google Meet, únete a él con voz en tiempo real y envíame el enlace". El agente debería llamar a `google_meet` con `action: "create"` y luego compartir el `meetingUri` devuelto.

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

Para una unión de solo observación/control del navegador, establece `"mode": "transcribe"`. Esto no inicia el puente del modelo en tiempo real dúplex, por lo que no responderá en la reunión.

Durante las sesiones en tiempo real, el estado de `google_meet` incluye la salud del navegador y del puente de audio, como `inCall`, `manualActionRequired`, `providerConnected`, `realtimeReady`, `audioInputActive`, `audioOutputActive`, últimas marcas de tiempo de entrada/salida, contadores de bytes y el estado de cierre del puente. Si aparece un mensaje de página segura de Meet, la automatización del navegador lo maneja cuando puede. Los mensajes de inicio de sesión, admisión del anfitrión y permisos del navegador/SO se reportan como una acción manual con una razón y un mensaje para que el agente los retransmita.

Las uniones locales de Chrome se realizan a través del perfil del navegador de OpenClaw con la sesión iniciada. En Meet, elige `BlackHole 2ch` para la ruta del micrófono/altavoz que usa OpenClaw. Para un audio dúplex limpio, usa dispositivos virtuales separados o un gráfico de estilo Loopback; un solo dispositivo BlackHole es suficiente para una primera prueba de humo, pero puede causar eco.

### Pasarela local + Chrome Parallels

No **necesitas** una puerta de enlace (Gateway) de OpenClaw completa o una clave de API del modelo dentro de una VM de macOS solo para que la VM sea propietaria de Chrome. Ejecuta la puerta de enlace y el agente localmente, luego ejecuta un host de nodo en la VM. Habilita el plugin incluido en la VM una vez para que el nodo anuncie el comando de Chrome:

Qué se ejecuta dónde:

- Host de la puerta de enlace: OpenClaw Gateway, espacio de trabajo del agente, claves de modelo/API, proveedor en tiempo real y la configuración del plugin de Google Meet.
- VM macOS Parallels: host de CLI/nodo de OpenClaw, Google Chrome, SoX, BlackHole 2ch y un perfil de Chrome con la sesión iniciada en Google.
- No es necesario en la VM: servicio de puerta de enlace, configuración del agente, clave de OpenAI/GPT o configuración del proveedor del modelo.

Instala las dependencias de la VM:

```bash
brew install blackhole-2ch sox
```

Reinicia la VM después de instalar BlackHole para que macOS exponga `BlackHole 2ch`:

```bash
sudo reboot
```

Después de reiniciar, verifica que la VM pueda ver el dispositivo de audio y los comandos de SoX:

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

Instala o actualiza OpenClaw en la VM y luego habilita el plugin incluido allí:

```bash
openclaw plugins enable google-meet
```

Inicia el host del nodo en la VM:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

Si `<gateway-host>` es una IP de LAN y no estás usando TLS, el nodo rechaza el
WebSocket en texto plano a menos que optes por esa red privada de confianza:

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

Usa la misma variable de entorno al instalar el nodo como un LaunchAgent:

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` es el entorno del proceso, no una
configuración de `openclaw.json`. `openclaw node install` lo almacena en el entorno
del LaunchAgent cuando está presente en el comando de instalación.

Aprobar el nodo desde el host Gateway:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Confirma que el Gateway ve el nodo y que anuncia tanto `googlemeet.chrome`
como la capacidad del navegador/`browser.proxy`:

```bash
openclaw nodes status
```

Enruta Meet a través de ese nodo en el host Gateway:

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["googlemeet.chrome", "browser.proxy"],
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          chrome: {
            guestName: "OpenClaw Agent",
            autoJoin: true,
            reuseExistingTab: true,
          },
          chromeNode: {
            node: "parallels-macos",
          },
        },
      },
    },
  },
}
```

Ahora únete normalmente desde el host Gateway:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

o pide al agente que use la herramienta `google_meet` con `transport: "chrome-node"`.

Para una prueba de humeo de un solo comando que crea o reutiliza una sesión, pronuncia una
frase conocida e imprime el estado de la sesión:

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

Durante la unión, la automatización del navegador de OpenClaw completa el nombre del invitado, hace clic en Unirse/Pedir
para unirse y acepta la elección de "Usar micrófono" de la primera ejecución de Meet cuando ese aviso
aparece. Durante la creación de reuniones solo con navegador, también puede continuar más allá del
mismo aviso sin micrófono si Meet no expone el botón de usar micrófono.
Si el perfil del navegador no ha iniciado sesión, Meet está esperando la admisión del
anfitrión, Chrome necesita permiso de micrófono/cámara, o Meet está atascado en un
aviso que la automatización no pudo resolver, el resultado de unión/prueba de voz reporta
`manualActionRequired: true` con `manualActionReason` y
`manualActionMessage`. Los agentes deben dejar de reintentar la unión, reportar ese mismo
mensaje más el `browserUrl`/`browserTitle` actual, y reintentar solo después de que la
acción manual del navegador esté completa.

Si se omite `chromeNode.node`, OpenClaw selecciona automáticamente solo cuando exactamente un
nodo conectado anuncia tanto `googlemeet.chrome` como el control del navegador. Si
varios nodos capaces están conectados, establece `chromeNode.node` al id del nodo,
nombre para mostrar, o IP remota.

Verificaciones comunes de fallos:

- `Configured Google Meet node ... is not usable: offline`: el nodo anclado es
  conocido por el Gateway pero no está disponible. Los agentes deben tratar ese nodo como
  estado de diagnóstico, no como un host Chrome utilizable, e informar del bloqueo de configuración
  en lugar de recurrir a otro transporte a menos que el usuario lo solicite.
- `No connected Google Meet-capable node`: inicie `openclaw node run` en la VM,
  apruebe el emparejamiento y asegúrese de que `openclaw plugins enable google-meet` y
  `openclaw plugins enable browser` se ejecutaron en la VM. También confirme que
  el host Gateway permite ambos comandos de nodo con
  `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]`.
- `BlackHole 2ch audio device not found`: instale `blackhole-2ch` en el host
  que se está comprobando y reinicie antes de usar el audio local de Chrome.
- `BlackHole 2ch audio device not found on the node`: instale `blackhole-2ch`
  en la VM y reinicie la VM.
- Chrome se abre pero no puede unirse: inicie sesión en el perfil del navegador dentro de la VM, o
  mantenga `chrome.guestName` configurado para la unión como invitado. La unión automática como invitado utiliza la automatización del navegador de OpenClaw
  a través del proxy del navegador del nodo; asegúrese de que la configuración del navegador del nodo
  apunte al perfil que desea, por ejemplo
  `browser.defaultProfile: "user"` o un perfil de sesión existente con nombre.
- Pestañas Meet duplicadas: deje `chrome.reuseExistingTab: true` habilitado. OpenClaw
  activa una pestaña existente para la misma URL de Meet antes de abrir una nueva, y
  la creación de reuniones del navegador reutiliza una `https://meet.google.com/new` en curso
  o una pestaña de solicitud de cuenta de Google antes de abrir otra.
- Sin audio: en Meet, enrute el micrófono/altavoz a través de la ruta del dispositivo de audio virtual
  utilizada por OpenClaw; utilice dispositivos virtuales separados o un enrutamiento estilo Loopback
  para un audio dúplex limpio.

## Notas de instalación

El valor predeterminado de tiempo real de Chrome utiliza dos herramientas externas:

- `sox`: utilidad de audio de línea de comandos. El complemento utiliza comandos explícitos de dispositivos CoreAudio
  para el puente de audio PCM16 predeterminado de 24 kHz.
- `blackhole-2ch`: controlador de audio virtual de macOS. Crea el dispositivo de audio `BlackHole 2ch`
  a través del cual Chrome/Meet puede enrutar.

OpenClaw no incluye ni redistribuye ninguno de los dos paquetes. La documentación pide a los usuarios que los instalen como dependencias del host a través de Homebrew. SoX está licenciado como `LGPL-2.0-only AND GPL-2.0-only`; BlackHole es GPL-3.0. Si crea un instalador o un appliance que incluya BlackHole con OpenClaw, revise los términos de licencia ascendente de BlackHole u obtenga una licencia separada de Existential Audio.

## Transportes

### Chrome

El transporte de Chrome abre la URL de Meet a través del control del navegador de OpenClaw y se une como el perfil del navegador de OpenClaw iniciado. En macOS, el complemento verifica `BlackHole 2ch` antes del lanzamiento. Si está configurado, también ejecuta un comando de estado de salud del puente de audio y un comando de inicio antes de abrir Chrome. Use `chrome` cuando Chrome/audio se ejecutan en el host Gateway; use `chrome-node` cuando Chrome/audio se ejecutan en un nodo emparejado, como una VM de macOS Parallels. Para Chrome local, elija el perfil con `browser.defaultProfile`; `chrome.browserProfile` se pasa a los hosts `chrome-node`.

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

Enrute el audio del micrófono y del altavoz de Chrome a través del puente de audio local de OpenClaw. Si `BlackHole 2ch` no está instalado, la unión falla con un error de configuración en lugar de unirse silenciosamente sin una ruta de audio.

### Twilio

El transporte Twilio es un plan de marcación estricto delegado al complemento Voice Call. No analiza las páginas de Meet en busca de números de teléfono.

Use esto cuando la participación de Chrome no esté disponible o desee una alternativa de marcación telefónica. Google Meet debe exponer un número de marcación telefónica y un PIN para la reunión; OpenClaw no los descubre desde la página de Meet.

Habilite el complemento Voice Call en el host Gateway, no en el nodo Chrome:

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // or set "twilio" if Twilio should be the default
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
        },
      },
    },
  },
}
```

Proporcione las credenciales de Twilio a través del entorno o la configuración. El entorno mantiene los secretos fuera de `openclaw.json`:

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

Reinicie o recargue el Gateway después de habilitar `voice-call`; los cambios de configuración del complemento no aparecen en un proceso Gateway ya en ejecución hasta que se recarga.

Luego verifique:

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

Cuando la delegación de Twilio está conectada, `googlemeet setup` incluye verificaciones exitosas de `twilio-voice-call-plugin` y `twilio-voice-call-credentials`.

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

Use `--dtmf-sequence` cuando la reunión necesita una secuencia personalizada:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth y verificación previa

OAuth es opcional para crear un enlace de Meet porque `googlemeet create` puede usar la automatización del navegador como alternativa. Configure OAuth cuando quiera creación oficial a través de la API, resolución de espacios o comprobaciones previas de Meet Media API.

El acceso a la API de Google Meet utiliza OAuth de usuario: cree un cliente OAuth de Google Cloud, solicite los permisos (scopes) necesarios, autorice una cuenta de Google y luego almacene el token de actualización resultante en la configuración del complemento de Google Meet o proporcione las variables de entorno `OPENCLAW_GOOGLE_MEET_*`.

OAuth no reemplaza la ruta de unión de Chrome. Los transportes Chrome y Chrome-node todavía se unen a través de un perfil de Chrome con sesión iniciada, BlackHole/SoX y un nodo conectado cuando utiliza la participación del navegador. OAuth es solo para la ruta oficial de la API de Google Meet: crear espacios de reunión, resolver espacios y ejecutar comprobaciones previas de Meet Media API.

### Crear credenciales de Google

En Google Cloud Console:

1. Cree o seleccione un proyecto de Google Cloud.
2. Habilite **Google Meet REST API** para ese proyecto.
3. Configure la pantalla de consentimiento de OAuth.
   - **Interno** es lo más sencillo para una organización de Google Workspace.
   - **Externo** funciona para configuraciones personales/pruebas; mientras la aplicación está en estado de Prueba, añada cada cuenta de Google que autorizará la aplicación como usuario de prueba.
4. Añada los permisos (scopes) que solicita OpenClaw:
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. Cree un ID de cliente OAuth.
   - Tipo de aplicación: **Aplicación web**.
   - URI de redirección autorizada:

     ```text
     http://localhost:8085/oauth2callback
     ```

6. Copie el ID de cliente y el secreto de cliente.

`meetings.space.created` es obligatorio para Google Meet `spaces.create`.
`meetings.space.readonly` permite a OpenClaw resolver URL/códigos de Meet a espacios.
`meetings.conference.media.readonly` es para las comprobaciones previas y el trabajo de medios de Meet Media API; es posible que Google requiera la inscripción en Developer Preview para el uso real de la Media API.
Si solo necesita uniones de Chrome basadas en navegador, omita OAuth por completo.

### Generar el token de actualización

Configure `oauth.clientId` y opcionalmente `oauth.clientSecret`, o páselos como variables de entorno, luego ejecute:

```bash
openclaw googlemeet auth login --json
```

El comando imprime un bloque de configuración `oauth` con un token de actualización. Utiliza PKCE, devolución de llamada en localhost en `http://localhost:8085/oauth2callback` y un flujo manual de copiar/pegar con `--manual`.

Ejemplos:

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

Use el modo manual cuando el navegador no pueda alcanzar la devolución de llamada local:

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

La salida JSON incluye:

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

Guarde el objeto `oauth` en la configuración del complemento de Google Meet:

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

Prefiera las variables de entorno cuando no desee el token de actualización en la configuración.
Si están presentes tanto los valores de configuración como los del entorno, el complemento resuelve la configuración
primero y luego el respaldo del entorno.

El consentimiento de OAuth incluye la creación de espacios de Meet, acceso de lectura a espacios de Meet y acceso de lectura
a medios de conferencias de Meet. Si se autenticó antes de que existiera el soporte de creación de reuniones,
vuelva a ejecutar `openclaw googlemeet auth login --json` para que el token de
actualización tenga el alcance `meetings.space.created`.

### Verificar OAuth con doctor

Ejecute el doctor de OAuth cuando desee una verificación de estado rápida y no secreta:

```bash
openclaw googlemeet doctor --oauth --json
```

Esto no carga el tiempo de ejecución de Chrome ni requiere un nodo de Chrome conectado. Verifica
que la configuración de OAuth existe y que el token de actualización puede acuñar un token de
acceso. El informe JSON incluye solo campos de estado como `ok`, `configured`,
`tokenSource`, `expiresAt` y mensajes de verificación; no imprime el token de
acceso, el token de actualización ni el secreto del cliente.

Resultados comunes:

| Verificación         | Significado                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `oauth-config`       | `oauth.clientId` más `oauth.refreshToken`, o un token de acceso en caché, está presente.                     |
| `oauth-token`        | El token de acceso en caché sigue siendo válido, o el token de actualización acuñó un nuevo token de acceso. |
| `meet-spaces-get`    | La verificación opcional `--meeting` resolvió un espacio de Meet existente.                                  |
| `meet-spaces-create` | La verificación opcional `--create-space` creó un nuevo espacio de Meet.                                     |

Para demostrar la habilitación de la API de Google Meet y el alcance `spaces.create` también, ejecute la
verificación de creación con efectos secundarios:

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` crea una URL de Meet desechable. Úsela cuando necesite confirmar
que el proyecto de Google Cloud tiene la API de Meet habilitada y que la cuenta
autorizada tiene el alcance `meetings.space.created`.

Para demostrar el acceso de lectura para un espacio de reunión existente:

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` y `resolve-space` demuestran el acceso de lectura a un espacio
existente al que la cuenta de Google autorizada puede acceder. Un `403` de estas comprobaciones
suele significar que la API REST de Google Meet está deshabilitada, que al token de actualización con consentimiento
le falta el alcance requerido o que la cuenta de Google no puede acceder a ese espacio
de Meet. Un error de token de actualización significa volver a ejecutar el bloque `openclaw googlemeet auth login
--` and store the new `oauth`.

No se necesitan credenciales de OAuth para la alternativa del navegador. En ese modo, la
autenticación de Google proviene del perfil de Chrome iniciado en el nodo seleccionado, no de
la configuración de OpenClaw.

Estas variables de entorno se aceptan como alternativas:

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` o `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` o `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` o `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` o `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` o
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` o `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` o `GOOGLE_MEET_PREVIEW_ACK`

Resuelva una URL de Meet, un código o un `spaces/{id}` a través de `spaces.get`:

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

Ejecute la verificación previa antes del trabajo con medios:

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

Enumere los artefactos de la reunión y la asistencia después de que Meet haya creado registros de la conferencia:

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

Con `--meeting`, `artifacts` y `attendance` usan el registro de conferencia más reciente
de forma predeterminada. Pase `--all-conference-records` cuando desee todos los registros retenidos
para esa reunión.

La búsqueda en el calendario puede resolver la URL de la reunión desde Google Calendar antes de leer
los artefactos de Meet:

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` busca en el calendario de `primary` de hoy un evento de calendario con un
enlace de Google Meet. Usa `--event <query>` para buscar texto de evento coincidente y
`--calendar <id>` para un calendario no principal. La búsqueda en el calendario requiere un
inicio de sesión OAuth nuevo que incluya el alcance de solo lectura de eventos de calendario.
`calendar-events` previsualiza los eventos de Meet coincidentes y marca el evento que
`latest`, `artifacts`, `attendance` o `export` elegirán.

Si ya conoces el id del registro de la conferencia, dirígete a él directamente:

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

Escribe un informe legible:

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-attendance.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

`artifacts` devuelve metadatos del registro de la conferencia más los metadatos de recursos de
participante, grabación, transcripción, entrada de transcripción estructurada y nota inteligente cuando
Google los expone para la reunión. Usa `--no-transcript-entries` para omitir
la búsqueda de entradas en reuniones grandes. `attendance` expande los participantes en
filas de sesión de participante con horas de primera/última visualización, duración total de la sesión,
indicadores de salida tardía/temprana y recursos de participantes duplicados fusionados por usuario
con sesión iniciada o nombre para mostrar. Pasa `--no-merge-duplicates` para mantener los recursos de participantes
sin procesar por separado, `--late-after-minutes` para ajustar la detección de llegadas tardías y
`--early-before-minutes` para ajustar la detección de salidas tempranas.

`export` escribe una carpeta que contiene `summary.md`, `attendance.csv`,
`transcript.md`, `artifacts.json`, `attendance.json` y `manifest.json`.
`manifest.json` registra la entrada elegida, las opciones de exportación, los registros de la conferencia,
los archivos de salida, los recuentos, la fuente del token, el evento de Calendar cuando se usó uno y cualquier
advertencia de recuperación parcial. Pasa `--zip` para también escribir un archivo portable junto
a la carpeta. Pasa `--include-doc-bodies` para exportar la transcripción vinculada y el texto
de Google Docs de smart-notes a través de Google Drive `files.export`; esto requiere un
inicio de sesión OAuth fresco que incluya el alcance de solo lectura de Drive Meet. Sin
`--include-doc-bodies`, las exportaciones incluyen solo los metadatos de Meet y las entradas
de transcripción estructuradas. Si Google devuelve un fallo parcial de artefacto, como un listado de smart-note,
una entrada de transcripción o un error en el cuerpo del documento de Drive, el resumen y
el manifiesto mantienen la advertencia en lugar de fallar toda la exportación.
Usa `--dry-run` para obtener los mismos datos de artefacto/asistencia e imprimir el
JSON del manifiesto sin crear la carpeta o el ZIP. Esto es útil antes de escribir
una exportación grande o cuando un agente solo necesita recuentos, registros seleccionados y
advertencias.

Los agentes también pueden crear el mismo paquete a través de la herramienta `google_meet`:

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

Establece `"dryRun": true` para devolver solo el manifiesto de exportación y omitir la escritura de archivos.

Ejecuta el smoke test en vivo protegido contra una reunión real retenida:

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

Entorno de smoke test en vivo:

- `OPENCLAW_LIVE_TEST=1` habilita las pruebas en vivo protegidas.
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` apunta a una URL de Meet retenida, un código o
  `spaces/{id}`.
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` o `GOOGLE_MEET_CLIENT_ID` proporciona el id
  de cliente de OAuth.
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` o `GOOGLE_MEET_REFRESH_TOKEN` proporciona
  el token de actualización.
- Opcional: `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`,
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` y
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` usan los mismos nombres alternativos
  sin el prefijo `OPENCLAW_`.

El artefacto base/asistencia de prueba en vivo necesita
`https://www.googleapis.com/auth/meetings.space.readonly` y
`https://www.googleapis.com/auth/meetings.conference.media.readonly`. La búsqueda
de calendario necesita `https://www.googleapis.com/auth/calendar.events.readonly`. La exportación
del cuerpo del documento de Drive necesita
`https://www.googleapis.com/auth/drive.meet.readonly`.

Cree un espacio Meet nuevo:

```bash
openclaw googlemeet create
```

El comando imprime el nuevo `meeting uri`, la fuente y la sesión de unión. Con las credenciales OAuth
utiliza la API oficial de Google Meet. Sin credenciales OAuth
utiliza el perfil del navegador conectado del nodo Chrome anclado como alternativa. Los agentes pueden
usar la herramienta `google_meet` con `action: "create"` para crear y unirse en un
solo paso. Para crear solo la URL, pase `"join": false`.

Ejemplo de salida JSON de la alternativa del navegador:

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

Si la alternativa del navegador encuentra el inicio de sesión de Google o un bloqueador de permisos de Meet antes de que
pueda crear la URL, el método Gateway devuelve una respuesta fallida y la
herramienta `google_meet` devuelve detalles estructurados en lugar de una cadena simple:

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

Cuando un agente ve `manualActionRequired: true`, debe informar el
`manualActionMessage` además del contexto del nodo/pestaña del navegador y dejar de abrir nuevas
pestañas de Meet hasta que el operador complete el paso del navegador.

Ejemplo de salida JSON de la creación de API:

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

Crear un Meet se une de forma predeterminada. El transporte Chrome o Chrome-node todavía
necesita un perfil de Google Chrome conectado para unirse a través del navegador. Si el
perfil está desconectado, OpenClaw informa `manualActionRequired: true` o un
de error de alternativa del navegador y pide al operador que termine el inicio de sesión de Google antes
de reintentar.

Establezca `preview.enrollmentAcknowledged: true` solo después de confirmar que su proyecto de
Cloud, la entidad OAuth y los participantes de la reunión están inscritos en el Programa
de vista previa para desarrolladores de Google Workspace para las API de medios de Meet.

## Config

La ruta común en tiempo real de Chrome solo necesita el complemento habilitado, BlackHole, SoX
y una clave de proveedor de voz en tiempo real de backend. OpenAI es el valor predeterminado; configure
`realtime.provider: "google"` para usar Google Gemini Live:

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

Configure la configuración del complemento en `plugins.entries.google-meet.config`:

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Valores predeterminados:

- `defaultTransport: "chrome"`
- `defaultMode: "realtime"`
- `chromeNode.node`: id/nombre/IP de nodo opcional para `chrome-node`
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`: nombre utilizado en la pantalla de invitado de Meet sin sesión iniciada
- `chrome.autoJoin: true`: rellenado del nombre de invitado con el mejor esfuerzo y clic en Unirse ahora a través de la automatización del navegador de OpenClaw en `chrome-node`
- `chrome.reuseExistingTab: true`: activar una pestaña de Meet existente en lugar de abrir duplicados
- `chrome.waitForInCallMs: 20000`: esperar a que la pestaña de Meet informe que está en la llamada antes de que se active la introducción en tiempo real
- `chrome.audioFormat: "pcm16-24khz"`: formato de audio de par de comandos. Use `"g711-ulaw-8khz"` solo para pares de comandos heredados/personalizados que aún emiten audio de telefonía.
- `chrome.audioInputCommand`: comando SoX que lee de CoreAudio `BlackHole 2ch` y escribe audio en `chrome.audioFormat`
- `chrome.audioOutputCommand`: comando SoX que lee audio en `chrome.audioFormat` y escribe en CoreAudio `BlackHole 2ch`
- `realtime.provider: "openai"`
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`: respuestas habladas breves, con `openclaw_agent_consult` para respuestas más profundas
- `realtime.introMessage`: verificación de preparación hablada breve cuando se conecta el puente en tiempo real; establézcalo en `""` para unirse en silencio
- `realtime.agentId`: id de agente opcional de OpenClaw para `openclaw_agent_consult`; por defecto es `main`

Opciones opcionales:

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
  },
  chromeNode: {
    node: "parallels-macos",
  },
  realtime: {
    provider: "google",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Kore",
      },
    },
  },
}
```

Configuración solo para Twilio:

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

`voiceCall.enabled` por defecto es `true`; con el transporte Twilio delega la llamada PSTN real y DTMF al complemento Voice Call. Si `voice-call` no está activado, Google Meet aún puede validar y registrar el plan de marcado, pero no puede realizar la llamada de Twilio.

## Herramienta

Los agentes pueden usar la herramienta `google_meet`:

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

Use `transport: "chrome"` cuando Chrome se ejecuta en el host de Gateway. Use `transport: "chrome-node"` cuando Chrome se ejecuta en un nodo emparejado como una VM de Parallels. En ambos casos, el modelo en tiempo real y `openclaw_agent_consult` se ejecutan en el host de Gateway, por lo que las credenciales del modelo permanecen allí.

Use `action: "status"` para listar las sesiones activas o inspeccionar un ID de sesión. Use
`action: "speak"` con `sessionId` y `message` para hacer que el agente en tiempo real
hable inmediatamente. Use `action: "test_speech"` para crear o reutilizar la sesión,
desencadenar una frase conocida y devolver el estado de salud de `inCall` cuando el host de Chrome pueda
informarlo. Use `action: "leave"` para marcar una sesión como finalizada.

`status` incluye el estado de salud de Chrome cuando está disponible:

- `inCall`: Chrome parece estar dentro de la llamada de Meet
- `micMuted`: estado del micrófono de Meet con el mejor esfuerzo
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`: el
  perfil del navegador necesita inicio de sesión manual, admisión del anfitrión de Meet, permisos o
  reparación del control del navegador antes de que el sonido pueda funcionar
- `providerConnected` / `realtimeReady`: estado del puente de voz en tiempo real
- `lastInputAt` / `lastOutputAt`: último audio visto desde o enviado al puente

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## Consulta del agente en tiempo real

El modo en tiempo real de Chrome está optimizado para un bucle de voz en vivo. El proveedor de voz en tiempo real
cuando el modelo en tiempo real necesita un razonamiento más profundo, información actual u otras
herramientas normales de OpenClaw, puede llamar a `openclaw_agent_consult`.

La herramienta de consulta ejecuta el agente normal de OpenClaw en segundo plano con el contexto reciente
del acta de la reunión y devuelve una respuesta hablada concisa a la sesión de
voz en tiempo real. El modelo de voz puede then decir esa respuesta de vuelta en la reunión.
Utiliza la misma herramienta compartida de consulta en tiempo real que Llamada de voz.

De manera predeterminada, las consultas se ejecutan contra el agente `main`. Establezca `realtime.agentId` cuando un
carril de Meet deba consultar un espacio de trabajo dedicado del agente OpenClaw, valores predeterminados del modelo,
política de herramientas, memoria e historial de sesión.

`realtime.toolPolicy` controla la ejecución de la consulta:

- `safe-read-only`: exponer la herramienta de consulta y limitar el agente regular a
  `read`, `web_search`, `web_fetch`, `x_search`, `memory_search` y
  `memory_get`.
- `owner`: exponer la herramienta de consulta y permitir que el agente regular use la política normal
  de herramientas del agente.
- `none`: no exponer la herramienta de consulta al modelo de voz en tiempo real.

La clave de sesión de consulta tiene ámbito por sesión de Meet, por lo que las llamadas de consulta de seguimiento
pueden reutilizar el contexto de consulta previo durante la misma reunión.

Para forzar una verificación de preparación hablada después de que Chrome se haya unido completamente a la llamada:

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

Para la prueba de humo completa de unión y habla:

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## Lista de verificación de pruebas en vivo

Use esta secuencia antes de entregar una reunión a un agente no atendido:

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

Estado esperado del nodo Chrome:

- `googlemeet setup` está todo verde.
- `googlemeet setup` incluye `chrome-node-connected` cuando el nodo Chrome es el
  transporte predeterminado o un nodo está fijado.
- `nodes status` muestra que el nodo seleccionado está conectado.
- El nodo seleccionado anuncia tanto `googlemeet.chrome` como `browser.proxy`.
- La pestaña Meet se une a la llamada y `test-speech` devuelve el estado de salud de Chrome con
  `inCall: true`.

Para un host Chrome remoto como una máquina virtual macOS de Parallels, esta es la verificación segura
más corta después de actualizar el Gateway o la máquina virtual:

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

Eso prueba que el complemento del Gateway está cargado, que el nodo de máquina virtual está conectado con el
token actual y que el puente de audio de Meet está disponible antes de que un agente abra una
pestaña de reunión real.

Para una prueba de humo de Twilio, use una reunión que exponga los detalles de marcado telefónico:

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

Estado esperado de Twilio:

- `googlemeet setup` incluye verificaciones verdes de `twilio-voice-call-plugin` y
  `twilio-voice-call-credentials`.
- `voicecall` está disponible en la CLI después de recargar el Gateway.
- La sesión devuelta tiene `transport: "twilio"` y un `twilio.voiceCallId`.
- `googlemeet leave <sessionId>` cuelga la llamada de voz delegada.

## Solución de problemas

### El agente no puede ver la herramienta Google Meet

Confirme que el complemento esté habilitado en la configuración del Gateway y recargue el Gateway:

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

Si acaba de editar `plugins.entries.google-meet`, reinicie o recargue el Gateway.
El agente en ejecución solo ve las herramientas de complemento registradas por el proceso actual del Gateway.

### Ningún nodo conectado compatible con Google Meet

En el host del nodo, ejecute:

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

En el host del Gateway, apruebe el nodo y verifique los comandos:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

El nodo debe estar conectado y listar `googlemeet.chrome` más `browser.proxy`.
La configuración del Gateway debe permitir esos comandos del nodo:

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

Si `googlemeet setup` falla `chrome-node-connected` o el registro del Gateway informa
`gateway token mismatch`, reinstale o reinicie el nodo con el token actual del Gateway.
Para un Gateway LAN, esto generalmente significa:

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

Luego recargue el servicio del nodo y vuelva a ejecutar:

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### El navegador se abre pero el agente no puede unirse

Ejecute `googlemeet test-speech` e inspeccione el estado de salud de Chrome devuelto. Si informa
`manualActionRequired: true`, muestre `manualActionMessage` al operador y deje de reintentar hasta que
la acción del navegador se complete.

Acciones manuales comunes:

- Inicie sesión en el perfil de Chrome.
- Admita al invitado desde la cuenta de host de Meet.
- Otorgue permisos de micrófono/cámara de Chrome cuando aparezca el mensaje de
  permiso nativo de Chrome.
- Cierre o repare un cuadro de diálogo de permisos de Meet atascado.

No informe "no iniciado sesión" solo porque Meet muestra "¿Quiere que la gente
lo escuche en la reunión?". Ese es el intersticio de elección de audio de Meet; OpenClaw
hace clic en **Usar micrófono** a través de la automatización del navegador cuando está disponible y sigue
esperando el estado real de la reunión. Para la reserva del navegador de solo creación, OpenClaw
puede hacer clic en **Continuar sin micrófono** porque la creación de la URL no necesita
la ruta de audio en tiempo real.

### Falla la creación de la reunión

`googlemeet create` usa primero el punto final `spaces.create` de la API de Google Meet
cuando se configuran las credenciales OAuth. Sin credenciales OAuth, recurre
al navegador del nodo Chrome anclado. Confirme:

- Para la creación a través de API: `oauth.clientId` y `oauth.refreshToken` están configurados,
  o están presentes las variables de entorno `OPENCLAW_GOOGLE_MEET_*` coincidentes.
- Para la creación de API: el token de actualización se generó después de que se agregó soporte de creación. Los tokens antiguos pueden carecer del ámbito `meetings.space.created`; vuelva a ejecutar `openclaw googlemeet auth login --json` y actualice la configuración del complemento.
- Para la alternativa del navegador: `defaultTransport: "chrome-node"` y `chromeNode.node` apuntan a un nodo conectado con `browser.proxy` y `googlemeet.chrome`.
- Para la alternativa del navegador: el perfil de OpenClaw Chrome en ese nodo ha iniciado sesión en Google y puede abrir `https://meet.google.com/new`.
- Para la alternativa del navegador: los reintentos reutilizan una pestaña `https://meet.google.com/new` existente o de aviso de cuenta de Google antes de abrir una nueva pestaña. Si un agente agota el tiempo de espera, vuelva a intentar la llamada a la herramienta en lugar de abrir manualmente otra pestaña de Meet.
- Para la alternativa del navegador: si la herramienta devuelve `manualActionRequired: true`, use el `browser.nodeId`, `browser.targetId`, `browserUrl` y `manualActionMessage` devueltos para guiar al operador. No vuelva a intentar en bucle hasta que se complete esa acción.
- Para la alternativa del navegador: si Meet muestra "Do you want people to hear you in the meeting?" (¿Quieres que la gente te oiga en la reunión?), deje la pestaña abierta. OpenClaw debe hacer clic en **Use microphone** (Usar micrófono) o, para la alternativa de solo creación, **Continue without microphone** (Continuar sin micrófono) a través de la automatización del navegador y continuar esperando la URL de Meet generada. Si no puede hacerlo, el error debe mencionar `meet-audio-choice-required`, no `google-login-required`.

### El agente se une pero no habla

Verifique la ruta en tiempo real:

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

Use `mode: "realtime"` para escuchar/responder. `mode: "transcribe"` intencionalmente no inicia el puente de voz en tiempo real dúplex.

También verifique:

- Una clave de proveedor en tiempo real está disponible en el host Gateway, como `OPENAI_API_KEY` o `GEMINI_API_KEY`.
- `BlackHole 2ch` es visible en el host Chrome.
- `sox` existe en el host Chrome.
- El micrófono y el altavoz de Meet están enrutados a través de la ruta de audio virtual utilizada por OpenClaw.

`googlemeet doctor [session-id]` imprime la sesión, el nodo, el estado en llamada,
la razón de la acción manual, la conexión del proveedor en tiempo real, `realtimeReady`, la actividad
de entrada/salida de audio, las marcas de tiempo del último audio, los contadores de bytes y la URL del navegador.
Use `googlemeet status [session-id]` cuando necesite el JSON sin procesar. Use
`googlemeet doctor --oauth` cuando necesite verificar la actualización de OAuth de Google Meet
sin exponer los tokens; agregue `--meeting` o `--create-space` cuando necesite
una prueba de la API de Google Meet también.

Si un agente agotó el tiempo de espera y puede ver una pestaña de Meet ya abierta, inspeccione esa pestaña
sin abrir otra:

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

La acción de herramienta equivalente es `recover_current_tab`. Enfoca e inspecciona una
pestaña de Meet existente para el transporte seleccionado. Con `chrome`, utiliza el control
local del navegador a través de la Gateway; con `chrome-node`, utiliza el nodo de
Chrome configurado. No abre una nueva pestaña ni crea una nueva sesión; informa del
bloqueador actual, como el estado de inicio de sesión, admisión, permisos o elección de audio.
El comando de la CLI se comunica con la Gateway configurada, por lo que la Gateway debe estar ejecutándose;
`chrome-node` también requiere que el nodo de Chrome esté conectado.

### Fallo en las comprobaciones de configuración de Twilio

`twilio-voice-call-plugin` falla cuando `voice-call` no está permitido o no está habilitado.
Agréguelo a `plugins.allow`, habilite `plugins.entries.voice-call` y recargue la
Gateway.

`twilio-voice-call-credentials` falla cuando al backend de Twilio le faltan el
SID de cuenta, el token de autenticación o el número de llamante. Establezca estos en el host de la Gateway:

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

Luego reinicie o recargue la Gateway y ejecute:

```bash
openclaw googlemeet setup
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` es solo de preparación por defecto. Para realizar una prueba en seco de un número específico:

```bash
openclaw voicecall smoke --to "+15555550123"
```

Solo agregue `--yes` cuando intencionalmente desee realizar una llamada de notificación
saliente en vivo:

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### La llamada de Twilio comienza pero nunca entra a la reunión

Confirme que el evento de Meet exponga los detalles de marcación telefónica. Pase el número exacto de marcación
y el PIN o una secuencia DTMF personalizada:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

Use `w` iniciales o comas en `--dtmf-sequence` si el proveedor necesita una pausa
antes de ingresar el PIN.

## Notas

La API de medios oficial de Google Meet está orientada a la recepción, por lo que hablar en una llamada de Meet aún necesita una ruta de participante. Este complemento mantiene visible ese límite: Chrome maneja la participación del navegador y el enrutamiento de audio local; Twilio maneja la participación de marcación telefónica.

El modo en tiempo real de Chrome necesita:

- `chrome.audioInputCommand` más `chrome.audioOutputCommand`: OpenClaw posee el puente del modelo en tiempo real y canaliza el audio en `chrome.audioFormat` entre esos comandos y el proveedor de voz en tiempo real seleccionado. La ruta de Chrome predeterminada es PCM16 de 24 kHz; G.711 mu-law de 8 kHz permanece disponible para pares de comandos heredados.
- `chrome.audioBridgeCommand`: un comando de puente externo posee toda la ruta de audio local y debe salir después de iniciar o validar su demonio.

Para un audio dúplex limpio, enrute la salida de Meet y el micrófono de Meet a través de dispositivos virtuales separados o un gráfico de dispositivos virtuales estilo Loopback. Un único dispositivo BlackHole compartido puede hacer eco de otros participantes de nuevo en la llamada.

`googlemeet speak` activa el puente de audio en tiempo real activo para una sesión de Chrome. `googlemeet leave` detiene ese puente. Para las sesiones de Twilio delegadas a través del complemento de llamada de voz, `leave` también cuelga la llamada de voz subyacente.

## Relacionado

- [Complemento de llamada de voz](/es/plugins/voice-call)
- [Modo de conversación](/es/nodes/talk)
- [Construcción de complementos](/es/plugins/building-plugins)
