---
summary: "Complemento de llamada de voz: llamadas salientes + entrantes a través de Twilio/Telnyx/Plivo (instalación del complemento + configuración + CLI)"
read_when:
  - You want to place an outbound voice call from OpenClaw
  - You are configuring or developing the voice-call plugin
title: "Complemento de llamada de voz"
---

# Llamada de voz (complemento)

Llamadas de voz para OpenClaw a través de un complemento. Soporta notificaciones salientes y conversaciones de varios turnos con políticas entrantes.

Proveedores actuales:

- `twilio` (Voz programable + Transmisiones de medios)
- `telnyx` (Control de llamadas v2)
- `plivo` (API de voz + transferencia XML + voz GetInput)
- `mock` (desarrollo/sin red)

Modelo mental rápido:

- Instalar complemento
- Reiniciar Gateway
- Configurar en `plugins.entries.voice-call.config`
- Usar `openclaw voicecall ...` o la herramienta `voice_call`

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
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
```

Reinicie el Gateway después.

## Configuración

Establezca la configuración en `plugins.entries.voice-call.config`:

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
            streamPath: "/voice/stream",
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
- Telnyx requiere `telnyx.publicKey` (o `TELNYX_PUBLIC_KEY`) a menos que `skipSignatureVerification` sea verdadero.
- `skipSignatureVerification` es solo para pruebas locales.
- Si usa el nivel gratuito de ngrok, configure `publicUrl` en la URL exacta de ngrok; siempre se exige la verificación de firma.
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` permite webhooks de Twilio con firmas no válidas **solo** cuando `tunnel.provider="ngrok"` y `serve.bind` es loopback (agente local ngrok). Use solo para desarrollo local.
- Las URL del nivel gratuito de Ngrok pueden cambiar o agregar un comportamiento intersticial; si `publicUrl` cambia, las firmas de Twilio fallarán. Para producción, prefiera un dominio estable o un embudo Tailscale.
- Valores predeterminados de seguridad de transmisión:
  - `streaming.preStartTimeoutMs` cierra los sockets que nunca envían un marco `start` válido.
  - `streaming.maxPendingConnections` limita el total de sockets de preinicio no autenticados.
  - `streaming.maxPendingConnectionsPerIp` limita los sockets de preinicio no autenticados por IP de origen.
  - `streaming.maxConnections` limita el total de sockets de flujo de medios abiertos (pendientes + activos).

## Segadora de llamadas obsoletas

Use `staleCallReaperSeconds` para finalizar llamadas que nunca reciben un webhook terminal
(por ejemplo, llamadas en modo de notificación que nunca se completan). El valor predeterminado es `0`
(deshabilitado).

Rangos recomendados:

- **Producción:** `120`–`300` segundos para flujos de estilo de notificación.
- Mantenga este valor **más alto que `maxDurationSeconds`** para que las llamadas normales puedan
  finalizar. Un buen punto de partida es `maxDurationSeconds + 30–60` segundos.

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

## Seguridad del Webhook

Cuando un proxy o túnel se encuentra delante de la puerta de enlace (Gateway), el complemento reconstruye la
URL pública para la verificación de firmas. Estas opciones controlan qué encabezados reenviados
son de confianza.

`webhookSecurity.allowedHosts` pone en la lista blanca los hosts de los encabezados de reenvío.

`webhookSecurity.trustForwardingHeaders` confía en los encabezados reenviados sin una lista blanca.

`webhookSecurity.trustedProxyIPs` solo confía en los encabezados reenviados cuando la IP
remota de la solicitud coincide con la lista.

La protección de repetición de webhook está habilitada para Twilio y Plivo. Las solicitudes de webhook válidas repetidas
se reconocen pero se omiten para efectos secundarios.

Los turnos de conversación de Twilio incluyen un token por turno en las devoluciones de llamada `<Gather>`, por lo que
las devoluciones de llamada de voz obsoletas/repetidas no pueden satisfacer un turno de transcripción pendiente más reciente.

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

Voice Call utiliza la configuración `messages.tts` principal (OpenAI o ElevenLabs) para
la transmisión de voz en las llamadas. Puede anularla en la configuración del complemento con la
**misma estructura**; se fusiona profundamente con `messages.tts`.

```json5
{
  tts: {
    provider: "elevenlabs",
    elevenlabs: {
      voiceId: "pMsXgVXv3BLzUgSXRplE",
      modelId: "eleven_multilingual_v2",
    },
  },
}
```

Notas:

- **Edge TTS se ignora para las llamadas de voz** (el audio de telefonía necesita PCM; la salida de Edge no es confiable).
- Se utiliza el TTS principal cuando la transmisión de medios de Twilio está habilitada; de lo contrario, las llamadas recurren a las voces nativas del proveedor.

### Más ejemplos

Usar solo el TTS principal (sin anulación):

```json5
{
  messages: {
    tts: {
      provider: "openai",
      openai: { voice: "alloy" },
    },
  },
}
```

Sobrescribir a ElevenLabs solo para llamadas (mantener el predeterminado principal en otros lugares):

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
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
}
```

Sobrescribir solo el modelo de OpenAI para llamadas (ejemplo de fusión profunda):

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            openai: {
              model: "gpt-4o-mini-tts",
              voice: "marin",
            },
          },
        },
      },
    },
  },
}
```

## Llamadas entrantes

La política entrante tiene como valor predeterminado `disabled`. Para habilitar las llamadas entrantes, establezca:

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` es un filtro de identificación de llamante de baja seguridad. El complemento normaliza el valor `From` proporcionado por el proveedor y lo compara con `allowFrom`. La verificación del webhook autentica la entrega del proveedor y la integridad de la carga útil, pero no prueba la propiedad del número de llamada PSTN/VoIP. Trate `allowFrom` como un filtrado de identificación de llamante, no como una identidad de llamante fuerte.

Las respuestas automáticas utilizan el sistema de agentes. Ajuste con:

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall expose --mode funnel
```

## Herramienta de agente

Nombre de la herramienta: `voice_call`

Acciones:

- `initiate_call` (mensaje, para?, modo?)
- `continue_call` (callId, mensaje)
- `speak_to_user` (callId, mensaje)
- `end_call` (callId)
- `get_status` (callId)

Este repositorio incluye un documento de habilidad correspondiente en `skills/voice-call/SKILL.md`.

## RPC de puerta de enlace

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)

import es from "/components/footer/es.mdx";

<es />
