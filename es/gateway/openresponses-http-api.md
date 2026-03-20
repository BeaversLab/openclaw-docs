---
summary: "Expone un punto de conexión HTTP /v1/responses compatible con OpenResponses desde la Gateway"
read_when:
  - Integración de clientes que hablen la API de OpenResponses
  - Deseas entradas basadas en elementos, llamadas a herramientas de cliente o eventos SSE
title: "API de OpenResponses"
---

# API de OpenResponses (HTTP)

La Gateway de OpenClaw puede servir un punto de conexión `POST /v1/responses` compatible con OpenResponses.

Este punto de conexión está **deshabilitado por defecto**. Actívalo primero en la configuración.

- `POST /v1/responses`
- Mismo puerto que la Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal de la Gateway (mismo ruta de código que
`openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con tu Gateway.

## Autenticación, seguridad y enrutamiento

El comportamiento operativo coincide con [OpenAI Chat Completions](/es/gateway/openai-http-api):

- usa `Authorization: Bearer <token>` con la configuración de autenticación normal de la Gateway
- trata el punto de conexión como acceso de operador completo para la instancia de la gateway
- selecciona agentes con `model: "openclaw:<agentId>"`, `model: "agent:<agentId>"` o `x-openclaw-agent-id`
- usa `x-openclaw-session-key` para el enrutamiento explícito de sesiones

Activa o desactiva este punto de conexión con `gateway.http.endpoints.responses.enabled`.

## Comportamiento de la sesión

Por defecto, el punto de conexión es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena `user` de OpenResponses, la Gateway deriva una clave de sesión estable
a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Forma de la solicitud (compatible)

La solicitud sigue la API de OpenResponses con entrada basada en elementos. Soporte actual:

- `input`: cadena o matriz de objetos de elemento.
- `instructions`: fusionado en el mensaje del sistema.
- `tools`: definiciones de herramientas de cliente (herramientas de función).
- `tool_choice`: filtrar o requerir herramientas de cliente.
- `stream`: activa la transmisión SSE.
- `max_output_tokens`: límite de salida de mejor esfuerzo (dependiente del proveedor).
- `user`: enrutamiento de sesión estable.

Aceptado pero **actualmente ignorado**:

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `previous_response_id`
- `truncation`

## Elementos (entrada)

### `message`

Roles: `system`, `developer`, `user`, `assistant`.

- `system` y `developer` se añaden al prompt del sistema.
- El elemento `user` o `function_call_output` más reciente se convierte en el "mensaje actual".
- Los mensajes anteriores de usuario/asistente se incluyen como historial para dar contexto.

### `function_call_output` (herramientas basadas en turnos)

Enviar resultados de herramientas de vuelta al modelo:

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` y `item_reference`

Se aceptan por compatibilidad con el esquema pero se ignoran al construir el prompt.

## Herramientas (herramientas de función del lado del cliente)

Proporcione herramientas con `tools: [{ type: "function", function: { name, description?, parameters? } }]`.

Si el agente decide llamar a una herramienta, la respuesta devuelve un elemento de salida `function_call`.
A continuación, envía una solicitud de seguimiento con `function_call_output` para continuar el turno.

## Imágenes (`input_image`)

Admite fuentes base64 o URL:

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

Tipos MIME permitidos (actual): `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`.
Tamaño máximo (actual): 10MB.

## Archivos (`input_file`)

Admite fuentes base64 o URL:

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

Tipos MIME permitidos (actual): `text/plain`, `text/markdown`, `text/html`, `text/csv`,
`application/json`, `application/pdf`.

Tamaño máximo (actual): 5MB.

Comportamiento actual:

- El contenido del archivo se decodifica y se agrega al **prompt del sistema**, no al mensaje de usuario,
  por lo que permanece efímero (no se guarda en el historial de la sesión).
- Los PDF se analizan para obtener texto. Si se encuentra poco texto, las primeras páginas se rasterizan
  en imágenes y se pasan al modelo.

El análisis de PDF utiliza la compilación heredada `pdfjs-dist` compatible con Node (sin worker). La compilación moderna de PDF.js espera workers del navegador/globales DOM, por lo que no se utiliza en Gateway.

Valores predeterminados de obtención de URL:

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` (total de partes `input_file` + `input_image` basadas en URL por solicitud)
- Las solicitudes están protegidas (resolución DNS, bloqueo de IP privada, límites de redirección, tiempos de espera).
- Se admiten listas de permitidos (allowlists) de nombre de host opcionales por tipo de entrada (`files.urlAllowlist`, `images.urlAllowlist`).
  - Host exacto: `"cdn.example.com"`
  - Subdominios comodín: `"*.assets.example.com"` (no coincide con el ápex)
  - Las listas de permitidos vacías u omitidas significan que no hay restricción de lista de permitidos de nombre de host.
- Para deshabilitar completamente las obtenciones basadas en URL, establezca `files.allowUrl: false` y/o `images.allowUrl: false`.

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
            allowedMimes: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/json",
              "application/pdf",
            ],
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
            allowedMimes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
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
- Se aceptan fuentes `input_image` HEIC/HEIF y se normalizan a JPEG antes de la entrega al proveedor.

Nota de seguridad:

- Las listas de permitidos de URL se aplican antes de la obtención y en los saltos de redirección.
- Permitir un nombre de host no evita el bloqueo de IP privada/interna.
- Para gateways expuestos a Internet, aplique controles de salida de red además de las protecciones a nivel de aplicación.
  Consulte [Seguridad](/es/gateway/security).

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

`usage` se rellena cuando el proveedor subyacente informa los recuentos de tokens.

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

Sin streaming:

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

Con streaming:

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

import es from "/components/footer/es.mdx";

<es />
