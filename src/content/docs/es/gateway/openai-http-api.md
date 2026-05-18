---
summary: "Expone un endpoint HTTP /v1/chat/completions compatible con OpenAI desde el Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

El Gateway de OpenClaw puede servir un pequeño punto de conexión de Chat Completions compatible con OpenAI.

Este punto final está **deshabilitado por defecto**. Habilítelo primero en la configuración.

- `POST /v1/chat/completions`
- Mismo puerto que la puerta de enlace (WS + HTTP multiplex): `http://<gateway-host>:<port>/v1/chat/completions`

Cuando la superficie HTTP compatible con OpenAI del Gateway está habilitada, también sirve:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal de la puerta de enlace (mismo camino de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con su puerta de enlace.

## Autenticación

Utiliza la configuración de autenticación de la puerta de enlace.

Rutas comunes de autenticación HTTP:

- autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`):
  `Authorization: Bearer <token-or-password>`
- autenticación HTTP de identidad confiable (`gateway.auth.mode="trusted-proxy"`):
  enrute a través del proxy con conocimiento de identidad configurado y déjelo inyectar los
  encabezados de identidad requeridos
- autenticación abierta de ingreso privado (`gateway.auth.mode="none"`):
  no se requiere encabezado de autenticación

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Cuando `gateway.auth.mode="trusted-proxy"`, la solicitud HTTP debe provenir de una
  fuente de proxy de confianza configurada; los proxies de bucle de retorno del mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito.
- Los llamadores internos del mismo host que omiten el proxy pueden usar
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` como alternativa
  directa local. Cualquier evidencia de encabezado `Forwarded`, `X-Forwarded-*` o `X-Real-IP`
  mantiene la solicitud en la ruta del proxy de confianza.
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados errores de autenticación, el punto final devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este punto final como una superficie de **acceso total de operador** para la instancia de puerta de enlace.

- La autenticación HTTP de portador aquí no es un modelo de ámbito estrecho por usuario.
- Un token/contraseña de puerta de enlace válido para este punto final debe tratarse como una credencial de propietariooperador.
- Las solicitudes se ejecutan a través de la misma ruta del agente del plano de control que las acciones de operador de confianza.
- No hay un límite de herramienta separado para no propietario/por usuario en este punto final; una vez que un autor de la llamada pasa la autenticación de la puerta de enlace aquí, OpenClaw trata a ese autor de la llamada como un operador de confianza para esta puerta de enlace.
- Para los modos de autenticación de secreto compartido (`token` y `password`), el punto final restaura los valores predeterminados normales de operador completo, incluso si el autor de la llamada envía un encabezado `x-openclaw-scopes` más estrecho.
- Los modos HTTP de identidad portadora de confianza (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"`) respetan `x-openclaw-scopes` cuando está presente y, de lo contrario, vuelven al conjunto de ámbitos predeterminados del operador normal.
- Si la política del agente de destino permite herramientas sensibles, este punto final puede usarlas.
- Mantenga este punto final solo en loopback/tailnet/ingreso privado; no lo exponga directamente a Internet pública.

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador de la puerta de enlace
  - ignora `x-openclaw-scopes` más estrecho
  - restaura el conjunto completo de ámbitos predeterminados del operador:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - trata los turnos de chat en este punto final como turnos de remitente propietario
- modos HTTP de identidad confiable (por ejemplo, autenticación de proxy confiable o `gateway.auth.mode="none"` en entrada privada)
  - autenticar alguna identidad confiable externa o límite de implementación
  - respetar `x-openclaw-scopes` cuando el encabezado está presente
  - recurrir al conjunto de ámbitos predeterminados del operador normal cuando el encabezado está ausente
  - solo perder la semántica de propietario cuando el llamador restringe explícitamente los ámbitos y omite `operator.admin`

Consulte [Seguridad](/es/gateway/security) y [Acceso remoto](/es/gateway/remote).

## Contrato de modelo centrado en agentes

OpenClaw trata el campo OpenAI `model` como un **objetivo de agente**, no como una identificación de modelo de proveedor sin procesar.

- `model: "openclaw"` se enruta al agente predeterminado configurado.
- `model: "openclaw/default"` también se enruta al agente predeterminado configurado.
- `model: "openclaw/<agentId>"` se enruta a un agente específico.

Encabezados de solicitud opcionales:

- `x-openclaw-model: <provider/model-or-bare-id>` anula el modelo de backend para el agente seleccionado.
- `x-openclaw-agent-id: <agentId>` sigue siendo compatible como una anulación de compatibilidad.
- `x-openclaw-session-key: <sessionKey>` controla completamente el enrutamiento de la sesión.
- `x-openclaw-message-channel: <channel>` establece el contexto de canal de entrada sintético para sugerencias y políticas conscientes del canal.

Alias de compatibilidad aún aceptados:

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## Habilitar el punto final

Establezca `gateway.http.endpoints.chatCompletions.enabled` en `true`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## Deshabilitar el punto final

Establezca `gateway.http.endpoints.chatCompletions.enabled` en `false`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## Comportamiento de la sesión

De forma predeterminada, el punto final es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena OpenAI `user`, la Gateway deriva una clave de sesión estable a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Por qué es importante esta superficie

Este es el conjunto de compatibilidad de mayor impacto para frontends y herramientas autohospedadas:

- La mayoría de las configuraciones de Open WebUI, LobeChat y LibreChat esperan `/v1/models`.
- Muchos sistemas RAG esperan `/v1/embeddings`.
- Los clientes de chat de OpenAI existentes generalmente pueden comenzar con `/v1/chat/completions`.
- Cada vez más clientes nativos de agentes prefieren `/v1/responses`.

## Lista de modelos y enrutamiento de agentes

<AccordionGroup>
  <Accordion title="¿Qué devuelve `/v1/models`?">
    Una lista de objetivos de agente de OpenClaw.

    Los ids devueltos son `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
    Úsalos directamente como valores de OpenAI `model`.

  </Accordion>
  <Accordion title="¿`/v1/models` enumera agentes o sub-agentes?">
    Enumera los objetivos de agentes de nivel superior, no los modelos del proveedor de backend ni los sub-agentes.

    Los sub-agentes permanecen como topología de ejecución interna. No aparecen como pseudomodelos.

  </Accordion>
  <Accordion title="¿Por qué se incluye `openclaw/default`?">
    `openclaw/default` es el alias estable para el agente predeterminado configurado.

    Eso significa que los clientes pueden seguir usando un id predecible incluso si el id real del agente predeterminado cambia entre entornos.

  </Accordion>
  <Accordion title="¿Cómo anulo el modelo del backend?">
    Usa `x-openclaw-model`.

    Ejemplos:
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    Si lo omites, el agente seleccionado se ejecuta con su elección de modelo configurada normal.

  </Accordion>
  <Accordion title="¿Cómo se integran las incrustaciones (embeddings) en este contrato?">
    `/v1/embeddings` usa los mismos ids `model` de objetivos de agente.

    Usa `model: "openclaw/default"` o `model: "openclaw/<agentId>"`.
    Cuando necesites un modelo de incrustación específico, envíalo en `x-openclaw-model`.
    Sin ese encabezado, la solicitud pasa a la configuración de incrustación normal del agente seleccionado.

  </Accordion>
</AccordionGroup>

## Transmisión (SSE)

Establece `stream: true` para recibir eventos enviados por el servidor (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `data: <json>`
- La transmisión termina con `data: [DONE]`

## Contrato de herramientas de chat

`/v1/chat/completions` admite un subconjunto de herramientas de función compatible con los clientes comunes de OpenAI Chat.

### Campos de solicitud admitidos

- `tools`: matriz de `{ "type": "function", "function": { ... } }`
- `tool_choice`: `"auto"`, `"none"`
- `messages[*].role: "tool"` turnos de seguimiento
- `messages[*].tool_call_id` para vincular los resultados de las herramientas a una llamada de herramienta anterior
- `max_completion_tokens`: número; límite por llamada para el total de tokens de finalización (tokens de razonamiento incluidos). Nombre de campo actual de OpenAI Chat Completions; preferido cuando se envían tanto `max_completion_tokens` como `max_tokens`.
- `max_tokens`: número; alias heredado aceptado por compatibilidad con versiones anteriores. Se ignora cuando `max_completion_tokens` también está presente.
- `temperature`: número; temperatura de muestreo de mejor esfuerzo enviada al proveedor upstream a través del canal de transmisión de parámetros del agente.
- `top_p`: número; muestreo de núcleo de mejor esfuerzo enviado al proveedor upstream a través del canal de transmisión de parámetros del agente.

Cuando se establece cualquier campo de límite de tokens, el valor se reenvía al proveedor upstream a través del canal de transmisión de parámetros del agente. El nombre real del campo de cable enviado al proveedor upstream es elegido por el transporte del proveedor: `max_completion_tokens` para endpoints de la familia OpenAI, y `max_tokens` para proveedores que solo aceptan el nombre heredado (como Mistral y Chutes). Los campos de muestreo (`temperature`, `top_p`) siguen el mismo canal de transmisión de parámetros; el backend de Codex Responses basado en ChatGPT los elimina en el lado del servidor ya que utiliza un muestreo fijo.

### Variantes no admitidas

El endpoint devuelve `400 invalid_request_error` para variantes de herramientas no admitidas, incluyendo:

- `tools` que no es una matriz
- entradas de herramientas que no son funciones
- falta `tool.function.name`
- variantes de `tool_choice` como `allowed_tools` y `custom`
- `tool_choice: "required"` (aún no se aplica en tiempo de ejecución; se admitirá una vez que se implemente la aplicación estricta)
- `tool_choice: { "type": "function", "function": { "name": "..." } }` (el mismo motivo que `required`)
- valores `tool_choice.function.name` que no coinciden con el `tools` proporcionado

### Forma de la respuesta de herramienta sin transmisión

Cuando el agente decide llamar a herramientas, la respuesta utiliza:

- `choices[0].finish_reason = "tool_calls"`
- entradas `choices[0].message.tool_calls[]` con:
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments` (cadena JSON)

Los comentarios del asistente antes de la llamada a la herramienta se devuelven en `choices[0].message.content` (posiblemente vacío).

### Forma de la respuesta de herramienta con transmisión

Cuando `stream: true`, las llamadas a herramientas se emiten como fragmentos incrementales de SSE:

- delta de rol de asistente inicial
- deltas opcionales de comentarios del asistente
- uno o más fragmentos `delta.tool_calls` que llevan la identidad de la herramienta y fragmentos de argumentos
- fragmento final con `finish_reason: "tool_calls"`
- `data: [DONE]`

Si `stream_options.include_usage=true`, se emite un fragmento de uso final antes de `[DONE]`.

### Bucle de seguimiento de herramientas

Después de recibir `tool_calls`, el cliente debe ejecutar la(s) función(es) solicitada(s) y enviar una solicitud de seguimiento que incluya:

- mensaje de llamada a herramienta del asistente anterior
- uno o más mensajes `role: "tool"` con `tool_call_id` coincidentes

Esto permite que la ejecución del agente de puerta de enlace continúe con el mismo bucle de razonamiento y produzca la respuesta final del asistente.

## Configuración rápida de Open WebUI

Para una conexión básica de Open WebUI:

- URL base: `http://127.0.0.1:18789/v1`
- URL base de Docker en macOS: `http://host.docker.internal:18789/v1`
- Clave de API: su token de portador de Gateway
- Modelo: `openclaw/default`

Comportamiento esperado:

- `GET /v1/models` debería listar `openclaw/default`
- Open WebUI debería usar `openclaw/default` como el id del modelo de chat
- Si desea un proveedor/modelo de backend específico para ese agente, configure el modelo predeterminado normal del agente o envíe `x-openclaw-model`

Prueba rápida:

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Si eso devuelve `openclaw/default`, la mayoría de las configuraciones de Open WebUI pueden conectarse con la misma URL base y token.

## Ejemplos

Sin transmisión:

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Con transmisión:

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Listar modelos:

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Obtener un modelo:

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Crear incrustaciones:

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

Notas:

- `/v1/models` devuelve los objetivos del agente de OpenClaw, no los catálogos sin procesar del proveedor.
- `openclaw/default` siempre está presente para que un id estable funcione en todos los entornos.
- Las anulaciones del proveedor/modelo de backend pertenecen a `x-openclaw-model`, no al campo `model` de OpenAI.
- `/v1/embeddings` admite `input` como una cadena o una matriz de cadenas.

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [OpenAI](/es/providers/openai)
