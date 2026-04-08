---
title: "Referencia de configuración de memoria"
summary: "Todos los controles de configuración para la búsqueda de memoria, proveedores de incrustaciones, QMD, búsqueda híbrida e indexación multimodal"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# Referencia de configuración de memoria

Esta página enumera cada control de configuración para la búsqueda de memoria de OpenClaw. Para
vistas conceptuales, consulte:

- [Resumen de memoria](/en/concepts/memory) -- cómo funciona la memoria
- [Motor integrado](/en/concepts/memory-builtin) -- backend SQLite predeterminado
- [Motor QMD](/en/concepts/memory-qmd) -- sidecar local-first
- [Búsqueda de memoria](/en/concepts/memory-search) -- canalización y ajuste de búsqueda

Todas las configuraciones de búsqueda de memoria se encuentran bajo `agents.defaults.memorySearch` en
`openclaw.json` a menos que se indique lo contrario.

---

## Selección de proveedor

| Clave      | Tipo      | Predeterminado               | Descripción                                                                                             |
| ---------- | --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | autodetectado                | ID del adaptador de incrustación: `openai`, `gemini`, `voyage`, `mistral`, `bedrock`, `ollama`, `local` |
| `model`    | `string`  | predeterminado del proveedor | Nombre del modelo de incrustación                                                                       |
| `fallback` | `string`  | `"none"`                     | ID del adaptador de reserva cuando falla el principal                                                   |
| `enabled`  | `boolean` | `true`                       | Habilitar o deshabilitar la búsqueda de memoria                                                         |

### Orden de autodetección

Cuando `provider` no está configurado, OpenClaw selecciona el primero disponible:

1. `local` -- si `memorySearch.local.modelPath` está configurado y el archivo existe.
2. `openai` -- si se puede resolver una clave de OpenAI.
3. `gemini` -- si se puede resolver una clave de Gemini.
4. `voyage` -- si se puede resolver una clave de Voyage.
5. `mistral` -- si se puede resolver una clave de Mistral.
6. `bedrock` -- si se resuelve la cadena de credenciales del SDK de AWS (rol de instancia, claves de acceso, perfil, SSO, identidad web o configuración compartida).

`ollama` es compatible pero no se detecta automáticamente (configúrelo explícitamente).

### Resolución de clave de API

Las incrustaciones remotas requieren una clave de API. Bedrock utiliza la cadena de credenciales predeterminada del SDK de AWS en su lugar (roles de instancia, SSO, claves de acceso).

| Proveedor | Variable de entorno                     | Clave de configuración            |
| --------- | --------------------------------------- | --------------------------------- |
| OpenAI    | `OPENAI_API_KEY`                        | `models.providers.openai.apiKey`  |
| Gemini    | `GEMINI_API_KEY`                        | `models.providers.google.apiKey`  |
| Voyage    | `VOYAGE_API_KEY`                        | `models.providers.voyage.apiKey`  |
| Mistral   | `MISTRAL_API_KEY`                       | `models.providers.mistral.apiKey` |
| Bedrock   | Cadena de credenciales de AWS           | No se necesita clave de API       |
| Ollama    | `OLLAMA_API_KEY` (marcador de posición) | --                                |

Codex OAuth solo cubre chat/completions y no satisface las solicitudes de incrustación.

---

## Configuración de punto final remoto

Para puntos finales personalizados compatibles con OpenAI o para anular los valores predeterminados del proveedor:

| Clave            | Tipo     | Descripción                                                                             |
| ---------------- | -------- | --------------------------------------------------------------------------------------- |
| `remote.baseUrl` | `string` | URL base de API personalizada                                                           |
| `remote.apiKey`  | `string` | Anular clave de API                                                                     |
| `remote.headers` | `object` | Encabezados HTTP adicionales (fusionados con los valores predeterminados del proveedor) |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
        remote: {
          baseUrl: "https://api.example.com/v1/",
          apiKey: "YOUR_KEY",
        },
      },
    },
  },
}
```

---

## Configuración específica de Gemini

| Clave                  | Tipo     | Predeterminado         | Descripción                                 |
| ---------------------- | -------- | ---------------------- | ------------------------------------------- |
| `model`                | `string` | `gemini-embedding-001` | También admite `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | Para Embedding 2: 768, 1536 o 3072          |

<Warning>Cambiar el modelo o `outputDimensionality` activa un reindexado completo automático.</Warning>

---

## Configuración de incrustación de Bedrock

Bedrock utiliza la cadena de credenciales predeterminada del SDK de AWS: no se necesitan claves de API.
Si OpenClaw se ejecuta en EC2 con un rol de instancia habilitado para Bedrock, simplemente configure el
proveedor y el modelo:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0",
      },
    },
  },
}
```

| Clave                  | Tipo     | Predeterminado                 | Descripción                                       |
| ---------------------- | -------- | ------------------------------ | ------------------------------------------------- |
| `model`                | `string` | `amazon.titan-embed-text-v2:0` | Cualquier ID de modelo de incrustación de Bedrock |
| `outputDimensionality` | `number` | predeterminado del modelo      | Para Titan V2: 256, 512 o 1024                    |

### Modelos compatibles

Se admiten los siguientes modelos (con detección de familia y valores predeterminados de dimensión):

| ID del modelo                              | Proveedor  | Dimensiones predeterminadas | Dimensiones configurables |
| ------------------------------------------ | ---------- | --------------------------- | ------------------------- |
| `amazon.titan-embed-text-v2:0`             | Amazon     | 1024                        | 256, 512, 1024            |
| `amazon.titan-embed-text-v1`               | Amazon     | 1536                        | --                        |
| `amazon.titan-embed-g1-text-02`            | Amazon     | 1536                        | --                        |
| `amazon.titan-embed-image-v1`              | Amazon     | 1024                        | --                        |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024                        | 256, 384, 1024, 3072      |
| `cohere.embed-english-v3`                  | Cohere     | 1024                        | --                        |
| `cohere.embed-multilingual-v3`             | Cohere     | 1024                        | --                        |
| `cohere.embed-v4:0`                        | Cohere     | 1536                        | 256-1536                  |
| `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512                         | --                        |
| `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024                        | --                        |

Las variantes con sufijos de rendimiento (por ejemplo, `amazon.titan-embed-text-v1:2:8k`) heredan
la configuración del modelo base.

### Autenticación

La autenticación de Bedrock utiliza el orden de resolución de credenciales estándar del SDK de AWS:

1. Variables de entorno (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
2. Caché de tokens SSO
3. Credenciales de token de identidad web
4. Archivos de credenciales y configuración compartidos
5. Credenciales de metadatos de ECS o EC2

La región se resuelve a partir de `AWS_REGION`, `AWS_DEFAULT_REGION`, el
`amazon-bedrock` del proveedor `baseUrl` o por defecto es `us-east-1`.

### Permisos IAM

El rol o usuario de IAM necesita:

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

Para el privilegio mínimo, limita `InvokeModel` al modelo específico:

```
arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
```

---

## Configuración de incrustación local

| Clave                 | Tipo     | Predeterminado                   | Descripción                                  |
| --------------------- | -------- | -------------------------------- | -------------------------------------------- |
| `local.modelPath`     | `string` | descargado automáticamente       | Ruta al archivo del modelo GGUF              |
| `local.modelCacheDir` | `string` | predeterminado de node-llama-cpp | Directorio de caché para modelos descargados |

Modelo predeterminado: `embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB, descargado automáticamente).
Requiere compilación nativa: `pnpm approve-builds` y luego `pnpm rebuild node-llama-cpp`.

---

## Configuración de búsqueda híbrida

Todo bajo `memorySearch.query.hybrid`:

| Clave                 | Tipo      | Predeterminado | Descripción                                      |
| --------------------- | --------- | -------------- | ------------------------------------------------ |
| `enabled`             | `boolean` | `true`         | Habilitar búsqueda híbrida BM25 + vectorial      |
| `vectorWeight`        | `number`  | `0.7`          | Peso para las puntuaciones vectoriales (0-1)     |
| `textWeight`          | `number`  | `0.3`          | Peso para las puntuaciones BM25 (0-1)            |
| `candidateMultiplier` | `number`  | `4`            | Multiplicador del tamaño del grupo de candidatos |

### MMR (diversidad)

| Clave         | Tipo      | Predeterminado | Descripción                                  |
| ------------- | --------- | -------------- | -------------------------------------------- |
| `mmr.enabled` | `boolean` | `false`        | Habilitar la reordenación MMR                |
| `mmr.lambda`  | `number`  | `0.7`          | 0 = máxima diversidad, 1 = máxima relevancia |

### Decaimiento temporal (recencia)

| Clave                        | Tipo      | Predeterminado | Descripción                                    |
| ---------------------------- | --------- | -------------- | ---------------------------------------------- |
| `temporalDecay.enabled`      | `boolean` | `false`        | Habilitar impulso de recencia                  |
| `temporalDecay.halfLifeDays` | `number`  | `30`           | La puntuación se reduce a la mitad cada N días |

Los archivos perennes (`MEMORY.md`, archivos sin fecha en `memory/`) nunca decaen.

### Ejemplo completo

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            vectorWeight: 0.7,
            textWeight: 0.3,
            mmr: { enabled: true, lambda: 0.7 },
            temporalDecay: { enabled: true, halfLifeDays: 30 },
          },
        },
      },
    },
  },
}
```

---

## Rutas de memoria adicionales

| Clave        | Tipo       | Descripción                                     |
| ------------ | ---------- | ----------------------------------------------- |
| `extraPaths` | `string[]` | Directorios o archivos adicionales para indexar |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        extraPaths: ["../team-docs", "/srv/shared-notes"],
      },
    },
  },
}
```

Las rutas pueden ser absolutas o relativas al espacio de trabajo. Los directorios se escanean
recursivamente en busca de archivos `.md`. El manejo de enlaces simbólicos depende del backend activo:
el motor integrado ignora los enlaces simbólicos, mientras que QMD sigue el comportamiento
del escáner QMD subyacente.

Para la búsqueda de transcripciones entre agentes con ámbito de agente, utilice
`agents.list[].memorySearch.qmd.extraCollections` en lugar de `memory.qmd.paths`.
Esas colecciones adicionales siguen la misma forma `{ path, name, pattern? }`, pero
se combinan por agente y pueden conservar nombres compartidos explícitos cuando la ruta
apunta fuera del espacio de trabajo actual.
Si la misma ruta resuelta aparece tanto en `memory.qmd.paths` como en
`memorySearch.qmd.extraCollections`, QMD mantiene la primera entrada y omite el
duplicado.

---

## Memoria multimodal (Gemini)

Indexar imágenes y audio junto con Markdown usando Gemini Embedding 2:

| Clave                     | Tipo       | Predeterminado | Descripción                                 |
| ------------------------- | ---------- | -------------- | ------------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`        | Habilitar la indexación multimodal          |
| `multimodal.modalities`   | `string[]` | --             | `["image"]`, `["audio"]`, o `["all"]`       |
| `multimodal.maxFileBytes` | `number`   | `10000000`     | Tamaño máximo de archivo para la indexación |

Solo se aplica a los archivos en `extraPaths`. Las raíces de memoria predeterminadas se mantienen solo en Markdown.
Requiere `gemini-embedding-2-preview`. `fallback` debe ser `"none"`.

Formatos compatibles: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`
(imágenes); `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Caché de incrustaciones

| Clave              | Tipo      | Predeterminado | Descripción                                                   |
| ------------------ | --------- | -------------- | ------------------------------------------------------------- |
| `cache.enabled`    | `boolean` | `false`        | Almacenar en caché las incrustaciones de fragmentos en SQLite |
| `cache.maxEntries` | `number`  | `50000`        | Máximo de incrustaciones en caché                             |

Evita volver a incrustar texto sin cambios durante la reindexación o actualizaciones de transcripciones.

---

## Indexación por lotes

| Clave                         | Tipo      | Predeterminado | Descripción                             |
| ----------------------------- | --------- | -------------- | --------------------------------------- |
| `remote.batch.enabled`        | `boolean` | `false`        | Habilitar API de incrustación por lotes |
| `remote.batch.concurrency`    | `number`  | `2`            | Trabajos por lotes paralelos            |
| `remote.batch.wait`           | `boolean` | `true`         | Esperar a que se complete el lote       |
| `remote.batch.pollIntervalMs` | `number`  | --             | Intervalo de sondeo                     |
| `remote.batch.timeoutMinutes` | `number`  | --             | Tiempo de espera del lote               |

Disponible para `openai`, `gemini` y `voyage`. El procesamiento por lotes de OpenAI suele ser
el más rápido y económico para grandes rellenados (backfills).

---

## Búsqueda de memoria de sesión (experimental)

Indexar las transcripciones de sesión y mostrarlas a través de `memory_search`:

| Clave                         | Tipo       | Predeterminado | Descripción                                     |
| ----------------------------- | ---------- | -------------- | ----------------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`        | Habilitar la indexación de sesiones             |
| `sources`                     | `string[]` | `["memory"]`   | Añada `"sessions"` para incluir transcripciones |
| `sync.sessions.deltaBytes`    | `number`   | `100000`       | Umbral de bytes para reindexar                  |
| `sync.sessions.deltaMessages` | `number`   | `50`           | Umbral de mensajes para reindexar               |

La indexación de sesiones es opcional y se ejecuta de forma asincrónica. Los resultados pueden estar
ligeramente obsoletos. Los registros de sesión residen en el disco, por lo que debe tratar el acceso al sistema de archivos como el límite
de confianza.

---

## Aceleración vectorial de SQLite (sqlite-vec)

| Clave                        | Tipo      | Predeterminado | Descripción                                |
| ---------------------------- | --------- | -------------- | ------------------------------------------ |
| `store.vector.enabled`       | `boolean` | `true`         | Usar sqlite-vec para consultas vectoriales |
| `store.vector.extensionPath` | `string`  | incluido       | Anular la ruta de sqlite-vec               |

Cuando sqlite-vec no está disponible, OpenClaw vuelve automáticamente a la similitud de coseno
en proceso.

---

## Almacenamiento de índices

| Clave                 | Tipo     | Predeterminado                        | Descripción                                        |
| --------------------- | -------- | ------------------------------------- | -------------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Ubicación del índice (admite el token `{agentId}`) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | Tokenizador FTS5 (`unicode61` o `trigram`)         |

---

## Configuración del backend QMD

Establezca `memory.backend = "qmd"` para habilitar. Todas las configuraciones de QMD residen en
`memory.qmd`:

| Clave                    | Tipo      | Predeterminado | Descripción                                       |
| ------------------------ | --------- | -------------- | ------------------------------------------------- |
| `command`                | `string`  | `qmd`          | Ruta del ejecutable QMD                           |
| `searchMode`             | `string`  | `search`       | Comando de búsqueda: `search`, `vsearch`, `query` |
| `includeDefaultMemory`   | `boolean` | `true`         | Autoindexar `MEMORY.md` + `memory/**/*.md`        |
| `paths[]`                | `array`   | --             | Rutas adicionales: `{ name, path, pattern? }`     |
| `sessions.enabled`       | `boolean` | `false`        | Indexar transcripciones de sesión                 |
| `sessions.retentionDays` | `number`  | --             | Retención de transcripciones                      |
| `sessions.exportDir`     | `string`  | --             | Directorio de exportación                         |

OpenClaw prefiere la colección y formas de consulta de MCP actuales de QMD, pero mantiene
funcionando las versiones antiguas de QMD recurriendo a los indicadores de colección `--mask` heredados
y nombres de herramientas MCP más antiguos cuando es necesario.

Las anulaciones del modelo QMD permanecen en el lado de QMD, no en la configuración de OpenClaw. Si necesita
anular globalmente los modelos de QMD, establezca variables de entorno como
`QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` y `QMD_GENERATE_MODEL` en el entorno de
ejecución de la puerta de enlace.

### Programa de actualización

| Clave                     | Tipo      | Predeterminado | Descripción                                               |
| ------------------------- | --------- | -------------- | --------------------------------------------------------- |
| `update.interval`         | `string`  | `5m`           | Intervalo de actualización                                |
| `update.debounceMs`       | `number`  | `15000`        | Debounce cambios de archivo                               |
| `update.onBoot`           | `boolean` | `true`         | Actualizar al inicio                                      |
| `update.waitForBootSync`  | `boolean` | `false`        | Bloquear el inicio hasta que se complete la actualización |
| `update.embedInterval`    | `string`  | --             | Cadencia de incrustación separada                         |
| `update.commandTimeoutMs` | `number`  | --             | Tiempo de espera para comandos QMD                        |
| `update.updateTimeoutMs`  | `number`  | --             | Tiempo de espera para operaciones de actualización de QMD |
| `update.embedTimeoutMs`   | `number`  | --             | Tiempo de espera para operaciones de incrustación de QMD  |

### Límites

| Clave                     | Tipo     | Predeterminado | Descripción                               |
| ------------------------- | -------- | -------------- | ----------------------------------------- |
| `limits.maxResults`       | `number` | `6`            | Máx. resultados de búsqueda               |
| `limits.maxSnippetChars`  | `number` | --             | Limitar la longitud del fragmento         |
| `limits.maxInjectedChars` | `number` | --             | Limitar el total de caracteres inyectados |
| `limits.timeoutMs`        | `number` | `4000`         | Tiempo de espera de búsqueda              |

### Ámbito

Controla qué sesiones pueden recibir resultados de búsqueda QMD. El mismo esquema que
[`session.sendPolicy`](/en/gateway/configuration-reference#session):

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

El valor predeterminado es solo MD (MD-only). `match.keyPrefix` coincide con la clave de sesión normalizada;
`match.rawKeyPrefix` coincide con la clave sin procesar, incluido `agent:<id>:`.

### Citas

`memory.citations` se aplica a todos los backends:

| Valor                   | Comportamiento                                                    |
| ----------------------- | ----------------------------------------------------------------- |
| `auto` (predeterminado) | Incluir pie de página `Source: <path#line>` en fragmentos         |
| `on`                    | Incluir siempre el pie de página                                  |
| `off`                   | Omitir pie de página (la ruta aún se pasa internamente al agente) |

### Ejemplo completo de QMD

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 6, timeoutMs: 4000 },
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

---

## Soñar (Dreaming) (experimental)

Soñar se configura en `plugins.entries.memory-core.config.dreaming`,
no en `agents.defaults.memorySearch`.

Soñar se ejecuta como un barrido programado y utiliza fases internas ligeras/profundas/REM como
detalle de implementación.

Para el comportamiento conceptual y los comandos de barra, consulte [Soñar (Dreaming)](/en/concepts/dreaming).

### Configuración de usuario

| Clave       | Tipo      | Predeterminado | Descripción                                                 |
| ----------- | --------- | -------------- | ----------------------------------------------------------- |
| `enabled`   | `boolean` | `false`        | Habilitar o deshabilitar soñar por completo                 |
| `frequency` | `string`  | `0 3 * * *`    | Cadencia opcional de cron para el barrido completo de soñar |

### Ejemplo

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
          },
        },
      },
    },
  },
}
```

Notas:

- Soñar escribe el estado de la máquina en `memory/.dreams/`.
- Soñar escribe una salida narrativa legible por humanos en `DREAMS.md` (o el `dreams.md` existente).
- La política y los umbrales de las fases ligera/profunda/REM son un comportamiento interno, no una configuración orientada al usuario.
