---
summary: "Configuración del canal SMS de Twilio, controles de acceso y configuración de webhooks"
read_when:
  - You want to connect OpenClaw to SMS through Twilio
  - You need SMS webhook or allowlist setup
title: "SMS"
---

OpenClaw puede recibir y enviar SMS a través de un número de teléfono de Twilio o de un Servicio de mensajería. El Gateway registra una ruta de webhook entrante, valida las firmas de las solicitudes de Twilio de manera predeterminada y envía respuestas a través de la API de Mensajes de Twilio.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política DM predeterminada para SMS es emparejamiento.
  </Card>
  <Card title="Seguridad del Gateway" icon="shield" href="/es/gateway/security">
    Revise la exposición del webhook y los controles de acceso del remitente.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Antes de empezar

Necesitas:

- Una cuenta de Twilio con un número de teléfono capaz de enviar SMS o un Servicio de mensajería de Twilio.
- El SID de cuenta de Twilio y el token de autenticación (Auth Token).
- Una URL HTTPS pública que llegue a tu Gateway de OpenClaw.
- Una elección de política de remitente: `pairing` para uso privado, `allowlist` para números de teléfono preaprobados o `open` solo para acceso SMS intencionalmente público.

Use un número de Twilio tanto para SMS como para llamadas de voz si el número tiene ambas capacidades. Configure el webhook de SMS y el webhook de voz por separado en Twilio; esta página cubre solo el webhook de SMS.

## Configuración rápida

<Steps>
  <Step title="Crear o elegir un remitente de Twilio">
    En Twilio, abra **Phone Numbers > Manage > Active numbers** y elija un número con capacidad de SMS. Guarde:

    - Account SID, por ejemplo `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    - Auth Token
    - Número de teléfono del remitente, por ejemplo `+15551234567`

    Si usa un Servicio de mensajería en lugar de un número de remitente fijo, guarde el SID del Servicio de mensajería, por ejemplo `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

  </Step>

  <Step title="Configure the SMS channel">

Guarde esto como `sms.patch.json5` y cambie los marcadores de posición:

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

Aplíquelo:

```bash
openclaw config patch --file ./sms.patch.json5 --dry-run
openclaw config patch --file ./sms.patch.json5
```

  </Step>

  <Step title="Point Twilio at the Gateway webhook">
    En la configuración del número de teléfono de Twilio, abra **Messaging** y configure **A message comes in** en:

```text
https://gateway.example.com/webhooks/sms
```

    Use HTTP `POST`. La ruta local predeterminada es `/webhooks/sms`; cambie `channels.sms.webhookPath` si necesita una ruta diferente.

  </Step>

  <Step title="Expose the exact SMS webhook path">
    Su URL pública debe enrutar la ruta de SMS al proceso Gateway. Si usa Tailscale Funnel para pruebas locales, exponga `/webhooks/sms` explícitamente:

```bash
tailscale funnel --bg --set-path /webhooks/sms http://127.0.0.1:<gateway-port>/webhooks/sms
tailscale funnel status
```

    Llamadas de voz y SMS usan rutas de webhook separadas. Si el mismo número de Twilio maneja ambos, mantenga ambas rutas configuradas en Twilio y en su túnel.

  </Step>

  <Step title="Start the Gateway and approve first sender">

```bash
openclaw gateway
```

Envíe un mensaje de texto al número de Twilio. El primer mensaje crea una solicitud de emparejamiento. Apruébela:

```bash
openclaw pairing list sms
openclaw pairing approve sms <CODE>
```

    Los códigos de emparejamiento caducan después de 1 hora.

  </Step>
</Steps>

## Ejemplos de configuración

### Archivo de configuración

Use la configuración de archivo de configuración cuando desee que la definición del canal viaje con la configuración del Gateway:

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

### Variables de entorno

Use la configuración de env para implementaciones de una sola cuenta donde los secretos provienen del entorno del host:

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="<twilio-auth-token>"
export TWILIO_PHONE_NUMBER="+15551234567"
export SMS_PUBLIC_WEBHOOK_URL="https://gateway.example.com/webhooks/sms"
```

Luego habilite el canal en la configuración:

```json5
{
  channels: {
    sms: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

`TWILIO_SMS_FROM` se acepta como alias para `TWILIO_PHONE_NUMBER`. Use `TWILIO_MESSAGING_SERVICE_SID` en lugar de un remitente de número de teléfono cuando Twilio deba elegir el remitente de un Servicio de mensajería.

### Token de autenticación SecretRef

`authToken` puede ser un SecretRef. Use esto cuando el Gateway debe resolver el Token de autenticación de Twilio desde el tiempo de ejecución de secretos de OpenClaw en lugar de almacenar configuración en texto plano:

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: { source: "env", provider: "default", id: "TWILIO_AUTH_TOKEN" },
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

La variable de entorno o el proveedor de secretos referenciado debe ser visible para el tiempo de ejecución del Gateway. Reinicie los procesos del Gateway administrados después de cambiar las variables de entorno del host.

### Número privado solo con lista de permitidos

Use `allowlist` cuando solo los números de teléfono conocidos deban poder comunicarse con el agente:

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "allowlist",
      allowFrom: ["+15557654321"],
    },
  },
}
```

### Remitente del Servicio de Mensajería

Use `messagingServiceSid` en lugar de `fromNumber` cuando Twilio debe elegir el remitente a través de un Servicio de Mensajería:

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

Si tanto `fromNumber` como `messagingServiceSid` están presentes después de la resolución de configuración y entorno, se usa `fromNumber`.

### Destino saliente predeterminado

Establezca `defaultTo` cuando la entrega iniciada por automatización o agente debe tener un destino predeterminado si un flujo de envío omite un objetivo explícito:

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      defaultTo: "+15557654321",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
    },
  },
}
```

## Control de acceso

`channels.sms.dmPolicy` controla el acceso directo por SMS:

- `pairing` (predeterminado)
- `allowlist` (requiere al menos un remitente en `allowFrom`)
- `open` (requiere que `allowFrom` incluya `"*"`)
- `disabled`

Las entradas de `allowFrom` deben ser números de teléfono E.164 como `+15551234567`. Se aceptan y normalizan los prefijos `sms:`. Para un asistente privado, prefiera `dmPolicy: "allowlist"` con números de teléfono explícitos.

## Envío de SMS

Los objetivos de SMS salientes usan el prefijo de servicio `sms:` con el canal SMS seleccionado:

```bash
openclaw message send --channel sms --target sms:+15551234567 --message "hello"
```

Cuando la selección del canal es implícita, `twilio-sms:+15551234567` selecciona este canal sin tomar el control del prefijo de servicio `sms:` propiedad del canal existente usado por iMessage.

```bash
openclaw message send --target twilio-sms:+15551234567 --message "hello"
```

La CLI requiere un `--target` explícito. `defaultTo` es para rutas de entrega iniciadas por automatización o agente donde el objetivo se puede resolver desde la configuración del canal.

Las respuestas del agente de conversaciones SMS entrantes regresan automáticamente al remitente a través del remitente de Twilio configurado.

La salida de SMS es texto plano. OpenClaw elimina el formato markdown, aplana los bloques de código delimitados, preserva los enlaces legibles y divide las respuestas largas antes de enviarlas a través de Twilio.

## Verificar la configuración

Una vez que se inicie la Gateway:

1. Confirme que el registro de la Gateway muestra la ruta del webhook de SMS.
2. Ejecute una prueba desde el lado de Twilio:

```bash
openclaw channels capabilities --channel sms
openclaw channels status --channel sms --probe --json
```

3. Envíe un SMS al número de Twilio desde su teléfono.
4. Ejecute `openclaw pairing list sms`.
5. Apruebe el código de emparejamiento con `openclaw pairing approve sms <CODE>`.
6. Envíe otro SMS y confirme que el agente responda.

Para pruebas solo de salida, use:

```bash
openclaw message send --channel sms --target sms:+15557654321 --message "OpenClaw SMS test"
```

### Prueba de extremo a extremo desde iMessage/SMS de macOS

En una Mac que pueda enviar SMS de operadora a través de Mensajes, puede usar `imsg` para controlar el lado del remitente sin tocar su teléfono:

```bash
imsg send --to "+15551234567" --service sms --text "OpenClaw SMS E2E $(date -u +%Y%m%dT%H%M%SZ)" --json
openclaw pairing list sms
openclaw pairing approve sms <CODE>
imsg send --to "+15551234567" --service sms --text "reply exactly SMS pong" --json
```

El primer mensaje debe crear una solicitud de emparejamiento. El segundo mensaje debe recibir la respuesta del agente a través de Twilio.

## Seguridad del webhook

De forma predeterminada, OpenClaw valida `X-Twilio-Signature` usando `publicWebhookUrl` y `authToken`. Mantenga `publicWebhookUrl` alineado byte por byte con la URL configurada en Twilio, incluido el esquema, el host, la ruta y la cadena de consulta.

Solo para pruebas de túnel local, puede establecer:

```json5
{
  channels: {
    sms: {
      dangerouslyDisableSignatureValidation: true,
    },
  },
}
```

No use la validación de firma deshabilitada en una Gateway pública.

## Configuración multicuenta

Use `accounts` cuando opere más de un número de Twilio:

```json5
{
  channels: {
    sms: {
      accounts: {
        support: {
          enabled: true,
          accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          authToken: "twilio-auth-token",
          fromNumber: "+15551234567",
          publicWebhookUrl: "https://gateway.example.com/webhooks/sms/support",
          webhookPath: "/webhooks/sms/support",
          dmPolicy: "allowlist",
          allowFrom: ["+15557654321"],
        },
      },
    },
  },
}
```

Cada cuenta debe usar un `webhookPath` distinto.

## Solución de problemas

### Twilio devuelve 403 u OpenClaw rechaza el webhook

Compruebe que `publicWebhookUrl` coincida exactamente con la URL configurada en Twilio, incluido el esquema, el host, la ruta y la cadena de consulta. Twilio firma la cadena de URL pública, por lo que las reescrituras de proxy y los nombres de host alternativos pueden romper la validación de la firma.

### No aparece ninguna solicitud de emparejamiento

Verifique la URL y el método del webhook de **Mensajería** (Messaging) del número de Twilio. Debe apuntar a la URL del webhook de SMS y usar `POST`. También confirme que la Gateway sea accesible desde la Internet pública o a través de su túnel.

Si el registro de mensajes de Twilio muestra el error `11200`, Twilio aceptó el SMS entrante pero no pudo alcanzar su webhook. Verifique:

- Twilio **Messaging > A message comes in** (Mensajería > Llega un mensaje) apunta a `publicWebhookUrl`.
- El método es `POST`.
- El túnel o proxy inverso expone exactamente el `webhookPath`; para Tailscale Funnel, ejecute `tailscale funnel status` y confirme que `/webhooks/sms` esté listado.
- `publicWebhookUrl` usa el mismo esquema, host, ruta y cadena de consulta que envía Twilio, por lo que la validación de firma puede reproducir la URL firmada.

### Fallo en el envío de salientes

Confirme que `accountSid`, `authToken` y `fromNumber` o `messagingServiceSid` están resueltos. Si usa una cuenta de prueba de Twilio, es posible que el número de destino deba ser verificado en Twilio antes de que se envíe el SMS saliente.

### Los mensajes llegan pero el agente no responde

Verifique `dmPolicy` y `allowFrom`. Con la política `pairing` predeterminada, el remitente debe ser aprobado antes de que se procesen los turnos normales del agente.
