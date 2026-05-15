---
summary: "Realiza y recibe llamadas de voz a través de Twilio, Telnyx o Plivo, con voz en tiempo real y transcripción de streaming opcionales"
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
  <Step title="Instala el complemento">
    <Tabs>
      <Tab title="Desde npm">
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

    Utiliza el paquete básico para seguir la etiqueta oficial de lanzamiento actual. Fija una
    versión exacta solo cuando necesites una instalación reproducible.

    Reinicia el Gateway después para que se cargue el complemento.

  </Step>
  <Step title="Configurar proveedor y webhook">
    Establece la configuración bajo `plugins.entries.voice-call.config` (ver
    [Configuration](#configuration) a continuación para la estructura completa). Como mínimo:
    `provider`, las credenciales del proveedor, `fromNumber`, y una URL de webhook
    públicamente accesible.
  </Step>
  <Step title="Verificar configuración">
    ```bash
    openclaw voicecall setup
    ```

    La salida predeterminada es legible en registros de chat y terminales. Comprueba
    la habilitación del complemento, las credenciales del proveedor, la exposición del webhook y que
    solo esté activo un modo de audio (`streaming` o `realtime`). Usa
    `--json` para scripts.

  </Step>
  <Step title="Prueba de humo">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    Ambas son ejecuciones en seco (dry runs) de manera predeterminada. Añade `--yes` para realizar realmente una breve
    llamada de notificación saliente:

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>Para Twilio, Telnyx y Plivo, la configuración debe resolver a una **URL de webhook pública**. Si `publicUrl`, la URL del túnel, la URL de Tailscale o la alternativa de servicio resuelve a un espacio de red de bucle local o privado, la configuración falla en lugar de iniciar un proveedor que no pueda recibir webhooks de la operadora.</Warning>

## Configuración

Si `enabled: true` pero al proveedor seleccionado le faltan las credenciales,
el registro de inicio de Gateway registra una advertencia de configuración incompleta con las claves faltantes y
omite el inicio del tiempo de ejecución. Los comandos, las llamadas RPC y las herramientas del agente aún
devuelven la configuración exacta del proveedor faltante cuando se utilizan.

<Note>
  Las credenciales de llamada de voz aceptan SecretRefs. `plugins.entries.voice-call.config.twilio.authToken`, `plugins.entries.voice-call.config.realtime.providers.*.apiKey`, `plugins.entries.voice-call.config.streaming.providers.*.apiKey` y `plugins.entries.voice-call.config.tts.providers.*.apiKey` se resuelven a través de la superficie estándar de SecretRef; consulte [Superficie de credenciales
  SecretRef](/es/reference/secretref-credential-surface).
</Note>

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
          sessionScope: "per-phone", // per-phone | per-call
          numbers: {
            "+15550009999": {
              inboundGreeting: "Silver Fox Cards, how can I help?",
              responseSystemPrompt: "You are a concise baseball card specialist.",
              tts: {
                providers: {
                  openai: { voice: "alloy" },
                },
              },
            },
          },

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
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` permite webhooks de Twilio con firmas inválidas **solo** cuando `tunnel.provider="ngrok"` y `serve.bind` es bucle local (agente local ngrok). Solo para desarrollo local.
    - Las URL del nivel gratuito de Ngrok pueden cambiar o añadir un comportamiento intersticial; si `publicUrl` cambia, las firmas de Twilio fallan. Producción: se prefiere un dominio estable o un embudo de Tailscale.

  </Accordion>
  <Accordion title="Límites de conexión de transmisión">
    - `streaming.preStartTimeoutMs` cierra los sockets que nunca envían un trama `start` válida.
    - `streaming.maxPendingConnections` limita el total de sockets no autenticados previos al inicio.
    - `streaming.maxPendingConnectionsPerIp` limita los sockets no autenticados previos al inicio por IP de origen.
    - `streaming.maxConnections` limita el total de sockets de transmisión de medios abiertos (pendientes + activos).

  </Accordion>
  <Accordion title="Migraciones de configuración heredadas">
    Las configuraciones antiguas que utilizan `provider: "log"`, `twilio.from`, o claves
    heredadas de OpenAI `streaming.*` son reescritas por `openclaw doctor --fix`.
    El respaldo en tiempo de ejecución aún acepta las claves antiguas de llamada de voz por ahora, pero
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

## Ámbito de sesión

De forma predeterminada, Voice Call utiliza `sessionScope: "per-phone"` para que las llamadas repetidas del
mismo llamador mantengan la memoria de la conversación. Establezca `sessionScope: "per-call"` cuando
cada llamada del operador debe comenzar con un contexto nuevo, por ejemplo recepción,
reservas, IVR o flujos de puente de Google Meet donde el mismo número de teléfono puede
representar diferentes reuniones.

## Conversaciones de voz en tiempo real

`realtime` selecciona un proveedor de voz en tiempo real dúplex completo para el audio de
llamadas en vivo. Es independiente de `streaming`, que solo reenvía el audio a
proveedores de transcripción en tiempo real.

<Warning>`realtime.enabled` no se puede combinar con `streaming.enabled`. Elija un modo de audio por llamada.</Warning>

Comportamiento actual en tiempo de ejecución:

- `realtime.enabled` es compatible con Twilio Media Streams.
- `realtime.provider` es opcional. Si no se establece, Voice Call utiliza el primer proveedor de voz en tiempo real registrado.
- Proveedores de voz en tiempo real incluidos: Google Gemini Live (`google`) y OpenAI (`openai`), registrados por sus complementos de proveedor.
- La configuración bruta del proveedor reside bajo `realtime.providers.<providerId>`.
- Voice Call expone la herramienta en tiempo real compartida `openclaw_agent_consult` de forma predeterminada. El modelo en tiempo real puede llamarla cuando el solicitante pide un razonamiento más profundo, información actual o herramientas normales de OpenClaw.
- `realtime.consultPolicy` opcionalmente añade orientación sobre cuándo el modelo en tiempo real debe llamar a `openclaw_agent_consult`.
- `realtime.agentContext.enabled` está desactivado de forma predeterminada. Cuando se habilita, Voice Call inyecta una identidad de agente limitada, una anulación de prompt del sistema y una cápsula de archivo de espacio de trabajo seleccionada en las instrucciones del proveedor en tiempo real durante la configuración de la sesión.
- `realtime.fastContext.enabled` está desactivado de forma predeterminada. Cuando se habilita, Voice Call primero busca en el contexto de memoria/sesión indexado la pregunta de consulta y devuelve esos fragmentos al modelo en tiempo real dentro de `realtime.fastContext.timeoutMs` antes de recurrir al agente de consulta completo solo si `realtime.fastContext.fallbackToConsult` es verdadero.
- Si `realtime.provider` apunta a un proveedor no registrado, o no hay ningún proveedor de voz en tiempo real registrado, Voice Call registra una advertencia y omite los medios en tiempo real en lugar de hacer fallar todo el complemento.
- Las claves de sesión de consulta reutilizan la sesión de llamada almacenada cuando está disponible, luego recurren a la `sessionScope` configurada (`per-phone` de forma predeterminada, o `per-call` para llamadas aisladas).

### Política de herramientas

`realtime.toolPolicy` controla la ejecución de la consulta:

| Política         | Comportamiento                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | Exponer la herramienta de consulta y limitar el agente regular a `read`, `web_search`, `web_fetch`, `x_search`, `memory_search` y `memory_get`. |
| `owner`          | Exponer la herramienta de consulta y permitir que el agente regular utilice la política de herramientas de agente normal.                       |
| `none`           | No exponga la herramienta de consulta. Los `realtime.tools` personalizados todavía se pasan al proveedor en tiempo real.                        |

`realtime.consultPolicy` controla solo las instrucciones del modelo en tiempo real:

| Política      | Guía                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `auto`        | Mantenga el mensaje predeterminado y deje que el proveedor decida cuándo llamar a la herramienta de consulta.          |
| `substantive` | Responda directamente al pegamento conversacional simple y consulte antes de hechos, memoria, herramientas o contexto. |
| `always`      | Consulte antes de cada respuesta sustantiva.                                                                           |

### Contexto de voz del agente

Habilite `realtime.agentContext` cuando el puente de voz debe sonar como el
agente OpenClaw configurado sin pagar un viaje completo de consulta al agente en
turnos ordinarios. La cápsula de contexto se agrega una vez cuando se crea la sesión en tiempo real,
por lo que no agrega latencia por turno. Las llamadas a
`openclaw_agent_consult` todavía ejecutan el agente OpenClaw completo y deben usarse
para trabajo de herramientas, información actual, búsquedas de memoria o estado del espacio de trabajo.

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          agentId: "main",
          realtime: {
            enabled: true,
            provider: "google",
            toolPolicy: "safe-read-only",
            consultPolicy: "substantive",
            agentContext: {
              enabled: true,
              maxChars: 6000,
              includeIdentity: true,
              includeSystemPrompt: true,
              includeWorkspaceFiles: true,
              files: ["SOUL.md", "IDENTITY.md", "USER.md"],
            },
          },
        },
      },
    },
  },
}
```

### Ejemplos de proveedores en tiempo real

<Tabs>
  <Tab title="Google Gemini Live">
    Valores predeterminados: clave API de `realtime.providers.google.apiKey`,
    `GEMINI_API_KEY` o `GOOGLE_GENERATIVE_AI_API_KEY`; modelo
    `gemini-2.5-flash-native-audio-preview-12-2025`; voz `Kore`.
    `sessionResumption` y `contextWindowCompression` están activados de forma predeterminada para llamadas más largas
    y reconectables. Use `silenceDurationMs`, `startSensitivity` y
    `endSensitivity` para ajustar una alternancia de turnos más rápida en el audio de telefonía.

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
                consultPolicy: "substantive",
                consultThinkingLevel: "low",
                consultFastMode: true,
                agentContext: { enabled: true },
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-2.5-flash-native-audio-preview-12-2025",
                    voice: "Kore",
                    silenceDurationMs: 500,
                    startSensitivity: "high",
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
[Proveedor de OpenAI](/es/providers/openai) para opciones de voz en tiempo real específicas del proveedor.

## Transcripción en streaming

`streaming` selecciona un proveedor de transcripción en tiempo real para el audio de llamadas en vivo.

Comportamiento actual del tiempo de ejecución:

- `streaming.provider` es opcional. Si no se establece, Voice Call usa el primer proveedor de transcripción en tiempo real registrado.
- Proveedores de transcripción en tiempo real incluidos: Deepgram (`deepgram`), ElevenLabs (`elevenlabs`), Mistral (`mistral`), OpenAI (`openai`) y xAI (`xai`), registrados por sus complementos de proveedor.
- La configuración sin procesar del proveedor se encuentra en `streaming.providers.<providerId>`.
- Después de que Twilio envía un mensaje de flujo aceptado `start`, Voice Call registra el flujo inmediatamente, pone en cola los medios entrantes a través del proveedor de transcripción mientras el proveedor se conecta e inicia el saludo inicial solo después de que la transcripción en tiempo real esté lista.
- Si `streaming.provider` apunta a un proveedor no registrado, o no hay ninguno registrado, Voice Call registra una advertencia y omite la transmisión de medios en lugar de fallar todo el complemento.

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

Voice Call utiliza la configuración central `messages.tts` para el habla en streaming
durante las llamadas. Puede anularla en la configuración del complemento con el
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

<Warning>**Microsoft Speech se ignora para las llamadas de voz.** El audio de telefonía necesita PCM; el transporte actual de Microsoft no expone la salida PCM de telefonía.</Warning>

Notas de comportamiento:

- Las claves `tts.<provider>` heredadas dentro de la configuración del complemento (`openai`, `elevenlabs`, `microsoft`, `edge`) son reparadas por `openclaw doctor --fix`; la configuración confirmada debe usar `tts.providers.<provider>`.
- Se usa Core TTS cuando el streaming de medios de Twilio está habilitado; de lo contrario, las llamadas recurren a voces nativas del proveedor.
- Si un stream de medios de Twilio ya está activo, Voice Call no recurre a TwiML `<Say>`. Si el TTS de telefonía no está disponible en ese estado, la solicitud de reproducción falla en lugar de mezclar dos rutas de reproducción.
- Cuando el TTS de telefonía recurre a un proveedor secundario, Voice Call registra una advertencia con la cadena de proveedores (`from`, `to`, `attempts`) para depuración.
- Cuando la interrupción (barge-in) o el desmontaje del stream de Twilio borran la cola TTS pendiente, las solicitudes de reproducción en cola se resuelven en lugar de dejar a los llamantes esperando la finalización de la reproducción.

### Ejemplos de TTS

<Tabs>
  <Tab title="Solo Core TTS">
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
  <Tab title="Anular a ElevenLabs (solo llamadas)">
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
  <Tab title="Anulación de modelo OpenAI (fusión profunda)">
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

La política entrante tiene como valor predeterminado `disabled`. Para habilitar las llamadas entrantes, configure:

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>
  `inboundPolicy: "allowlist"` es un filtro de identificación de llamante de baja seguridad. El complemento normaliza el valor `From` proporcionado por el proveedor y lo compara con `allowFrom`. La verificación del webhook autentica la entrega del proveedor y la integridad de la carga útil, pero **no** prueba la propiedad del número de llamante PSTN/VoIP. Trate `allowFrom` como un filtrado de
  identificación de llamante, no como una fuerte identidad del llamante.
</Warning>

Las respuestas automáticas usan el sistema de agente. Ajuste con `responseModel`,
`responseSystemPrompt` y `responseTimeoutMs`.

### Enrutamiento por número

Use `numbers` cuando un complemento Voice Call recibe llamadas para múltiples números de teléfono y cada número debe comportarse como una línea diferente. Por ejemplo, un número puede usar un asistente personal informal mientras que otro usa una persona empresarial, un agente de respuesta diferente y una voz TTS diferente.

Las rutas se seleccionan a partir del número `To` marcado proporcionado por el proveedor. Las claves deben ser números E.164. Cuando llega una llamada, Voice Call resuelve la ruta coincidente una vez, almacena la ruta coincidente en el registro de llamada y reutiliza esa configuración efectiva para el saludo, la ruta de auto-respuesta clásica, la ruta de consulta en tiempo real y la reproducción TTS. Si ninguna ruta coincide, se utiliza la configuración global de Voice Call. Las llamadas salientes no usan `numbers`; pase el objetivo de salida, el mensaje y la sesión explícitamente al iniciar la llamada.

Las anulaciones de ruta actualmente admiten:

- `inboundGreeting`
- `tts`
- `agentId`
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

El valor de ruta `tts` se fusiona profundamente sobre la configuración `tts` de Voice Call global, por lo que generalmente puede anular solo la voz del proveedor:

```json5
{
  inboundGreeting: "Hello from the main line.",
  responseSystemPrompt: "You are the default voice assistant.",
  tts: {
    provider: "openai",
    providers: {
      openai: { voice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards, how can I help?",
      responseSystemPrompt: "You are a concise baseball card specialist.",
      tts: {
        providers: {
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

### Contrato de salida hablada

Para las respuestas automáticas, Voice Call añade un contrato estricto de salida hablada al prompt del sistema:

```text
{"spoken":"..."}
```

Voice Call extrae el texto de voz de manera defensiva:

- Ignora las cargas útiles marcadas como contenido de razonamiento/error.
- Analiza JSON directo, JSON vallado o claves `"spoken"` en línea.
- Recurre a texto sin formato y elimina los párrafos de introducción probables de planificación/meta.

Esto mantiene la reproducción hablada centrada en el texto orientado al llamante y evita filtrar texto de planificación en el audio.

### Comportamiento de inicio de conversación

Para las llamadas `conversation` salientes, el manejo del primer mensaje está vinculado al estado de reproducción en vivo:

- La limpieza de la cola de interrupción y la respuesta automática se suprimen solo mientras el saludo inicial está hablando activamente.
- Si la reproducción inicial falla, la llamada regresa a `listening` y el mensaje inicial permanece en cola para reintentar.
- La reproducción inicial para el streaming de Twilio comienza al conectar el stream sin retraso adicional.
- La interrupción (barge-in) aborta la reproducción activa y borra las entradas de Twilio TTS que están en cola pero que aún no se están reproduciendo. Las entradas borradas se resuelven como omitidas, por lo que la lógica de respuesta posterior puede continuar sin esperar el audio que nunca se reproducirá.
- Las conversaciones de voz en tiempo real utilizan el propio turno de apertura del flujo en tiempo real. Voice Call **no** publica una actualización TwiML heredada `<Say>` para ese mensaje inicial, por lo que las sesiones `<Connect><Stream>` salientes permanecen adjuntas.

### Período de gracia de desconexión del flujo de Twilio

Cuando se desconecta un flujo de medios de Twilio, Voice Call espera **2000 ms** antes de finalizar automáticamente la llamada:

- Si el flujo se vuelve a conectar durante esa ventana, la finalización automática se cancela.
- Si ningún flujo se vuelve a registrar después del período de gracia, la llamada finaliza para evitar llamadas activas atascadas.

## Recolector de llamadas obsoletas

Use `staleCallReaperSeconds` para finalizar llamadas que nunca reciben un webhook terminal (por ejemplo, llamadas en modo de notificación que nunca se completan). El valor predeterminado es `0` (deshabilitado).

Rangos recomendados:

- **Producción:** `120`–`300` segundos para flujos de estilo de notificación.
- Mantenga este valor **superior a `maxDurationSeconds`** para que las llamadas normales puedan finalizar. Un buen punto de partida es `maxDurationSeconds + 30–60` segundos.

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

## Seguridad del webhook

Cuando un proxy o túnel se encuentra delante de la Gateway, el complemento reconstruye la URL pública para la verificación de firmas. Estas opciones controlan qué encabezados reenviados son de confianza:

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  Lista de permitidos (allowlist) de hosts desde encabezados de reenvío.
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  Confiar en los encabezados reenviados sin una lista de permitidos.
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  Confiar solo en los encabezados reenviados cuando la IP remota de la solicitud coincida con la lista.
</ParamField>

Protecciones adicionales:

- La **protección contra repetición** (replay protection) del webhook está habilitada para Twilio y Plivo. Las solicitudes de webhook válidas repetidas se reconocen pero se omiten para efectos secundarios.
- Los turnos de conversación de Twilio incluyen un token por turno en las devoluciones de llamada `<Gather>`, por lo que las devoluciones de llamada de voz obsoletas o repetidas no pueden satisfacer un turno de transcripción pendiente más reciente.
- Las solicitudes de webhook no autenticadas se rechazan antes de leer el cuerpo cuando faltan los encabezados de firma requeridos por el proveedor.
- El webhook de llamada de voz utiliza el perfil de cuerpo previo a la autenticación compartido (64 KB / 5 segundos) más un límite de solicitudes simultáneas por IP antes de la verificación de la firma.

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

Cuando el Gateway ya se está ejecutando, los comandos operativos `voicecall` delegan
al tiempo de ejecución de llamada de voz propiedad del Gateway, por lo que la CLI no vincula un
segundo servidor webhook. Si no se puede alcanzar ningún Gateway, los comandos recurren a un
tiempo de ejecución de CLI independiente.

`latency` lee `calls.jsonl` desde la ruta de almacenamiento de llamada de voz predeterminada.
Use `--file <path>` para apuntar a un registro diferente y `--last <n>` para limitar
el análisis a los últimos N registros (predeterminado 200). La salida incluye p50/p90/p99
para la latencia de turno y los tiempos de espera de escucha.

## Herramienta del agente

Nombre de la herramienta: `voice_call`.

| Acción          | Args                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

Este repositorio incluye un documento de habilidad correspondiente en `skills/voice-call/SKILL.md`.

## RPC del Gateway

| Método               | Args                                       |
| -------------------- | ------------------------------------------ |
| `voicecall.initiate` | `to?`, `message`, `mode?`, `dtmfSequence?` |
| `voicecall.continue` | `callId`, `message`                        |
| `voicecall.speak`    | `callId`, `message`                        |
| `voicecall.dtmf`     | `callId`, `digits`                         |
| `voicecall.end`      | `callId`                                   |
| `voicecall.status`   | `callId`                                   |

`dtmfSequence` solo es válido con `mode: "conversation"`. Las llamadas en modo de notificación
deben usar `voicecall.dtmf` después de que exista la llamada si necesitan dígitos posteriores a la conexión.

## Solución de problemas

### La configuración falla la exposición del webhook

Ejecute la configuración desde el mismo entorno que ejecuta el Gateway:

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

Para `twilio`, `telnyx` y `plivo`, `webhook-exposure` debe estar verde. Un
`publicUrl` configurado aún falla cuando apunta a un espacio de red local o privada,
porque el operador no puede devolver la llamada a esas direcciones. No use
`localhost`, `127.0.0.1`, `0.0.0.0`, `10.x`, `172.16.x`-`172.31.x`,
`192.168.x`, `169.254.x`, `fc00::/7` o `fd00::/8` como `publicUrl`.

Las llamadas salientes de Twilio en modo de notificación envían su TwiML `<Say>` inicial directamente en
la solicitud de creación de llamada, por lo que el primer mensaje hablado no depende de que Twilio
obtenga el TwiML del webhook. Aún se requiere un webhook público para devoluciones de llamada de estado,
llamadas de conversación, DTMF previo a la conexión, transmisiones en tiempo real y control de
llamada posterior a la conexión.

Use una ruta de exposición pública:

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          // or
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

Después de cambiar la configuración, reinicie o recargue el Gateway, luego ejecute:

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` es una ejecución en seco a menos que pase `--yes`.

### Fallo de las credenciales del proveedor

Verifique el proveedor seleccionado y los campos de credenciales requeridos:

- Twilio: `twilio.accountSid`, `twilio.authToken` y `fromNumber`, o
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_FROM_NUMBER`.
- Telnyx: `telnyx.apiKey`, `telnyx.connectionId`, `telnyx.publicKey` y
  `fromNumber`.
- Plivo: `plivo.authId`, `plivo.authToken` y `fromNumber`.

Las credenciales deben existir en el host del Gateway. Editar un perfil de shell local no afecta a un Gateway que ya se está ejecutando hasta que se reinicie o recargue su entorno.

### Las llamadas comienzan pero los webhooks del proveedor no llegan

Confirme que la consola del proveedor apunta a la URL webhook pública exacta:

```text
https://voice.example.com/voice/webhook
```

Luego inspeccione el estado de tiempo de ejecución:

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

Causas comunes:

- `publicUrl` apunta a una ruta diferente a `serve.path`.
- La URL del túnel cambió después de que se inició el Gateway.
- Un proxy reenvía la solicitud pero elimina o reescribe los encabezados host/proto.
- Un firewall o DNS enruta el nombre de host público a un lugar distinto al Gateway.
- El Gateway se reinició sin el complemento de llamada de voz habilitado.

Cuando un proxy inverso o túnel está delante del Gateway, configure `webhookSecurity.allowedHosts` con el nombre de host público, o use `webhookSecurity.trustedProxyIPs` para una dirección de proxy conocida. Use `webhookSecurity.trustForwardingHeaders` solo cuando el límite del proxy esté bajo su control.

### Fallo en la verificación de la firma

Las firmas del proveedor se verifican contra la URL pública que OpenClaw reconstruye a partir de la solicitud entrante. Si las firmas fallan:

- Confirme que la URL del webhook del proveedor coincide exactamente con `publicUrl`, incluyendo el esquema, el host y la ruta.
- Para las URL de la capa gratuita de ngrok, actualice `publicUrl` cuando cambie el nombre de host del túnel.
- Asegúrese de que el proxy conserve los encabezados originales de host y proto, o configure `webhookSecurity.allowedHosts`.
- No habilite `skipSignatureVerification` fuera de las pruebas locales.

### Fallo en las uniones de Twilio de Google Meet

Google Meet usa este complemento para las uniones de marcación de Twilio. Primero verifique Llamada de voz:

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

Luego verifique explícitamente el transporte de Google Meet:

```bash
openclaw googlemeet setup --transport twilio
```

Si Llamada de voz está en verde pero el participante de Meet nunca se une, verifique el número de marcación de Meet, el PIN y `--dtmf-sequence`. La llamada telefónica puede estar sana mientras la reunión rechaza o ignora una secuencia DTMF incorrecta.

Google Meet inicia la parte telefónica de Twilio a través de `voicecall.start` con una
secuencia DTMF de preconexión. Las secuencias derivadas de PIN incluyen el `voiceCall.dtmfDelayMs` del complemento de Google Meet
como dígitos de espera iniciales de Twilio. El valor predeterminado es de 12 segundos
porque los mensajes de marcación de Meet pueden llegar tarde. Voice Call luego redirige de
vuelta al manejo en tiempo real antes de que se solicite el saludo de introducción.

Use `openclaw logs --follow` para el rastro de la fase en vivo. Una unión a Twilio Meet
saludable registra este orden:

- Google Meet delega la unión a Twilio a Voice Call.
- Voice Call almacena el TwiML DTMF de preconexión.
- El TwiML inicial de Twilio se consume y sirve antes del manejo en tiempo real.
- Voice Call sirve el TwiML en tiempo real para la llamada de Twilio.
- Google Meet solicita el discurso de introducción con `voicecall.speak` después del retraso posterior a DTMF.

`openclaw voicecall tail` todavía muestra los registros de llamadas persistidos; es útil para
el estado de la llamada y las transcripciones, pero no todas las transiciones de webhook/tiempo real aparecen
allí.

### La llamada en tiempo real no tiene voz

Confirme que solo esté habilitado un modo de audio. `realtime.enabled` y
`streaming.enabled` no pueden ser ambos verdaderos.

Para las llamadas Twilio en tiempo real, también verifique:

- Un complemento de proveedor en tiempo real está cargado y registrado.
- `realtime.provider` no está configurado o nombra un proveedor registrado.
- La clave API del proveedor está disponible para el proceso Gateway.
- `openclaw logs --follow` muestra que se sirvió el TwiML en tiempo real, que se inició el puente en tiempo real
  y que se puso en cola el saludo inicial.

## Relacionado

- [Modo de conversación](/es/nodes/talk)
- [Texto a voz](/es/tools/tts)
- [Activación por voz](/es/nodes/voicewake)
