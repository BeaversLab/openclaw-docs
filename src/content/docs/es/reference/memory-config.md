---
title: "Referencia de configuración de memoria"
summary: "Referencia de configuración completa para la búsqueda de memoria de OpenClaw, proveedores de incrustaciones, backend QMD, búsqueda híbrida y memoria multimodal"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# Referencia de configuración de memoria

Esta página cubre la superficie de configuración completa para la búsqueda de memoria de OpenClaw. Para
la visión general conceptual (diseño de archivos, herramientas de memoria, cuándo escribir memoria y el
flush automático), consulte [Memory](/es/concepts/memory).

## Valores predeterminados de búsqueda de memoria

- Habilitado por defecto.
- Vigila cambios en los archivos de memoria (con rebote).
- Configure la búsqueda de memoria en `agents.defaults.memorySearch` (no en el nivel superior
  `memorySearch`).
- Utiliza incrustaciones remotas por defecto. Si `memorySearch.provider` no está configurado, OpenClaw selecciona automáticamente:
  1. `local` si hay un `memorySearch.local.modelPath` configurado y el archivo existe.
  2. `openai` si se puede resolver una clave de OpenAI.
  3. `gemini` si se puede resolver una clave de Gemini.
  4. `voyage` si se puede resolver una clave de Voyage.
  5. `mistral` si se puede resolver una clave de Mistral.
  6. De lo contrario, la búsqueda de memoria permanece deshabilitada hasta que se configure.
- El modo local usa node-llama-cpp y puede requerir `pnpm approve-builds`.
- Usa sqlite-vec (cuando está disponible) para acelerar la búsqueda vectorial dentro de SQLite.
- `memorySearch.provider = "ollama"` también es compatible con incrustaciones
  Ollama locales/autohospedadas (`/api/embeddings`), pero no se selecciona automáticamente.

Las incrustaciones remotas **requieren** una clave API para el proveedor de incrustaciones. OpenClaw resuelve las claves desde los perfiles de autenticación, `models.providers.*.apiKey` o variables de entorno. Codex OAuth solo cubre chat/completions y **no** satisface las incrustaciones para la búsqueda de memoria. Para Gemini, use `GEMINI_API_KEY` o `models.providers.google.apiKey`. Para Voyage, use `VOYAGE_API_KEY` o `models.providers.voyage.apiKey`. Para Mistral, use `MISTRAL_API_KEY` o `models.providers.mistral.apiKey`. Ollama generalmente no requiere una clave API real (un marcador de posición como `OLLAMA_API_KEY=ollama-local` es suficiente cuando lo exige la política local).
Cuando use un endpoint personalizado compatible con OpenAI, establezca `memorySearch.remote.apiKey` (y opcionalmente `memorySearch.remote.headers`).

## Backend QMD (experimental)

Establezca `memory.backend = "qmd"` para cambiar el indexador SQLite integrado por [QMD](https://github.com/tobi/qmd): un sidecar de búsqueda con prioridad local que combina BM25 + vectores + reranking. Markdown sigue siendo la fuente de verdad; OpenClaw delega en QMD para la recuperación. Puntos clave:

### Requisitos previos

- Desactivado de forma predeterminada. Actívelo por configuración (`memory.backend = "qmd"`).
- Instale la CLI de QMD por separado (`bun install -g https://github.com/tobi/qmd` u obtenga una versión) y asegúrese de que el binario `qmd` esté en el `PATH` de la puerta de enlace.
- QMD necesita una compilación de SQLite que permita extensiones (`brew install sqlite` en macOS).
- QMD se ejecuta completamente de forma local a través de Bun + `node-llama-cpp` y descarga automáticamente modelos GGUF de HuggingFace en el primer uso (no se requiere un demonio Ollama separado).
- La puerta de enlace ejecuta QMD en un hogar XGD autocontenido bajo `~/.openclaw/agents/<agentId>/qmd/` al establecer `XDG_CONFIG_HOME` y `XDG_CACHE_HOME`.
- Soporte del sistema operativo: macOS y Linux funcionan de inmediato una vez instalados Bun + SQLite. Windows se admite mejor a través de WSL2.

### Cómo se ejecuta el sidecar

- La puerta de enlace escribe un hogar QMD autocontenido bajo `~/.openclaw/agents/<agentId>/qmd/` (configuración + caché + base de datos SQLite).
- Las colecciones se crean mediante `qmd collection add` a partir de `memory.qmd.paths`
  (más los archivos de memoria del espacio de trabajo predeterminados), luego se ejecutan `qmd update` + `qmd embed`
  al inicio y en un intervalo configurable (`memory.qmd.update.interval`,
  predeterminado 5 m).
- Ahora la pasarela inicializa el gestor QMD al arrancar, por lo que los temporizadores
  de actualización periódica se arman incluso antes de la primera llamada `memory_search`.
- La actualización al arrancar ahora se ejecuta en segundo plano de forma predeterminada
  para que el inicio del chat no se bloquee; establezca `memory.qmd.update.waitForBootSync = true` para mantener
  el comportamiento de bloqueo anterior.
- Las búsquedas se ejecutan mediante `memory.qmd.searchMode` (predeterminado `qmd search --json`; también
  admite `vsearch` y `query`). Si el modo seleccionado rechaza las marcas en su
  compilación de QMD, OpenClaw reintenta con `qmd query`. Si QMD falla o falta el binario,
  OpenClaw retrocede automáticamente al gestor SQLite incorporado para que
  las herramientas de memoria sigan funcionando.
- OpenClaw no expone hoy el ajuste del tamaño del lote de incrustación de QMD;
  el comportamiento por lotes lo controla el propio QMD.
- **La primera búsqueda puede ser lenta**: QMD puede descargar modelos locales GGUF
  (reranker/expansión de consulta) en la primera ejecución de `qmd query`.
  - OpenClaw establece `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automáticamente cuando ejecuta QMD.
  - Si desea descargar manualmente los modelos por adelantado (y calentar el mismo índice
    que usa OpenClaw), ejecute una consulta única con los directorios XDG del agente.

    El estado de QMD de OpenClaw reside en su **directorio de estado** (predeterminado `~/.openclaw`).
    Puede apuntar `qmd` exactamente al mismo índice exportando las mismas variables XDG
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

### Superficie de configuración (`memory.qmd.*`)

- `command` (predeterminado `qmd`): anula la ruta del ejecutable.
- `searchMode` (predeterminado `search`): elige qué comando QMD respalda
  `memory_search` (`search`, `vsearch`, `query`).
- `includeDefaultMemory` (predeterminado `true`): indexación automática de `MEMORY.md` + `memory/**/*.md`.
- `paths[]`: añadir directorios/archivos adicionales (`path`, `pattern` opcional, `name` estable opcional).
- `sessions`: optar por la indexación de sesión JSONL (`enabled`, `retentionDays`,
  `exportDir`).
- `update`: controla el ritmo de actualización y la ejecución del mantenimiento:
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`).
- `limits`: limitar la carga de recuperación (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope`: mismo esquema que [`session.sendPolicy`](/es/gateway/configuration-reference#session).
  El valor predeterminado es solo MD (`deny` todo, `allow` chats directos); relájalo para mostrar resultados QMD
  en grupos/canales.
  - `match.keyPrefix` coincide con la clave de sesión **normalizada** (en minúsculas, con cualquier
    `agent:<id>:` inicial eliminada). Ejemplo: `discord:channel:`.
  - `match.rawKeyPrefix` coincide con la clave de sesión **sin procesar** (en minúsculas), incluyendo
    `agent:<id>:`. Ejemplo: `agent:main:discord:`.
  - Heredado: `match.keyPrefix: "agent:..."` se sigue tratando como un prefijo de clave sin procesar,
    pero se prefiere `rawKeyPrefix` para mayor claridad.
- Cuando `scope` deniega una búsqueda, OpenClaw registra una advertencia con el `channel`/`chatType` derivado
  para que los resultados vacíos sean más fáciles de depurar.
- Los fragmentos obtenidos fuera del espacio de trabajo aparecen como
  `qmd/<collection>/<relative-path>` en los resultados de `memory_search`; `memory_get`
  entiende ese prefijo y lee desde la raíz de la colección QMD configurada.
- Cuando `memory.qmd.sessions.enabled = true`, OpenClaw exporta transcripciones de sesión
  saneadas (turnos de Usuario/Asistente) a una colección QMD dedicada bajo
  `~/.openclaw/agents/<id>/qmd/sessions/`, para que `memory_search` pueda recordar conversaciones
  recientes sin tocar el índice SQLite integrado.
- Los fragmentos de `memory_search` ahora incluyen un pie de página `Source: <path#line>` cuando
  `memory.citations` es `auto`/`on`; establezca `memory.citations = "off"` para mantener
  los metadatos de la ruta internos (el agente todavía recibe la ruta para
  `memory_get`, pero el texto del fragmento omite el pie de página y el prompt del sistema
  advierte al agente que no lo cite).

### Ejemplo de QMD

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

### Citas y reserva

- `memory.citations` se aplica independientemente del backend (`auto`/`on`/`off`).
- Cuando se ejecuta `qmd`, etiquetamos `status().backend = "qmd"` para que los diagnósticos muestren qué
  motor sirvió los resultados. Si el subproceso QMD sale o no se puede analizar
  la salida JSON, el gestor de búsqueda registra una advertencia y devuelve el proveedor integrado
  (incrustaciones Markdown existentes) hasta que QMD se recupere.

## Rutas de memoria adicionales

Si desea indexar archivos Markdown fuera de la disposición del espacio de trabajo predeterminado, añada
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
- Si `memorySearch.multimodal.enabled = true`, OpenClaw también indexa archivos de imagen/audio compatibles bajo `extraPaths` únicamente. Las raíces de memoria predeterminadas (`MEMORY.md`, `memory.md`, `memory/**/*.md`) permanecen solo para Markdown.
- Se ignoran los enlaces simbólicos (archivos o directorios).

## Archivos de memoria multimodal (imagen Gemini + audio)

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
- La indexación multimodal solo se aplica a los archivos descubiertos a través de `memorySearch.extraPaths`.
- Modalidades compatibles en esta fase: imagen y audio.
- `memorySearch.fallback` debe mantenerse `"none"` mientras la memoria multimodal esté habilitada.
- Los bytes de los archivos de imagen/audio coincidentes se cargan en el punto de conexión de embedding de Gemini configurado durante la indexación.
- Extensiones de imagen compatibles: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`.
- Extensiones de audio compatibles: `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`.
- Las consultas de búsqueda siguen siendo de texto, pero Gemini puede comparar esas consultas de texto con los embeddings de imagen/audio indexados.
- `memory_get` todavía solo lee Markdown; los archivos binarios son buscables pero no se devuelven como contenido de archivo sin procesar.

## Embeddings de Gemini (nativos)

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

- `remote.baseUrl` es opcional (por defecto es la URL base de la API de Gemini).
- `remote.headers` le permite agregar encabezados adicionales si es necesario.
- Modelo predeterminado: `gemini-embedding-001`.
- `gemini-embedding-2-preview` también es compatible: límite de 8192 tokens y dimensiones configurables (768 / 1536 / 3072, predeterminado 3072).

### Gemini Embedding 2 (versión preliminar)

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

> **Reindexación requerida:** Cambiar de `gemini-embedding-001` (768 dimensiones)
> a `gemini-embedding-2-preview` (3072 dimensiones) cambia el tamaño del vector. Lo mismo ocurre si
> cambia `outputDimensionality` entre 768, 1536 y 3072.
> OpenClaw se reindexará automáticamente cuando detecte un cambio de modelo o dimensión.

## Endpoint personalizado compatible con OpenAI

Si desea utilizar un endpoint personalizado compatible con OpenAI (OpenRouter, vLLM o un proxy),
puede utilizar la configuración `remote` con el proveedor OpenAI:

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

Si no desea configurar una clave de API, use `memorySearch.provider = "local"` o establezca
`memorySearch.fallback = "none"`.

### Alternativas (Fallbacks)

- `memorySearch.fallback` puede ser `openai`, `gemini`, `voyage`, `mistral`, `ollama`, `local`, o `none`.
- El proveedor de reserva (fallback) solo se utiliza cuando falla el proveedor de incrustaciones (embedding) principal.

### Indexación por lotes (OpenAI + Gemini + Voyage)

- Desactivado por defecto. Establezca `agents.defaults.memorySearch.remote.batch.enabled = true` para activarlo para la indexación de corpus grandes (OpenAI, Gemini y Voyage).
- El comportamiento predeterminado espera a que se complete el lote; ajuste `remote.batch.wait`, `remote.batch.pollIntervalMs` y `remote.batch.timeoutMinutes` si es necesario.
- Establezca `remote.batch.concurrency` para controlar cuántos trabajos por lotes enviamos en paralelo (predeterminado: 2).
- El modo por lotes se aplica cuando `memorySearch.provider = "openai"` o `"gemini"` y utiliza la clave de API correspondiente.
- Los trabajos por lotes de Gemini utilizan el endpoint de incrustaciones por lotes asíncronas y requieren la disponibilidad de Gemini Batch API.

Por qué el lote de OpenAI es rápido y barato:

- Para grandes reposiciones de datos (backfills), OpenAI suele ser la opción más rápida que admitimos porque podemos enviar muchas solicitudes de incrustación en un solo trabajo por lotes y dejar que OpenAI las procese de forma asíncrona.
- OpenAI ofrece precios con descuento para las cargas de trabajo de la API por lotes, por lo que las ejecuciones de indexación grandes suelen ser más baratas que enviar las mismas solicitudes de forma síncrona.
- Consulte la documentación y los precios de la API por lotes de OpenAI para obtener más detalles:
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

## Cómo funcionan las herramientas de memoria

- `memory_search` busca semánticamente fragmentos de Markdown (~400 tokens objetivo, 80 tokens de superposición) de `MEMORY.md` + `memory/**/*.md`. Devuelve texto de fragmento (limitado a ~700 caracteres), ruta de archivo, rango de líneas, puntuación, proveedor/modelo y si se recurrió de incrustaciones locales a remotas. No se devuelve la carga útil completa del archivo.
- `memory_get` lee un archivo de memoria Markdown específico (relativo al espacio de trabajo), opcionalmente desde una línea de inicio y durante N líneas. Se rechazan las rutas fuera de `MEMORY.md` / `memory/`.
- Ambas herramientas solo están habilitadas cuando `memorySearch.enabled` se resuelve como verdadero para el agente.

## Qué se indexa (y cuándo)

- Tipo de archivo: solo Markdown (`MEMORY.md`, `memory/**/*.md`).
- Almacenamiento del índice: SQLite por agente en `~/.openclaw/memory/<agentId>.sqlite` (configurable mediante `agents.defaults.memorySearch.store.path`, admite token `{agentId}`).
- Actualidad: un observador en `MEMORY.md` + `memory/` marca el índice como sucio (rebote de 1,5 s). La sincronización se programa al inicio de la sesión, al buscar o en un intervalo y se ejecuta de forma asíncrona. Las transcripciones de sesión usan umbrales delta para activar la sincronización en segundo plano.
- Desencadenantes de reindexación: el índice almacena la **huella digital del proveedor/modelo de incrustación + punto de conexión + parámetros de fragmentación**. Si alguno de estos cambia, OpenClaw restablece y reindexa automáticamente todo el almacén.

## Búsqueda híbrida (BM25 + vector)

Cuando está habilitada, OpenClaw combina:

- **Similitud vectorial** (coincidencia semántica, la redacción puede diferir)
- **Relevancia de palabras clave BM25** (tokens exactos como ID, variables de entorno, símbolos de código)

Si la búsqueda de texto completo no está disponible en su plataforma, OpenClaw recurra a la búsqueda solo vectorial.

### Por qué híbrida

La búsqueda vectorial es excelente en "esto significa lo mismo":

- "host de pasarela Mac Studio" frente a "la máquina que ejecuta la pasarela"
- "actualizaciones de archivo con rebote" frente a "evitar indexar en cada escritura"

Pero puede ser débil en tokens exactos de alta señal:

- ID (`a828e60`, `b3b9895a...`)
- símbolos de código (`memorySearch.query.hybrid`)
- cadenas de error ("sqlite-vec no disponible")

BM25 (texto completo) es lo opuesto: fuerte en tokens exactos, más débil en paráfrasis.
La búsqueda híbrida es el término medio pragmático: **usar ambas señales de recuperación** para obtener
buenos resultados tanto para consultas de "lenguaje natural" como para consultas de "buscar una aguja en un pajar".

### Cómo fusionamos los resultados (el diseño actual)

Boceto de implementación:

1. Recuperar un grupo de candidatos de ambos lados:

- **Vector**: `maxResults * candidateMultiplier` primeros por similitud de coseno.
- **BM25**: `maxResults * candidateMultiplier` primeros por rango BM25 de FTS5 (menor es mejor).

2. Convertir el rango BM25 en una puntuación de 0 a 1 (aprox):

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. Unir candidatos por ID de fragmento y calcular una puntuación ponderada:

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Notas:

- `vectorWeight` + `textWeight` se normaliza a 1.0 en la resolución de configuración, por lo que los pesos se comportan como porcentajes.
- Si los embeddings no están disponibles (o el proveedor devuelve un vector cero), aún ejecutamos BM25 y devolvemos coincidencias de palabras clave.
- Si FTS5 no se puede crear, mantenemos la búsqueda solo vectorial (sin falla grave).

Esto no es "perfecto según la teoría de RI", pero es simple, rápido y tiende a mejorar el recuerdo/precisión en notas reales.
Si queremos algo más sofisticado más adelante, los siguientes pasos comunes son la Fusión de Rango Recíproco (RRF) o la normalización de puntuaciones
(min/max o puntuación z) antes de mezclar.

### Canalización de posprocesamiento

Después de fusionar las puntuaciones vectoriales y de palabras clave, dos etapas opcionales de posprocesamiento
refinan la lista de resultados antes de que llegue al agente:

```
Vector + Keyword -> Weighted Merge -> Temporal Decay -> Sort -> MMR -> Top-K Results
```

Ambas etapas están **desactivadas por defecto** y se pueden activar de forma independiente.

### Reordenación MMR (diversidad)

Cuando la búsqueda híbrida devuelve resultados, varios fragmentos pueden contener contenido similar o superpuesto.
Por ejemplo, buscar "configuración de red doméstica" podría devolver cinco fragmentos casi idénticos
de diferentes notas diarias que mencionan la misma configuración del enrutador.

**MMR (Maximal Marginal Relevance)** reordena los resultados para equilibrar la relevancia con la diversidad,
asegurando que los resultados principales cubran diferentes aspectos de la consulta en lugar de repetir la misma información.

Cómo funciona:

1. Los resultados se puntúan por su relevancia original (puntuación ponderada vector + BM25).
2. MMR selecciona iterativamente resultados que maximizan: `lambda x relevance - (1-lambda) x max_similarity_to_selected`.
3. La similitud entre resultados se mide utilizando la similitud de texto de Jaccard en el contenido tokenizado.

El parámetro `lambda` controla el equilibrio:

- `lambda = 1.0` -- relevancia pura (sin penalización de diversidad)
- `lambda = 0.0` -- diversidad máxima (ignora la relevancia)
- Predeterminado: `0.7` (equilibrado, ligero sesgo de relevancia)

**Ejemplo -- consulta: "configuración de la red doméstica"**

Dados estos archivos de memoria:

```
memory/2026-02-10.md  -> "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  -> "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  -> "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     -> "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

Sin MMR -- primeros 3 resultados:

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  <- router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  <- reference doc
```

Con MMR (lambda=0.7) -- primeros 3 resultados:

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/network.md     (score: 0.85)  <- reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  <- AdGuard DNS (diverse!)
```

El casi duplicado del 8 de febrero desaparece y el agente obtiene tres piezas de información distintas.

**Cuándo habilitar:** Si nota que `memory_search` devuelve fragmentos redundantes o casi duplicados,
especialmente con notas diarias que a menudo repiten información similar a través de los días.

### Decaimiento temporal (impulso de recencia)

Los agentes con notas diarias acumulan cientos de archivos fechados con el tiempo. Sin decaimiento,
una nota bien redactada de hace seis meses puede superar la actualización de ayer sobre el mismo tema.

El **decaimiento temporal** aplica un multiplicador exponencial a las puntuaciones basado en la antigüedad de cada resultado,
por lo que las memorias recientes se clasifican naturalmente más alto mientras que las antiguas se desvanecen:

```
decayedScore = score x e^(-lambda x ageInDays)
```

donde `lambda = ln(2) / halfLifeDays`.

Con la semivida predeterminada de 30 días:

- Notas de hoy: **100%** de la puntuación original
- Hace 7 días: **~84%**
- Hace 30 días: **50%**
- Hace 90 días: **12.5%**
- Hace 180 días: **~1.6%**

**Los archivos perennes nunca se decaen:**

- `MEMORY.md` (archivo de memoria raíz)
- Archivos sin fecha en `memory/` (p. ej., `memory/projects.md`, `memory/network.md`)
- Estos contienen información de referencia duradera que siempre debe clasificarse normalmente.

Los **archivos diarios fechados** (`memory/YYYY-MM-DD.md`) usan la fecha extraída del nombre del archivo.
Otras fuentes (p. ej., transcripciones de sesión) recurren a la hora de modificación del archivo (`mtime`).

**Ejemplo -- consulta: "¿cuál es el horario de trabajo de Rod?"**

Dados estos archivos de memoria (hoy es 10 de febrero):

```
memory/2025-09-15.md  -> "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  -> "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  -> "Rod started new team, standup moved to 14:15"        (7 days old)
```

Sin decaimiento:

```
1. memory/2025-09-15.md  (score: 0.91)  <- best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

Con decaimiento (halfLife=30):

```
1. memory/2026-02-10.md  (score: 0.82 x 1.00 = 0.82)  <- today, no decay
2. memory/2026-02-03.md  (score: 0.80 x 0.85 = 0.68)  <- 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 x 0.03 = 0.03)  <- 148 days, nearly gone
```

La nota anticuada de septiembre cae al final a pesar de tener la mejor coincidencia semántica bruta.

**Cuándo habilitar:** Si su agente tiene meses de notas diarias y descubre que la información antigua y obsoleta supera en rango al contexto reciente. Una vida media de 30 días funciona bien para flujos de trabajo con muchas notas diarias; aumente (por ejemplo, 90 días) si consulta notas antiguas con frecuencia.

### Configuración de búsqueda híbrida

Ambas características se configuran bajo `memorySearch.query.hybrid`:

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

- **Solo MMR** -- útil cuando tiene muchas notas similares pero la antigüedad no importa.
- **Solo decaimiento temporal** -- útil cuando la actualidad importa pero sus resultados ya son diversos.
- **Ambas** -- recomendado para agentes con historiales grandes y de larga duración de notas diarias.

## Caché de incrustaciones

OpenClaw puede almacenar en caché las **incrustaciones de fragmentos** en SQLite para que la reindexación y las actualizaciones frecuentes (especialmente las transcripciones de sesiones) no vuelvan a incrustar el texto sin cambios.

Configuración:

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

## Búsqueda de memoria de sesión (experimental)

Opcionalmente, puede indexar **transcripciones de sesiones** y mostrarlas a través de `memory_search`.
Esto está protegido por una bandera experimental.

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
- Las actualizaciones de sesión tienen anti-rebote y se **indexan de forma asíncrona** una vez que cruzan los umbrales de delta (best-effort).
- `memory_search` nunca se bloquea en la indexación; los resultados pueden estar ligeramente obsoletos hasta que finalice la sincronización en segundo plano.
- Los resultados aún incluyen solo fragmentos; `memory_get` sigue limitado a archivos de memoria.
- La indexación de sesiones está aislada por agente (solo se indexan los registros de sesión de ese agente).
- Los registros de sesión residen en el disco (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`). Cualquier proceso/usuario con acceso al sistema de archivos puede leerlos, así que trate el acceso al disco como el límite de confianza. Para un aislamiento más estricto, ejecute agentes en usuarios o hosts de sistema operativo separados.

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

## Aceleración vectorial SQLite (sqlite-vec)

Cuando la extensión sqlite-vec está disponible, OpenClaw almacena incrustaciones en una
tabla virtual SQLite (`vec0`) y realiza consultas de distancia vectorial en la
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

- `enabled` por defecto es true; cuando está desactivado, la búsqueda recurre a la
  similitud coseno en proceso sobre las incrustaciones almacenadas.
- Si falta la extensión sqlite-vec o no se carga, OpenClaw registra el
  error y continúa con la alternativa de JS (sin tabla de vectores).
- `extensionPath` anula la ruta de sqlite-vec incluida (útil para compilaciones personalizadas
  o ubicaciones de instalación no estándar).

## Descarga automática de incrustación local

- Modelo de incrustación local predeterminado: `hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB).
- Cuando `memorySearch.provider = "local"`, `node-llama-cpp` resuelve `modelPath`; si falta el GGUF, se **descarga automáticamente** en la caché (o en `local.modelCacheDir` si está configurado) y luego se carga. Las descargas se reanudan al reintentar.
- Requisito de compilación nativa: ejecute `pnpm approve-builds`, elija `node-llama-cpp`, luego `pnpm rebuild node-llama-cpp`.
- Alternativa: si falla la configuración local y `memorySearch.fallback = "openai"`, cambiamos automáticamente a incrustaciones remotas (`openai/text-embedding-3-small` a menos que se anule) y registramos el motivo.

## Ejemplo de endpoint personalizado compatible con OpenAI

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
- `remote.headers` se fusionan con los encabezados de OpenAI; lo remoto gana en conflictos de clave. Omita `remote.headers` para usar los valores predeterminados de OpenAI.
