---
summary: "Plugin de llamada de voz: llamadas salientes + entrantes a través de Twilio/Telnyx/Plivo (instalación del complemento + configuración + CLI)"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Plugin de llamada de voz"
---

# Llamada de voz (complemento)

Llamadas de voz para OpenClaw a través de un complemento. Soporta notificaciones salientes y conversaciones de varios turnos con políticas entrantes.

Proveedores actuales:

- `twilio` (Voz programable + flujos de medios)
- `telnyx` (Control de llamadas v2)
- `plivo` (API de voz + transferencia XML + voz GetInput)
- `mock` (desarrollo/sin red)

Modelo mental rápido:

- Instalar complemento
- Reiniciar Gateway
- Configurar en `plugins.entries.voice-call.config`
- Use `openclaw voicecall ...` o la herramienta `voice_call`

## Dónde se ejecuta (local vs remoto)

El complemento de llamada de voz se ejecuta **dentro del proceso del Gateway**.

Si utiliza un Gateway remoto, instale/configure el complemento en la **máquina que ejecuta el Gateway** y luego reinicie el Gateway para cargarlo.

## Instalación

### Opción A: instalar desde npm (recomendado)

```bash
openclaw plugins install @openclaw/voice-call
```

Reinicie el Gateway después.

### Opción B: instalar desde una carpeta local (desarrollo, sin copia)

```bash
PLUGIN_SRC=./path/to/local/voice-call-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

Reinicie el Gateway después.

## Configuración

Establecer la configuración en `plugins.entries.voice-call.config`:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234",
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },

          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Telnyx Mission Control Portal
            // (Base64 string; can also be set via TELNYX_PUBLIC_KEY).
            publicKey: "...",
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook security (recommended for tunnels/proxies)
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: {
            enabled: true,
            provider: "openai", // optional; first registered realtime transcription provider when unset
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
            preStartTimeoutMs: 5000,
            maxPendingConnections: 32,
            maxPendingConnectionsPerIp: 4,
            maxConnections: 128,
          },
        },
      },
    },
  },
}
```

Notas:

- Twilio/Telnyx requieren una URL de webhook **accesible públicamente**.
- Plivo requiere una URL de webhook **accesible públicamente**.
- `mock` es un proveedor de desarrollo local (sin llamadas a la red).
- Si las configuraciones antiguas todavía usan `provider: "log"`, `twilio.from`, o claves OpenAI heredadas `streaming.*`, ejecute `openclaw doctor --fix` para reescribirlas.
- Telnyx requiere `telnyx.publicKey` (o `TELNYX_PUBLIC_KEY`) a menos que `skipSignatureVerification` sea verdadero.
- `skipSignatureVerification` es solo para pruebas locales.
- Si usa el nivel gratuito de ngrok, establezca `publicUrl` en la URL exacta de ngrok; la verificación de firmas siempre se aplica.
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` permite webhooks de Twilio con firmas no válidas **solo** cuando `tunnel.provider="ngrok"` y `serve.bind` es loopback (agente local ngrok). Usar solo para desarrollo local.
- Las URL del nivel gratuito de Ngrok pueden cambiar o agregar comportamiento intersticial; si `publicUrl` cambia, las firmas de Twilio fallarán. Para producción, prefiera un dominio estable o un embudo Tailscale.
- Valores predeterminados de seguridad de transmisión:
  - `streaming.preStartTimeoutMs` cierra los sockets que nunca envían un trama `start` válida.
- `streaming.maxPendingConnections` limita el total de sockets previos al inicio sin autenticar.
- `streaming.maxPendingConnectionsPerIp` limita los sockets previos al inicio sin autenticar por IP de origen.
- `streaming.maxConnections` limita el total de sockets de flujo de medios abiertos (pendientes + activos).
- La alternativa en tiempo de ejecución todavía acepta esas claves antiguas de llamada de voz por ahora, pero la ruta de reescritura es `openclaw doctor --fix` y la interfaz de compatibilidad es temporal.

## Transcripción en tiempo real

`streaming` selecciona un proveedor de transcripción en tiempo real para el audio de la llamada en vivo.

Comportamiento actual en tiempo de ejecución:

- `streaming.provider` es opcional. Si no se establece, Voice Call utiliza el primer proveedor de transcripción en tiempo real registrado.
- Hoy el proveedor incluido es OpenAI, registrado por el complemento `openai` incluido.
- La configuración sin procesar del proveedor se encuentra bajo `streaming.providers.<providerId>`.
- Si `streaming.provider` apunta a un proveedor no registrado, o no hay ningún proveedor de transcripción en tiempo real registrado, Voice Call registra una advertencia y omite la transmisión de medios en lugar de fallar todo el complemento.

Valores predeterminados de transcripción en tiempo real de OpenAI:

- Clave de API: `streaming.providers.openai.apiKey` o `OPENAI_API_KEY`
- modelo: `gpt-4o-transcribe`
- `silenceDurationMs`: `800`
- `vadThreshold`: `0.5`

Ejemplo:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "openai",
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
          },
        },
      },
    },
  },
}
```

Las claves heredadas aún se migran automáticamente mediante `openclaw doctor --fix`:

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## Segador de llamadas obsoletas

Use `staleCallReaperSeconds` para finalizar llamadas que nunca reciben un webhook terminal (por ejemplo, llamadas en modo de notificación que nunca se completan). El valor predeterminado es `0` (deshabilitado).

Rangos recomendados:

- **Producción:** `120`–`300` segundos para flujos de estilo de notificación.
- Mantenga este valor **mayor que `maxDurationSeconds`** para que las llamadas normales puedan finalizar. Un buen punto de partida es `maxDurationSeconds + 30–60` segundos.

Ejemplo:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 360,
        },
      },
    },
  },
}
```

## Seguridad de Webhook

Cuando un proxy o túnel se encuentra frente a la puerta de enlace, el complemento reconstruye la URL pública para la verificación de firmas. Estas opciones controlan qué encabezados reenviados son de confianza.

`webhookSecurity.allowedHosts` permite listar hosts desde los encabezados de reenvío.

`webhookSecurity.trustForwardingHeaders` confía en los encabezados reenviados sin una lista de permitidos.

`webhookSecurity.trustedProxyIPs` solo confía en los encabezados reenviados cuando la IP
remota de la solicitud coincide con la lista.

La protección contra reproducción de webhooks está habilitada para Twilio y Plivo. Las solicitudes de webhook válidas reproducidas se reconocen pero se omiten para evitar efectos secundarios.

Los turnos de conversación de Twilio incluyen un token por turno en las devoluciones de llamada `<Gather>`, por lo que las devoluciones de llamada de voz obsoletas o reproducidas no pueden satisfacer un turno de transcripción pendiente más reciente.

Las solicitudes de webhook no autenticadas se rechazan antes de leer el cuerpo cuando faltan los encabezados de firma requeridos por el proveedor.

El webhook de llamada de voz utiliza el perfil de cuerpo previo a la autenticación compartido (64 KB / 5 segundos)
más un límite en vuelo por IP antes de la verificación de la firma.

Ejemplo con un host público estable:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## TTS para llamadas

Voice Call utiliza la configuración `messages.tts` central para
transmitir voz en las llamadas. Puede anularla en la configuración del complemento con el
**mismo formato** — se fusiona profundamente con `messages.tts`.

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

Notas:

- Las claves `tts.<provider>` heredadas dentro de la configuración del complemento (`openai`, `elevenlabs`, `microsoft`, `edge`) se migran automáticamente a `tts.providers.<provider>` al cargar. Se prefiere el formato `providers` en la configuración confirmada.
- **Se ignora el reconocimiento de voz de Microsoft para las llamadas de voz** (el audio de telefonía necesita PCM; el transporte actual de Microsoft no expone la salida PCM de telefonía).
- Se utiliza el TTS central cuando la transmisión de medios de Twilio está habilitada; de lo contrario, las llamadas vuelven a las voces nativas del proveedor.
- Si ya está activo un flujo de medios de Twilio, Voice Call no vuelve a TwiML `<Say>`. Si el TTS de telefonía no está disponible en ese estado, la solicitud de reproducción falla en lugar de mezclar dos rutas de reproducción.
- Cuando el TTS de telefonía vuelve a un proveedor secundario, Voice Call registra una advertencia con la cadena de proveedores (`from`, `to`, `attempts`) para la depuración.

### Más ejemplos

Usar solo el TTS central (sin anulación):

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { voice: "alloy" },
      },
    },
  },
}
```

Anular a ElevenLabs solo para llamadas (mantener el valor predeterminado central en otro lugar):

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "elevenlabs_key",
                voiceId: "pMsXgVXv3BLzUgSXRplE",
                modelId: "eleven_multilingual_v2",
              },
            },
          },
        },
      },
    },
  },
}
```

Anular solo el modelo de OpenAI para llamadas (ejemplo de fusión profunda):

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            providers: {
              openai: {
                model: "gpt-4o-mini-tts",
                voice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```

## Llamadas entrantes

La política de entrada (inbound) se establece de forma predeterminada en `disabled`. Para habilitar las llamadas entrantes, configure:

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` es un filtro de identificación de llamadas de baja seguridad. El complemento normaliza el valor `From` proporcionado por el proveedor y lo compara con `allowFrom`. La verificación del webhook autentica la entrega del proveedor y la integridad de la carga útil, pero no prueba la propiedad del número de llamante PSTN/VoIP. Trate `allowFrom` como un filtrado de identificación de llamadas, no como una identidad de llamante sólida.

Las respuestas automáticas utilizan el sistema de agentes. Ajuste con:

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### Contrato de salida hablada

Para las respuestas automáticas, Voice Call añade un contrato estricto de salida hablada al mensaje del sistema:

- `{"spoken":"..."}`

Luego, Voice Call extrae el texto del habla de forma defensiva:

- Ignora las cargas útiles marcadas como contenido de razonamiento/error.
- Analiza JSON directo, JSON cercado o claves `"spoken"` en línea.
- Recurre a texto sin formato y elimina los párrafos de introducción probables de planificación/metadatos.

Esto mantiene la reproducción hablada centrada en el texto orientado al llamante y evita filtrar el texto de planificación en el audio.

### Comportamiento de inicio de conversación

Para las llamadas `conversation` salientes, el manejo del primer mensaje está vinculado al estado de reproducción en vivo:

- La limpieza de la cola de interrupción (barge-in) y la respuesta automática se suprimen solo mientras el saludo inicial se está reproduciendo activamente.
- Si la reproducción inicial falla, la llamada vuelve a `listening` y el mensaje inicial permanece en cola para reintentar.
- La reproducción inicial para el streaming de Twilio comienza al conectar el flujo sin retraso adicional.

### Período de gracia de desconexión del flujo de Twilio

Cuando se desconecta un flujo de medios de Twilio, Voice Call espera `2000ms` antes de finalizar automáticamente la llamada:

- Si el flujo se vuelve a conectar durante esa ventana, la finalización automática se cancela.
- Si no se vuelve a registrar ningún flujo después del período de gracia, la llamada finaliza para evitar llamadas activas bloqueadas.

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                     # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

`latency` lee `calls.jsonl` de la ruta de almacenamiento predeterminada de voice-call. Use
`--file <path>` para apuntar a un registro diferente y `--last <n>` para limitar el análisis
a los últimos N registros (predeterminado 200). La salida incluye p50/p90/p99 para la latencia
del turno y los tiempos de espera de escucha.

## Herramienta del agente

Nombre de la herramienta: `voice_call`

Acciones:

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `end_call` (callId)
- `get_status` (callId)

Este repositorio incluye un documento de habilidad correspondiente en `skills/voice-call/SKILL.md`.

## RPC de puerta de enlace

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)
