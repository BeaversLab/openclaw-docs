---
summary: "Todos los controles de configuración para la búsqueda de memoria, proveedores de incrustación, QMD, búsqueda híbrida e indexación multimodal"
title: "Referencia de configuración de memoria"
sidebarTitle: "Configuración de memoria"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

Esta página enumera cada control de configuración para la búsqueda de memoria de OpenClaw. Para resúmenes conceptuales, consulte:

<CardGroup cols={2}>
  <Card title="Memory overview" href="/es/concepts/memory">
    Cómo funciona la memoria.
  </Card>
  <Card title="Builtin engine" href="/es/concepts/memory-builtin">
    Backend SQLite predeterminado.
  </Card>
  <Card title="QMD engine" href="/es/concepts/memory-qmd">
    Sidecar con prioridad local.
  </Card>
  <Card title="Memory search" href="/es/concepts/memory-search">
    Canalización y ajuste de búsqueda.
  </Card>
  <Card title="Active memory" href="/es/concepts/active-memory">
    Subagente de memoria para sesiones interactivas.
  </Card>
</CardGroup>

Todas las configuraciones de búsqueda de memoria se encuentran en `agents.defaults.memorySearch` en `openclaw.json` a menos que se indique lo contrario.

<Note>
Si está buscando el interruptor de funcionalidad de **memoria activa** y la configuración del subagente, eso se encuentra en `plugins.entries.active-memory` en lugar de `memorySearch`.

La memoria activa utiliza un modelo de dos puertas:

1. el complemento debe estar habilitado y apuntar al id del agente actual
2. la solicitud debe ser una sesión de chat persistente interactiva elegible

Consulte [Active Memory](/es/concepts/active-memory) para ver el modelo de activación, la configuración propiedad del complemento, la persistencia de la transcripción y el patrón de implementación segura.

</Note>

---

## Selección de proveedor

| Clave      | Tipo      | Predeterminado           | Descripción                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | `"openai"`               | ID del adaptador de incrustación, como `bedrock`, `deepinfra`, `gemini`, `github-copilot`, `local`, `mistral`, `ollama`, `openai`, `openai-compatible` o `voyage`; también puede ser un `models.providers.<id>` configurado cuyo `api` apunte a un adaptador de incrustación de memoria o a una API de modelo compatible con OpenAI |
| `model`    | `string`  | proveedor predeterminado | Nombre del modelo de incrustación                                                                                                                                                                                                                                                                                                   |
| `fallback` | `string`  | `"none"`                 | ID del adaptador de respaldo cuando falla el principal                                                                                                                                                                                                                                                                              |
| `enabled`  | `boolean` | `true`                   | Activar o desactivar la búsqueda en memoria                                                                                                                                                                                                                                                                                         |

Cuando `provider` no está configurado, OpenClaw utiliza incrustaciones de OpenAI. Configure `provider`
explícitamente para usar Gemini, Voyage, Mistral, DeepInfra, Bedrock, GitHub Copilot,
Ollama, un modelo GGUF local o un endpoint `/v1/embeddings` compatible con OpenAI.
Las configuraciones heredadas que todavía dicen `provider: "auto"` se resuelven a `openai`.

<Warning>
Cambiar el proveedor de incrustación, el modelo, la configuración del proveedor, las fuentes, el alcance,
la fragmentación o el tokenizador puede hacer que el índice vectorial de SQLite existente sea incompatible.
OpenClaw pausa la búsqueda vectorial e informa una advertencia de identidad del índice en lugar de
volver a incrustar todo automáticamente. Reconstruya cuando esté listo con
`openclaw memory status --index --agent <id>` o
`openclaw memory index --force --agent <id>`.
</Warning>

Si las incrustaciones de OpenAI no son accesibles desde su red, la recuperación de memoria falla de forma abierta
en lugar de bloquear el turno. Establezca el campo `memorySearch.provider` existente en un
proveedor local accesible, Ollama, regional o compatible con OpenAI para restaurar
la clasificación semántica.

### Ids de proveedores personalizados

`memorySearch.provider` puede apuntar a una entrada `models.providers.<id>` personalizada para adaptadores de proveedores específicos de memoria como `ollama`, o para APIs de modelos compatibles con OpenAI como `openai-responses` / `openai-completions`. OpenClaw resuelve el propietario `api` de ese proveedor para el adaptador de incrustación mientras conserva el id del proveedor personalizado para el manejo del punto final, autenticación y prefijo del modelo. Esto permite que las configuraciones de varias GPU o varios hosts dediquen las incrustaciones de memoria a un punto final local específico:

```json5
{
  models: {
    providers: {
      "ollama-5080": {
        api: "ollama",
        baseUrl: "http://gpu-box.local:11435",
        apiKey: "ollama-local",
        models: [{ id: "qwen3-embedding:0.6b" }],
      },
    },
  },
  agents: {
    defaults: {
      memorySearch: {
        provider: "ollama-5080",
        model: "qwen3-embedding:0.6b",
      },
    },
  },
}
```

### Resolución de clave API

Las incrustaciones remotas requieren una clave API. Bedrock utiliza la cadena de credenciales predeterminada del SDK de AWS en su lugar (roles de instancia, SSO, claves de acceso).

| Proveedor      | Var de entorno                                     | Clave de configuración                                           |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Bedrock        | Cadena de credenciales de AWS                      | No se necesita clave API                                         |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey`                              |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`                                 |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | Perfil de autenticación mediante inicio de sesión de dispositivo |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`                                |
| Ollama         | `OLLAMA_API_KEY` (marcador de posición)            | --                                                               |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`                                 |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`                                 |

<Note>Codex OAuth cubre solo chat/completions y no satisface las solicitudes de incrustación.</Note>

---

## Configuración de punto de conexión remoto

Use `provider: "openai-compatible"` para un servidor `/v1/embeddings` compatible con OpenAI genérico
que no debe heredar las credenciales globales de chat de OpenAI.

<ParamField path="remote.baseUrl" type="string">
  URL base de API personalizada.
</ParamField>
<ParamField path="remote.apiKey" type="string">
  Sobrescribir clave de API.
</ParamField>
<ParamField path="remote.headers" type="object">
  Encabezados HTTP adicionales (fusionados con los valores predeterminados del proveedor).
</ParamField>

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai-compatible",
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

## Configuración específica del proveedor

<AccordionGroup>
  <Accordion title="Gemini">
    | Clave                    | Tipo     | Predeterminado                | Descripción                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | También admite `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | Para Embedding 2: 768, 1536 o 3072        |

    <Warning>
    Cambiar el modelo o `outputDimensionality` cambia la identidad del índice. OpenClaw
    pausa la búsqueda vectorial hasta que reconstruya explícitamente el índice de memoria.
    </Warning>

  </Accordion>
  <Accordion title="Tipos de entrada compatibles con OpenAI">
    Los puntos finales de embedding compatibles con OpenAI pueden optar por campos de solicitud `input_type` específicos del proveedor. Esto es útil para modelos de embedding asimétricos que requieren diferentes etiquetas para embeddings de consultas y documentos.

    | Clave                 | Tipo     | Predeterminado | Descripción                                             |
    | ------------------- | -------- | -------------- | ------------------------------------------------------- |
    | `inputType`         | `string` | sin establecer   | `input_type` compartido para embeddings de consultas y documentos   |
    | `queryInputType`    | `string` | sin establecer   | `input_type` en tiempo de consulta; anula `inputType`          |
    | `documentInputType` | `string` | sin establecer   | `input_type` de índice/documento; anula `inputType`      |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai-compatible",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "${EMBEDDINGS_API_KEY}",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    Cambiar estos valores afecta la identidad de la caché de embedding para la indexación por lotes del proveedor y debe ir seguido de una reindexación de la memoria cuando el modelo ascendente trata las etiquetas de manera diferente.

  </Accordion>
  <Accordion title="Bedrock">
    ### Configuración de incrustación de Bedrock

    Bedrock utiliza la cadena de credenciales predeterminada del AWS SDK: no se necesitan claves de API. Si OpenClaw se ejecuta en EC2 con un rol de instancia habilitado para Bedrock, simplemente configure el proveedor y el modelo:

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

    | Clave                   | Tipo     | Predeterminado                 | Descripción                     |
    | ----------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | Cualquier ID de modelo de incrustación de Bedrock |
    | `outputDimensionality` | `number` | modelo predeterminado          | Para Titan V2: 256, 512 o 1024 |

    **Modelos compatibles** (con detección de familia y valores predeterminados de dimensiones):

    | ID del modelo                                | Proveedor   | Dimensiones predeterminadas | Dimensiones configurables |
    | ------------------------------------------- | ---------- | --------------------------- | ------------------------- |
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

    Las variantes con sufijo de rendimiento (p. ej., `amazon.titan-embed-text-v1:2:8k`) heredan la configuración del modelo base.

    **Autenticación:** La autenticación de Bedrock utiliza el orden estándar de resolución de credenciales del AWS SDK:

    1. Variables de entorno (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. Caché de tokens SSO
    3. Credenciales de token de identidad web
    4. Archivos de credenciales y configuración compartidos
    5. Credenciales de metadatos de ECS o EC2

    La región se resuelve desde `AWS_REGION`, `AWS_DEFAULT_REGION`, el `amazon-bedrock` del proveedor `baseUrl`, o por defecto es `us-east-1`.

    **Permisos IAM:** el rol o usuario de IAM necesita:

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    Para el privilegio mínimo, limite `InvokeModel` al modelo específico:

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="Local (GGUF + node-llama-cpp)">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | descargado automáticamente        | Ruta al archivo de modelo GGUF                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | predeterminado de node-llama-cpp | Directorio de caché para modelos descargados                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | Tamaño de la ventana de contexto para el contexto de embedding. 4096 cubre los fragmentos típicos (128–512 tokens) limitando la VRAM no ponderada. Reduzca a 1024–2048 en hosts con restricciones. `"auto"` usa el máximo entrenado del modelo — no recomendado para modelos de 8B+ (Qwen3-Embedding-8B: 40 960 tokens → ~32 GB VRAM vs ~8.8 GB a 4096). |

    Modelo predeterminado: `embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB, descargado automáticamente). Las descargas de código fuente aún requieren aprobación de compilación nativa: `pnpm approve-builds` y luego `pnpm rebuild node-llama-cpp`.

    Use la CLI independiente para verificar la misma ruta de proveedor que usa la Gateway:

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    Establezca `provider: "local"` explícitamente para embeddings GGUF locales. Las referencias a modelos `hf:` y HTTP(S) son compatibles con configuraciones locales explícitas, pero no cambian el proveedor predeterminado.

  </Accordion>
</AccordionGroup>

### Tiempo de espera de embedding en línea

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  Anule el tiempo de espera para los lotes de embedding en línea durante la indexación de memoria.

Sin establecer utiliza el valor predeterminado del proveedor: 600 segundos para proveedores locales/autoalojados como `local`, `ollama` y `lmstudio`, y 120 segundos para proveedores alojados. Aumente esto cuando los lotes de inserción locales limitados por CPU sean saludables pero lentos.

</ParamField>

---

## Configuración de búsqueda híbrida

Todo bajo `memorySearch.query.hybrid`:

| Clave                 | Tipo      | Predeterminado | Descripción                                      |
| --------------------- | --------- | -------------- | ------------------------------------------------ |
| `enabled`             | `boolean` | `true`         | Habilitar búsqueda híbrida BM25 + vectorial      |
| `vectorWeight`        | `number`  | `0.7`          | Peso para las puntuaciones vectoriales (0-1)     |
| `textWeight`          | `number`  | `0.3`          | Peso para las puntuaciones BM25 (0-1)            |
| `candidateMultiplier` | `number`  | `4`            | Multiplicador del tamaño del grupo de candidatos |

<Tabs>
  <Tab title="MMR (diversidad)">
    | Clave           | Tipo      | Predeterminado | Descripción                          |
    | ------------- | --------- | ------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | Habilitar reordenación MMR                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = máxima diversidad, 1 = máxima relevancia |
  </Tab>
  <Tab title="Decaimiento temporal (recencia)">
    | Clave                          | Tipo      | Predeterminado | Descripción               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | Habilitar impulso de recencia      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | La puntuación se reduce a la mitad cada N días |

    Los archivos perennes (`MEMORY.md`, archivos sin fecha en `memory/`) nunca se ven afectados por el decaimiento.

  </Tab>
</Tabs>

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

Las rutas pueden ser absolutas o relativas al espacio de trabajo. Los directorios se escanean de forma recursiva en busca de archivos `.md`. El manejo de enlaces simbólicos depende del backend activo: el motor integrado ignora los enlaces simbólicos, mientras que QMD sigue el comportamiento del escáner QMD subyacente.

Para la búsqueda de transcripciones entre agentes con ámbito de agente, utilice `agents.list[].memorySearch.qmd.extraCollections` en lugar de `memory.qmd.paths`. Esas colecciones adicionales siguen la misma forma `{ path, name, pattern? }`, pero se combinan por agente y pueden conservar nombres compartidos explícitos cuando la ruta apunta fuera del espacio de trabajo actual. Si la misma ruta resuelta aparece tanto en `memory.qmd.paths` como en `memorySearch.qmd.extraCollections`, QMD mantiene la primera entrada y omite el duplicado.

---

## Memoria multimodal (Gemini)

Indexe imágenes y audio junto con Markdown utilizando Gemini Embedding 2:

| Clave                     | Tipo       | Predeterminado | Descripción                              |
| ------------------------- | ---------- | -------------- | ---------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`        | Habilitar indexación multimodal          |
| `multimodal.modalities`   | `string[]` | --             | `["image"]`, `["audio"]`, o `["all"]`    |
| `multimodal.maxFileBytes` | `number`   | `10000000`     | Tamaño máximo de archivo para indexación |

<Note>Solo se aplica a los archivos en `extraPaths`. Las raíces de memoria predeterminadas permanecen solo en Markdown. Requiere `gemini-embedding-2-preview`. `fallback` debe ser `"none"`.</Note>

Formatos admitidos: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif` (imágenes); `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Caché de incrustaciones (embeddings)

| Clave              | Tipo      | Predeterminado | Descripción                                                   |
| ------------------ | --------- | -------------- | ------------------------------------------------------------- |
| `cache.enabled`    | `boolean` | `true`         | Almacenar en caché las incrustaciones de fragmentos en SQLite |
| `cache.maxEntries` | `number`  | `50000`        | Máximo de incrustaciones en caché                             |

Evita volver a incrustar texto sin cambios durante la reindexación o actualizaciones de transcripciones.

---

## Indexación por lotes

| Clave                         | Tipo      | Predeterminado | Descripción                             |
| ----------------------------- | --------- | -------------- | --------------------------------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`            | Incrustaciones en línea paralelas       |
| `remote.batch.enabled`        | `boolean` | `false`        | Habilitar API de incrustación por lotes |
| `remote.batch.concurrency`    | `number`  | `2`            | Trabajos por lotes paralelos            |
| `remote.batch.wait`           | `boolean` | `true`         | Esperar a la finalización del lote      |
| `remote.batch.pollIntervalMs` | `number`  | --             | Intervalo de sondeo                     |
| `remote.batch.timeoutMinutes` | `number`  | --             | Tiempo de espera del lote               |

Disponible para `openai`, `gemini` y `voyage`. El proceso por lotes de OpenAI suele ser el más rápido y económico para grandes rellenados (backfills).

`remote.nonBatchConcurrency` controla las llamadas de incrustación en línea utilizadas por proveedores locales/autoalojados y proveedores alojados cuando las API de lotes del proveedor no están activas. Ollama establece `1` de forma predeterminada para la indexación no por lotes para evitar saturar hosts locales pequeños; configure un valor más alto en máquinas más grandes.

Esto es independiente de `sync.embeddingBatchTimeoutSeconds`, que controla el tiempo de espera de las llamadas de incrustación en línea.

---

## Búsqueda de memoria de sesión (experimental)

Indexar las transcripciones de sesión y mostrarlas a través de `memory_search`:

| Clave                         | Tipo       | Predeterminado | Descripción                                      |
| ----------------------------- | ---------- | -------------- | ------------------------------------------------ |
| `experimental.sessionMemory`  | `boolean`  | `false`        | Habilitar indexación de sesiones                 |
| `sources`                     | `string[]` | `["memory"]`   | Añadir `"sessions"` para incluir transcripciones |
| `sync.sessions.deltaBytes`    | `number`   | `100000`       | Umbral de bytes para reindexar                   |
| `sync.sessions.deltaMessages` | `number`   | `50`           | Umbral de mensajes para reindexar                |

<Warning>La indexación de sesiones es opcional y se ejecuta de forma asíncrona. Los resultados pueden estar ligeramente obsoletos. Los registros de sesión residen en el disco, por lo que debe tratar el acceso al sistema de archivos como el límite de confianza.</Warning>

---

## Aceleración vectorial de SQLite (sqlite-vec)

| Clave                        | Tipo      | Predeterminado | Descripción                                |
| ---------------------------- | --------- | -------------- | ------------------------------------------ |
| `store.vector.enabled`       | `boolean` | `true`         | Usar sqlite-vec para consultas vectoriales |
| `store.vector.extensionPath` | `string`  | incluido       | Sobrescribir ruta de sqlite-vec            |

Cuando sqlite-vec no está disponible, OpenClaw vuelve automáticamente a la similitud de coseno dentro del proceso.

---

## Almacenamiento de índices

| Clave                 | Tipo     | Predeterminado                        | Descripción                                        |
| --------------------- | -------- | ------------------------------------- | -------------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Ubicación del índice (admite el token `{agentId}`) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | Tokenizador FTS5 (`unicode61` o `trigram`)         |

---

## Configuración del backend QMD

Establezca `memory.backend = "qmd"` para habilitar. Todos los ajustes de QMD se encuentran bajo `memory.qmd`:

| Clave                    | Tipo      | Predeterminado | Descripción                                                                                         |
| ------------------------ | --------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`          | Ruta del ejecutable QMD; establezca una ruta absoluta cuando el servicio `PATH` difiera de su shell |
| `searchMode`             | `string`  | `search`       | Comando de búsqueda: `search`, `vsearch`, `query`                                                   |
| `includeDefaultMemory`   | `boolean` | `true`         | Autoindexar `MEMORY.md` + `memory/**/*.md`                                                          |
| `paths[]`                | `array`   | --             | Rutas adicionales: `{ name, path, pattern? }`                                                       |
| `sessions.enabled`       | `boolean` | `false`        | Indexar transcripciones de sesiones                                                                 |
| `sessions.retentionDays` | `number`  | --             | Retención de transcripciones                                                                        |
| `sessions.exportDir`     | `string`  | --             | Directorio de exportación                                                                           |

`searchMode: "search"` es solo léxico/BM25. OpenClaw no ejecuta sondas de preparación de vectores semánticos ni mantenimiento de incrustaciones de QMD para ese modo, incluso durante `memory status --deep`; `vsearch` y `query` siguen requiriendo preparación de vectores QMD e incrustaciones.

OpenClaw prefiere las formas actuales de colección QMD y consulta MCP, pero mantiene funcionando las versiones anteriores de QMD intentando marcas de patrón de colección compatibles y nombres de herramientas MCP antiguos cuando sea necesario. Cuando QMD anuncia compatibilidad con múltiples filtros de colección, las colecciones de la misma fuente se buscan con un proceso QMD; las compilaciones antiguas de QMD mantienen la ruta de compatibilidad por colección. Misma fuente significa que las colecciones de memoria duradera se agrupan, mientras que las colecciones de transcripciones de sesión siguen siendo un grupo separado para que la diversificación de fuentes siga teniendo ambas entradas.

<Note>Las anulaciones de modelos de QMD permanecen del lado de QMD, no en la configuración de OpenClaw. Si necesita anular los modelos de QMD globalmente, establezca variables de entorno como `QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` y `QMD_GENERATE_MODEL` en el entorno de ejecución de la puerta de enlace.</Note>

<AccordionGroup>
  <Accordion title="Programación de actualización">
    | Clave                       | Tipo      | Predeterminado | Descripción                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | Intervalo de actualización                      |
    | `update.debounceMs`       | `number`  | `15000` | Debounce para cambios de archivos                 |
    | `update.onBoot`           | `boolean` | `true`  | Actualizar cuando se abre el gestor QMD de larga duración; también controla la actualización de inicio opcional |
    | `update.startup`          | `string`  | `off`   | Actualización opcional al inicio de la puerta de enlace: `off`, `idle` o `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | Retraso antes de que se ejecute la actualización `startup: "idle"` |
    | `update.waitForBootSync`  | `boolean` | `false` | Bloquear la apertura del gestor hasta que se complete su actualización inicial |
    | `update.embedInterval`    | `string`  | --      | Cadencia de incrustación separada                |
    | `update.commandTimeoutMs` | `number`  | --      | Tiempo de espera para comandos QMD              |
    | `update.updateTimeoutMs`  | `number`  | --      | Tiempo de espera para operaciones de actualización de QMD     |
    | `update.embedTimeoutMs`   | `number`  | --      | Tiempo de espera para operaciones de incrustación de QMD      |
  </Accordion>
  <Accordion title="Límites">
    | Clave                       | Tipo     | Predeterminado | Descripción                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | Máx. resultados de búsqueda         |
    | `limits.maxSnippetChars`  | `number` | --      | Limitar longitud del fragmento       |
    | `limits.maxInjectedChars` | `number` | --      | Limitar caracteres inyectados totales |
    | `limits.timeoutMs`        | `number` | `4000`  | Tiempo de espera de búsqueda             |
  </Accordion>
  <Accordion title="Ámbito">
    Controla qué sesiones pueden recibir resultados de búsqueda QMD. El mismo esquema que [`session.sendPolicy`](/es/gateway/config-agents#session):

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

    La configuración predeterminada incluida permite sesiones directas y de canal, mientras que sigue denegando grupos.

    El valor predeterminado es solo DM. `match.keyPrefix` coincide con la clave de sesión normalizada; `match.rawKeyPrefix` coincide con la clave sin procesar incluyendo `agent:<id>:`.

  </Accordion>
  <Accordion title="Citas">
    `memory.citations` se aplica a todos los backends:

    | Valor            | Comportamiento                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (predeterminado) | Incluir pie de página `Source: <path#line>` en fragmentos    |
    | `on`             | Incluir siempre el pie de página                               |
    | `off`            | Omitir pie de página (la ruta aún se pasa internamente al agente) |

  </Accordion>
</AccordionGroup>

Las actualizaciones de arranque de QMD utilizan una ruta de subproceso de una sola vez durante el inicio de la puerta de enlace. El administrador QMD de larga duración aún posee el observador de archivos regular y los temporizadores de intervalo cuando se abre la búsqueda de memoria para uso interactivo.

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

## Soñar

Soñar se configura bajo `plugins.entries.memory-core.config.dreaming`, no bajo `agents.defaults.memorySearch`.

Soñar se ejecuta como un barrido programado y utiliza fases internas ligera/profunda/REM como un detalle de implementación.

Para el comportamiento conceptual y los comandos de barra, consulte [Soñar](/es/concepts/dreaming).

### Ajustes de usuario

| Clave                                  | Tipo      | Predeterminado        | Descripción                                                                                                                                                     |
| -------------------------------------- | --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`               | Habilitar o deshabilitar la "dreaming" (ensoñación) por completo                                                                                                |
| `frequency`                            | `string`  | `0 3 * * *`           | Cadencia cron opcional para el barrido completo de dreaming                                                                                                     |
| `model`                                | `string`  | modelo predeterminado | Anulación opcional del modelo del subagente Dream Diary                                                                                                         |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`                 | Máximo de tokens estimados conservados de cada fragmento de recuerdo a corto plazo promovido a `MEMORY.md`; los metadatos de procedencia siguen siendo visibles |

### Ejemplo

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        subagent: {
          allowModelOverride: true,
          allowedModels: ["anthropic/claude-sonnet-4-6"],
        },
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
            model: "anthropic/claude-sonnet-4-6",
          },
        },
      },
    },
  },
}
```

<Note>
- Dreaming escribe el estado de la máquina en `memory/.dreams/`.
- Dreaming escribe una salida narrativa legible por humanos en `DREAMS.md` (o en el `dreams.md` existente).
- `dreaming.model` utiliza el puerto de confianza (trust gate) del subagente de complementos existente; configure `plugins.entries.memory-core.subagent.allowModelOverride: true` antes de habilitarlo.
- Dream Diary reintentará una vez con el modelo predeterminado de la sesión cuando el modelo configurado no esté disponible. Los fallos de confianza o lista blanca se registran y no se reintentan silenciosamente.
- La política y los umbrales de la fase ligera/profunda/REM son un comportamiento interno, no una configuración visible para el usuario.

</Note>

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [Descripción general de la memoria](/es/concepts/memory)
- [Búsqueda de memoria](/es/concepts/memory-search)
