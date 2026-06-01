---
summary: "Expone un endpoint HTTP /v1/chat/completions compatible con OpenAI desde el Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "Completaciones de chat de OpenAI"
---

El Gateway de OpenClaw puede servir un pequeño punto de conexión de Chat Completions compatible con OpenAI.

Este punto final está **deshabilitado por defecto**. Habilítelo primero en la configuración.

- `POST /v1/chat/completions`
- Mismo puerto que el Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/v1/chat/completions`

Cuando la superficie HTTP compatible con OpenAI del Gateway está habilitada, también sirve:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal del Gateway (mismo camino de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con su Gateway.

## Autenticación

Utiliza la configuración de autenticación de la puerta de enlace.

Rutas comunes de autenticación HTTP:

- autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`):
  `Authorization: Bearer <token-or-password>`
- autenticación HTTP de identidad confiable (`gateway.auth.mode="trusted-proxy"`):
  enrutar a través del proxy con reconocimiento de identidad configurado y permitirle inyectar los
  encabezados de identidad requeridos
- autenticación abierta de entrada privada (`gateway.auth.mode="none"`):
  no se requiere encabezado de autenticación

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Cuando `gateway.auth.mode="trusted-proxy"`, la solicitud HTTP debe provenir de una
  fuente de proxy confiable configurada; los proxies de bucle invertido del mismo host requieren
  `gateway.auth.trustedProxy.allowLoopback = true` explícito.
- Los llamadores internos del mismo host que omiten el proxy pueden usar
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` como alternativa
  directa local. Cualquier evidencia de encabezado `Forwarded`, `X-Forwarded-*` o `X-Real-IP`
  mantiene la solicitud en la ruta del proxy de confianza.
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el punto final devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este punto final como una superficie de **acceso total de operador** para la instancia de puerta de enlace.

- La autenticación HTTP de portador aquí no es un modelo de ámbito estrecho por usuario.
- Un token/contraseña de puerta de enlace válido para este punto final debe tratarse como una credencial de propietariooperador.
- Las solicitudes se ejecutan a través de la misma ruta del agente del plano de control que las acciones de operador de confianza.
- No hay un límite de herramienta separado para no propietario/por usuario en este punto final; una vez que un autor de la llamada pasa la autenticación de la puerta de enlace aquí, OpenClaw trata a ese autor de la llamada como un operador de confianza para esta puerta de enlace.
- Para los modos de autenticación de secreto compartido (`token` y `password`), el punto final restaura los valores predeterminados completos normales del operador incluso si el remitente envía un encabezado `x-openclaw-scopes` más estrecho.
- Los modos HTTP con identidad confiable (por ejemplo, autenticación de proxy confiable o `gateway.auth.mode="none"`) respetan `x-openclaw-scopes` cuando están presentes y, de lo contrario, recurren al conjunto de ámbitos predeterminados del operador normal.
- Si la política del agente de destino permite herramientas sensibles, este punto final puede usarlas.
- Mantenga este punto final solo en loopback/tailnet/ingreso privado; no lo exponga directamente a Internet pública.

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador de la puerta de enlace
  - ignora `x-openclaw-scopes` más estrechos
  - restaura el conjunto completo de ámbitos predeterminados del operador:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - trata los turnos de chat en este punto final como turnos de remitente propietario
- modos HTTP con identidad confiable (por ejemplo, autenticación de proxy confiable o `gateway.auth.mode="none"` en ingreso privado)
  - autenticar alguna identidad confiable externa o límite de implementación
  - respetan `x-openclaw-scopes` cuando el encabezado está presente
  - recurrir al conjunto de ámbitos predeterminados del operador normal cuando el encabezado está ausente
  - solo pierden la semántica de propietario cuando el llamador restringe explícitamente los ámbitos y omite `operator.admin`

Consulte [Seguridad](/es/gateway/security) y [Acceso remoto](/es/gateway/remote).

## Cuándo usar este punto final

Use `/v1/chat/completions` cuando esté integrando herramientas o un backend confiable del lado de la aplicación con una puerta de enlace existente y pueda mantener de forma segura las credenciales del operador de la puerta de enlace.

- Prefiera esto a agregar un canal integrado nuevo cuando su integración sea simplemente otra superficie de operador/cliente para la misma puerta de enlace.
- Para clientes móviles nativos que se conectan directamente a una puerta de enlace remota, se prefiere [WebChat](/es/web/webchat) o el [Protocolo de puerta de enlace](/es/gateway/protocol) e implementar el flujo de inicialización de dispositivo emparejado/token de dispositivo para que el dispositivo no necesite un token/contraseña HTTP compartido.
- En su lugar, cree un complemento de canal cuando esté integrando una red de mensajería externa con sus propios usuarios, salas, entrega de webhooks o transporte de salida. Consulte [Creación de complementos](/es/plugins/building-plugins).

## Contrato de modelo centrado en agentes

OpenClaw trata el campo OpenAI `model` como un **objetivo de agente**, no como una identificación de modelo de proveedor sin procesar.

- `model: "openclaw"` enruta al agente predeterminado configurado.
- `model: "openclaw/default"` también enruta al agente predeterminado configurado.
- `model: "openclaw/<agentId>"` enruta a un agente específico.

Encabezados de solicitud opcionales:

- `x-openclaw-model: <provider/model-or-bare-id>` anula el modelo backend para el agente seleccionado.
- `x-openclaw-agent-id: <agentId>` sigue siendo compatible como anulación de compatibilidad.
- `x-openclaw-session-key: <sessionKey>` controla completamente el enrutamiento de la sesión.
- `x-openclaw-message-channel: <channel>` establece el contexto de canal de ingreso sintético para indicaciones y políticas conscientes del canal.

Alias de compatibilidad aún aceptados:

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## Habilitar el endpoint

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

## Deshabilitar el endpoint

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

De forma predeterminada, el endpoint es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena de OpenAI `user`, la Gateway deriva una clave de sesión estable a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

Para aplicaciones personalizadas, la opción predeterminada más segura es reutilizar el mismo valor de `user` por hilo de conversación. Evite identificadores de nivel de cuenta a menos que desee explícitamente que múltiples conversaciones o dispositivos compartan una sesión de OpenClaw. Use `x-openclaw-session-key` cuando necesite un control de enrutamiento explícito entre varios clientes o hilos.

## Por qué esta superficie es importante

Este es el conjunto de compatibilidad de mayor impacto para frontends autohospedados y herramientas:

- La mayoría de las configuraciones de Open WebUI, LobeChat y LibreChat esperan `/v1/models`.
- Muchos sistemas RAG esperan `/v1/embeddings`.
- Los clientes de chat existentes de OpenAI generalmente pueden comenzar con `/v1/chat/completions`.
- Los clientes más nativos de agentes cada vez prefieren más `/v1/responses`.

## Lista de modelos y enrutamiento de agentes

<AccordionGroup>
  <Accordion title="¿Qué devuelve `/v1/models`?">
    Una lista de objetivos de agente de OpenClaw.

    Los ids devueltos son entradas `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
    Úselos directamente como valores de OpenAI `model`.

  </Accordion>
  <Accordion title="¿`/v1/models` enumera agentes o sub-agentes?">
    Enumera los destinos de agentes de nivel superior, no los modelos de proveedores de backend ni los sub-agentes.

    Los sub-agentes siguen siendo una topología de ejecución interna. No aparecen como pseudo-modelos.

  </Accordion>
  <Accordion title="¿Por qué se incluye `openclaw/default`?">
    `openclaw/default` es el alias estable para el agente predeterminado configurado.

    Eso significa que los clientes pueden seguir usando un id predecible incluso si el id real del agente predeterminado cambia entre entornos.

  </Accordion>
  <Accordion title="¿Cómo anulo el modelo del backend?">
    Use `x-openclaw-model`.

    Ejemplos:
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    Si lo omite, el agente seleccionado se ejecuta con su elección de modelo configurada normal.

  </Accordion>
  <Accordion title="¿Cómo se ajustan los incrustaciones (embeddings) a este contrato?">
    `/v1/embeddings` usa los mismos ids de `model` de destino de agente.

    Use `model: "openclaw/default"` o `model: "openclaw/<agentId>"`.
    Cuando necesite un modelo de incrustación específico, envíelo en `x-openclaw-model`.
    Sin ese encabezado, la solicitud pasa a la configuración de incrustación normal del agente seleccionado.

  </Accordion>
</AccordionGroup>

## Streaming (SSE)

Establezca `stream: true` para recibir Server-Sent Events (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `data: <json>`
- El flujo termina con `data: [DONE]`

## Contrato de herramientas de chat

`/v1/chat/completions` admite un subconjunto de herramientas de función compatible con los clientes comunes de OpenAI Chat.

### Campos de solicitud admitidos

- `tools`: matriz de `{ "type": "function", "function": { ... } }`
- `tool_choice`: `"auto"`, `"none"`
- `messages[*].role: "tool"` turnos de seguimiento
- `messages[*].tool_call_id` para vincular los resultados de las herramientas a una llamada de herramienta anterior
- `max_completion_tokens`: número; límite por llamada para el total de tokens de finalización (tokens de razonamiento incluidos). Nombre de campo actual de OpenAI Chat Completions; preferido cuando se envían tanto `max_completion_tokens` como `max_tokens`.
- `max_tokens`: número; alias heredado aceptado para compatibilidad con versiones anteriores. Se ignora cuando `max_completion_tokens` también está presente.
- `temperature`: número; temperatura de muestreo de mejor esfuerzo enviada al proveedor upstream a través del canal agent stream-param.
- `top_p`: número; muestreo de núcleo (nucleus sampling) de mejor esfuerzo enviado al proveedor upstream a través del canal agent stream-param.
- `frequency_penalty`: número; penalización de frecuencia de mejor esfuerzo reenviada al proveedor ascendente a través del canal de parámetros de flujo del agente. Rango validado: -2.0 a 2.0. Devuelve `400 invalid_request_error` para valores fuera de rango.
- `presence_penalty`: número; penalización de presencia de mejor esfuerzo reenviada al proveedor ascendente a través del canal de parámetros de flujo del agente. Rango validado: -2.0 a 2.0. Devuelve `400 invalid_request_error` para valores fuera de rango.
- `seed`: número (entero); semilla de mejor esfuerzo reenviada al proveedor ascendente a través del canal de parámetros de flujo del agente. Devuelve `400 invalid_request_error` para valores no enteros.

Cuando se establece cualquier campo de límite de tokens, el valor se reenvía al proveedor ascendente a través del canal de parámetros de flujo del agente. El nombre real del campo de cable enviado al proveedor ascendente es elegido por el transporte del proveedor: `max_completion_tokens` para puntos finales de la familia OpenAI, y `max_tokens` para proveedores que solo aceptan el nombre heredado (como Mistral y Chutes). Los campos de muestreo (`temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `seed`) siguen el mismo canal de parámetros de flujo; el backend de Respuestas de Codex basado en ChatGPT los elimina en el servidor ya que utiliza un muestreo fijo.

### Variantes no compatibles

El punto final devuelve `400 invalid_request_error` para variantes de herramientas no compatibles, incluyendo:

- `tools` que no es una matriz
- entradas de herramienta que no son funciones
- falta `tool.function.name`
- variantes de `tool_choice` como `allowed_tools` y `custom`
- `tool_choice: "required"` (aún no aplicado en tiempo de ejecución; se admitirá una vez que se implemente la aplicación estricta)
- `tool_choice: { "type": "function", "function": { "name": "..." } }` (el mismo motivo que `required`)
- valores de `tool_choice.function.name` que no coinciden con `tools` proporcionado

### Forma de respuesta de herramienta sin transmisión

Cuando el agente decide llamar a las herramientas, la respuesta utiliza:

- `choices[0].finish_reason = "tool_calls"`
- entradas de `choices[0].message.tool_calls[]` con:
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments` (cadena JSON)

El comentario del asistente antes de la llamada a la herramienta se devuelve en `choices[0].message.content` (posiblemente vacío).

### Forma de respuesta de herramienta con transmisión

Cuando `stream: true`, las llamadas a herramientas se emiten como fragmentos SSE incrementales:

- delta inicial de rol de asistente
- deltas opcionales de comentarios del asistente
- uno o más fragmentos de `delta.tool_calls` que transportan la identidad de la herramienta y fragmentos de argumentos
- fragmento final con `finish_reason: "tool_calls"`
- `data: [DONE]`

Si `stream_options.include_usage=true`, se emite un fragmento de uso final antes de `[DONE]`.

### Bucle de seguimiento de herramientas

Después de recibir `tool_calls`, el cliente debe ejecutar la(s) función(es) solicitada(s) y enviar una solicitud de seguimiento que incluya:

- mensaje previo de llamada a herramienta del asistente
- uno o más mensajes de `role: "tool"` con `tool_call_id` coincidente

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
- Si deseas un proveedor/modelo de backend específico para ese agente, establece el modelo predeterminado normal del agente o envía `x-openclaw-model`

Prueba rápida:

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Si eso devuelve `openclaw/default`, la mayoría de las configuraciones de Open WebUI pueden conectarse con la misma URL base y token.

## Ejemplos

Sesión estable para una conversación de la aplicación:

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "user": "conv:YOUR_CONVERSATION_ID",
    "messages": [{"role":"user","content":"Summarize my tasks for today"}]
  }'
```

Reutiliza el mismo valor de `user` en llamadas posteriores para esa conversación para continuar la misma sesión del agente.

Sin transmisión (Non-streaming):

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Con transmisión (Streaming):

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

Crear incrustaciones (embeddings):

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

- `/v1/models` devuelve los destinos de los agentes de OpenClaw, no los catálogos brutos de los proveedores.
- `openclaw/default` siempre está presente para que un id estable funcione en diferentes entornos.
- Las anulaciones del proveedor/modelo de backend pertenecen a `x-openclaw-model`, no al campo `model` de OpenAI.
- `/v1/embeddings` admite `input` como una cadena o una matriz de cadenas.

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [OpenAI](/es/providers/openai)
