---
summary: "Complemento Meeting Notes: capturar transcripciones de voz de Discord y fuentes de reuniones importadas, y luego escribir resúmenes"
read_when:
  - You want OpenClaw to take meeting notes
  - You are wiring Discord voice, Google Meet, Slack huddles, or another meeting source into notes
  - You need the meeting_notes tool contract
title: "Complemento Meeting Notes"
---

El complemento Meeting Notes es la capa de notas genérica para llamadas en vivo y transcripciones
de reuniones importadas. Administra el almacenamiento de transcripciones, la representación de resúmenes y la
herramienta `meeting_notes`. Los complementos de canal administran la captura, la autenticación y el
acceso a reuniones específicas de la plataforma.

Use esta página cuando desee que OpenClaw capture notas de voz de Discord hoy, cuando
desee importar una transcripción de otro sistema de reuniones, o cuando esté
creando un proveedor de fuente de Google Meet, Slack huddle, Zoom o propiedad de calendario.

## Modelo de fuente

Las fuentes de reuniones registran `meetingNotesSourceProviders` a través del SDK del complemento.
El primer proveedor en vivo es `discord-voice`; el proveedor `manual-transcript`
incorporado importa transcripciones posteriores a la reunión.

- `live-audio`: la fuente se une o escucha una llamada y transmite las expresiones finales.
- `live-caption`: la fuente lee subtítulos de un navegador o superficie de reunión.
- `posthoc-transcript`: la fuente importa una transcripción o artefacto de notas después de la reunión.
- `recording-stt`: la fuente transcribe una grabación antes de importar las expresiones.

Esto mantiene a Discord, Google Meet, las reuniones de Slack y las superficies de reuniones futuras fuera
del motor de notas. Cada fuente suministra expresiones etiquetadas con el hablante; Meeting
Notes escribe los artefactos y el resumen.

## Instalar y habilitar

Meeting Notes es un complemento de fuente externo en este repositorio. No es parte de
el paquete npm central de OpenClaw y solo está disponible cuando el complemento está
instalado como complemento o cargado desde una fuente de pago que contiene
`extensions/meeting-notes`.

Una vez que se carga el complemento, está habilitado de forma predeterminada a menos que uno de estos ajustes
lo bloquee:

- `plugins.enabled: false` deshabilita todos los complementos.
- `plugins.deny` contiene `meeting-notes`.
- `plugins.allow` está configurado y no contiene `meeting-notes`.
- `plugins.entries.meeting-notes.enabled: false` deshabilita esta entrada de complemento.
- `plugins.entries.meeting-notes.config.enabled: false` mantiene el complemento cargado
  pero deshabilita la herramienta `meeting_notes` y el servicio de inicio automático.

El archivo de configuración de usuario normal es `~/.openclaw/openclaw.json`. La sección `plugins`
controla la carga de complementos, y el objeto anidado `entries.<pluginId>.config`
se pasa a ese complemento como configuración específica del mismo. Se espera un bloque
`config: { ... }` separado bajo `meeting-notes`; es la forma en que los complementos
reciben sus propias opciones sin agregar claves de configuración principales.

Use esta forma cuando su configuración tenga una lista de permitidos (allowlist) de complementos:

```json5
{
  plugins: {
    allow: ["discord", "meeting-notes"],
    entries: {
      "meeting-notes": {
        enabled: true,
        config: {
          enabled: true,
          maxUtterances: 2000,
          autoStart: [],
        },
      },
    },
  },
}
```

Ejecute una verificación de configuración después de editar:

```bash
openclaw config validate
```

La recarga en caliente (hot reload) de la configuración de Gateway aplica la lista de permitidos de complementos y los cambios de entrada de complementos.
Reinicie el Gateway si también está cambiando el complemento de origen en sí, instalando
nuevos archivos de complemento o cambiando las credenciales de voz de Discord.

## Configuración

Meeting Notes tiene tres campos de configuración de complemento:

- `enabled`: `true` por defecto. Establezca `false` para dejar el complemento instalado pero
  deshabilitar la herramienta y el servicio de inicio automático.
- `maxUtterances`: `2000` por defecto. La generación de resumen lee solo las N
  emisiones más recientes de `transcript.jsonl`; los valores válidos se limitan a `1` a
  `10000`.
- `autoStart`: vacío por defecto. Cada entrada inicia una fuente de notas en vivo cuando el
  Gateway se inicia o recarga el complemento.

Una entrada `autoStart` acepta:

- `providerId`: requerido. Use `discord-voice` para voz de Discord.
- `enabled`: opcional, por defecto `true`. Establezca `false` para mantener una entrada sin
  iniciarla.
- `sessionId`: opcional. Si se omite, OpenClaw genera un id con marca de tiempo.
- `title`: título legible opcional para resúmenes y salida de CLI.
- `accountId`: id de cuenta de origen opcional cuando existe más de una cuenta.
- `guildId`: id de gremio de Discord específico del proveedor.
- `channelId`: ID del canal de voz de Discord específico del proveedor.
- `meetingUrl`: URL de la reunión específica del proveedor para fuentes de navegador o calendario.

Use `autoStart` cuando OpenClaw debe comenzar la captura de notas automáticamente al iniciar la puerta de enlace (gateway):

```json5
{
  plugins: {
    entries: {
      "meeting-notes": {
        config: {
          autoStart: [
            {
              providerId: "discord-voice",
              guildId: "123",
              channelId: "456",
              title: "Weekly planning",
            },
          ],
        },
      },
    },
  },
}
```

El inicio automático reintenta los fallos de inicio hasta 12 veces con un retraso de cinco segundos. Esto permite que el servicio de notas espere a que los complementos de canal, como Discord, terminen de inicializarse. Las sesiones que se iniciaron automáticamente se detienen y resumen cuando el servicio del complemento se detiene correctamente.

La captura de voz de Discord aún necesita la configuración y los permisos normales de voz de Discord. Consulte [Discord voice](/es/channels/discord#voice-mode).

## Voz de Discord

Discord es la primera fuente en vivo. El complemento de Discord es propietario de la conexión de voz, la detección de hablantes, la decodificación de audio y la transcripción. Meeting Notes recibe las expresiones finales etiquetadas con el hablante y las persiste.

Para la captura en vivo de Discord:

- Habilite y configure primero el complemento de Discord.
- Configure el modo de voz de Discord para que OpenClaw pueda unirse al canal de voz de destino.
- Use `providerId: "discord-voice"`.
- Proporcione `guildId` y `channelId`.
- Agregue `accountId` solo cuando ejecuta más de una cuenta de Discord.

El modelo de transcripción no es elegido por Meeting Notes. En el modo de voz `stt-tts` de Discord, STT usa `tools.media.audio`; `voice.model` controla el modelo de respuesta del agente, no la transcripción. En los modos de voz en tiempo real, la transcripción sigue el proveedor y el modelo en tiempo real configurados. Consulte [Discord voice](/es/channels/discord#voice-mode) para obtener información sobre los controles actuales del modelo y el proveedor de voz de Discord.

## Google Meet, agrupaciones de Slack y otras fuentes

Meeting Notes es intencionalmente neutral a la fuente. Google Meet, las agrupaciones de Slack, Zoom, las grabaciones de calendario o la captura de subtítulos del navegador deben ser proveedores de fuentes separados que se registren con el SDK del complemento.

Fuentes recomendadas:

- Soporte en vivo de navegador/subtítulos de Google Meet: implemente un proveedor `live-caption`
  que acepte `meetingUrl` y emita expresiones finales de subtítulos.
- Grabaciones de Google Meet o transcripciones descargadas: implemente
  `posthoc-transcript` o use `manual-transcript` hasta que exista un proveedor.
- Agrupaciones de Slack hoy: importe notas de agrupaciones posteriores a la reunión o artefactos de transcripción.
  Slack no expone una API general de audio de agrupación en vivo para que se unan bots.
- Agrupaciones de Slack más adelante: mantenga el proveedor de fuente propiedad de Slack responsable de
  la autenticación de Slack, la búsqueda de artefactos y la normalización de la transcripción.

El motor de notas no debe contener uniones de plataforma, automatización del navegador, sondeo de la API de Slack
o lógica de voz de Discord. Esas pertenecen al complemento de fuente propietario.

## Herramienta

Use `meeting_notes` con un `action`:

- `status`: listar proveedores registrados y sesiones activas.
- `start`: iniciar una sesión de notas en vivo.
- `stop`: detener una sesión en vivo y escribir `summary.md`.
- `import`: importar una transcripción y escribir `summary.md`.
- `summarize`: regenerar un resumen para una sesión existente.

Las notas en vivo de Discord requieren `providerId: "discord-voice"`, más `guildId` y
`channelId`. `accountId` es opcional cuando solo hay una cuenta de Discord activa.

```json
{
  "action": "start",
  "providerId": "discord-voice",
  "guildId": "123",
  "channelId": "456",
  "title": "Weekly planning"
}
```

Detener por id de sesión:

```json
{
  "action": "stop",
  "sessionId": "meeting-2026-05-22T10-00-00-000Z-a1b2c3d4"
}
```

Importar una transcripción:

```json
{
  "action": "import",
  "providerId": "manual-transcript",
  "title": "Design review",
  "transcript": "Alex: We decided to ship the Discord source first.\nSam: Action item: add Slack huddle import later."
}
```

`manual-transcript` divide el texto de transcripción sin formato en enunciados. Úselo para
notas de Google Meet copiadas, resúmenes de agrupaciones de Slack, transcripciones de calendario o cualquier
fuente que ya haya producido texto.

## Diseño de almacenamiento

Los artefactos se almacenan en el directorio de estado de OpenClaw:

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

Si `OPENCLAW_STATE_DIR` no está establecido, el directorio de estado predeterminado es
`~/.openclaw`. Por lo tanto, una instalación local normal escribe notas bajo
`~/.openclaw/meeting-notes/...`.

Cada archivo tiene un trabajo:

- `metadata.json`: id de sesión, proveedor de fuente, título, hora de inicio, hora de detención
  y metadatos del proveedor.
- `transcript.jsonl`: enunciados del hablante de solo anexión. Cada línea es un objeto JSON
  con el texto del enunciado y el id de sesión.
- `summary.json`: datos de resumen estructurados utilizados por herramientas, incluida la
  ventana de transcripción etiquetada por hablante utilizada para el resumen generado.
- `summary.md`: notas legibles por humanos para terminales, editores y flujos de trabajo de documentos, incluyendo una sección de transcripción etiquetada por hablante.

El directorio de fecha proviene de la hora de inicio de la sesión, por lo que múltiples reuniones por día se mantienen agrupadas. Si un id de sesión humano se repite durante varios días, use el selector calificado por fecha de `openclaw meeting-notes list`, tal como `2026-05-22/standup`.

Por defecto, OpenClaw genera ids de sesión con marca de tiempo:

```text
meeting-2026-05-22T10-00-00-000Z-a1b2c3d4
```

Eso significa que diez reuniones en el mismo día se convierten en diez directorios hermanos:

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  meeting-2026-05-22T13-00-00-000Z-c3d4e5f6/
```

Configure `sessionId` solo cuando ese id sea único para el día. Los ids humanos como `standup` son adecuados para una reunión recurrente por día. Si el mismo id aparece en múltiples días, use el selector calificado por fecha en la CLI.

## Acceso a la CLI

Use la CLI de solo lectura para encontrar o imprimir resúmenes almacenados:

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes path <session>
openclaw meeting-notes path <session> --transcript
```

Consulte [CLI de Meeting Notes](/es/cli/meeting-notes) para la referencia completa de comandos.

## Reuniones largas

Para reuniones largas, las declaraciones se anexan a `transcript.jsonl` a medida que llegan. La generación de resúmenes lee una ventana delimitada controlada por `plugins.entries.meeting-notes.config.maxUtterances` (predeterminado: `2000`), por lo que una llamada de varias horas no requiere memoria de resumen ilimitada.

Esto significa que la transcripción puede seguir creciendo en el disco, mientras que el resumen se mantiene delimitado. Aumente `maxUtterances` cuando necesite más de una reunión de varias horas en el resumen generado y la sección de transcripción etiquetada por hablante. Disminúyalo cuando los resúmenes son demasiado lentos o demasiado grandes.

Los resúmenes actuales se generan cuando se detiene una sesión, después de una importación, o cuando se ejecuta la acción `summarize`. No se reescriben continuamente para cada declaración.

## Solución de problemas

### Falta `meeting_notes`

Compruebe que el complemento esté instalado o cargado desde el código fuente, y que la carga de complementos no lo excluya:

```bash
openclaw config validate
openclaw meeting-notes list
```

Si `plugins.allow` está establecido, debe incluir `meeting-notes`. Si `plugins.deny` contiene `meeting-notes`, elimínelo.

### El inicio automático no se une a Discord

Confirme que la entrada `autoStart` utiliza `providerId: "discord-voice"` e incluye
ambos `guildId` y `channelId`. Si ejecuta varias cuentas de Discord, incluya
`accountId`. Además, verifique que la voz de Discord funcione fuera de Meeting Notes uniéndose
al mismo canal de voz a través de los comandos de voz de Discord.

### Falta el resumen

Las sesiones en vivo escriben `summary.md` cuando se detienen. Detenga la sesión con
la acción `meeting_notes` `stop` y luego inspecciónela:

```bash
openclaw meeting-notes list
openclaw meeting-notes path <session>
```

Use la acción `meeting_notes` `summarize` para regenerar `summary.md` para una
sesión almacenada existente.

### El selector es ambiguo

Si reutilizó un id de sesión humano como `standup`, use el selector
calificado por fecha que muestra `openclaw meeting-notes list`:

```bash
openclaw meeting-notes show 2026-05-22/standup
```

## Relacionado

- [CLI de Meeting Notes](/es/cli/meeting-notes)
- [Voz de Discord](/es/channels/discord#voice-mode)
- [Gestión de complementos](/es/tools/plugin)
- [Arquitectura de complementos](/es/plugins/architecture)
