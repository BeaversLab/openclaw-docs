---
summary: "Expone un endpoint HTTP /v1/responses compatible con OpenResponses desde el Gateway"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "API de OpenResponses"
---

# API de OpenResponses (HTTP)

La puerta de enlace de OpenClaw puede servir un punto final `POST /v1/responses` compatible con OpenResponses.

Este endpoint está **desactivado por defecto**. Actívalo primero en la configuración.

- `POST /v1/responses`
- Mismo puerto que la puerta de enlace (multiplexación WS + HTTP): `http://<gateway-host>:<port>/v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal de la puerta de enlace (misma ruta de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con su puerta de enlace.

## Autenticación, seguridad y enrutamiento

El comportamiento operativo coincide con [OpenAI Chat Completions](/es/gateway/openai-http-api):

- use la ruta de autenticación HTTP de la puerta de enlace coincidente:
  - autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`): `Authorization: Bearer <token-or-password>`
  - autenticación de proxy confiable (`gateway.auth.mode="trusted-proxy"`): encabezados de proxy con reconocimiento de identidad de una fuente de proxy confiable configurada que no sea de bucle invertido
  - autenticación abierta de entrada privada (`gateway.auth.mode="none"`): sin encabezado de autenticación
- trate el punto final como acceso completo de operador para la instancia de la puerta de enlace
- para los modos de autenticación de secreto compartido (`token` y `password`), ignore los valores `x-openclaw-scopes` más limitados declarados por el portador y restaure los valores predeterminados normales de operador completo
- para los modos HTTP que portan identidad de confianza (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"`), respete `x-openclaw-scopes` cuando esté presente y, de lo contrario, vuelva al conjunto predeterminado de alcance de operador normal
- seleccione agentes con `model: "openclaw"`, `model: "openclaw/default"`, `model: "openclaw/<agentId>"`, o `x-openclaw-agent-id`
- use `x-openclaw-model` cuando desee anular el modelo backend del agente seleccionado
- use `x-openclaw-session-key` para el enrutamiento explícito de sesiones
- use `x-openclaw-message-channel` cuando desee un contexto de canal de entrada sintético no predeterminado

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto de operador de la puerta de enlace compartida
  - ignora `x-openclaw-scopes` más limitados
  - restaura el conjunto completo de alcances de operador predeterminados:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - trata los turnos de chat en este punto final como turnos de propietario-remitente
- modos HTTP de identidad confiable (por ejemplo, autenticación de proxy confiable, o `gateway.auth.mode="none"` en ingreso privado)
  - respeta `x-openclaw-scopes` cuando el encabezado está presente
  - recurre al conjunto de alcances de operador predeterminados normales cuando el encabezado está ausente
  - solo pierde la semántica de propietario cuando la llamada restringe explícitamente los alcances y omite `operator.admin`

Habilite o deshabilite este punto final con `gateway.http.endpoints.responses.enabled`.

La misma superficie de compatibilidad también incluye:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

Para la explicación canónica de cómo los modelos dirigidos a agentes, `openclaw/default`, el paso directo de incrustaciones y las anulaciones del modelo de backend se ajustan, consulte [OpenAI Chat Completions](/es/gateway/openai-http-api#agent-first-model-contract) y [Model list and agent routing](/es/gateway/openai-http-api#model-list-and-agent-routing).

## Comportamiento de la sesión

De forma predeterminada, el punto final es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena `user` de OpenResponses, el Gateway deriva una clave de sesión estable
a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Forma de la solicitud (admitida)

La solicitud sigue la API de OpenResponses con entrada basada en elementos. Soporte actual:

- `input`: cadena o matriz de objetos de elemento.
- `instructions`: fusionado en el indicador del sistema.
- `tools`: definiciones de herramientas de cliente (herramientas de función).
- `tool_choice`: filtrar o requerir herramientas de cliente.
- `stream`: habilita el streaming SSE.
- `max_output_tokens`: límite de salida de mejor esfuerzo (dependiente del proveedor).
- `user`: enrutamiento de sesión estable.

Aceptado pero **actualmente ignorado**:

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

Soportado:

- `previous_response_id`: OpenClaw reutiliza la sesión de respuesta anterior cuando la solicitud se mantiene dentro del mismo ámbito de agente/usuario/sesión-solicitada.

## Elementos (entrada)

### `message`

Roles: `system`, `developer`, `user`, `assistant`.

- `system` y `developer` se añaden al prompt del sistema.
- El elemento `user` o `function_call_output` más reciente se convierte en el "mensaje actual".
- Los mensajes anteriores de usuario/asistente se incluyen como historial para dar contexto.

### `function_call_output` (herramientas por turnos)

Envíe los resultados de las herramientas de vuelta al modelo:

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` y `item_reference`

Aceptados por compatibilidad con el esquema, pero ignorados al construir el prompt.

## Herramientas (herramientas de función del lado del cliente)

Proporcione herramientas con `tools: [{ type: "function", function: { name, description?, parameters? } }]`.

Si el agente decide llamar a una herramienta, la respuesta devuelve un elemento de salida `function_call`.
A continuación, envía una solicitud de seguimiento con `function_call_output` para continuar el turno.

## Imágenes (`input_image`)

Soporta fuentes base64 o URL:

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

Tipos MIME permitidos (actuales): `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`.
Tamaño máximo (actual): 10MB.

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

Tipos MIME permitidos (actuales): `text/plain`, `text/markdown`, `text/html`, `text/csv`,
`application/json`, `application/pdf`.

Tamaño máximo (actual): 5MB.

Comportamiento actual:

- El contenido del archivo se decodifica y se agrega al **prompt del sistema**, no al mensaje del usuario,
  por lo que permanece efímero (no se persiste en el historial de la sesión).
- El texto del archivo decodificado se envuelve como **contenido externo que no es de confianza** antes de que se agregue, por lo que los bytes del archivo se tratan como datos, no como instrucciones de confianza.
- El bloque inyectado utiliza marcadores de límite explícitos como `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` e incluye una línea de metadatos `Source: External`.
- Esta ruta de entrada de archivo omite intencionalmente el largo banner `SECURITY NOTICE:` para preservar el presupuesto del prompt; los marcadores de límite y los metadatos siguen en su lugar.
- Los PDF se analizan para obtener texto primero. Si se encuentra poco texto, las primeras páginas se rasterizan en imágenes y se pasan al modelo, y el bloque de archivo inyectado utiliza el marcador de posición `[PDF content rendered to images]`.

El análisis de PDF utiliza la compilación heredada `pdfjs-dist` compatible con Node (sin trabajador). La compilación moderna de PDF.js espera trabajadores de navegador/globales DOM, por lo que no se utiliza en la Gateway.

Valores predeterminados de recuperación de URL:

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` (partes totales basadas en URL `input_file` + `input_image` por solicitud)
- Las solicitudes están protegidas (resolución DNS, bloqueo de IP privada, límites de redirección, tiempos de espera).
- Se admiten listas de permitidos de nombres de host opcionales por tipo de entrada (`files.urlAllowlist`, `images.urlAllowlist`).
  - Host exacto: `"cdn.example.com"`
  - Subdominios comodín: `"*.assets.example.com"` (no coincide con el ápice)
  - Las listas de permitidos vacías u omitidas significan que no hay restricción de lista de permitidos de nombres de host.
- Para deshabilitar por completo las recuperaciones basadas en URL, configure `files.allowUrl: false` y/o `images.allowUrl: false`.

## Límites de archivo + imagen (config)

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
- Las fuentes HEIC/HEIF `input_image` se aceptan y normalizan a JPEG antes de la entrega al proveedor.

Nota de seguridad:

- Las listas de permitidos de URL se aplican antes de la recuperación y en los saltos de redirección.
- Permitir un nombre de host no evita el bloqueo de IP privadas/internas.
- Para gateways expuestos a Internet, aplique controles de salida de red además de las protecciones a nivel de aplicación.
  Consulte [Seguridad](/es/gateway/security).

## Transmisión (SSE)

Establezca `stream: true` para recibir Eventos enviados por el servidor (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `event: <type>` y `data: <json>`
- La transmisión termina con `data: [DONE]`

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
OpenClaw normaliza los alias comunes de estilo OpenAI antes de que esos contadores lleguen a
las superficies de estado/sesión descendentes, incluidos `input_tokens` / `output_tokens`
y `prompt_tokens` / `completion_tokens`.

## Errores

Los errores utilizan un objeto JSON como:

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
