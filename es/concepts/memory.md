---
title: "Memoria"
summary: "Cómo funciona la memoria de OpenClaw (archivos del espacio de trabajo + vaciado automático de memoria)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# Memoria

La memoria de OpenClaw es **Markdown plano en el espacio de trabajo del agente**. Los archivos son la
fuente de la verdad; el modelo solo "recuerda" lo que se escribe en el disco.

Las herramientas de búsqueda de memoria son proporcionadas por el complemento de memoria activo (predeterminado:
`memory-core`). Desactive los complementos de memoria con `plugins.slots.memory = "none"`.

## Archivos de memoria (Markdown)

El diseño del espacio de trabajo predeterminado utiliza dos capas de memoria:

- `memory/YYYY-MM-DD.md`
  - Registro diario (solo agregar).
  - Leer hoy + ayer al inicio de la sesión.
- `MEMORY.md` (opcional)
  - Memoria a largo plazo curada.
  - Si tanto `MEMORY.md` como `memory.md` existen en la raíz del espacio de trabajo, OpenClaw solo carga `MEMORY.md`.
  - La versión en minúsculas de `memory.md` solo se usa como respaldo cuando `MEMORY.md` está ausente.
  - **Cargar solo en la sesión principal privada** (nunca en contextos de grupo).

Estos archivos residen bajo el espacio de trabajo (`agents.defaults.workspace`, predeterminado
`~/.openclaw/workspace`). Consulte [Espacio de trabajo del agente](/es/concepts/agent-workspace) para ver el diseño completo.

## Herramientas de memoria

OpenClaw expone dos herramientas orientadas al agente para estos archivos Markdown:

- `memory_search` — recuperación semántica sobre fragmentos indexados.
- `memory_get` — lectura dirigida de un archivo/rango de líneas Markdown específico.

`memory_get` ahora **se degrada con elegancia cuando un archivo no existe** (por ejemplo,
el registro diario de hoy antes de la primera escritura). Tanto el administrador integrado como el backend QMD
devuelven `{ text: "", path }` en lugar de lanzar `ENOENT`, por lo que los agentes pueden
manejar "aún no hay nada grabado" y continuar su flujo de trabajo sin envolver la
llamada a la herramienta en lógica try/catch.

## Cuándo escribir memoria

- Las decisiones, preferencias y hechos duraderos van a `MEMORY.md`.
- Las notas del día a día y el contexto en curso van a `memory/YYYY-MM-DD.md`.
- Si alguien dice "recuerda esto", escríbelo (no lo mantengas en la RAM).
- Esta área sigue evolucionando. Ayuda recordarle al modelo que almacene recuerdos; él sabrá qué hacer.
- Si quieres que algo quede grabado, **pídele al bot que lo escriba** en la memoria.

## Vaciamiento automático de memoria (ping de precompactación)

Cuando una sesión está **cerca de la autocompactación**, OpenClaw activa un **turno
agente silencioso** que recuerda al modelo escribir memoria durable **antes** de que
se compacte el contexto. Los avisos predeterminados dicen explícitamente que el modelo _puede responder_,
pero por lo general `NO_REPLY` es la respuesta correcta para que el usuario nunca vea este turno.

Esto se controla mediante `agents.defaults.compaction.memoryFlush`:

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

Detalles:

- **Umbral suave**: el vaciamiento se activa cuando la estimación de tokens de la sesión supera
  `contextWindow - reserveTokensFloor - softThresholdTokens`.
- **Silencioso** por defecto: los avisos incluyen `NO_REPLY` para que no se entregue nada.
- **Dos avisos**: un aviso de usuario más un aviso del sistema añaden el recordatorio.
- **Un vaciamiento por ciclo de compactación** (rastreado en `sessions.json`).
- **El espacio de trabajo debe ser escribible**: si la sesión se ejecuta en sandbox con
  `workspaceAccess: "ro"` o `"none"`, se omite el vaciamiento.

Para ver el ciclo de vida completo de la compactación, consulte
[Gestión de sesiones + compactación](/es/reference/session-management-compaction).

## Búsqueda de memoria vectorial

OpenClaw puede construir un pequeño índice vectorial sobre `MEMORY.md` y `memory/*.md` para
que las consultas semánticas puedan encontrar notas relacionadas incluso cuando la redacción difiera.

Valores predeterminados:

- Habilitado de forma predeterminada.
- Vigila los archivos de memoria en busca de cambios (con rebote/debounced).
- Configure la búsqueda de memoria en `agents.defaults.memorySearch` (no en el nivel superior
  `memorySearch`).
- Utiliza incrustaciones remotas de forma predeterminada. Si `memorySearch.provider` no está configurado, OpenClaw selecciona automáticamente:
  1. `local` si se configura `memorySearch.local.modelPath` y el archivo existe.
  2. `openai` si se puede resolver una clave de OpenAI.
  3. `gemini` si se puede resolver una clave de Gemini.
  4. `voyage` si se puede resolver una clave de Voyage.
  5. `mistral` si se puede resolver una clave de Mistral.
  6. De lo contrario, la búsqueda de memoria permanece deshabilitada hasta que se configure.
- El modo local usa node-llama-cpp y puede requerir `pnpm approve-builds`.
- Usa sqlite-vec (cuando está disponible) para acelerar la búsqueda vectorial dentro de SQLite.
- `memorySearch.provider = "ollama"` también es compatible con incrustaciones
  Ollama locales/autoalojadas (`/api/embeddings`), pero no se selecciona automáticamente.

Las incrustaciones remotas **requieren** una clave API del proveedor de incrustaciones. OpenClaw
resuelve las claves desde perfiles de autenticación, `models.providers.*.apiKey` o variables de
entorno. Codex OAuth solo cubre chat/completions y **no** satisface
las incrustaciones para la búsqueda de memoria. Para Gemini, usa `GEMINI_API_KEY` o
`models.providers.google.apiKey`. Para Voyage, usa `VOYAGE_API_KEY` o
`models.providers.voyage.apiKey`. Para Mistral, usa `MISTRAL_API_KEY` o
`models.providers.mistral.apiKey`. Ollama generalmente no requiere una clave API real
(un marcador de posición como `OLLAMA_API_KEY=ollama-local` es suficiente cuando lo requiere
la política local).
Al usar un punto final personalizado compatible con OpenAI,
establece `memorySearch.remote.apiKey` (y opcional `memorySearch.remote.headers`).

### Backend QMD (experimental)

Establece `memory.backend = "qmd"` para intercambiar el indexador SQLite incorporado por
[QMD](https://github.com/tobi/qmd): un sidecar de búsqueda con prioridad local que combina
BM25 + vectores + reranking. Markdown sigue siendo la fuente de verdad; OpenClaw delega
a QMD para la recuperación. Puntos clave:

**Requisitos previos**

- Deshabilitado por defecto. Actívalo por configuración (`memory.backend = "qmd"`).
- Instala la CLI de QMD por separado (`bun install -g https://github.com/tobi/qmd` u obtén
  una versión) y asegúrate de que el binario `qmd` esté en el `PATH` de la puerta de enlace.
- QMD necesita una compilación de SQLite que permita extensiones (`brew install sqlite` en
  macOS).
- QMD se ejecuta completamente localmente a través de Bun + `node-llama-cpp` y descarga automáticamente modelos
  GGUF de HuggingFace en el primer uso (no se requiere un demonio Ollama separado).
- La puerta de enlace ejecuta QMD en un hogar XDG autocontenido bajo
  `~/.openclaw/agents/<agentId>/qmd/` estableciendo `XDG_CONFIG_HOME` y
  `XDG_CACHE_HOME`.
- Soporte de sistema operativo: macOS y Linux funcionan de inmediato una vez instalados Bun + SQLite.
  Windows se admite mejor a través de WSL2.

**Cómo se ejecuta el sidecar**

- El gateway escribe un directorio QMD autónomo bajo
  `~/.openclaw/agents/<agentId>/qmd/` (config + caché + base de datos sqlite).
- Las colecciones se crean mediante `qmd collection add` desde `memory.qmd.paths`
  (además de los archivos de memoria del espacio de trabajo predeterminados), luego se ejecutan `qmd update` + `qmd embed`
  al inicio y en un intervalo configurable (`memory.qmd.update.interval`,
  predeterminado 5 m).
- El gateway ahora inicializa el gestor QMD al inicio, por lo que los temporizadores
  de actualización periódica se activan incluso antes de la primera llamada `memory_search`.
- La actualización al inicio ahora se ejecuta en segundo plano de forma predeterminada
  para que el inicio del chat no se bloquee; configure `memory.qmd.update.waitForBootSync = true` para mantener
  el comportamiento de bloqueo anterior.
- Las búsquedas se ejecutan mediante `memory.qmd.searchMode` (predeterminado `qmd search --json`; también
  admite `vsearch` y `query`). Si el modo seleccionado rechaza indicadores en su
  compilación de QMD, OpenClaw reintenta con `qmd query`. Si QMD falla o falta el binario,
  OpenClaw recurre automáticamente al gestor SQLite integrado para que las
  herramientas de memoria sigan funcionando.
- OpenClaw no expone hoy el ajuste del tamaño del lote de incrustación de QMD;
  el comportamiento del lote está controlado por el propio QMD.
- **La primera búsqueda puede ser lenta**: QMD puede descargar modelos GGUF locales
  (reranker/expansión de consulta) en la primera ejecución de `qmd query`.
  - OpenClaw establece `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automáticamente cuando ejecuta QMD.
  - Si desea descargar los modelos manualmente (y precargar el mismo índice que usa
    OpenClaw), ejecute una consulta única con los directorios XDG del agente.

    El estado de QMD de OpenClaw reside en su **directorio de estado** (predeterminado `~/.openclaw`).
    Puede apuntar `qmd` al mismo índice exacto exportando las mismas variables XDG
    que usa OpenClaw:

    ```bash
    # Pick the same state dir OpenClaw uses
    STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

    export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
    export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

    # (Optional) force an index refresh + embeddings
    qmd update
    qmd embed

    # Warm up / trigger first-time model downloads
    qmd query "test" -c memory-root --json >/dev/null 2>&1
    ```

**Superficie de configuración (`memory.qmd.*`)**

- `command` (predeterminado `qmd`): anular la ruta del ejecutable.
- `searchMode` (predeterminado `search`): elegir qué comando QMD respalda
  `memory_search` (`search`, `vsearch`, `query`).
- `includeDefaultMemory` (predeterminado `true`): indexación automática de `MEMORY.md` + `memory/**/*.md`.
- `paths[]`: agregar directorios/archivos adicionales (`path`, `pattern` opcional,
  `name` estable opcional).
- `sessions`: optar por la indexación JSONL de sesión (`enabled`, `retentionDays`,
  `exportDir`).
- `update`: controla la cadencia de actualización y la ejecución del mantenimiento:
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`).
- `limits`: limitar la carga de recuperación (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope`: mismo esquema que [`session.sendPolicy`](/es/gateway/configuration#session).
  El valor predeterminado es solo MD (`deny` todo, `allow` chats directos); relájalo para mostrar aciertos QMD
  en grupos/canales.
  - `match.keyPrefix` coincide con la clave de sesión **normalizada** (en minúsculas, con cualquier
    `agent:<id>:` inicial eliminada). Ejemplo: `discord:channel:`.
  - `match.rawKeyPrefix` coincide con la clave de sesión **sin procesar** (en minúsculas), incluyendo
    `agent:<id>:`. Ejemplo: `agent:main:discord:`.
  - Heredado: `match.keyPrefix: "agent:..."` todavía se trata como un prefijo de clave sin procesar,
    pero se prefiere `rawKeyPrefix` para mayor claridad.
- Cuando `scope` deniega una búsqueda, OpenClaw registra una advertencia con la `channel`/`chatType` derivada
  para que sea más fácil depurar los resultados vacíos.
- Los fragmentos obtenidos fuera del espacio de trabajo aparecen como
  `qmd/<collection>/<relative-path>` en los resultados de `memory_search`; `memory_get`
  entiende ese prefijo y lee desde la raíz de la colección QMD configurada.
- Cuando `memory.qmd.sessions.enabled = true`, OpenClaw exporta transcripciones de sesión
  saneadas (turnos de Usuario/Ayudante) a una colección QMD dedicada bajo
  `~/.openclaw/agents/<id>/qmd/sessions/`, para que `memory_search` pueda recordar conversaciones
  recientes sin tocar el índice SQLite integrado.
- Los fragmentos de `memory_search` ahora incluyen un pie de página `Source: <path#line>` cuando
  `memory.citations` es `auto`/`on`; configure `memory.citations = "off"` para mantener
  los metadatos de la ruta internos (el agente todavía recibe la ruta para
  `memory_get`, pero el texto del fragmento omite el pie de página y el indicador del sistema
  advierte al agente que no lo cite).

**Ejemplo**

```json5
memory: {
  backend: "qmd",
  citations: "auto",
  qmd: {
    includeDefaultMemory: true,
    update: { interval: "5m", debounceMs: 15000 },
    limits: { maxResults: 6, timeoutMs: 4000 },
    scope: {
      default: "deny",
      rules: [
        { action: "allow", match: { chatType: "direct" } },
        // Normalized session-key prefix (strips `agent:<id>:`).
        { action: "deny", match: { keyPrefix: "discord:channel:" } },
        // Raw session-key prefix (includes `agent:<id>:`).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ]
    },
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

**Citas y alternativa**

- `memory.citations` se aplica independientemente del motor (`auto`/`on`/`off`).
- Cuando se ejecuta `qmd`, etiquetamos `status().backend = "qmd"` para que los diagnósticos muestren qué
  motor sirvió los resultados. Si el subproceso QMD sale o la salida JSON no se puede
  analizar, el gestor de búsqueda registra una advertencia y devuelve el proveedor integrado
  (incrustaciones de Markdown existentes) hasta que QMD se recupere.

### Rutas de memoria adicionales

Si desea indexar archivos Markdown fuera de la estructura del espacio de trabajo predeterminado, añada
rutas explícitas:

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

Notas:

- Las rutas pueden ser absolutas o relativas al espacio de trabajo.
- Los directorios se escanean de forma recursiva en busca de archivos `.md`.
- De forma predeterminada, solo se indexan los archivos Markdown.
- Si `memorySearch.multimodal.enabled = true`, OpenClaw también indexa archivos de imagen/audio compatibles solo bajo `extraPaths`. Las raíces de memoria predeterminadas (`MEMORY.md`, `memory.md`, `memory/**/*.md`) se mantienen solo para Markdown.
- Se ignoran los enlaces simbólicos (archivos o directorios).

### Archivos de memoria multimodales (imagen Gemini + audio)

OpenClaw puede indexar archivos de imagen y audio de `memorySearch.extraPaths` cuando se utiliza el embedding 2 de Gemini:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      extraPaths: ["assets/reference", "voice-notes"],
      multimodal: {
        enabled: true,
        modalities: ["image", "audio"], // or ["all"]
        maxFileBytes: 10000000
      },
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

Notas:

- La memoria multimodal actualmente solo es compatible con `gemini-embedding-2-preview`.
- La indexación multimodal se aplica solo a los archivos descubiertos a través de `memorySearch.extraPaths`.
- Modalidades compatibles en esta fase: imagen y audio.
- `memorySearch.fallback` debe permanecer `"none"` mientras la memoria multimodal esté habilitada.
- Los bytes de los archivos de imagen/audio coincidentes se cargan en el endpoint de embedding de Gemini configurado durante la indexación.
- Extensiones de imagen compatibles: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`.
- Extensiones de audio compatibles: `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`.
- Las consultas de búsqueda siguen siendo de texto, pero Gemini puede comparar esas consultas de texto con los embeddings de imagen/audio indexados.
- `memory_get` todavía solo lee Markdown; los archivos binarios son buscables pero no se devuelven como contenido de archivo sin procesar.

### Embeddings de Gemini (nativo)

Establezca el proveedor en `gemini` para usar la API de embeddings de Gemini directamente:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

Notas:

- `remote.baseUrl` es opcional (el valor predeterminado es la URL base de la API de Gemini).
- `remote.headers` le permite agregar encabezados adicionales si es necesario.
- Modelo predeterminado: `gemini-embedding-001`.
- `gemini-embedding-2-preview` también es compatible: límite de 8192 tokens y dimensiones configurables (768 / 1536 / 3072, predeterminado 3072).

#### Gemini Embedding 2 (versión preliminar)

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      outputDimensionality: 3072,  // optional: 768, 1536, or 3072 (default)
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

> **⚠️ Se requiere volver a indexar:** Cambiar de `gemini-embedding-001` (768 dimensiones)
> a `gemini-embedding-2-preview` (3072 dimensiones) cambia el tamaño del vector. Lo mismo ocurre si
> cambia `outputDimensionality` entre 768, 1536 y 3072.
> OpenClaw volverá a indexar automáticamente cuando detecte un cambio en el modelo o en las dimensiones.

Si deseas utilizar un **endpoint personalizado compatible con OpenAI** (OpenRouter, vLLM o un proxy),
puedes usar la configuración `remote` con el proveedor OpenAI:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

Si no deseas establecer una clave API, usa `memorySearch.provider = "local"` o establece
`memorySearch.fallback = "none"`.

Alternativas:

- `memorySearch.fallback` puede ser `openai`, `gemini`, `voyage`, `mistral`, `ollama`, `local`, o `none`.
- El proveedor de reserva solo se usa cuando falla el proveedor de incrustaciones principal.

Indexación por lotes (OpenAI + Gemini + Voyage):

- Deshabilitado por defecto. Establece `agents.defaults.memorySearch.remote.batch.enabled = true` para habilitar la indexación de corpus grandes (OpenAI, Gemini y Voyage).
- El comportamiento predeterminado espera a que se complete el lote; ajusta `remote.batch.wait`, `remote.batch.pollIntervalMs` y `remote.batch.timeoutMinutes` si es necesario.
- Establece `remote.batch.concurrency` para controlar cuántos trabajos por lotes enviamos en paralelo (predeterminado: 2).
- El modo por lotes se aplica cuando `memorySearch.provider = "openai"` o `"gemini"` y usa la clave API correspondiente.
- Los trabajos por lotes de Gemini usan el endpoint de incrustaciones asíncronas por lotes y requieren la disponibilidad de Gemini Batch API.

Por qué el lote de OpenAI es rápido y barato:

- Para grandes rellenos de datos (backfills), OpenAI suele ser la opción más rápida que admitimos porque podemos enviar muchas solicitudes de incrustación en un solo trabajo por lotes y dejar que OpenAI las procese de forma asíncrona.
- OpenAI ofrece precios con descuento para las cargas de trabajo de la API por lotes, por lo que las ejecuciones de indexación grandes suelen ser más baratas que enviar las mismas solicitudes de forma síncrona.
- Consulta los documentos y precios de la API por lotes de OpenAI para obtener más detalles:
  - [https://platform.openai.com/docs/api-reference/batch](https://platform.openai.com/docs/api-reference/batch)
  - [https://platform.openai.com/pricing](https://platform.openai.com/pricing)

Ejemplo de configuración:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

Herramientas:

- `memory_search` — devuelve fragmentos con rangos de archivo + línea.
- `memory_get` — lee el contenido del archivo de memoria por ruta.

Modo local:

- Establece `agents.defaults.memorySearch.provider = "local"`.
- Proporciona `agents.defaults.memorySearch.local.modelPath` (GGUF o URI `hf:`).
- Opcional: establece `agents.defaults.memorySearch.fallback = "none"` para evitar la reserva remota.

### Cómo funcionan las herramientas de memoria

- `memory_search` busca semánticamente fragmentos de Markdown (objetivo de ~400 tokens, superposición de 80 tokens) de `MEMORY.md` + `memory/**/*.md`. Devuelve el texto del fragmento (limitado a ~700 caracteres), la ruta del archivo, el rango de líneas, la puntuación, el proveedor/modelo y si se ha vuelto a incrustar localmente o de forma remota. No se devuelve la carga útil del archivo completo.
- `memory_get` lee un archivo Markdown de memoria específico (relativo al espacio de trabajo), opcionalmente desde una línea inicial y durante N líneas. Se rechazan las rutas fuera de `MEMORY.md` / `memory/`.
- Ambas herramientas solo están habilitadas cuando `memorySearch.enabled` se resuelve como verdadero para el agente.

### Qué se indexa (y cuándo)

- Tipo de archivo: solo Markdown (`MEMORY.md`, `memory/**/*.md`).
- Almacenamiento del índice: SQLite por agente en `~/.openclaw/memory/<agentId>.sqlite` (configurable mediante `agents.defaults.memorySearch.store.path`, soporta token `{agentId}`).
- Actualización: un observador en `MEMORY.md` + `memory/` marca el índice como sucio (anti-rebote de 1.5 s). La sincronización se programa al inicio de la sesión, al buscar o en un intervalo y se ejecuta de forma asíncrona. Las transcripciones de la sesión utilizan umbrales delta para activar la sincronización en segundo plano.
- Disparadores de reindexación: el índice almacena el **proveedor/modelo de incrustación + huella digital del punto final + parámetros de fragmentación**. Si alguno de estos cambia, OpenClaw restablece y reindexa automáticamente todo el almacén.

### Búsqueda híbrida (BM25 + vector)

Cuando está habilitada, OpenClaw combina:

- **Similitud vectorial** (coincidencia semántica, la redacción puede diferir)
- **Relevancia de palabras clave BM25** (tokens exactos como ID, variables de entorno, símbolos de código)

Si la búsqueda de texto completo no está disponible en su plataforma, OpenClaw vuelve a la búsqueda solo vectorial.

#### ¿Por qué híbrida?

La búsqueda vectorial es excelente en "esto significa lo mismo":

- "Mac Studio gateway host" vs "la máquina que ejecuta la puerta de enlace"
- "evitar actualizaciones de archivo" vs "evitar la indexación en cada escritura"

Pero puede ser débil con tokens exactos y de alta señal:

- ID (`a828e60`, `b3b9895a…`)
- símbolos de código (`memorySearch.query.hybrid`)
- cadenas de error ("sqlite-vec no disponible")

BM25 (texto completo) es lo opuesto: fuerte en tokens exactos, más débil en paráfrasis.
La búsqueda híbrida es el término medio pragmático: **usar ambas señales de recuperación** para obtener
buenos resultados tanto para consultas en "lenguaje natural" como para consultas de "buscar una aguja en un pajar".

#### Cómo fusionamos los resultados (el diseño actual)

Boceto de implementación:

1. Recuperar un grupo de candidatos de ambos lados:

- **Vector**: `maxResults * candidateMultiplier` superiores por similitud de coseno.
- **BM25**: `maxResults * candidateMultiplier` superiores por rango BM25 de FTS5 (menor es mejor).

2. Convertir el rango BM25 en una puntuación de 0..1 aprox.:

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. Unir candidatos por ID de fragmento y calcular una puntuación ponderada:

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Notas:

- `vectorWeight` + `textWeight` se normaliza a 1.0 en la resolución de configuración, por lo que los pesos se comportan como porcentajes.
- Si los embeddings no están disponibles (o el proveedor devuelve un vector cero), todavía ejecutamos BM25 y devolvemos coincidencias de palabras clave.
- Si no se puede crear FTS5, mantenemos la búsqueda solo vectorial (sin fallo grave).

Esto no es "perfecto según la teoría de IR", pero es simple, rápido y tiende a mejorar el recuerdo/precisión en notas reales.
Si queremos ser más sofisticados más adelante, los siguientes pasos comunes son la Fusión de Rango Recíproco (RRF) o la normalización de puntuaciones
(min/max o puntuación z) antes de mezclar.

#### Canalización de postprocesamiento

Después de fusionar las puntuaciones vectoriales y de palabras clave, dos etapas opcionales de postprocesamiento
refinan la lista de resultados antes de que llegue al agente:

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

Ambas etapas están **desactivadas por defecto** y se pueden activar de forma independiente.

#### Reclasificación MMR (diversidad)

Cuando la búsqueda híbrida devuelve resultados, múltiples fragmentos pueden contenido similar o superpuesto.
Por ejemplo, buscar "configuración de red doméstica" podría devolver cinco fragmentos casi idénticos
de diferentes notas diarias que mencionan la misma configuración del enrutador.

**MMR (Maximal Marginal Relevance)** re-clasifica los resultados para equilibrar la relevancia con la diversidad,
asegurando que los resultados principales cubran diferentes aspectos de la consulta en lugar de repetir la misma información.

Cómo funciona:

1. Los resultados se puntúan por su relevancia original (puntuación ponderada vector + BM25).
2. MMR selecciona iterativamente resultados que maximizan: `λ × relevance − (1−λ) × max_similarity_to_selected`.
3. La similitud entre resultados se mide utilizando la similitud de texto de Jaccard en el contenido tokenizado.

El parámetro `lambda` controla el equilibrio:

- `lambda = 1.0` → relevancia pura (sin penalización por diversidad)
- `lambda = 0.0` → diversidad máxima (ignora la relevancia)
- Predeterminado: `0.7` (equilibrado, ligero sesgo de relevancia)

**Ejemplo — consulta: "configuración de la red doméstica"**

Dados estos archivos de memoria:

```
memory/2026-02-10.md  → "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  → "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  → "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     → "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

Sin MMR — 3 resultados principales:

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  ← router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  ← reference doc
```

Con MMR (λ=0.7) — 3 resultados principales:

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/network.md     (score: 0.85)  ← reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  ← AdGuard DNS (diverse!)
```

El casi duplicado del 8 de febrero desaparece y el agente obtiene tres piezas de información distintas.

**Cuándo activar:** Si notas que `memory_search` devuelve fragmentos redundantes o casi duplicados,
especialmente con notas diarias que a menudo repiten información similar a lo largo de los días.

#### Decaimiento temporal (impulso de actualidad)

Los agentes con notas diarias acumulan cientos de archivos fechados con el tiempo. Sin decaimiento,
una nota bien redactada de hace seis meses puede superar en clasificación a la actualización de ayer sobre el mismo tema.

El **decaimiento temporal** aplica un multiplicador exponencial a las puntuaciones basado en la antigüedad de cada resultado,
por lo que los recuerdos recientes se clasifican naturalmente más alto mientras que los antiguos se desvanecen:

```
decayedScore = score × e^(-λ × ageInDays)
```

donde `λ = ln(2) / halfLifeDays`.

Con la vida media predeterminada de 30 días:

- Notas de hoy: **100%** de la puntuación original
- Hace 7 días: **~84%**
- Hace 30 días: **50%**
- Hace 90 días: **12.5%**
- Hace 180 días: **~1.6%**

**Los archivos perennes nunca sufren decaimiento:**

- `MEMORY.md` (archivo de memoria raíz)
- Archivos sin fecha en `memory/` (por ejemplo, `memory/projects.md`, `memory/network.md`)
- Estos contienen información de referencia duradera que siempre debe clasificarse normalmente.

Los **archivos diarios fechados** (`memory/YYYY-MM-DD.md`) utilizan la fecha extraída del nombre del archivo.
Otras fuentes (por ejemplo, transcripciones de sesión) recurren a la hora de modificación del archivo (`mtime`).

**Ejemplo — consulta: "¿cuál es el horario de trabajo de Rod?"**

Dados estos archivos de memoria (hoy es 10 de febrero):

```
memory/2025-09-15.md  → "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  → "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  → "Rod started new team, standup moved to 14:15"        (7 days old)
```

Sin decaimiento:

```
1. memory/2025-09-15.md  (score: 0.91)  ← best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

Con decaimiento (halfLife=30):

```
1. memory/2026-02-10.md  (score: 0.82 × 1.00 = 0.82)  ← today, no decay
2. memory/2026-02-03.md  (score: 0.80 × 0.85 = 0.68)  ← 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 148 days, nearly gone
```

La nota obsoleta de septiembre cae al fondo a pesar de tener la mejor coincidencia semántica bruta.

**Cuándo habilitar:** Si su agente tiene meses de notas diarias y descubre que la información antigua y obsoleta supera en rango al contexto reciente. Una vida media de 30 días funciona bien para flujos de trabajo con muchas notas diarias; aumente (por ejemplo, 90 días) si consulta notas antiguas con frecuencia.

#### Configuración

Ambas características se configuran en `memorySearch.query.hybrid`:

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4,
          // Diversity: reduce redundant results
          mmr: {
            enabled: true,    // default: false
            lambda: 0.7       // 0 = max diversity, 1 = max relevance
          },
          // Recency: boost newer memories
          temporalDecay: {
            enabled: true,    // default: false
            halfLifeDays: 30  // score halves every 30 days
          }
        }
      }
    }
  }
}
```

Puede habilitar cada característica de forma independiente:

- **Solo MMR** — útil cuando tiene muchas notas similares pero la antigüedad no importa.
- **Solo decadencia temporal** — útil cuando la recientez importa pero sus resultados ya son diversos.
- **Ambas** — recomendado para agentes con historiales grandes y de larga duración de notas diarias.

### Caché de incrustaciones (embeddings)

OpenClaw puede almacenar en caché las **incrustaciones de fragmentos (chunk embeddings)** en SQLite para que la reindexación y las actualizaciones frecuentes (especialmente las transcripciones de sesiones) no vuelvan a incrustar el texto sin cambios.

Config:

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### Búsqueda de memoria de sesión (experimental)

Opcionalmente, puede indexar las **transcripciones de sesión** y mostrarlas a través de `memory_search`.
Esto está protegido por una marca experimental.

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

Notas:

- La indexación de sesiones es **opt-in** (desactivada por defecto).
- Las actualizaciones de sesión se someten a antirrebote (debounced) y se **indexan de forma asíncrona** una vez que cruzan los umbrales de delta (best-effort).
- `memory_search` nunca se bloquea en la indexación; los resultados pueden estar ligeramente obsoletos hasta que finalice la sincronización en segundo plano.
- Los resultados aún incluyen solo fragmentos; `memory_get` sigue limitado a los archivos de memoria.
- La indexación de sesiones está aislada por agente (solo se indexan los registros de sesión de ese agente).
- Los registros de sesión residen en el disco (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`). Cualquier proceso/usuario con acceso al sistema de archivos puede leerlos, así que trate el acceso al disco como el límite de confianza. Para un aislamiento más estricto, ejecute los agentes en usuarios o hosts de sistema operativo separados.

Umbrales de delta (valores predeterminados mostrados):

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // JSONL lines
        }
      }
    }
  }
}
```

### Aceleración vectorial SQLite (sqlite-vec)

Cuando la extensión sqlite-vec está disponible, OpenClaw almacena las incrustaciones en una
tabla virtual de SQLite (`vec0`) y realiza consultas de distancia vectorial en la
base de datos. Esto mantiene la búsqueda rápida sin cargar cada incrustación en JS.

Configuración (opcional):

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

Notas:

- `enabled` por defecto es true; cuando está desactivado, la búsqueda recurre a similitud de coseno en proceso sobre las incrustaciones almacenadas.
- Si falta la extensión sqlite-vec o falla su carga, OpenClaw registra el
  error y continúa con la alternativa de JS (sin tabla vectorial).
- `extensionPath` anula la ruta de sqlite-vec incluida (útil para compilaciones personalizadas
  o ubicaciones de instalación no estándar).

### Descarga automática de incrustaciones locales

- Modelo de incrustación local predeterminado: `hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB).
- Cuando `memorySearch.provider = "local"`, `node-llama-cpp` resuelve `modelPath`; si falta el GGUF, se **descarga automáticamente** en el caché (o en `local.modelCacheDir` si está configurado) y luego lo carga. Las descargas se reanudan al reintentar.
- Requisito de compilación nativa: ejecute `pnpm approve-builds`, elija `node-llama-cpp` y luego `pnpm rebuild node-llama-cpp`.
- Alternativa: si falla la configuración local y `memorySearch.fallback = "openai"`, cambiamos automáticamente a incrustaciones remotas (`openai/text-embedding-3-small` a menos que se anule) y registramos el motivo.

### Ejemplo de punto de conexión personalizado compatible con OpenAI

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

Notas:

- `remote.*` tiene prioridad sobre `models.providers.openai.*`.
- `remote.headers` se fusionan con los encabezados de OpenAI; en caso de conflicto de claves, gana el remoto. Omita `remote.headers` para usar los valores predeterminados de OpenAI.

import es from "/components/footer/es.mdx";

<es />
