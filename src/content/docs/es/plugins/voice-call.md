---
summary: "Realiza llamadas salientes y acepta llamadas entrantes a través de Twilio, Telnyx o Plivo, con voz en tiempo real y transcripción en flujo opcionales"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
  - You need realtime voice or streaming transcription on telephony
title: "Complemento de llamada de voz"
sidebarTitle: "Llamada de voz"
---

Llamadas de voz para OpenClaw a través de un complemento. Soporta notificaciones salientes,
conversaciones de varios turnos, voz en tiempo real dúplex completo, transcripción
en flujo y llamadas entrantes con políticas de lista de permitidos.

**Proveedores actuales:** `twilio` (Programmable Voice + Media Streams),
`telnyx` (Call Control v2), `plivo` (Voice API + XML transfer + GetInput
speech), `mock` (dev/sin red).

<Note>El complemento Voice Call se ejecuta **dentro del proceso Gateway**. Si utiliza un Gateway remoto, instale y configure el complemento en la máquina que ejecuta el Gateway, luego reinicie el Gateway para cargarlo.</Note>

## Inicio rápido

<Steps>
  <Step title="Instalar el complemento">
    <Tabs>
      <Tab title="Desde npm (recomendado)">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="Desde una carpeta local (desarrollo)">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    Reinicie el Gateway después para que se cargue el complemento.

  </Step>
  <Step title="Configurar proveedor y webhook">
    Establezca la configuración en `plugins.entries.voice-call.config` (vea
    [Configuration](#configuration) a continuación para la estructura completa). Como mínimo:
    `provider`, credenciales del proveedor, `fromNumber`, y una URL de webhook
    accesible públicamente.
  </Step>
  <Step title="Verificar configuración">
    ```bash
    openclaw voicecall setup
    ```

    El resultado predeterminado es legible en los registros de chat y terminales. Verifica
    la habilitación del complemento, las credenciales del proveedor, la exposición del webhook y que
    solo un modo de audio (`streaming` o `realtime`) esté activo. Use
    `--json` para scripts.

  </Step>
  <Step title="Prueba de humo">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    Ambas son simulaciones por defecto. Añada `--yes` para realizar realmente una
    breve llamada de notificación saliente:

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>Para Twilio, Telnyx y Plivo, la configuración debe resolver a una **URL de webhook pública**. Si `publicUrl`, la URL del túnel, la URL de Tailscale o el respaldo de servicio resuelve a un bucle local o a una red privada, la configuración falla en lugar de iniciar un proveedor que no puede recibir webhooks del operador.</Warning>

## Configuración

Si `enabled: true` pero al proveedor seleccionado le faltan las credenciales,
el registro de inicio de Gateway registra una advertencia de configuración incompleta con las claves faltantes y
omite el inicio del tiempo de ejecución. Los comandos, las llamadas RPC y las herramientas del agente todavía
devuelven la configuración exacta del proveedor faltante cuando se utilizan.

<Note>Las credenciales de llamada de voz aceptan SecretRefs. `plugins.entries.voice-call.config.twilio.authToken` y `plugins.entries.voice-call.config.tts.providers.*.apiKey` se resuelven a través de la superficie estándar de SecretRef; consulte [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface).</Note>

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // or TWILIO_FROM_NUMBER for Twilio
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },
          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Mission Control Portal
            // (Base64; can also be set via TELNYX_PUBLIC_KEY).
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
          // tailscale: { mode: "funnel", path: "/voice/webhook" },

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: { enabled: true /* see Streaming transcription */ },
          realtime: { enabled: false /* see Realtime voice */ },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Notas de exposición y seguridad del proveedor">
    - Twilio, Telnyx y Plivo requieren todos una URL de webhook **accesible públicamente**.
    - `mock` es un proveedor de desarrollo local (sin llamadas de red).
    - Telnyx requiere `telnyx.publicKey` (o `TELNYX_PUBLIC_KEY`) a menos que `skipSignatureVerification` sea verdadero.
    - `skipSignatureVerification` es solo para pruebas locales.
    - En el nivel gratuito de ngrok, establezca `publicUrl` en la URL exacta de ngrok; la verificación de firma se aplica siempre.
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` permite webhooks de Twilio con firmas inválidas **solo** cuando `tunnel.provider="ngrok"` y `serve.bind` es un bucle local (agente local de ngrok). Solo para desarrollo local.
    - Las URLs del nivel gratuito de Ngrok pueden cambiar o agregar comportamiento intersticial; si `publicUrl` cambia, las firmas de Twilio fallan. Producción: preferir un dominio estable o un embudo de Tailscale.
  </Accordion>
  <Accordion title="Streaming connection caps">
    - `streaming.preStartTimeoutMs` cierra los sockets que nunca envían un marco `start` válido.
    - `streaming.maxPendingConnections` limita el total de sockets de preinicio no autenticados.
    - `streaming.maxPendingConnectionsPerIp` limita los sockets de preinicio no autenticados por IP de origen.
    - `streaming.maxConnections` limita el total de sockets de flujo de medios abiertos (pendientes + activos).
  </Accordion>
  <Accordion title="Legacy config migrations">
    Las configuraciones antiguas que usan `provider: "log"`, `twilio.from`, o claves
    heredadas de `streaming.*` de OpenAI son reescritas por `openclaw doctor --fix`.
    El respaldo en tiempo de ejecución todavía acepta las claves antiguas de voice-call por ahora, pero
    la ruta de reescritura es `openclaw doctor --fix` y el shim de compatibilidad es
    temporal.

    Claves de transmisión migradas automáticamente:

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## Conversaciones de voz en tiempo real

`realtime` selecciona un proveedor de voz en tiempo real dúplex completo para el audio de la
llamada en vivo. Es independiente de `streaming`, que solo reenvía el audio a los
proveedores de transcripción en tiempo real.

<Warning>`realtime.enabled` no se puede combinar con `streaming.enabled`. Elija un modo de audio por llamada.</Warning>

Comportamiento actual en tiempo de ejecución:

- `realtime.enabled` es compatible con Media Streams de Twilio.
- `realtime.provider` es opcional. Si no se establece, Voice Call usa el primer proveedor de voz en tiempo real registrado.
- Proveedores de voz en tiempo real incluidos: Google Gemini Live (`google`) y OpenAI (`openai`), registrados por sus complementos de proveedor.
- La configuración sin procesar del propietario del proveedor se encuentra en `realtime.providers.<providerId>`.
- Voice Call expone la herramienta `openclaw_agent_consult` en tiempo real compartida de forma predeterminada. El modelo en tiempo real puede llamarla cuando el solicitante pida un razonamiento más profundo, información actual o herramientas normales de OpenClaw.
- Si `realtime.provider` apunta a un proveedor no registrado, o no hay ningún proveedor de voz en tiempo real registrado, Voice Call registra una advertencia y omite los medios en tiempo real en lugar de hacer que falle todo el complemento.
- Las claves de sesión de consulta reutilizan la sesión de voz existente cuando está disponible, luego recurren al número de teléfono del llamante/llamado para que las llamadas de consulta de seguimiento mantengan el contexto durante la llamada.

### Política de herramientas

`realtime.toolPolicy` controla la ejecución de la consulta:

| Política         | Comportamiento                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | Exponer la herramienta de consulta y limitar el agente regular a `read`, `web_search`, `web_fetch`, `x_search`, `memory_search` y `memory_get`. |
| `owner`          | Exponer la herramienta de consulta y permitir que el agente regular use la política de herramientas de agente normal.                           |
| `none`           | No exponer la herramienta de consulta. Las `realtime.tools` personalizadas aún se pasan al proveedor en tiempo real.                            |

### Ejemplos de proveedores en tiempo real

<Tabs>
  <Tab title="Google Gemini Live">
    Valores predeterminados: clave de API de `realtime.providers.google.apiKey`,
    `GEMINI_API_KEY` o `GOOGLE_GENERATIVE_AI_API_KEY`; modelo
    `gemini-2.5-flash-native-audio-preview-12-2025`; voz `Kore`.

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              provider: "twilio",
              inboundPolicy: "allowlist",
              allowFrom: ["+15550005678"],
              realtime: {
                enabled: true,
                provider: "google",
                instructions: "Speak briefly. Call openclaw_agent_consult before using deeper tools.",
                toolPolicy: "safe-read-only",
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="OpenAI">
    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              realtime: {
                enabled: true,
                provider: "openai",
                providers: {
                  openai: { apiKey: "${OPENAI_API_KEY}" },
                },
              },
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

Consulte [Proveedor de Google](/es/providers/google) y
[Proveedor de OpenAI](/es/providers/openai) para obtener opciones de voz en tiempo real específicas del proveedor.

## Transcripción en tiempo real

`streaming` selecciona un proveedor de transcripción en tiempo real para el audio de llamadas en vivo.

Comportamiento actual en tiempo de ejecución:

- `streaming.provider` es opcional. Si no se establece, Voice Call usa el primer proveedor de transcripción en tiempo real registrado.
- Proveedores de transcripción en tiempo real incluidos: Deepgram (`deepgram`), ElevenLabs (`elevenlabs`), Mistral (`mistral`), OpenAI (`openai`) y xAI (`xai`), registrados por sus complementos de proveedor.
- La configuración sin procesar propiedad del proveedor se encuentra en `streaming.providers.<providerId>`.
- Si `streaming.provider` apunta a un proveedor no registrado, o no hay ninguno registrado, Voice Call registra una advertencia y omite el streaming multimedia en lugar de fallar en todo el complemento.

### Ejemplos de proveedores de streaming

<Tabs>
  <Tab title="OpenAI">
    Valores predeterminados: clave de API `streaming.providers.openai.apiKey` o
    `OPENAI_API_KEY`; modelo `gpt-4o-transcribe`; `silenceDurationMs: 800`;
    `vadThreshold: 0.5`.

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

  </Tab>
  <Tab title="xAI">
    Valores predeterminados: clave de API `streaming.providers.xai.apiKey` o `XAI_API_KEY`;
    endpoint `wss://api.x.ai/v1/stt`; codificación `mulaw`; frecuencia de muestreo `8000`;
    `endpointingMs: 800`; `interimResults: true`.

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                streamPath: "/voice/stream",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}", // optional if XAI_API_KEY is set
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## TTS para llamadas

Voice Call utiliza la configuración central `messages.tts` para el streaming de
voz en las llamadas. Puede anularla en la configuración del complemento con el
**mismo formato**; se fusiona profundamente con `messages.tts`.

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

<Warning>**Se ignora el voz de Microsoft para las llamadas de voz.** El audio de telefonía necesita PCM; el transporte actual de Microsoft no expone salida PCM de telefonía.</Warning>

Notas sobre el comportamiento:

- Las claves heredadas `tts.<provider>` dentro de la configuración del complemento (`openai`, `elevenlabs`, `microsoft`, `edge`) se reparan mediante `openclaw doctor --fix`; la configuración confirmada debe usar `tts.providers.<provider>`.
- Se usa el TTS central cuando el streaming multimedia de Twilio está habilitado; de lo contrario, las llamadas vuelven a las voces nativas del proveedor.
- Si un flujo de medios de Twilio ya está activo, Voice Call no recurre a TwiML `<Say>`. Si TTS de telefonía no está disponible en ese estado, la solicitud de reproducción falla en lugar de mezclar dos rutas de reproducción.
- Cuando TTS de telefonía recurre a un proveedor secundario, Voice Call registra una advertencia con la cadena de proveedores (`from`, `to`, `attempts`) para depuración.
- Cuando la interrupción (barge-in) de Twilio o el desmontaje del flujo borra la cola de TTS pendiente, las solicitudes de reproducción en cola se resuelven en lugar de mantener a los llamantes esperando la finalización de la reproducción.

### Ejemplos de TTS

<Tabs>
  <Tab title="Solo TTS Core">
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
  </Tab>
  <Tab title="Sobrescribir a ElevenLabs (solo llamadas)">
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
  </Tab>
  <Tab title="Sobrescribir modelo de OpenAI (fusión profunda)">
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
  </Tab>
</Tabs>

## Llamadas entrantes

La política de entrada predeterminada es `disabled`. Para habilitar las llamadas entrantes, configure:

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>
  `inboundPolicy: "allowlist"` es un filtro de identificación de llamante de baja seguridad. El complemento normaliza el valor `From` proporcionado por el proveedor y lo compara con `allowFrom`. La verificación de webhook autentica la entrega del proveedor y la integridad de la carga útil, pero **no** prueba la propiedad del número de llamante PSTN/VoIP. Trate `allowFrom` como filtrado de
  identificación de llamante, no como identidad de llamante fuerte.
</Warning>

Las respuestas automáticas utilizan el sistema del agente. Ajuste con `responseModel`,
`responseSystemPrompt` y `responseTimeoutMs`.

### Contrato de salida hablada

Para las respuestas automáticas, Voice Call añade un contrato estricto de salida hablada al
prompt del sistema:

```text
{"spoken":"..."}
```

Voice Call extrae el texto de voz de manera defensiva:

- Ignora las cargas útiles marcadas como contenido de razonamiento/error.
- Analiza JSON directo, JSON vallado o claves `"spoken"` en línea.
- Recurre a texto plano y elimina los párrafos de introducción de planificación/metadatos probables.

Esto mantiene la reproducción hablada enfocada en el texto orientado al llamante y evita
filtrar texto de planificación en el audio.

### Comportamiento de inicio de conversación

Para las llamadas `conversation` salientes, el manejo del primer mensaje está vinculado al estado de reproducción en vivo:

- La limpieza de la cola de interrupción (barge-in) y la respuesta automática se suprimen solo mientras el saludo inicial se está reproduciendo activamente.
- Si la reproducción inicial falla, la llamada vuelve a `listening` y el mensaje inicial permanece en cola para reintentar.
- La reproducción inicial para el streaming de Twilio comienza al conectar el flujo sin retraso adicional.
- La interrupción (barge-in) aborta la reproducción activa y borra las entradas TTS de Twilio en cola pero aún no reproducidas. Las entradas borradas se resuelven como omitidas, por lo que la lógica de respuesta de seguimiento puede continuar sin esperar el audio que nunca se reproducirá.
- Las conversaciones de voz en tiempo real utilizan el turno de apertura propio del flujo en tiempo real. Voice Call **no** publica una actualización TwiML `<Say>` heredada para ese mensaje inicial, por lo que las sesiones `<Connect><Stream>` salientes permanecen conectadas.

### Gracia de desconexión del flujo de Twilio

Cuando se desconecta un flujo de medios de Twilio, Voice Call espera **2000 ms** antes de finalizar automáticamente la llamada:

- Si el flujo se vuelve a conectar durante esa ventana, se cancela el final automático.
- Si ningún flujo se vuelve a registrar después del período de gracia, la llamada finaliza para evitar llamadas activas bloqueadas.

## Segador de llamadas obsoletas

Use `staleCallReaperSeconds` para finalizar llamadas que nunca reciben un webhook terminal (por ejemplo, llamadas en modo de notificación que nunca se completan). El valor predeterminado es `0` (deshabilitado).

Rangos recomendados:

- **Producción:** `120`–`300` segundos para flujos de estilo de notificación.
- Mantenga este valor **más alto que `maxDurationSeconds`** para que las llamadas normales puedan finalizar. Un buen punto de partida es `maxDurationSeconds + 30–60` segundos.

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

## Seguridad de webhooks

Cuando un proxy o túnel se encuentra frente a la Gateway (pasarela), el complemento reconstruye la URL pública para la verificación de firmas. Estas opciones controlan qué encabezados reenviados son de confianza:

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  Permitir hosts en la lista blanca desde los encabezados de reenvío.
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  Confiar en los encabezados de reenvío sin una lista blanca.
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  Confiar solo en los encabezados de reenvío cuando la IP remota de la solicitud coincida con la lista.
</ParamField>

Protecciones adicionales:

- La **protección contra reenvío (replay protection)** del webhook está habilitada para Twilio y Plivo. Las solicitudes de webhook válidas reenviadas se reconocen pero se omiten para evitar efectos secundarios.
- Los turnos de conversación de Twilio incluyen un token por turno en las devoluciones de llamada (callbacks) de `<Gather>`, por lo que las devoluciones de llamada de voz obsoletas o reenviadas no pueden satisfacer un turno de transcripción pendiente más reciente.
- Las solicitudes de webhook no autenticadas se rechazan antes de la lectura del cuerpo cuando faltan los encabezados de firma requeridos por el proveedor.
- El webhook de voz utiliza el perfil de cuerpo compartido de preautenticación (64 KB / 5 segundos) más un límite en vuelo por IP antes de la verificación de la firma.

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

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                      # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

`latency` lee `calls.jsonl` desde la ruta de almacenamiento predeterminada de llamadas de voz.
Use `--file <path>` para señalar un registro diferente y `--last <n>` para limitar
el análisis a los últimos N registros (predeterminado 200). La salida incluye p50/p90/p99
para la latencia del turno y los tiempos de espera de escucha.

## Herramienta del agente

Nombre de la herramienta: `voice_call`.

| Acción          | Args                      |
| --------------- | ------------------------- |
| `initiate_call` | `message`, `to?`, `mode?` |
| `continue_call` | `callId`, `message`       |
| `speak_to_user` | `callId`, `message`       |
| `send_dtmf`     | `callId`, `digits`        |
| `end_call`      | `callId`                  |
| `get_status`    | `callId`                  |

Este repositorio incluye un documento de habilidad correspondiente en `skills/voice-call/SKILL.md`.

## RPC de puerta de enlace

| Método               | Args                      |
| -------------------- | ------------------------- |
| `voicecall.initiate` | `to?`, `message`, `mode?` |
| `voicecall.continue` | `callId`, `message`       |
| `voicecall.speak`    | `callId`, `message`       |
| `voicecall.dtmf`     | `callId`, `digits`        |
| `voicecall.end`      | `callId`                  |
| `voicecall.status`   | `callId`                  |

## Relacionado

- [Modo de conversación](/es/nodes/talk)
- [Conversión de texto a voz](/es/tools/tts)
- [Activación por voz](/es/nodes/voicewake)
