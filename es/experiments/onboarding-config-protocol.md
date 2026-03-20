---
summary: "Notas del protocolo RPC para el asistente de configuración y el esquema de configuración"
read_when: "Cambiar los pasos del asistente de configuración o los puntos finales del esquema de configuración"
title: "Protocolo de incorporación y configuración"
---

# Protocolo de incorporación + Configuración

Propósito: superficies compartidas de incorporación y configuración en la CLI, la aplicación macOS y la interfaz de usuario web.

## Componentes

- Motor del asistente (sesión compartida + indicaciones + estado de incorporación).
- La incorporación de la CLI utiliza el mismo flujo del asistente que los clientes de la interfaz de usuario.
- El RPC de la puerta de enlace expone los puntos finales del asistente y del esquema de configuración.
- La incorporación de macOS utiliza el modelo de paso del asistente.
- La interfaz de usuario web representa formularios de configuración a partir del esquema JSON y las sugerencias de la interfaz de usuario.

## RPC de puerta de enlace

- `wizard.start` params: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` params: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` params: `{ sessionId }`
- `wizard.status` params: `{ sessionId }`
- `config.schema` params: `{}`
- `config.schema.lookup` params: `{ path }`
  - `path` acepta segmentos de configuración estándar más identificadores de complementos delimitados por barras, por ejemplo `plugins.entries.pack/one.config`.

Respuestas (forma)

- Asistente: `{ sessionId, done, step?, status?, error? }`
- Esquema de configuración: `{ schema, uiHints, version, generatedAt }`
- Búsqueda de esquema de configuración: `{ path, schema, hint?, hintPath?, children[] }`

## Sugerencias de la interfaz de usuario

- `uiHints` claveada por ruta; metadatos opcionales (etiqueta/ayuda/grupo/orden/avanzado/sensible/marcador de posición).
- Los campos sensibles se representan como entradas de contraseña; sin capa de redacción.
- Los nodos de esquema no admitidos vuelven al editor JSON sin procesar.

## Notas

- Este documento es el único lugar para rastrear las refactorizaciones del protocolo para la incorporación/configuración.

import es from "/components/footer/es.mdx";

<es />
