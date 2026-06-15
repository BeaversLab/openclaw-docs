---
summary: "Expone un endpoint HTTP /v1/responses compatible con OpenResponses desde el Gateway"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "API de OpenResponses"
---

El Gateway de OpenClaw puede servir un punto final `POST /v1/responses` compatible con OpenResponses.

Este punto final está **deshabilitado de forma predeterminada**. Habilítelo primero en la configuración.

- `POST /v1/responses`
- Mismo puerto que el Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal del Gateway (mismo camino de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con su Gateway.

## Autenticación, seguridad y enrutamiento

El comportamiento operativo coincide con [OpenAI Chat Completions](/es/gateway/openai-http-api):

- use la ruta de autenticación HTTP del Gateway coincidente:
  - autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`): `Authorization: Bearer <token-or-password>`
  - autenticación de proxy confiable (`gateway.auth.mode="trusted-proxy"`): encabezados de proxy con reconocimiento de identidad de una fuente de proxy confiable configurada; los proxies de bucle de retorno del mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito
  - trusted-proxy local direct fallback: los llamadores del mismo host sin encabezados `Forwarded`, `X-Forwarded-*` o `X-Real-IP` pueden usar `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`
  - private-ingress open auth (`gateway.auth.mode="none"`): sin encabezado de autenticación
- tratar el endpoint como acceso completo de operador para la instancia de gateway
- para los modos de autenticación de secreto compartido (`token` y `password`), ignorar los valores `x-openclaw-scopes` más estrechos declarados por el portador y restaurar los valores predeterminados completos del operador normales
- para los modos HTTP portadores de identidad confiable (por ejemplo, autenticación de proxy confiable o `gateway.auth.mode="none"`), respetar `x-openclaw-scopes` cuando esté presente y, de lo contrario, volver al conjunto predeterminado de ámbito de operador normal
- seleccionar agentes con `model: "openclaw"`, `model: "openclaw/default"`, `model: "openclaw/<agentId>"` o `x-openclaw-agent-id`
- usar `x-openclaw-model` cuando quieras anular el modelo de backend del agente seleccionado
- usar `x-openclaw-session-key` para el enrutamiento explícito de sesiones
- usar `x-openclaw-message-channel` cuando quieras un contexto de canal de entrada sintético no predeterminado

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador de la puerta de enlace
  - ignora `x-openclaw-scopes` más estrechos
  - restaura el conjunto completo de ámbitos predeterminados del operador:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - trata los turnos de chat en este endpoint como turnos de propietario-remitente
- modos HTTP portadores de identidad confiable (por ejemplo, autenticación de proxy confiable o `gateway.auth.mode="none"` en ingreso privado)
  - respeta `x-openclaw-scopes` cuando el encabezado está presente
  - vuelve al conjunto predeterminado de ámbito de operador normal cuando el encabezado está ausente
  - solo pierde la semántica de propietario cuando el llamador limita explícitamente los alcances y omite `operator.admin`

Habilite o deshabilite este punto final con `gateway.http.endpoints.responses.enabled`.

La misma superficie de compatibilidad también incluye:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

Para la explicación canónica de cómo encajan los modelos objetivo de agente, `openclaw/default`, el paso de embeddings y las anulaciones del modelo backend, consulte [OpenAI Chat Completions](/es/gateway/openai-http-api#agent-first-model-contract) y [Model list and agent routing](/es/gateway/openai-http-api#model-list-and-agent-routing).

## Comportamiento de la sesión

De forma predeterminada, el punto final es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena de OpenResponses `user`, el Gateway deriva una clave de sesión estable a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Forma de solicitud (compatible)

La solicitud sigue la API de OpenResponses con entrada basada en elementos. Soporte actual:

- `input`: cadena o matriz de objetos de elementos.
- `instructions`: fusionado en el mensaje del sistema.
- `tools`: definiciones de herramientas de cliente (herramientas de función).
- `tool_choice`: `"auto"`, `"none"`, `"required"` o `{ "type": "function", "name": "..." }` para filtrar o requerir herramientas del cliente.
- `stream`: habilita el streaming SSE.
- `max_output_tokens`: límite de salida de mejor esfuerzo (dependiente del proveedor).
- `temperature`: temperatura de muestreo de mejor esfuerzo enviada al proveedor. Ignorado por el backend Codex Responses basado en ChatGPT, que utiliza muestreo fijo en el servidor.
- `top_p`: muestreo de núcleo de mejor esfuerzo enviado al proveedor. La misma advertencia de Codex Responses que `temperature`.
- `user`: enrutamiento de sesión estable.

Aceptado pero **actualmente ignorado**:

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

Compatible:

- `previous_response_id`: OpenClaw reutiliza la sesión de respuesta anterior cuando la solicitud permanece dentro del mismo ámbito de agente/usuario/sesión solicitada.

## Elementos (entrada)

### `message`

Roles: `system`, `developer`, `user`, `assistant`.

- `system` y `developer` se añaden al mensaje del sistema.
- El elemento `user` o `function_call_output` más reciente se convierte en el "mensaje actual".
- Los mensajes anteriores de usuario/asistente se incluyen como historial para dar contexto.

### `function_call_output` (herramientas por turnos)

Enviar los resultados de las herramientas de vuelta al modelo:

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` y `item_reference`

Se aceptan por compatibilidad con el esquema pero se ignoran al construir el mensaje.

## Herramientas (herramientas de funciones del lado del cliente)

Proporcione herramientas con `tools: [{ type: "function", name, description?, parameters? }]`.

Si el agente decide llamar a una herramienta, la respuesta devuelve un elemento de salida `function_call`.
A continuación, envía una solicitud de seguimiento con `function_call_output` para continuar el turno.

Para `tool_choice: "required"` y `tool_choice` fijadas a funciones, el punto de conexión reduce el conjunto de herramientas de función del cliente expuestas, instruye al tiempo de ejecución para que llame a una herramienta del cliente antes de responder y rechaza el turno si no incluye una llamada de herramienta del cliente estructurada coincidente. Este contrato se aplica a la lista HTTP `tools` proporcionada por el llamador, no a todas las herramientas internas del agente OpenClaw. Las solicitudes sin transmisión devuelven `502` con un `api_error`; las solicitudes con transmisión emiten un evento `response.failed`. Esto coincide con el contrato `/v1/chat/completions`.

## Imágenes (`input_image`)

Soporta fuentes base64 o URL:

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

Tipos MIME permitidos (actualmente): `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`.
Tamaño máximo (actualmente): 10MB.

## Archivos (`input_file`)

Soporta fuentes base64 o URL:

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

Tipos MIME permitidos (actualmente): `text/plain`, `text/markdown`, `text/html`, `text/csv`,
`application/json`, `application/pdf`.

Tamaño máximo (actualmente): 5MB.

Comportamiento actual:

- El contenido del archivo se decodifica y se añade al **system prompt**, no al mensaje de usuario,
  por lo que permanece efímero (no se guarda en el historial de la sesión).
- El texto decodificado del archivo se envuelve como **contenido externo no confiable** antes de añadirse,
  por lo que los bytes del archivo se tratan como datos, no como instrucciones confiables.
- El bloque inyectado utiliza marcadores de límite explícitos como
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` e incluye una
  línea de metadatos `Source: External`.
- Esta ruta de entrada de archivos omite intencionalmente el banner largo `SECURITY NOTICE:` para
  preservar el presupuesto del prompt; los marcadores de límite y los metadatos siguen en su lugar.
- Los PDF se analizan para obtener texto primero. Si se encuentra poco texto, las primeras páginas se rasterizan en imágenes y se pasan al modelo, y el bloque de archivo inyectado utiliza el marcador de posición `[PDF content rendered to images]`.

El análisis de PDF lo proporciona el complemento incluido `document-extract`, que utiliza `clawpdf` y su tiempo de ejecución PDFium WebAssembly empaquetado para la extracción de texto y el renderizado de páginas.

Valores predeterminados de obtención de URL:

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` (total de partes `input_file` + `input_image` basadas en URL por solicitud)
- Las solicitudes están protegidas (resolución DNS, bloqueo de IP privada, límites de redirección, tiempos de espera).
- Se admiten listas de permitidos (allowlists) de nombres de host opcionales por tipo de entrada (`files.urlAllowlist`, `images.urlAllowlist`).
  - Host exacto: `"cdn.example.com"`
  - Subdominios comodín: `"*.assets.example.com"` (no coincide con el vértice)
  - Las listas de permitidos vacías u omitidas significan que no hay restricción de lista de permitidos de nombres de host.
- Para deshabilitar por completo las obtenciones basadas en URL, establezca `files.allowUrl: false` y/o `images.allowUrl: false`.

## Límites de archivo + imagen (configuración)

Los valores predeterminados se pueden ajustar en `gateway.http.endpoints.responses`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

Valores predeterminados cuando se omiten:

- `maxBodyBytes`: 20MB
- `maxUrlParts`: 8
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10s
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 4,000,000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s
- Las fuentes `input_image` HEIC/HEIF se aceptan cuando hay un convertidor del sistema disponible y se normalizan a JPEG antes de la entrega al proveedor. Los convertidores compatibles son macOS `sips`, ImageMagick, GraphicsMagick o ffmpeg.

Nota de seguridad:

- Las listas de permitidos de URL se hacen cumplir antes de la obtención y en los saltos de redirección.
- Permitir un nombre de host no omite el bloqueo de IPs privadas/internas.
- Para gateways expuestos a internet, aplique controles de salida de red además de las protecciones a nivel de aplicación.
  Vea [Seguridad](/es/gateway/security).

## Transmisión (SSE)

Establezca `stream: true` para recibir eventos enviados por el servidor (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `event: <type>` y `data: <json>`
- El flujo termina con `data: [DONE]`

Tipos de eventos emitidos actualmente:

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed` (en caso de error)

## Uso

`usage` se completa cuando el proveedor subyacente informa los recuentos de tokens.
OpenClaw normaliza los alias comunes de estilo OpenAI antes de que esos contadores alcancen
las superficies de estado/sesión descendentes, incluyendo `input_tokens` / `output_tokens`
y `prompt_tokens` / `completion_tokens`.

## Errores

Los errores usan un objeto JSON como:

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

Casos comunes:

- `401` autenticación faltante/no válida
- `400` cuerpo de solicitud no válido
- `405` método incorrecto

## Ejemplos

Sin transmisión:

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

Con transmisión:

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```

## Relacionado

- [Completaciones de chat de OpenAI](/es/gateway/openai-http-api)
- [OpenAI](/es/providers/openai)
