---
summary: "Complemento de Google Meet: unirse a URL de Meet explícitas a través de Chrome o Twilio con valores predeterminados de respuesta de agente"
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
- `agent` es el modo de respuesta predeterminado: la transcripción en tiempo real escucha, el
  agente OpenClaw configurado responde y el TTS habitual de OpenClaw habla en Meet.
- `bidi` sigue disponible como modo de reserva de modelo de voz en tiempo real directo.
- Los agentes eligen el comportamiento de unión con `mode`: use `agent` para escucha/respuesta
  en vivo, `bidi` para reserva de voz en tiempo real directa, o `transcribe`
  para unirse/controlar el navegador sin el puente de respuesta.
- La autenticación comienza como Google OAuth personal o un perfil de Chrome ya iniciado.
- No hay ningún anuncio automático de consentimiento.
- El backend de audio de Chrome predeterminado es `BlackHole 2ch`.
- Chrome puede ejecutarse localmente o en un host de nodo emparejado.
- Twilio acepta un número de teléfono de acceso más un PIN opcional o una secuencia DTMF; no
  puede llamar directamente a una URL de Meet.
- El comando de CLI es `googlemeet`; `meet` está reservado para flujos de trabajo de teleconferencia
  de agentes más amplios.

## Inicio rápido

Instale las dependencias de audio locales y configure un proveedor de transcripción
en tiempo real más el TTS habitual de OpenClaw. OpenAI es el proveedor de transcripción
predeterminado; Google Gemini Live también funciona como una alternativa de voz `bidi` separada con
`realtime.voiceProvider: "google"`:

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# only needed when realtime.voiceProvider is "google" for bidi mode
export GEMINI_API_KEY=...
```

`blackhole-2ch` instala el dispositivo de audio virtual `BlackHole 2ch`. El instalador
de Homebrew requiere un reinicio antes de que macOS exponga el dispositivo:

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

El resultado de la configuración está diseñado para ser legible por el agente y consciente del modo. Reporta el perfil de Chrome, la fijación del nodo y, para las uniones en tiempo real de Chrome, el puente de audio BlackHole/SoX y las comprobaciones de introducción en tiempo real retrasadas. Para uniones de solo observación, compruebe el mismo transporte con `--mode transcribe`; ese modo omite los requisitos previos de audio en tiempo real porque no escucha ni habla a través del puente:

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

Cuando se configura la delegación de Twilio, la configuración también informa si el
plugin `voice-call`, las credenciales de Twilio y la exposición del webhook público están listos.
Trate cualquier verificación `ok: false` como un bloqueo para el transporte y el modo verificados
antes de pedir a un agente que se una. Use `openclaw googlemeet setup --json` para
secuencias de comandos o salida legible por máquina. Use `--transport chrome`,
`--transport chrome-node` o `--transport twilio` para realizar una verificación previa de un transporte
específico antes de que un agente lo intente.

Para Twilio, realice siempre la verificación previa del transporte explícitamente cuando el transporte predeterminado
es Chrome:

```bash
openclaw googlemeet setup --transport twilio
```

Esto detecta el cableado `voice-call` faltante, las credenciales de Twilio o la exposición del webhook
inalcanzable antes de que el agente intente llamar a la reunión.

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
  "mode": "agent"
}
```

La herramienta `google_meet` orientada al agente permanece disponible en hosts que no son macOS para los flujos de artefactos, calendario, configuración, transcripción, Twilio y `chrome-node`. Las acciones de respuesta de voz de Chrome local se bloquean allí porque la ruta de audio de Chrome incluida actualmente depende de `BlackHole 2ch` de macOS. En Linux, use `mode: "transcribe"`, marcación Twilio o un host `chrome-node` macOS para la participación de respuesta de voz de Chrome.

Cree una nueva reunión y únase a ella:

```bash
openclaw googlemeet create --transport chrome-node --mode agent
```

Para salas creadas por API, use `SpaceConfig.accessType` de Google Meet cuando desee que la política de no solicitar ingreso de la sala sea explícita en lugar de heredada de los valores predeterminados de la cuenta de Google:

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

`OPEN` permite que cualquiera con la URL de Meet se una sin tocar. `TRUSTED` permite que los usuarios de confianza de la organización anfitriona, los usuarios externos invitados y los usuarios que llamen por teléfono se unan sin tocar. `RESTRICTED` limita la entrada sin tocar a los invitados. Estas configuraciones solo se aplican a la ruta de creación oficial de la API de Google Meet, por lo que se deben configurar las credenciales de OAuth.

Si autenticó Google Meet antes de que esta opción estuviera disponible, vuelva a ejecutar `openclaw googlemeet auth login --json` después de agregar el alcance `meetings.space.settings` a su pantalla de consentimiento de OAuth de Google.

Crear solo la URL sin unirse:

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` tiene dos rutas:

- Creación de API: se utiliza cuando las credenciales de OAuth de Google Meet están configuradas. Esta es la ruta más determinista y no depende del estado de la interfaz de usuario del navegador.
- Respaldo del navegador: se utiliza cuando faltan las credenciales de OAuth. OpenClaw utiliza el nodo de Chrome anclado, abre `https://meet.google.com/new`, espera a que Google redirija a una URL de código de reunión real y luego devuelve esa URL. Esta ruta requiere que el perfil de Chrome de OpenClaw en el nodo ya haya iniciado sesión en Google. La automatización del navegador maneja el propio mensaje del micrófono de la primera ejecución de Meet; ese mensaje no se trata como un error de inicio de sesión de Google. Los flujos de unión y creación también intentan reutilizar una pestaña de Meet existente antes de abrir una nueva. La coincidencia ignora cadenas de consulta de URL inofensivas como `authuser`, por lo que un reintento del agente debería enfocarse en la reunión ya abierta en lugar de crear una segunda pestaña de Chrome.

La salida del comando/herramienta incluye un campo `source` (`api` o `browser`) para que los agentes
puedan explicar qué ruta se utilizó. `create` se une a la nueva reunión de forma predeterminada y
devuelve `joined: true` más la sesión de unión. Para solo generar la URL, use
`create --no-join` en la CLI o pase `"join": false` a la herramienta.

O diga a un agente: "Crea un Google Meet, únete con el modo de respuesta del agente
y envíame el enlace". El agente debe llamar a `google_meet` con
`action: "create"` y luego compartir el `meetingUri` devuelto.

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent"
}
```

Para una unión de solo observación/control del navegador, establezca `"mode": "transcribe"`. Esto no inicia el puente de voz en tiempo real dúplex, no requiere BlackHole o SoX, y no responderá en la reunión. Las uniones de Chrome en este modo también evitan la concesión de permisos de micrófono/cámara de OpenClaw y evitan la ruta **Usar micrófono** de Meet. Si Meet muestra un intersticial de elección de audio, la automatización intenta la ruta sin micrófono y, de lo contrario, informa una acción manual en lugar de abrir el micrófono local. En el modo de transcripción, los transportes administrados de Chrome también instalan un observador de subtítulos de Meet de mejor esfuerzo. `googlemeet status --json` y `googlemeet doctor` muestran `captioning`, `captionsEnabledAttempted`, `transcriptLines`, `lastCaptionAt`, `lastCaptionSpeaker`, `lastCaptionText` y una cola corta `recentTranscript` para que los operadores puedan saber si el navegador se unió a la llamada y si los subtítulos de Meet están produciendo texto. Use `openclaw googlemeet test-listen <meet-url> --transport chrome-node` cuando necesite una sonda de sí/no: se une en modo de transcripción, espera movimientos de subtítulos o transcripciones nuevas y devuelve `listenVerified`, `listenTimedOut`, campos de acción manual y el estado más reciente de los subtítulos.

Durante las sesiones en tiempo real, el estado `google_meet` incluye el estado de salud del navegador y del puente de audio, como `inCall`, `manualActionRequired`, `providerConnected`,
`realtimeReady`, `audioInputActive`, `audioOutputActive`, las últimas marcas de tiempo de entrada/salida,
contadores de bytes y el estado de cierre del puente. Si aparece un mensaje de página de Meet segura,
la automatización del navegador lo maneja cuando puede. Los mensajes de inicio de sesión, admisión del anfitrión y
permisos del navegador/SO se reportan como una acción manual con un motivo y
mensaje para que el agente los transmita. Las sesiones de Chrome administradas solo emiten la frase de introducción o
de prueba después de que los informes de salud del navegador indiquen `inCall: true`; de lo contrario, los informes de estado indican
`speechReady: false` y el intento de habla se bloquea en lugar de fingir que el
agente habló en la reunión.

El Chrome local se une a través del perfil de navegador de OpenClaw conectado. El modo en tiempo real requiere `BlackHole 2ch` para la ruta del micrófono/altavoz utilizada por OpenClaw. Para un audio dúplex limpio, utilice dispositivos virtuales separados o un gráfico estilo Loopback; un solo dispositivo BlackHole es suficiente para una primera prueba de humo, pero puede generar eco.

### Pasarela local + Parallels Chrome

**No** necesita una pasarela OpenClaw completa ni una clave API de modelo dentro de una máquina virtual macOS solo para que la VM sea dueña de Chrome. Ejecute la pasarela y el agente localmente, luego ejecute un host de nodo en la VM. Habilite el complemento incluido en la VM una vez para que el nodo anuncie el comando Chrome:

Qué se ejecuta dónde:

- Host de la pasarela: OpenClaw Gateway, espacio de trabajo del agente, claves de modelo/API, proveedor en tiempo real y la configuración del complemento de Google Meet.
- VM macOS de Parallels: host de CLI/nodo de OpenClaw, Google Chrome, SoX, BlackHole 2ch y un perfil de Chrome conectado a Google.
- No es necesario en la VM: servicio de Gateway, configuración del agente, clave de OpenAI/GPT, o configuración del proveedor del modelo.

Instale las dependencias de la VM:

```bash
brew install blackhole-2ch sox
```

Reinicie la VM después de instalar BlackHole para que macOS exponga `BlackHole 2ch`:

```bash
sudo reboot
```

Después de reiniciar, verifique que la VM pueda ver el dispositivo de audio y los comandos de SoX:

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

Instale o actualice OpenClaw en la VM, luego habilite el complemento incluido allí:

```bash
openclaw plugins enable google-meet
```

Inicie el host del nodo en la VM:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

Si `<gateway-host>` es una IP de LAN y no está usando TLS, el nodo rechaza el WebSocket en texto plano a menos que usted acepte esa red privada de confianza:

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

Use la misma variable de entorno al instalar el nodo como un LaunchAgent:

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` es el entorno del proceso, no una configuración de `openclaw.json`. `openclaw node install` lo almacena en el entorno de LaunchAgent cuando está presente en el comando de instalación.

Aprobar el nodo desde el host de Gateway:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Confirme que la Gateway ve el nodo y que anuncia tanto `googlemeet.chrome`
y la capacidad del navegador/`browser.proxy`:

```bash
openclaw nodes status
```

Enruta Meet a través de ese nodo en el host de la Gateway:

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

Ahora únase normalmente desde el host de la Gateway:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

o pida al agente que use la herramienta `google_meet` con `transport: "chrome-node"`.

Para una prueba de humo de un solo comando que crea o reutiliza una sesión, pronuncia una frase
conocida e imprime el estado de la sesión:

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

Durante la unión en tiempo real, la automatización del navegador de OpenClaw completa el nombre del invitado, hace clic en Unirse/Pedir unirse y acepta la elección "Usar micrófono" de la primera ejecución de Meet cuando aparece ese mensaje. Durante la unión de solo observación o la creación de reuniones solo en el navegador, continúa más allá del mismo mensaje sin micrófono cuando esa opción está disponible. Si el perfil del navegador no ha iniciado sesión, Meet está esperando la admisión del anfitrión, Chrome necesita permiso de micrófono/cámara para una unión en tiempo real, o Meet está atascado en un mensaje que la automatización no pudo resolver, el resultado de unión/prueba de voz informa `manualActionRequired: true` con `manualActionReason` y `manualActionMessage`. Los agentes deben dejar de reintentar la unión, informar ese mensaje exacto más el `browserUrl`/`browserTitle` actual, y reintentar solo después de que la acción manual del navegador esté completa.

Si se omite `chromeNode.node`, OpenClaw selecciona automáticamente solo cuando exactamente un
nodo conectado anuncia tanto `googlemeet.chrome` como el control del navegador. Si
hay varios nodos capaces conectados, configure `chromeNode.node` con el id del nodo,
nombre para mostrar o IP remota.

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
- Pestañas de Meet duplicadas: deje `chrome.reuseExistingTab: true` habilitado. OpenClaw
  activa una pestaña existente para la misma URL de Meet antes de abrir una nueva, y
  la creación de reuniones del navegador reutiliza una `https://meet.google.com/new` en curso
  o una pestaña de solicitud de cuenta de Google antes de abrir otra.
- Sin audio: en Meet, enruta el micrófono/altavoz a través de la ruta del
  dispositivo de audio virtual que usa OpenClaw; utiliza dispositivos virtuales
  separados o un enrutamiento estilo Loopback para un audio dúplex limpio.

## Notas de instalación

La configuración predeterminada de conversación de Chrome (talk-back) usa
dos herramientas externas:

- `sox`: utilidad de audio de línea de comandos. El plugin usa
  comandos de dispositivo CoreAudio explícitos para el puente de audio PCM16
  predeterminado de 24 kHz.
- `blackhole-2ch`: controlador de audio virtual para macOS. Crea el
  dispositivo de audio `BlackHole 2ch` a través del cual
  Chrome/Meet puede enrutar.

OpenClaw no incluye ni redistribuye ninguno de los dos paquetes. La documentación pide a los usuarios que los instalen como dependencias del host a través de Homebrew. SoX está licenciado como `LGPL-2.0-only AND GPL-2.0-only`; BlackHole es GPL-3.0. Si crea un instalador o un dispositivo que incluya BlackHole con OpenClaw, revise los términos de licencia originales de BlackHole u obtenga una licencia separada de Existential Audio.

## Transportes

### Chrome

El transporte Chrome abre la URL de Meet a través del control del navegador de OpenClaw y se une como el perfil del navegador de OpenClaw conectado. En macOS, el complemento comprueba `BlackHole 2ch` antes del lanzamiento. Si está configurado, también ejecuta un comando de estado del puente de audio y un comando de inicio antes de abrir Chrome. Use `chrome` cuando el Chrome/audio se ejecutan en el host de la puerta de enlace; use `chrome-node` cuando el Chrome/audio se ejecutan en un nodo emparejado, como una VM de Parallels macOS. Para Chrome local, elija el perfil con `browser.defaultProfile`; `chrome.browserProfile` se pasa a los hosts `chrome-node`.

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

Enrute el audio del micrófono y del altavoz de Chrome a través del puente de audio local de OpenClaw. Si `BlackHole 2ch` no está instalado, la unión falla con un error de configuración en lugar de unirse silenciosamente sin una ruta de audio.

### Twilio

El transporte Twilio es un plan de marcación estricto delegado al complemento de llamada de voz. No analiza las páginas de Meet en busca de números de teléfono.

Úselo cuando la participación de Chrome no esté disponible o desee una alternativa de acceso telefónico. Google Meet debe exponer un número de teléfono y un PIN para la reunión; OpenClaw no los descubre desde la página de Meet.

Habilite el complemento de llamada de voz en el host de Gateway, no en el nodo de Chrome:

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call", "google"],
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
          inboundPolicy: "allowlist",
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "Join this Google Meet as an OpenClaw agent. Be brief.",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                silenceDurationMs: 500,
                startSensitivity: "high",
              },
            },
          },
        },
      },
      google: {
        enabled: true,
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
export GEMINI_API_KEY=...
```

Use `realtime.provider: "openai"` con el complemento del proveedor de OpenAI y `OPENAI_API_KEY` en su lugar si ese es su proveedor de voz en tiempo real.

Reinicie o recargue el Gateway después de habilitar `voice-call`; los cambios en la configuración del complemento no aparecen en un proceso de Gateway que ya se está ejecutando hasta que se recarga.

Luego verifique:

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

Cuando la delegación de Twilio está conectada, `googlemeet setup` incluye comprobaciones exitosas de
`twilio-voice-call-plugin`, `twilio-voice-call-credentials` y
`twilio-voice-call-webhook`.

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

Use `--dtmf-sequence` cuando la reunión necesite una secuencia personalizada:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth y preflight

OAuth es opcional para crear un enlace de Meet porque `googlemeet create` puede recurrir a la automatización del navegador. Configure OAuth cuando desee creación oficial a través de la API, resolución de espacio o comprobaciones previas de la API de Meet Media.

El acceso a la API de Google Meet utiliza OAuth de usuario: cree un cliente OAuth de Google Cloud,
solicite los alcances requeridos, autorice una cuenta de Google y luego almacene el
token de actualización resultante en la configuración del complemento Google Meet o proporcione las
variables de entorno `OPENCLAW_GOOGLE_MEET_*`.

OAuth no reemplaza la ruta de unión de Chrome. Los transportes Chrome y Chrome-node
todavía se unen a través de un perfil de Chrome con sesión iniciada, BlackHole/SoX y un nodo
conectado cuando se utiliza la participación del navegador. OAuth es solo para la ruta oficial de la API de
Google Meet: crear espacios de reunión, resolver espacios y ejecutar comprobaciones
previas de la API de Meet Media.

### Crear credenciales de Google

En Google Cloud Console:

1. Crea o selecciona un proyecto de Google Cloud.
2. Habilita la **Google Meet REST API** para ese proyecto.
3. Configura la pantalla de consentimiento de OAuth.
   - **Interno** es lo más sencillo para una organización de Google Workspace.
   - **Externo** funciona para configuraciones personales/pruebas; mientras la aplicación está en Pruebas,
     añade cada cuenta de Google que autorizará la aplicación como usuario de prueba.
4. Añade los ámbitos que solicita OpenClaw:
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.space.settings`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. Crea un ID de cliente OAuth.
   - Tipo de aplicación: **Aplicación web**.
   - URI de redirección autorizada:

     ```text
     http://localhost:8085/oauth2callback
     ```

6. Copia el ID de cliente y el secreto de cliente.

`meetings.space.created` es requerido por el `spaces.create` de Google Meet.
`meetings.space.readonly` permite a OpenClaw resolver URLs/códigos de Meet a espacios.
`meetings.space.settings` permite a OpenClaw pasar configuraciones de `SpaceConfig` como
`accessType` durante la creación de salas de API.
`meetings.conference.media.readonly` es para el trabajo de preflight y medios de la Meet Media API;
Google puede requerir la inscripción en Developer Preview para el uso real de la Media API.
Si solo necesitas uniones de Chrome basadas en navegador, omite OAuth por completo.

### Generar el token de actualización

Configura `oauth.clientId` y opcionalmente `oauth.clientSecret`, o pásalos como
variables de entorno, luego ejecuta:

```bash
openclaw googlemeet auth login --json
```

El comando imprime un bloque de configuración `oauth` con un token de actualización. Utiliza PKCE, una devolución de llamada de localhost en el puerto `http://localhost:8085/oauth2callback` y un flujo manual de copiar/pegar con `--manual`.

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

Guarde el objeto `oauth` bajo la configuración del complemento de Google Meet:

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

Prefiera las variables de entorno cuando no desee el token de actualización en la configuración. Si están presentes tanto los valores de configuración como los del entorno, el complemento resuelve primero la configuración y luego la alternativa del entorno.

El consentimiento de OAuth incluye la creación de espacios de Meet, acceso de lectura a espacios de Meet y acceso de lectura a medios de conferencias de Meet. Si se autenticó antes de que existiera el soporte de creación de reuniones, vuelva a ejecutar `openclaw googlemeet auth login --json` para que el token de actualización tenga el alcance `meetings.space.created`.

### Verificar OAuth con doctor

Ejecute el OAuth doctor cuando desee una verificación de estado rápida y no secreta:

```bash
openclaw googlemeet doctor --oauth --json
```

Esto no carga el tiempo de ejecución de Chrome ni requiere un nodo de Chrome conectado. Verifica que la configuración de OAuth exista y que el token de actualización pueda generar un token de acceso. El informe JSON incluye solo campos de estado como `ok`, `configured`, `tokenSource`, `expiresAt` y mensajes de verificación; no imprime el token de acceso, el token de actualización ni el secreto del cliente.

Resultados comunes:

| Verificación         | Significado                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `oauth-config`       | `oauth.clientId` más `oauth.refreshToken`, o un token de acceso en caché, están presentes.                   |
| `oauth-token`        | El token de acceso en caché sigue siendo válido o el token de actualización generó un nuevo token de acceso. |
| `meet-spaces-get`    | La verificación opcional `--meeting` resolvió un espacio Meet existente.                                     |
| `meet-spaces-create` | La verificación opcional `--create-space` creó un nuevo espacio Meet.                                        |

Para probar la habilitación de la API de Google Meet y el alcance `spaces.create` también, ejecute la
verificación de creación con efectos secundarios:

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` crea una URL Meet desechable. Úsela cuando necesite confirmar
que el proyecto de Google Cloud tiene la API de Meet habilitada y que la cuenta
autorizada tiene el alcance `meetings.space.created`.

Para probar el acceso de lectura a un espacio de reunión existente:

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` y `resolve-space` demuestran el acceso de lectura a un espacio existente al que la cuenta de Google autorizada puede acceder. Un `403` de estas comprobaciones generalmente significa que la API REST de Google Meet está deshabilitada, al token de actualización con consentimiento le falta el alcance requerido, o la cuenta de Google no puede acceder a ese espacio de Meet. Un error de token de actualización significa volver a ejecutar el bloque `openclaw googlemeet auth login
--` and store the new `oauth`.

No se necesitan credenciales de OAuth para la alternativa del navegador. En ese modo, la autenticación de Google proviene del perfil de Chrome con sesión iniciada en el nodo seleccionado, no de la configuración de OpenClaw.

Estas variables de entorno se aceptan como alternativas:

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` o `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` o `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` o `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` o `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` o
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` o `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` o `GOOGLE_MEET_PREVIEW_ACK`

Resuelva una URL de Meet, un código o `spaces/{id}` a través de `spaces.get`:

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

Ejecute la verificación previa antes del trabajo de medios:

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

Enumere los artefactos y la asistencia de la reunión después de que Meet haya creado registros de conferencias:

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

Con `--meeting`, `artifacts` y `attendance` use el registro de conferencia más reciente
de forma predeterminada. Pase `--all-conference-records` cuando desee todos los registros conservados
para esa reunión.

La búsqueda en el calendario puede resolver la URL de la reunión desde Google Calendar antes de leer
los artefactos de Meet:

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` busca en el calendario `primary` de hoy un evento de calendario con un
enlace de Google Meet. Use `--event <query>` para buscar texto de evento coincidente y
`--calendar <id>` para un calendario no principal. La búsqueda en el calendario requiere un inicio de sesión
OAuth fresco que incluya el alcance de solo lectura de eventos de Calendar.
`calendar-events` previsualiza los eventos de Meet coincidentes y marca el evento que
`latest`, `artifacts`, `attendance` o `export` elegirán.

Si ya conoce el ID del registro de la conferencia, diríjase directamente a él:

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

Finalice una conferencia activa para un espacio creado por API cuando desee cerrar la
sala después de la llamada:

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

Esto llama a Google Meet `spaces.endActiveConference` y requiere OAuth con el
alcance `meetings.space.created` para un espacio que la cuenta autorizada pueda gestionar.
OpenClaw acepta una URL de Meet, un código de reunión o una entrada `spaces/{id}` y la resuelve
en el recurso de espacio de la API antes de finalizar la conferencia activa.
Es diferente de `googlemeet leave`: `leave` detiene la participación local/de sesión
de OpenClaw, mientras que `end-active-conference` pide a Google Meet que finalice la
conferencia activa para el espacio.

Escribir un informe legible:

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

`artifacts` devuelve metadatos del registro de la conferencia más metadatos de recursos de participantes, grabaciones,
transcripciones, entradas de transcripciones estructuradas y notas inteligentes cuando
Google las expone para la reunión. Use `--no-transcript-entries` para omitir
la búsqueda de entradas en reuniones grandes. `attendance` expande los participantes en
filas de sesión de participante con horas de primera/última visualización, duración total de la sesión,
indicadores de salida tardía/temprana y recursos de participantes duplicados fusionados por usuario
con sesión iniciada o nombre para mostrar. Pase `--no-merge-duplicates` para mantener los recursos de participantes
en bruto separados, `--late-after-minutes` para ajustar la detección de tardanza y
`--early-before-minutes` para ajustar la detección de salida temprana.

`export` escribe una carpeta que contiene `summary.md`, `attendance.csv`,
`transcript.md`, `artifacts.json`, `attendance.json` y `manifest.json`.
`manifest.json` registra la entrada elegida, opciones de exportación, registros de la conferencia,
archivos de salida, recuentos, origen del token, evento de Calendar cuando se usó uno y cualquier
advertencia de recuperación parcial. Pase `--zip` para también escribir un archivo portátil al lado
de la carpeta. Pase `--include-doc-bodies` para exportar la transcripción vinculada y
el texto de notas inteligentes de Google Docs a través de Google Drive `files.export`; esto requiere un
inicio de sesión OAuth nuevo que incluya el alcance de solo lectura de Drive Meet. Sin
`--include-doc-bodies`, las exportaciones incluyen solo metadatos de Meet y entradas de transcripción
estructuradas. Si Google devuelve un fallo parcial de artefacto, como un listado de nota inteligente,
entrada de transcripción o error de cuerpo de documento de Drive, el resumen y
el manifiesto mantienen la advertencia en lugar de fallar toda la exportación.
Use `--dry-run` para obtener los mismos datos de artefacto/asistencia e imprimir el
JSON del manifiesto sin crear la carpeta o ZIP. Eso es útil antes de escribir
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

Establezca `"dryRun": true` para devolver solo el manifiesto de exportación y omitir la escritura de archivos.

Y también pueden crear una sala respaldada por API con una política de acceso explícita:

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

Y pueden finalizar la conferencia activa para una sala conocida:

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

Para la validación de escuchar primero, los agentes deben usar `test_listen` antes de afirmar que
la reunión es útil:

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

Ejecute el smoke test en vivo protegido contra una reunión real retenida:

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

Ejecute la sonda del navegador de escuchar primero en vivo contra una reunión donde alguien
hable con subtítulos de Meet disponibles:

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

Entorno de smoke test en vivo:

- `OPENCLAW_LIVE_TEST=1` habilita pruebas en vivo protegidas.
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` apunta a una URL de Meet retenida, código o
  `spaces/{id}`.
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` o `GOOGLE_MEET_CLIENT_ID` proporciona el id de
  cliente OAuth.
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` o `GOOGLE_MEET_REFRESH_TOKEN` proporciona
  el token de actualización.
- Opcional: `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`,
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` y
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` usan los mismos nombres de reserva
  sin el prefijo `OPENCLAW_`.

La prueba de humo en vivo base de artefacto/asistencia necesita
`https://www.googleapis.com/auth/meetings.space.readonly` y
`https://www.googleapis.com/auth/meetings.conference.media.readonly`. La búsqueda
de calendario necesita `https://www.googleapis.com/auth/calendar.events.readonly`. La exportación
del cuerpo del documento de Drive necesita
`https://www.googleapis.com/auth/drive.meet.readonly`.

Cree un espacio de Meet nuevo:

```bash
openclaw googlemeet create
```

El comando imprime el nuevo `meeting uri`, la fuente y la sesión de unión. Con las credenciales
OAuth, utiliza la API oficial de Google Meet. Sin credenciales OAuth,
utiliza el perfil del navegador conectado del nodo Chrome anclado como alternativa. Los agentes pueden
usar la herramienta `google_meet` con `action: "create"` para crear y unirse en un
solo paso. Para la creación solo de URL, pase `"join": false`.

Salida JSON de ejemplo de la alternativa del navegador:

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

Cuando un agente ve `manualActionRequired: true`, debe reportar el
`manualActionMessage` además del contexto del nodo/pestaña del navegador y dejar de abrir nuevas
pestañas de Meet hasta que el operador complete el paso del navegador.

Salida JSON de ejemplo de la creación de API:

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

Crear un Meet se une por defecto. El transporte Chrome o Chrome-node aún
necesita un perfil de Google Chrome conectado para unirse a través del navegador. Si el
perfil está desconectado, OpenClaw reporta `manualActionRequired: true` o un
error de alternativa del navegador y pide al operador que termine el inicio de sesión de Google antes
de reintentar.

Establezca `preview.enrollmentAcknowledged: true` solo después de confirmar que su proyecto de Cloud,
el principal de OAuth y los participantes de la reunión están inscritos en el Programa
de vista previa para desarrolladores de Google Workspace para las API de medios de Meet.

## Config

La ruta común del agente de Chrome solo necesita que el complemento esté habilitado, BlackHole, SoX, una clave de proveedor de transcripción en tiempo real y un proveedor OpenClaw TTS configurado.
OpenAI es el proveedor de transcripción predeterminado; configure `realtime.voiceProvider` en
`"google"` y `realtime.model` para usar Google Gemini Live para el modo `bidi`
sin cambiar el proveedor de transcripción del modo de agente predeterminado:

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

Establezca la configuración del complemento en `plugins.entries.google-meet.config`:

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
- `defaultMode: "agent"` (`"realtime"` solo se acepta como un alias
  de compatibilidad heredado para `"agent"`; las nuevas llamadas a herramientas deben indicar `"agent"`)
- `chromeNode.node`: id/nombre/IP de nodo opcional para `chrome-node`
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`: nombre utilizado en la pantalla de invitado de Meet sin sesión
  iniciada
- `chrome.autoJoin: true`: llenado del nombre de invitado con el mejor esfuerzo y clic en Unirse ahora a
  través de la automatización del navegador OpenClaw en `chrome-node`
- `chrome.reuseExistingTab: true`: activar una pestaña Meet existente en lugar de
  abrir duplicados
- `chrome.waitForInCallMs: 20000`: esperar a que la pestaña Meet informe que está en la llamada
  antes de que se active la introducción de conversación
- `chrome.audioFormat: "pcm16-24khz"`: formato de audio de par de comandos. Use
  `"g711-ulaw-8khz"` solo para pares de comandos heredados/personalizados que todavía emiten
  audio de telefonía.
- `chrome.audioBufferBytes: 4096`: búfer de procesamiento de SoX para los comandos de audio
  de pares de comandos de Chrome generados. Esto es la mitad del búfer predeterminado
  de 8192 bytes de SoX, lo que reduce la latencia predeterminada de la tubería (pipe)
  mientras deja espacio para aumentarla en hosts ocupados. Los valores por debajo
  del mínimo de SoX se limitan a 17 bytes.
- `chrome.audioInputCommand`: comando SoX que lee de CoreAudio `BlackHole 2ch`
  y escribe audio en `chrome.audioFormat`
- `chrome.audioOutputCommand`: comando SoX que lee audio en `chrome.audioFormat`
  y escribe en CoreAudio `BlackHole 2ch`
- `chrome.bargeInInputCommand`: comando opcional de micrófono local que escribe
  PCM mono little-endian de 16 bits con signo para la detección de intervención
  humana (barge-in) mientras la reproducción del asistente está activa. Actualmente
  esto se aplica al puente de pares de comandos `chrome`
  alojado en el Gateway.
- `chrome.bargeInRmsThreshold: 650`: nivel RMS que cuenta como una interrupción humana en `chrome.bargeInInputCommand`
- `chrome.bargeInPeakThreshold: 2500`: nivel pico que cuenta como una interrupción humana en `chrome.bargeInInputCommand`
- `chrome.bargeInCooldownMs: 900`: retraso mínimo entre borrados repetidos de interrupciones humanas
- `mode: "agent"`: modo de retorno de voz predeterminado. El habla del participante es transcrita por el proveedor de transcripción en tiempo real configurado, enviada al agente OpenClaw configurado en una sesión de subagente por reunión y dicha nuevamente a través del tiempo de ejecución TTS normal de OpenClaw.
- `mode: "bidi"`: modo de modelo en tiempo real bidireccional directo de respaldo. El proveedor de voz en tiempo real responde directamente al habla del participante y puede llamar a `openclaw_agent_consult` para respuestas más profundas o respaldadas por herramientas.
- `mode: "transcribe"`: modo de solo observación sin el puente de conversación bidireccional.
- `realtime.provider: "openai"`: reserva de compatibilidad utilizada cuando los campos del proveedor con ámbito a continuación no están establecidos.
- `realtime.transcriptionProvider: "openai"`: ID del proveedor utilizado por el modo `agent`
  para la transcripción en tiempo real.
- `realtime.voiceProvider`: ID del proveedor utilizado por el modo `bidi` para voz en tiempo real
  directa. Establézcalo en `"google"` para usar Gemini Live manteniendo la transcripción
  del modo de agente en OpenAI.
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`: respuestas habladas breves, con
  `openclaw_agent_consult` para respuestas más profundas
- `realtime.introMessage`: verificación de lista hablada breve cuando se conecta el puente en tiempo real;
  establézcalo en `""` para unirse en silencio
- `realtime.agentId`: id de agente opcional de OpenClaw para
  `openclaw_agent_consult`; por defecto es `main`

Overrides opcionales:

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
    bargeInInputCommand: ["sox", "-q", "-t", "coreaudio", "External Microphone", "-r", "24000", "-c", "1", "-b", "16", "-e", "signed-integer", "-t", "raw", "-"],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        voice: "Kore",
      },
    },
  },
}
```

ElevenLabs tanto para el habla como para la escucha en modo agente:

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          modelId: "eleven_v3",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
        },
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

La voz persistente de Meet proviene de
`messages.tts.providers.elevenlabs.voiceId`. Las respuestas del agente también pueden usar
directivas `[[tts:voiceId=... model=eleven_v3]]` por respuesta cuando las
sustituciones del modelo TTS están activadas, pero la configuración es el
valor predeterminado determinista para las reuniones.
Al unirse, los registros deberían mostrar `transcriptionProvider=elevenlabs` y cada
respuesta hablada debería registrar `provider=elevenlabs model=eleven_v3 voice=<voiceId>`.

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

`voiceCall.enabled` tiene como valor predeterminado `true`; con el transporte Twilio delega la
llamada PSTN real, DTMF y el saludo inicial al complemento Voice Call. Voice Call
reproduce la secuencia DTMF antes de abrir el flujo de medios en tiempo real y luego usa el
texto de introducción guardado como el saludo inicial en tiempo real. Si `voice-call` no está
habilitado, Google Meet aún puede validar y registrar el plan de marcado, pero no puede
realizar la llamada Twilio.

## Herramienta

Los agentes pueden utilizar la herramienta `google_meet`:

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

Use `transport: "chrome"` cuando Chrome se ejecuta en el host de Gateway. Use
`transport: "chrome-node"` cuando Chrome se ejecuta en un nodo emparejado como una máquina
virtual Parallels. En ambos casos, los proveedores de modelos y `openclaw_agent_consult` se ejecutan en el
host de Gateway, por lo que las credenciales del modelo permanecen allí. Con el valor predeterminado `mode: "agent"`,
el proveedor de transcripción en tiempo real maneja la escucha, el agente OpenClaw
configurado produce la respuesta y OpenClaw TTS habitual la pronuncia en Meet. Use
`mode: "bidi"` cuando desee que el modelo de voz en tiempo real responda directamente.
Raw `mode: "realtime"` sigue aceptándose como alias de compatibilidad heredado para
`mode: "agent"`, pero ya no se anuncia en el esquema de herramientas del agente.
Los registros en modo agente incluyen el proveedor/modelo de transcripción resuelto en el inicio
del puente, así como el proveedor de TTS, el modelo, la voz, el formato de salida y la frecuencia de muestreo después
de cada respuesta sintetizada.

Use `action: "status"` para listar las sesiones activas o inspeccionar un ID de sesión. Use `action: "speak"` con `sessionId` y `message` para hacer que el agente en tiempo real hable inmediatamente. Use `action: "test_speech"` para crear o reutilizar la sesión, activar una frase conocida y devolver el estado de salud de `inCall` cuando el host de Chrome pueda reportarlo. `test_speech` siempre fuerza `mode: "agent"` y falla si se le pide ejecutarse en `mode: "transcribe"` porque las sesiones de solo observación intencionalmente no pueden emitir voz. Su resultado de `speechOutputVerified` se basa en el aumento de los bytes de salida de audio en tiempo real durante esta llamada de prueba, por lo que una sesión reutilizada con audio antiguo no cuenta como una verificación de voz exitosa reciente. Use `action: "leave"` para marcar una sesión como finalizada.

`status` incluye el estado de Chrome cuando está disponible:

- `inCall`: Chrome parece estar dentro de la llamada Meet
- `micMuted`: estado del micrófono de Meet con mejor esfuerzo
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`: el
  perfil del navegador necesita inicio de sesión manual, admisión del anfitrión de Meet, permisos o
  reparación del control del navegador antes de que el habla pueda funcionar
- `speechReady` / `speechBlockedReason` / `speechBlockedMessage`: si
  se permite el habla administrada de Chrome ahora. `speechReady: false` significa que OpenClaw no
  envió la frase de introducción/prueba al puente de audio.
- `providerConnected` / `realtimeReady`: estado del puente de voz en tiempo real
- `lastInputAt` / `lastOutputAt`: último audio visto desde o enviado al puente
- `audioOutputRouted` / `audioOutputDeviceLabel`: si la salida de medios de la pestaña de Meet se enrutó activamente al dispositivo BlackHole utilizado por el puente
- `lastSuppressedInputAt` / `suppressedInputBytes`: entrada de bucle invertido ignorada mientras la reproducción del asistente está activa

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## Modos de agente y bidi

El modo `agent` de Chrome está optimizado para el comportamiento "mi agente está en la reunión". El proveedor de transcripción en tiempo real escucha el audio de la reunión, las transcripciones finales de los participantes se enrutan a través del agente OpenClaw configurado y la respuesta se pronuncia a través del tiempo de ejecución TTS normal de OpenClaw. Configure `mode: "bidi"` cuando desee que el modelo de voz en tiempo real responda directamente.
Los fragmentos de transcripción finales cercanos se combinan antes de la consulta para que un turno hablado no produzca varias respuestas parciales obsoletas. La entrada en tiempo real también se suprime mientras el audio del asistente en cola todavía se está reproduciendo, y los ecos de transcripción recientes que parecen de asistente se ignoran antes de la consulta del agente para que el bucle de retorno BlackHole no haga que el agente responda a su propio discurso.

| Modo    | Quién decide la respuesta       | Ruta de salida de voz                                  | Usar cuando                                                |
| ------- | ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `agent` | El agente OpenClaw configurado  | Tiempo de ejecución TTS normal de OpenClaw             | Desea el comportamiento "mi agente está en la reunión"     |
| `bidi`  | El modelo de voz en tiempo real | Respuesta de audio del proveedor de voz en tiempo real | Desea el bucle de voz conversacional con la menor latencia |

En el modo `bidi`, cuando el modelo en tiempo real necesita un razonamiento más profundo, información actual o herramientas normales de OpenClaw, puede llamar a `openclaw_agent_consult`.

La herramienta de consulta ejecuta el agente regular de OpenClaw en segundo plano con el contexto de la transcripción de la reunión reciente y devuelve una respuesta hablada concisa. En el modo `agent`, OpenClaw envía esa respuesta directamente al tiempo de ejecución de TTS; en el modo `bidi`, el modelo de voz en tiempo real puede pronunciar el resultado de la consulta nuevamente en la reunión. Utiliza la misma maquinaria de consulta compartida que la llamada de voz.

De manera predeterminada, las consultas se ejecutan contra el agente `main`. Establezca `realtime.agentId` cuando un carril de Meet deba consultar un espacio de trabajo dedicado del agente OpenClaw, valores predeterminados del modelo, política de herramientas, memoria e historial de sesiones.

Las consultas en modo agente utilizan una clave de sesión `agent:<id>:subagent:google-meet:<session>` por reunión, de modo que las preguntas de seguimiento mantengan el contexto de la reunión mientras heredan la política de agente normal del agente configurado.

`realtime.toolPolicy` controla la ejecución de la consulta:

- `safe-read-only`: exponga la herramienta de consulta y limite el agente regular a
  `read`, `web_search`, `web_fetch`, `x_search`, `memory_search` y
  `memory_get`.
- `owner`: expone la herramienta de consulta y permite que el agente regular use la política normal de herramientas del agente.
- `none`: no exponga la herramienta de consulta al modelo de voz en tiempo real.

La clave de sesión de consulta tiene ámbito por sesión de Meet, por lo que las llamadas de consulta de seguimiento pueden reutilizar el contexto de consulta anterior durante la misma reunión.

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

## Lista de verificación de prueba en vivo

Use esta secuencia antes de entregar una reunión a un agente no atendido:

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

Estado esperado del nodo Chrome:

- `googlemeet setup` está todo en verde.
- `googlemeet setup` incluye `chrome-node-connected` cuando Chrome-node es el transporte predeterminado o un nodo está fijado.
- `nodes status` muestra el nodo seleccionado conectado.
- El nodo seleccionado anuncia tanto `googlemeet.chrome` como `browser.proxy`.
- La pestaña Meet se une a la llamada y `test-speech` devuelve el estado de salud de Chrome con
  `inCall: true`.

Para un host de Chrome remoto como una máquina virtual macOS de Parallels, esta es la verificación
segura más corta después de actualizar el Gateway o la VM:

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

Eso demuestra que el complemento del Gateway está cargado, que el nodo de la VM está conectado con el
token actual y que el puente de audio de Meet está disponible antes de que un agente abra una
pestaña de reunión real.

Para una prueba de humo de Twilio, use una reunión que exponga los detalles de acceso telefónico:

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

Estado esperado de Twilio:

- `googlemeet setup` incluye verificaciones `twilio-voice-call-plugin` verdes,
  `twilio-voice-call-credentials` y `twilio-voice-call-webhook`.
- `voicecall` está disponible en la CLI después de recargar el Gateway.
- La sesión devuelta tiene `transport: "twilio"` y un `twilio.voiceCallId`.
- `openclaw logs --follow` muestra el TwiML DTMF servido antes del TwiML en tiempo real, luego un puente en tiempo real con el saludo inicial en cola.
- `googlemeet leave <sessionId>` cuelga la llamada de voz delegada.

## Solución de problemas

### El agente no puede ver la herramienta de Google Meet

Confirme que el complemento esté habilitado en la configuración de Gateway y recargue el Gateway:

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

Si acaba de editar `plugins.entries.google-meet`, reinicie o recargue el Gateway.
El agente en ejecución solo ve las herramientas de complemento registradas por el proceso actual de Gateway.

En hosts de Gateway que no sean macOS, la herramienta `google_meet` orientada al agente permanece visible,
pero las acciones de conversación local de Chrome se bloquean antes de llegar al puente de audio.
El audio de conversación local de Chrome actualmente depende de macOS `BlackHole 2ch`, por lo que
los agentes de Linux deben usar `mode: "transcribe"`, Twilio dial-in, o un host
macOS `chrome-node` en lugar de la ruta predeterminada del agente local de Chrome.

### Ningún nodo conectado compatible con Google Meet

En el host del nodo, ejecute:

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

En el host de Gateway, apruebe el nodo y verifique los comandos:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

El nodo debe estar conectado y listar `googlemeet.chrome` más `browser.proxy`.
La configuración de Gateway debe permitir esos comandos de nodo:

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

Si `googlemeet setup` falla `chrome-node-connected` o el registro de Gateway informa
`gateway token mismatch`, reinstale o reinicie el nodo con el token de Gateway
actual. Para una Gateway de LAN esto generalmente significa:

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

Ejecute `googlemeet test-listen` para uniones de solo observación o `googlemeet test-speech`
para uniones en tiempo real, luego inspeccione el estado de salud de Chrome devuelto. Si alguna sonda
informa `manualActionRequired: true`, muestre `manualActionMessage` al operador
y deje de reintentar hasta que se complete la acción del navegador.

Acciones manuales comunes:

- Inicie sesión en el perfil de Chrome.
- Admita al invitado desde la cuenta de anfitrión de Meet.
- Otorgue permisos de micrófono/cámara a Chrome cuando aparezca el mensaje
  de permiso nativo de Chrome.
- Cierre o repare un cuadro de diálogo de permisos de Meet atascado.

No informes "not signed in" (no has iniciado sesión) solo porque Meet muestre "Do you want people to hear you in the meeting?" (¿Quieres que la gente te escuche en la reunión?). Ese es el intersticial de elección de audio de Meet; OpenClaw hace clic en **Use microphone** (Usar micrófono) mediante la automatización del navegador cuando está disponible y sigue esperando el estado real de la reunión. Para la alternativa de navegador de solo creación, OpenClaw puede hacer clic en **Continue without microphone** (Continuar sin micrófono) porque la creación de la URL no necesita la ruta de audio en tiempo real.

### Fallo en la creación de la reunión

`googlemeet create` primero usa el punto final `spaces.create` de la API de Google Meet
cuando las credenciales de OAuth están configuradas. Sin las credenciales de OAuth, recurre
al navegador del nodo de Chrome anclado. Confirmar:

- Para la creación mediante API: `oauth.clientId` y `oauth.refreshToken` están configurados,
  o están presentes las variables de entorno `OPENCLAW_GOOGLE_MEET_*` correspondientes.
- Para la creación a través de la API: el token de actualización se generó después de añadirse la compatibilidad de creación. Los tokens antiguos pueden carecer del alcance `meetings.space.created`; vuelve a ejecutar `openclaw googlemeet auth login --json` y actualiza la configuración del complemento.
- Para la reserva del navegador: `defaultTransport: "chrome-node"` y
  `chromeNode.node` apuntan a un nodo conectado con `browser.proxy` y
  `googlemeet.chrome`.
- Para la reserva del navegador: el perfil de OpenClaw Chrome en ese nodo ha iniciado sesión
  en Google y puede abrir `https://meet.google.com/new`.
- Para la reserva del navegador: los reintentos reutilizan una pestaña `https://meet.google.com/new`
  existente o de aviso de cuenta de Google antes de abrir una pestaña nueva. Si un agente expira el tiempo de espera,
  reintenta la llamada a la herramienta en lugar de abrir manualmente otra pestaña de Meet.
- Para la alternativa del navegador: si la herramienta devuelve `manualActionRequired: true`, use
  los `browser.nodeId`, `browser.targetId`, `browserUrl` y
  `manualActionMessage` devueltos para guiar al operador. No reintente en un bucle hasta que esa
  acción se complete.
- Para la alternativa del navegador: si Meet muestra "¿Quieres que la gente te oiga en la
  reunión?", deja la pestaña abierta. OpenClaw debe hacer clic en **Usar micrófono** o, para
  la alternativa de solo creación, **Continuar sin micrófono** a través de la automatización del
  navegador y seguir esperando a que se genere la URL de Meet. Si no puede hacerlo, el
  error debería mencionar `meet-audio-choice-required`, no `google-login-required`.

### El agente se une pero no habla

Comprueba la ruta en tiempo real:

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

Use `mode: "agent"` para la ruta normal de conversación STT -> agente OpenClaw -> TTS,
o `mode: "bidi"` para la reserva de voz en tiempo real directa. `mode: "transcribe"`
intencionalmente no inicia el puente de conversación. Para la depuración solo de observación,
ejecute `openclaw googlemeet status --json <session-id>` después de que hablen los participantes
y verifique `captioning`, `transcriptLines` y `lastCaptionText`. Si `inCall` es
verdadero pero `transcriptLines` se mantiene en `0`, es posible que los subtítulos de Meet estén deshabilitados, nadie
ha hablado desde que se instaló el observador, la interfaz de usuario de Meet cambió, o los subtítulos
en vivo no están disponibles para el idioma/cuenta de la reunión.

`googlemeet test-speech` siempre verifica la ruta en tiempo real e informa si se observaron bytes de salida del puente para esa invocación. Si `speechOutputVerified` es falso y `speechOutputTimedOut` es verdadero, el proveedor en tiempo real puede haber aceptado la emisión, pero OpenClaw no vio nuevos bytes de salida llegar al puente de audio de Chrome.

Además, verifique:

- Una clave de proveedor en tiempo real está disponible en el host de Gateway, tal como `OPENAI_API_KEY` o `GEMINI_API_KEY`.
- `BlackHole 2ch` es visible en el host de Chrome.
- `sox` existe en el host de Chrome.
- El micrófono y el altavoz de Meet se enrutan a través de la ruta de audio virtual utilizada por OpenClaw. `doctor` debería mostrar `meet output routed: yes` para uniones en tiempo real locales de Chrome.

`googlemeet doctor [session-id]` imprime la sesión, el nodo, el estado en llamada,
el motivo de la acción manual, la conexión del proveedor en tiempo real, `realtimeReady`, la actividad
de entrada/salida de audio, las marcas de tiempo del último audio, los contadores de bytes y la URL del navegador.
Use `googlemeet status [session-id] --json` cuando necesite el JSON sin procesar. Use
`googlemeet doctor --oauth` cuando necesite verificar la actualización de OAuth de Google Meet
sin exponer los tokens; agregue `--meeting` o `--create-space` cuando también necesite
una prueba de la API de Google Meet.

Si un agente agotó el tiempo de espera y puede ver una pestaña de Meet ya abierta, inspeccione esa pestaña
sin abrir otra:

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

La acción de herramienta equivalente es `recover_current_tab`. Enfoca e inspecciona una
pestaña de Meet existente para el transporte seleccionado. Con `chrome`, utiliza el control
local del navegador a través de Gateway; con `chrome-node`, utiliza el nodo de
Chrome configurado. No abre una nueva pestaña ni crea una nueva sesión; informa del
bloqueador actual, como el estado de inicio de sesión, admisión, permisos o elección de audio.
El comando de la CLI se comunica con el Gateway configurado, por lo que el Gateway debe estar ejecutándose;
`chrome-node` también requiere que el nodo de Chrome esté conectado.

### Fallo en las comprobaciones de configuración de Twilio

`twilio-voice-call-plugin` falla cuando `voice-call` no está permitido o no está habilitado.
Agréguelo a `plugins.allow`, habilite `plugins.entries.voice-call` y recargue el
Gateway.

`twilio-voice-call-credentials` falla cuando al backend de Twilio le falta el SID de
cuenta, el token de autenticación o el número de llamada. Establézcalos en el host del Gateway:

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

`twilio-voice-call-webhook` falla cuando `voice-call` no tiene exposición pública de
webhook, o cuando `publicUrl` apunta a un espacio de red de bucle local o privado.
Establezca `plugins.entries.voice-call.config.publicUrl` en la URL pública del proveedor o
configure una exposición de túnel/Tailscale `voice-call`.

Las URLs de bucle de retorno y privadas no son válidas para las devoluciones de llamada del operador. No use
`localhost`, `127.0.0.1`, `0.0.0.0`, `10.x`, `172.16.x`-`172.31.x`,
`192.168.x`, `169.254.x`, `fc00::/7`, o `fd00::/8` como `publicUrl`.

Para obtener una URL pública estable:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

Para el desarrollo local, utilice un túnel o una exposición a Tailscale en lugar de una
URL de host privado:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

Luego, reinicie o recargue el Gateway y ejecute:

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` es solo de preparación de forma predeterminada. Para realizar una prueba en seco de un número específico:

```bash
openclaw voicecall smoke --to "+15555550123"
```

Solo agregue `--yes` cuando intencionalmente desee realizar una
llamada de notificación saliente en vivo:

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### La llamada de Twilio se inicia pero nunca ingresa a la reunión

Confirme que el evento de Meet exponga los detalles de acceso telefónico. Pase el número
de acceso exacto y el PIN o una secuencia DTMF personalizada:

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

Use `w` iniciales o comas en `--dtmf-sequence` si el proveedor necesita
una pausa antes de ingresar el PIN.

Si se crea la llamada telefónica pero la lista de Meet nunca muestra al participante
que accede por teléfono:

- Ejecute `openclaw googlemeet doctor <session-id>` para confirmar el ID de llamada delegada de
  Twilio, si se puso en cola el DTMF y si se solicitó el saludo inicial.
- Ejecute `openclaw voicecall status --call-id <id>` y confirme que la llamada sigue
  activa.
- Ejecute `openclaw voicecall tail` y compruebe que los webhooks de Twilio están llegando
  al Gateway.
- Ejecute `openclaw logs --follow` y busque la secuencia de Twilio Meet: Google
  Meet delega la unión, Voice Call almacena y sirve el TwiML DTMF de preconexión,
  Voice Call sirve el TwiML en tiempo real para la llamada de Twilio y, luego, Google Meet solicita
  el discurso de introducción con `voicecall.speak`.
- Vuelva a ejecutar `openclaw googlemeet setup --transport twilio`; se requiere una comprobación de configuración
  en verde, pero esto no prueba que la secuencia del PIN de la reunión sea correcta.
- Confirme que el número de acceso telefónico pertenece a la misma invitación y región de Meet
  que el PIN.
- Aumente `voiceCall.dtmfDelayMs` desde el valor predeterminado de 12 segundos si Meet responde
  lentamente o si la transcripción de la llamada aún muestra el mensaje que solicita el PIN después
  de haber enviado el DTMF de preconexión.
- Si el participante se une pero no escuchas el saludo, verifica
  `openclaw logs --follow` para la solicitud `voicecall.speak` posterior al DTMF y
  ya sea la reproducción TTS del flujo de medios o la alternativa de Twilio `<Say>`. Si la transcripción de la llamada
  todavía contiene "ingrese el PIN de la reunión", la llamada telefónica aún no se ha unido
  a la sala de Meet, por lo que los participantes de la reunión no escucharán el habla.

Si los webhooks no llegan, depura primero el complemento de llamada de voz: el proveedor debe
alcanzar `plugins.entries.voice-call.config.publicUrl` o el túnel configurado.
Consulta [Solución de problemas de llamada de voz](/es/plugins/voice-call#troubleshooting).

## Notas

La API de medios oficial de Google Meet está orientada a la recepción, por lo que hablar en una llamada de Meet
todavía necesita una ruta de participante. Este complemento mantiene visible ese límite:
Chrome maneja la participación del navegador y el enrutamiento de audio local; Twilio maneja
la participación de marcación telefónica.

Los modos de retroalimentación de voz de Chrome necesitan `BlackHole 2ch` más cualquiera de:

- `chrome.audioInputCommand` más `chrome.audioOutputCommand`: OpenClaw posee el
  puente y canaliza el audio en `chrome.audioFormat` entre esos comandos y el
  proveedor seleccionado. El modo de agente usa transcripción en tiempo real más TTS regular;
  el modo bidi usa el proveedor de voz en tiempo real. La ruta predeterminada de Chrome es PCM16 de 24 kHz
  con `chrome.audioBufferBytes: 4096`; G.711 mu-law de 8 kHz permanece
  disponible para pares de comandos heredados.
- `chrome.audioBridgeCommand`: un comando de puente externo posee toda la ruta de
  audio local y debe salir después de iniciar o validar su demonio. Esto solo es
  válido para `bidi` porque el modo `agent` necesita acceso directo al par de comandos para TTS.

Cuando un agente llama a la herramienta `google_meet` en el modo de agente, la sesión del asesor de la reunión
bifurca la transcripción actual de la persona que llama antes de responder al habla del
participante. La sesión de Meet permanece separada (`agent:<agentId>:subagent:google-meet:<sessionId>`)
para que los seguimientos de la reunión no modifiquen directamente la transcripción de la persona que llama.

Para un audio dúplex limpio, enruta la salida de Meet y el micrófono de Meet a través de dispositivos
virtuales separados o un gráfico de dispositivos virtuales estilo Loopback. Un solo dispositivo
BlackHole compartido puede hacer eco de otros participantes de vuelta a la llamada.

Con el puente Chrome de par de comandos, `chrome.bargeInInputCommand` puede escuchar un
micrófono local separado y borrar la reproducción del asistente cuando el humano
comienza a hablar. Esto mantiene el habla humana por delante de la salida del
asistente incluso cuando la entrada de bucle invertido compartida de BlackHole
está temporalmente suprimida durante la reproducción del asistente. Al igual que
`chrome.audioInputCommand` y `chrome.audioOutputCommand`, es un comando local
configurado por el operador. Utilice una ruta de comando o una lista de
argumentos confiable explícita, y no lo dirija a scripts de ubicaciones no
confiables.

`googlemeet speak` activa el puente de audio de conversación activo para
una sesión de Chrome. `googlemeet leave` detiene ese puente. Para las sesiones
de Twilio delegadas a través del complemento Voice Call, `leave`
también cuelga la llamada de voz subyacente. Use `googlemeet end-active-conference`
cuando también desee cerrar la conferencia activa de Google Meet para un espacio
administrado por API.

## Relacionado

- [Complemento de llamada de voz](/es/plugins/voice-call)
- [Modo de conversación](/es/nodes/talk)
- [Construcción de complementos](/es/plugins/building-plugins)
