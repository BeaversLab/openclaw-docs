---
summary: "Plan: Agregar endpoint /v1/responses de OpenResponses y dejar obsoleto chat completions de forma limpia"
read_when:
  - Designing or implementing `/v1/responses` gateway support
  - Planning migration from Chat Completions compatibility
owner: "openclaw"
status: "borrador"
last_updated: "2026-01-19"
title: "Plan de OpenResponses Gateway"
---

# Plan de integración de OpenResponses Gateway

## Contexto

OpenClaw Gateway actualmente expone un endpoint mínimo de Chat Completions compatible con OpenAI en
`/v1/chat/completions` (ver [OpenAI Chat Completions](/es/gateway/openai-http-api)).

Open Responses es un estándar de inferencia abierto basado en la API de OpenAI Responses. Está diseñado
para flujos de trabajo de agentes y utiliza entradas basadas en elementos más eventos de transmisión semántica. La especificación de OpenResponses
define `/v1/responses`, no `/v1/chat/completions`.

## Objetivos

- Agregar un endpoint `/v1/responses` que se adhiera a la semántica de OpenResponses.
- Mantener Chat Completions como una capa de compatibilidad que sea fácil de deshabilitar y eventualmente eliminar.
- Estandarizar la validación y el análisis con esquemas aislados y reutilizables.

## No objetivos

- Paridad completa de características de OpenResponses en la primera pasada (imágenes, archivos, herramientas alojadas).
- Reemplazar la lógica interna de ejecución de agentes o la orquestación de herramientas.
- Cambiar el comportamiento existente de `/v1/chat/completions` durante la primera fase.

## Resumen de la investigación

Fuentes: OpenAPI de OpenResponses, sitio de especificaciones de OpenResponses y la publicación del blog de Hugging Face.

Puntos clave extraídos:

- `POST /v1/responses` acepta campos `CreateResponseBody` como `model`, `input` (cadena o
  `ItemParam[]`), `instructions`, `tools`, `tool_choice`, `stream`, `max_output_tokens` y
  `max_tool_calls`.
- `ItemParam` es una unión discriminada de:
  - elementos `message` con roles `system`, `developer`, `user`, `assistant`
  - `function_call` y `function_call_output`
  - `reasoning`
  - `item_reference`
- Las respuestas exitosas devuelven un `ResponseResource` con elementos `object: "response"`, `status` y
  `output`.
- El streaming utiliza eventos semánticos tales como:
  - `response.created`, `response.in_progress`, `response.completed`, `response.failed`
  - `response.output_item.added`, `response.output_item.done`
  - `response.content_part.added`, `response.content_part.done`
  - `response.output_text.delta`, `response.output_text.done`
- La especificación requiere:
  - `Content-Type: text/event-stream`
  - `event:` debe coincidir con el campo JSON `type`
  - el evento terminal debe ser el literal `[DONE]`
- Los elementos de razonamiento pueden exponer `content`, `encrypted_content` y `summary`.
- Los ejemplos de HF incluyen `OpenResponses-Version: latest` en las solicitudes (encabezado opcional).

## Arquitectura Propuesta

- Añadir `src/gateway/open-responses.schema.ts` que contenga solo esquemas Zod (sin importaciones de gateway).
- Añadir `src/gateway/openresponses-http.ts` (o `open-responses-http.ts`) para `/v1/responses`.
- Mantener `src/gateway/openai-http.ts` intacto como adaptador de compatibilidad heredado.
- Añadir configuración `gateway.http.endpoints.responses.enabled` (por defecto `false`).
- Mantener `gateway.http.endpoints.chatCompletions.enabled` independiente; permitir que ambos endpoints sean
  activados por separado.
- Emitir una advertencia de inicio cuando Chat Completions esté habilitado para señalar su estado heredado.

## Ruta de Deprecación para Chat Completions

- Mantener límites estrictos de módulos: sin tipos de esquema compartidos entre responses y chat completions.
- Hacer que Chat Completions sea opcional mediante configuración para que se pueda deshabilitar sin cambios en el código.
- Actualizar la documentación para etiquetar Chat Completions como heredado una vez que `/v1/responses` sea estable.
- Paso futuro opcional: asignar las solicitudes de Chat Completions al controlador de Responses para una ruta de eliminación más sencilla.

## Subconjunto de soporte de la Fase 1

- Aceptar `input` como cadena o `ItemParam[]` con roles de mensaje y `function_call_output`.
- Extraer los mensajes del sistema y del desarrollador en `extraSystemPrompt`.
- Usar el `user` o `function_call_output` más reciente como el mensaje actual para las ejecuciones del agente.
- Rechazar las partes de contenido no compatibles (imagen/archivo) con `invalid_request_error`.
- Devolver un solo mensaje del asistente con contenido `output_text`.
- Devolver `usage` con valores puestos a cero hasta que se conecte el contabilizador de tokens.

## Estrategia de validación (Sin SDK)

- Implementar esquemas Zod para el subconjunto compatible de:
  - `CreateResponseBody`
  - `ItemParam` + uniones de partes de contenido de mensajes
  - `ResponseResource`
  - Formas de eventos de transmisión utilizados por la puerta de enlace
- Mantener los esquemas en un único módulo aislado para evitar desviaciones y permitir la generación de código futura.

## Implementación de transmisión (Fase 1)

- Líneas SSE con `event:` y `data:`.
- Secuencia requerida (mínima viable):
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta` (repetir según sea necesario)
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## Plan de pruebas y verificación

- Añadir cobertura e2e para `/v1/responses`:
  - Autenticación requerida
  - Forma de respuesta sin transmisión
  - Orden de eventos de transmisión y `[DONE]`
  - Enrutamiento de sesión con cabeceras y `user`
- Mantener `src/gateway/openai-http.test.ts` sin cambios.
- Manual: curl a `/v1/responses` con `stream: true` y verificar el orden de eventos y el terminal `[DONE]`.

## Actualizaciones de documentación (Seguimiento)

- Añadir una nueva página de documentos para el uso de `/v1/responses` y ejemplos.
- Actualizar `/gateway/openai-http-api` con una nota de herencia y un puntero a `/v1/responses`.

import es from "/components/footer/es.mdx";

<es />
