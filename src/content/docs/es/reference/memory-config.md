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
Si está buscando el interruptor de características de la **memoria activa** y la configuración del subagente, eso se encuentra en `plugins.entries.active-memory` en lugar de en `memorySearch`.

La memoria activa utiliza un modelo de dos puertas:

1. el complemento debe estar habilitado y apuntar al id del agente actual
2. la solicitud debe ser una sesión de chat interactiva persistente elegible

Consulte [Active Memory](/es/concepts/active-memory) para conocer el modelo de activación, la configuración propiedad del complemento, la persistencia de las transcripciones y el patrón de implementación segura.

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

### Ids de proveedores personalizados

`memorySearch.provider` puede apuntar a una entrada `models.providers.<id>` personalizada para adaptadores de proveedores específicos de memoria, como `ollama`, o para APIs de modelos compatibles con OpenAI, como `openai-responses` / `openai-completions`. OpenClaw resuelve el propietario `api` de ese proveedor para el adaptador de incrustaciones, mientras conserva el id del proveedor personalizado para el manejo del endpoint, la autenticación y el prefijo del modelo. Esto permite que las configuraciones multi-GPU o multi-host dediquen las incrustaciones de memoria a un endpoint local específico:

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

### Resolución de clave de API

Las incrustaciones remotas requieren una clave de API. Bedrock utiliza la cadena de credenciales predeterminada del SDK de AWS en su lugar (roles de instancia, SSO, claves de acceso).

| Proveedor      | Var de entorno                                     | Clave de configuración                                           |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Bedrock        | Cadena de credenciales de AWS                      | No se necesita clave de API                                      |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey`                              |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`                                 |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | Perfil de autenticación mediante inicio de sesión de dispositivo |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`                                |
| Ollama         | `OLLAMA_API_KEY` (marcador de posición)            | --                                                               |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`                                 |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`                                 |

<Note>Codex OAuth cubre solo chat/completions y no satisface las solicitudes de incrustaciones.</Note>

---

## Configuración de endpoint remoto

Use `provider: "openai-compatible"` para un servidor `/v1/embeddings` genérico compatible con OpenAI que no debe heredar las credenciales globales de chat de OpenAI.

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
    | `model`                | `string` | `gemini-embedding-001` | También compatible con `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | Para Embedding 2: 768, 1536 o 3072        |

    <Warning>
    Cambiar el modelo o `outputDimensionality` activa una reindexación completa automática.
    </Warning>

  </Accordion>
  <Accordion title="Tipos de entrada compatibles con OpenAI">
    Los puntos de conexión de incrustación (embedding) compatibles con OpenAI pueden optar por campos de solicitud `input_type` específicos del proveedor. Esto es útil para modelos de incrustación asimétricos que requieren diferentes etiquetas para incrustaciones de consultas y documentos.

    | Clave                 | Tipo     | Predeterminado | Descripción                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | sin establecer   | `input_type` compartida para incrustaciones de consultas y documentos   |
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

    Cambiar estos valores afecta la identidad de la caché de incrustación para la indexación por lotes del proveedor y debe ir seguido de una reindexación de memoria cuando el modelo ascendente trata las etiquetas de manera diferente.

  </Accordion>
  <Accordion title="Bedrock">
    ### Configuración de incrustación de Bedrock

    Bedrock utiliza la cadena de credenciales predeterminada del AWS SDK; no se necesitan claves de API. Si OpenClaw se ejecuta en EC2 con un rol de instancia habilitado para Bedrock, simplemente configure el proveedor y el modelo:

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

    | Key                    | Type     | Default                        | Description                     |
    | ---------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | Cualquier ID de modelo de incrustación de Bedrock  |
    | `outputDimensionality` | `number` | modelo predeterminado                  | Para Titan V2: 256, 512 o 1024 |

    **Modelos compatibles** (con detección de familia y dimensiones predeterminadas):

    | Model ID                                   | Provider   | Default Dims | Configurable Dims    |
    | ------------------------------------------ | ---------- | ------------ | -------------------- |
    | `amazon.titan-embed-text-v2:0`             | Amazon     | 1024         | 256, 512, 1024       |
    | `amazon.titan-embed-text-v1`               | Amazon     | 1536         | --                   |
    | `amazon.titan-embed-g1-text-02`            | Amazon     | 1536         | --                   |
    | `amazon.titan-embed-image-v1`              | Amazon     | 1024         | --                   |
    | `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024         | 256, 384, 1024, 3072 |
    | `cohere.embed-english-v3`                  | Cohere     | 1024         | --                   |
    | `cohere.embed-multilingual-v3`             | Cohere     | 1024         | --                   |
    | `cohere.embed-v4:0`                        | Cohere     | 1536         | 256-1536             |
    | `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512          | --                   |
    | `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024         | --                   |

    Las variantes con sufijo de rendimiento (por ejemplo, `amazon.titan-embed-text-v1:2:8k`) heredan la configuración del modelo base.

    **Autenticación:** La autenticación de Bedrock utiliza el orden estándar de resolución de credenciales del AWS SDK:

    1. Variables de entorno (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. Caché de tokens SSO
    3. Credenciales de token de identidad web
    4. Archivos de credenciales y configuración compartidos
    5. Credenciales de metadatos de ECS o EC2

    La región se resuelve desde `AWS_REGION`, `AWS_DEFAULT_REGION`, el `amazon-bedrock` del proveedor `baseUrl` o se predetermina a `us-east-1`.

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
    | `local.modelPath`     | `string`           | descargado automáticamente        | Ruta al archivo del modelo GGUF                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | predeterminado de node-llama-cpp | Dir. de caché para modelos descargados                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | Tamaño de la ventana de contexto para el contexto de incrustación. 4096 cubre fragmentos típicos (128–512 tokens) limitando la VRAM que no es de pesos. Reduzca a 1024–2048 en hosts con recursos limitados. `"auto"` usa el máximo entrenado del modelo — no recomendado para modelos de 8B+ (Qwen3-Embedding-8B: 40 960 tokens → ~32 GB VRAM vs ~8.8 GB a 4096). |

    Modelo predeterminado: `embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB, descargado automáticamente). Las fuentes de código aún requieren aprobación de compilación nativa: `pnpm approve-builds` y luego `pnpm rebuild node-llama-cpp`.

    Use la CLI independiente para verificar la misma ruta de proveedor que usa la Gateway:

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    Establezca `provider: "local"` explícitamente para incrustaciones GGUF locales. Las referencias de modelos `hf:` y HTTP(S) son compatibles con configuraciones locales explícitas, pero no cambian el proveedor predeterminado.

  </Accordion>
</AccordionGroup>

### Tiempo de espera de incrustación en línea

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  Anula el tiempo de espera para los lotes de incrustación en línea durante la indexación de memoria.

Sin configurar se usa el valor predeterminado del proveedor: 600 segundos para proveedores locales/autohospedados como `local`, `ollama` y `lmstudio`, y 120 segundos para proveedores hospedados. Aumente esto cuando los lotes de incrustación locales limitados por la CPU estén sanos pero lentos.

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
    | `mmr.enabled` | `boolean` | `false` | Habilitar reclasificación MMR                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = máxima diversidad, 1 = máxima relevancia |
  </Tab>
  <Tab title="Decaimiento temporal (recencia)">
    | Clave                          | Tipo      | Predeterminado | Descripción               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | Habilitar impulso de recencia      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | La puntuación se reduce a la mitad cada N días |

    Los archivos perennes (`MEMORY.md`, archivos sin fecha en `memory/`) nunca se decaen.

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

Para la búsqueda de transcripciones entre agentes con alcance de agente, utilice `agents.list[].memorySearch.qmd.extraCollections` en lugar de `memory.qmd.paths`. Esas colecciones adicionales siguen la misma forma `{ path, name, pattern? }`, pero se fusionan por agente y pueden preservar nombres compartidos explícitos cuando la ruta apunta fuera del espacio de trabajo actual. Si la misma ruta resuelta aparece tanto en `memory.qmd.paths` como en `memorySearch.qmd.extraCollections`, QMD mantiene la primera entrada y omite el duplicado.

---

## Memoria multimodal (Gemini)

Indexe imágenes y audio junto con Markdown usando Gemini Embedding 2:

| Clave                     | Tipo       | Predeterminado | Descripción                              |
| ------------------------- | ---------- | -------------- | ---------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`        | Habilitar indexación multimodal          |
| `multimodal.modalities`   | `string[]` | --             | `["image"]`, `["audio"]`, o `["all"]`    |
| `multimodal.maxFileBytes` | `number`   | `10000000`     | Tamaño máximo de archivo para indexación |

<Note>Solo se aplica a los archivos en `extraPaths`. Las raíces de memoria predeterminadas permanecen solo para Markdown. Requiere `gemini-embedding-2-preview`. `fallback` debe ser `"none"`.</Note>

Formatos compatibles: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif` (imágenes); `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Caché de incrustaciones (Embedding cache)

| Clave              | Tipo      | Predeterminado | Descripción                                    |
| ------------------ | --------- | -------------- | ---------------------------------------------- |
| `cache.enabled`    | `boolean` | `true`         | Cachear incrustaciones de fragmentos en SQLite |
| `cache.maxEntries` | `number`  | `50000`        | Incrustaciones en caché máximas                |

Evita volver a incrustar texto sin cambios durante la reindexación o actualizaciones de transcripciones.

---

## Indexación por lotes

| Clave                         | Tipo      | Por defecto | Descripción                             |
| ----------------------------- | --------- | ----------- | --------------------------------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`         | Incrustaciones en línea paralelas       |
| `remote.batch.enabled`        | `boolean` | `false`     | Habilitar API de incrustación por lotes |
| `remote.batch.concurrency`    | `number`  | `2`         | Trabajos por lotes paralelos            |
| `remote.batch.wait`           | `boolean` | `true`      | Esperar a que se complete el lote       |
| `remote.batch.pollIntervalMs` | `number`  | --          | Intervalo de sondeo                     |
| `remote.batch.timeoutMinutes` | `number`  | --          | Tiempo de espera del lote               |

Disponible para `openai`, `gemini` y `voyage`. Los lotes de OpenAI suelen ser los más rápidos y económicos para grandes reposiciones.

`remote.nonBatchConcurrency` controla las llamadas de incrustación en línea utilizadas por proveedores locales/autoalojados y proveedores alojados cuando las API de lotes del proveedor no están activas. Ollama tiene por defecto `1` para la indexación no por lotes para evitar saturar hosts locales pequeños; configure un valor más alto en máquinas más grandes.

Esto es independiente de `sync.embeddingBatchTimeoutSeconds`, que controla el tiempo de espera de las llamadas de incrustación en línea.

---

## Búsqueda de memoria de sesión (experimental)

Indexar transcripciones de sesión y exponerlas a través de `memory_search`:

| Clave                         | Tipo       | Por defecto  | Descripción                                     |
| ----------------------------- | ---------- | ------------ | ----------------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | Habilitar indexación de sesión                  |
| `sources`                     | `string[]` | `["memory"]` | Añada `"sessions"` para incluir transcripciones |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | Umbral de bytes para reindexar                  |
| `sync.sessions.deltaMessages` | `number`   | `50`         | Umbral de mensajes para reindexar               |

<Warning>La indexación de sesiones es opcional y se ejecuta de forma asíncrona. Los resultados pueden estar ligeramente desactualizados. Los registros de sesión viven en el disco, así que trate el acceso al sistema de archivos como el límite de confianza.</Warning>

---

## Aceleración vectorial de SQLite (sqlite-vec)

| Clave                        | Tipo      | Predeterminado | Descripción                                |
| ---------------------------- | --------- | -------------- | ------------------------------------------ |
| `store.vector.enabled`       | `boolean` | `true`         | Usar sqlite-vec para consultas vectoriales |
| `store.vector.extensionPath` | `string`  | incluido       | Anular la ruta de sqlite-vec               |

Cuando sqlite-vec no está disponible, OpenClaw recurre automáticamente a la similitud de coseno en proceso.

---

## Almacenamiento del índice

| Clave                 | Tipo     | Predeterminado                        | Descripción                                         |
| --------------------- | -------- | ------------------------------------- | --------------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Ubicación del índice (soporta el token `{agentId}`) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | Tokenizador FTS5 (`unicode61` o `trigram`)          |

---

## Configuración del backend QMD

Establezca `memory.backend = "qmd"` para habilitar. Todas las configuraciones de QMD se encuentran bajo `memory.qmd`:

| Clave                    | Tipo      | Predeterminado | Descripción                                                                                         |
| ------------------------ | --------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`          | Ruta del ejecutable QMD; establezca una ruta absoluta cuando el servicio `PATH` difiera de su shell |
| `searchMode`             | `string`  | `search`       | Comando de búsqueda: `search`, `vsearch`, `query`                                                   |
| `includeDefaultMemory`   | `boolean` | `true`         | Autoindexar `MEMORY.md` + `memory/**/*.md`                                                          |
| `paths[]`                | `array`   | --             | Rutas adicionales: `{ name, path, pattern? }`                                                       |
| `sessions.enabled`       | `boolean` | `false`        | Indexar transcripciones de sesión                                                                   |
| `sessions.retentionDays` | `number`  | --             | Retención de transcripciones                                                                        |
| `sessions.exportDir`     | `string`  | --             | Directorio de exportación                                                                           |

`searchMode: "search"` es solo léxico/BM25. OpenClaw no ejecuta sondas de preparación de vectores semánticos ni mantenimiento de incrustaciones de QMD para ese modo, incluso durante `memory status --deep`; `vsearch` y `query` continúan requiriendo preparación de vectores QMD e incrustaciones.

OpenClaw prefiere las formas de colección y consulta de MCP actuales de QMD, pero mantiene funcionando las versiones antiguas de QMD intentando indicadores de patrón de colección compatibles y nombres de herramientas MCP antiguos cuando es necesario. Cuando QMD anuncia soporte para múltiples filtros de colección, las colecciones de la misma fuente se buscan con un solo proceso QMD; las compilaciones antiguas de QMD mantienen la ruta de compatibilidad por colección. Misma fuente significa que las colecciones de memoria duradera se agrupan juntas, mientras que las colecciones de transcripciones de sesión permanecen como un grupo separado para que la diversificación de fuentes aún tenga ambas entradas.

<Note>Las anulaciones del modelo QMD se mantienen del lado de QMD, no en la configuración de OpenClaw. Si necesita anular los modelos de QMD globalmente, establezca variables de entorno como `QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` y `QMD_GENERATE_MODEL` en el entorno de tiempo de ejecución de la puerta de enlace.</Note>

<AccordionGroup>
  <Accordion title="Update schedule">
    | Key                       | Type      | Default | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | Intervalo de actualización                      |
    | `update.debounceMs`       | `number`  | `15000` | Desactivar cambios de archivo                 |
    | `update.onBoot`           | `boolean` | `true`  | Actualizar cuando se abre el gestor QMD de larga duración; también controla la actualización de inicio opcional |
    | `update.startup`          | `string`  | `off`   | Actualización opcional al iniciar la puerta de enlace: `off`, `idle`, o `immediate` |
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
    | `limits.maxResults`       | `number` | `6`     | Máximos resultados de búsqueda         |
    | `limits.maxSnippetChars`  | `number` | --      | Limitar la longitud del fragmento       |
    | `limits.maxInjectedChars` | `number` | --      | Limitar el total de caracteres inyectados |
    | `limits.timeoutMs`        | `number` | `4000`  | Tiempo de espera de búsqueda             |
  </Accordion>
  <Accordion title="Ámbito">
    Controla qué sesiones pueden recibir resultados de búsqueda de QMD. Mismo esquema que [`session.sendPolicy`](/es/gateway/config-agents#session):

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

    La configuración predeterminada incluida permite sesiones directas y de canal, aunque sigue denegando grupos.

    El valor predeterminado es solo MD. `match.keyPrefix` coincide con la clave de sesión normalizada; `match.rawKeyPrefix` coincide con la clave sin procesar incluyendo `agent:<id>:`.

  </Accordion>
  <Accordion title="Citas">
    `memory.citations` se aplica a todos los backends:

    | Valor            | Comportamiento                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (predeterminado) | Incluir pie de página `Source: <path#line>` en fragmentos    |
    | `on`             | Incluir siempre el pie de página                               |
    | `off`            | Omitir el pie de página (la ruta aún se pasa internamente al agente) |

  </Accordion>
</AccordionGroup>

Las actualizaciones de arranque de QMD utilizan una ruta de subproceso de una sola vez durante el inicio de la puerta de enlace. El gestor de QMD de larga duración aún posee el observador de archivos regular y los temporizadores de intervalo cuando se abre la búsqueda de memoria para uso interactivo.

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

### Configuración de usuario

| Clave                                  | Tipo      | Predeterminado        | Descripción                                                                                                                                                |
| -------------------------------------- | --------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`               | Habilitar o deshabilitar el soñar por completo                                                                                                             |
| `frequency`                            | `string`  | `0 3 * * *`           | Cadencia cron opcional para el barrido completo de soñar                                                                                                   |
| `model`                                | `string`  | modelo predeterminado | Anulación opcional del modelo del subagente Dream Diary                                                                                                    |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`                 | Tokens estimados máximos conservados de cada fragmento de recuerdo a corto plazo promovido a `MEMORY.md`; los metadatos de procedencia permanecen visibles |

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
- Soñar escribe el estado de la máquina en `memory/.dreams/`.
- Soñar escribe una salida narrativa legible por humanos en `DREAMS.md` (o el `dreams.md` existente).
- `dreaming.model` utiliza el control de confianza del subagente de complemento existente; establezca `plugins.entries.memory-core.subagent.allowModelOverride: true` antes de habilitarlo.
- Dream Diary reintenta una vez con el modelo predeterminado de la sesión cuando el modelo configurado no está disponible. Los fallos de confianza o lista blanda se registran y no se reintentan silenciosamente.
- La política y los umbrales de la fase ligera/profunda/REM son un comportamiento interno, no una configuración para el usuario.

</Note>

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [Descripción general de la memoria](/es/concepts/memory)
- [Búsqueda de memoria](/es/concepts/memory-search)
