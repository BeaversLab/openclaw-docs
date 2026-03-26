---
summary: "Notas del protocolo RPC para el asistente de configuración y el esquema de configuración"
read_when: "Cambiar los pasos del asistente de configuración o los endpoints del esquema de configuración"
title: "Protocolo de incorporación y configuración"
---

# Protocolo de incorporación + configuración

Propósito: superficies de incorporación y configuración compartidas entre la CLI, la aplicación macOS y la interfaz de usuario web.

## Componentes

- Motor del asistente (sesión compartida + indicaciones + estado de incorporación).
- La incorporación de la CLI utiliza el mismo flujo del asistente que los clientes de la interfaz de usuario.
- Gateway RPC expone los endpoints del asistente y del esquema de configuración.
- La incorporación de macOS utiliza el modelo de paso del asistente.
- La interfaz de usuario web renderiza los formularios de configuración a partir de JSON Schema e indicaciones de la interfaz de usuario.

## Gateway RPC

- `wizard.start` parámetros: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` parámetros: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` parámetros: `{ sessionId }`
- `wizard.status` parámetros: `{ sessionId }`
- `config.schema` parámetros: `{}`
- `config.schema.lookup` parámetros: `{ path }`
  - `path` acepta segmentos de configuración estándar además de ids de complementos delimitados por barras, por ejemplo `plugins.entries.pack/one.config`.

Respuestas (forma)

- Asistente: `{ sessionId, done, step?, status?, error? }`
- Esquema de configuración: `{ schema, uiHints, version, generatedAt }`
- Búsqueda de esquema de configuración: `{ path, schema, hint?, hintPath?, children[] }`

## Indicaciones de la interfaz de usuario

- `uiHints` con clave por ruta; metadatos opcionales (etiqueta/ayuda/grupo/orden/avanzado/sensible/marcador de posición).
- Los campos sensibles se representan como entradas de contraseña; sin capa de redacción.
- Los nodos de esquema no compatibles recurren al editor JSON sin procesar.

## Notas

- Este documento es el único lugar para realizar un seguimiento de las refactorizaciones del protocolo para la incorporación/configuración.

import es from "/components/footer/es.mdx";

<es />
