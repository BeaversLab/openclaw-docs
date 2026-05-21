---
summary: "Configura el plugin externo oficial de memoria LanceDB, incluyendo embeddings locales compatibles con Ollama"
read_when:
  - You are configuring the memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "Memoria LanceDB"
sidebarTitle: "Memoria LanceDB"
---

`memory-lancedb` es un plugin externo oficial de memoria que almacena memoria a largo plazo en
LanceDB y utiliza embeddings para la recuperación. Puede recuperar automáticamente
memorias relevantes antes de un turno del modelo y capturar datos importantes después de una respuesta.

Úsalo cuando quieras una base de datos de vectores local para la memoria, necesites un
punto final de incrustación compatible con OpenAI o quieras mantener una base de datos de memoria fuera
del almacén de memoria integrado predeterminado.

## Instalación

Instala `memory-lancedb` antes de configurar `plugins.slots.memory = "memory-lancedb"`:

```bash
openclaw plugins install @openclaw/memory-lancedb
```

El plugin se publica en npm y no se incluye en la imagen de tiempo de ejecución de OpenClaw.
El instalador escribe la entrada del plugin y cambia el slot de memoria cuando ningún otro
plugin lo posee.

<Note>`memory-lancedb` es un plugin de memoria activo. Actívalo seleccionando el slot de memoria con `plugins.slots.memory = "memory-lancedb"`. Los plugins complementarios como `memory-wiki` pueden ejecutarse junto a él, pero solo un plugin posee el slot de memoria activo.</Note>

## Inicio rápido

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

Reinicia el Gateway después de cambiar la configuración del plugin:

```bash
openclaw gateway restart
```

Luego verifica que el plugin esté cargado:

```bash
openclaw plugins list
```

## Embeddings respaldados por proveedores

`memory-lancedb` puede usar los mismos adaptadores de proveedor de embeddings de memoria que
`memory-core`. Establece `embedding.provider` y omite `embedding.apiKey` para usar el
perfil de autenticación configurado del proveedor, la variable de entorno o
`models.providers.<provider>.apiKey`.

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
        },
      },
    },
  },
}
```

Esta ruta funciona con perfiles de autenticación de proveedores que exponen credenciales de embeddings.
Por ejemplo, GitHub Copilot se puede usar cuando el perfil/plan de Copilot admite
embeddings:

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

OpenAI Codex / ChatGPT OAuth (`openai-codex`) no es una credencial de
embeddings de la plataforma OpenAI. Para embeddings de OpenAI, usa un perfil de autenticación de clave de API de OpenAI,
`OPENAI_API_KEY` o `models.providers.openai.apiKey`. Los usuarios que solo usan OAuth pueden usar
otro proveedor compatible con embeddings, como GitHub Copilot u Ollama.

## Embeddings de Ollama

Para las incrustaciones de Ollama, se prefiere el proveedor de incrustaciones de Ollama incluido. Utiliza el endpoint nativo de Ollama `/api/embed` y sigue las mismas reglas de autenticación/URL base que el proveedor de Ollama documentado en [Ollama](/es/providers/ollama).

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "ollama",
            baseUrl: "http://127.0.0.1:11434",
            model: "mxbai-embed-large",
            dimensions: 1024,
          },
          recallMaxChars: 400,
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

Establezca `dimensions` para modelos de incrustación no estándar. OpenClaw conoce las dimensiones de `text-embedding-3-small` y `text-embedding-3-large`; los modelos personalizados necesitan el valor en la configuración para que LanceDB pueda crear la columna de vectores.

Para modelos de incrustación locales pequeños, reduzca `recallMaxChars` si ve errores de longitud de contexto del servidor local.

## Proveedores compatibles con OpenAI

Algunos proveedores de incrustación compatibles con OpenAI rechazan el parámetro `encoding_format`, mientras que otros lo ignoran y siempre devuelven vectores `number[]`. `memory-lancedb` por lo tanto omite `encoding_format` en las solicitudes de incrustación y acepta respuestas de matriz de flotantes o respuestas de flotantes32 codificados en base64.

Si tiene un punto final de incrustaciones compatible con OpenAI sin procesar que no tiene un adaptador de proveedor incluido, omita `embedding.provider` (o déjelo como `openai`) y configure `embedding.apiKey` más `embedding.baseUrl`. Esto preserva la ruta directa del cliente compatible con OpenAI.

Establezca `embedding.dimensions` para proveedores cuyas dimensiones del modelo no estén integradas. Por ejemplo, ZhiPu `embedding-3` utiliza `2048` dimensiones:

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${ZHIPU_API_KEY}",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "embedding-3",
            dimensions: 2048,
          },
        },
      },
    },
  },
}
```

## Límites de recuperación y captura

`memory-lancedb` tiene dos límites de texto separados:

| Configuración     | Predeterminado | Rango     | Se aplica a                                                               |
| ----------------- | -------------- | --------- | ------------------------------------------------------------------------- |
| `recallMaxChars`  | `1000`         | 100-10000 | texto enviado a la API de incrustación para recuperación                  |
| `captureMaxChars` | `500`          | 100-10000 | longitud del mensaje elegible para captura automática                     |
| `customTriggers`  | `[]`           | 0-50      | frases literales que hacen que la captura automática considere un mensaje |

`recallMaxChars` controla el recuerdo automático, la herramienta `memory_recall`, la ruta de consulta `memory_forget` y `openclaw ltm search`. El recuerdo automático prefiere el último mensaje de usuario del turno y solo recurre al mensaje completo (prompt) cuando no hay ningún mensaje de usuario disponible. Esto evita que los metadatos del canal y los bloques de mensajes grandes se incluyan en la solicitud de incrustación (embedding).

`captureMaxChars` controla si una respuesta es lo suficientemente corta como para ser considerada para su captura automática. No limita las incrustaciones de las consultas de recuerdo.

`customTriggers` le permite agregar frases literales de captura automática sin escribir expresiones regulares. Los activadores integrados incluyen frases de memoria comunes en inglés, checo, chino, japonés y coreano.

## Comandos

Cuando `memory-lancedb` es el complemento de memoria activo, registra el espacio de nombres de la CLI `ltm`:

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

El subcomando `query` ejecuta una consulta no vectorial directamente contra la tabla LanceDB:

```bash
openclaw ltm query --cols id,text,createdAt --limit 20
openclaw ltm query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`: lista de permitidos de columnas separadas por comas (por defecto `id`, `text`, `importance`, `category`, `createdAt`).
- `--filter <condition>`: cláusula WHERE estilo SQL; limitada a 200 caracteres y restringida a caracteres alfanuméricos, operadores de comparación, comillas, paréntesis y un pequeño conjunto de puntuación segura.
- `--limit <n>`: entero positivo; por defecto `10`.
- `--order-by <column>:<asc|desc>`: ordenamiento en memoria aplicado después del filtro; la columna de ordenamiento se incluye automáticamente en la proyección.

Los agentes también obtienen herramientas de memoria LanceDB del complemento de memoria activo:

- `memory_recall` para la recuperación respaldada por LanceDB
- `memory_store` para guardar hechos importantes, preferencias, decisiones y entidades
- `memory_forget` para eliminar memorias coincidentes

## Almacenamiento

De forma predeterminada, los datos de LanceDB residen bajo `~/.openclaw/memory/lancedb`. Anule la ruta con `dbPath`:

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/memory/lancedb",
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

`storageOptions` acepta pares clave/valor de cadena para los backends de almacenamiento LanceDB y admite la expansión de `${ENV_VAR}`:

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "s3://memory-bucket/openclaw",
          storageOptions: {
            access_key: "${AWS_ACCESS_KEY_ID}",
            secret_key: "${AWS_SECRET_ACCESS_KEY}",
            endpoint: "${AWS_ENDPOINT_URL}",
          },
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

## Dependencias de tiempo de ejecución

`memory-lancedb` depende del paquete nativo `@lancedb/lancedb`. OpenClaw empaquetado trata ese paquete como parte del paquete del complemento. El inicio de Gateway no repara las dependencias del complemento; si falta la dependencia, reinstale o actualice el paquete del complemento y reinicie Gateway.

Si una instalación antigua registra un error de `dist/package.json` faltante o `@lancedb/lancedb` faltante durante la carga del complemento, actualice OpenClaw y reinicie Gateway.

Si el complemento registra que LanceDB no está disponible en `darwin-x64`, use el backend de memoria predeterminado en esa máquina, mueva Gateway a una plataforma compatible o deshabilite `memory-lancedb`.

## Solución de problemas

### La longitud de la entrada supera la longitud del contexto

Esto generalmente significa que el modelo de incrustación rechazó la consulta de recuperación:

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

Establezca un `recallMaxChars` más bajo y luego reinicie el Gateway:

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        config: {
          recallMaxChars: 400,
        },
      },
    },
  },
}
```

Para Ollama, también verifique que el servidor de incrustación sea accesible desde el host del Gateway:

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### Modelo de incrustación no compatible

Sin `dimensions`, solo se conocen las dimensiones de incrustación integradas de OpenAI.
Para modelos de incrustación locales o personalizados, establezca `embedding.dimensions` en el tamaño
del vector informado por ese modelo.

### El complemento se carga pero no aparecen memorias

Compruebe que `plugins.slots.memory` apunte a `memory-lancedb` y luego ejecute:

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

Si `autoCapture` está deshabilitado, el complemento recordará los recuerdos existentes pero no
almacenará automáticamente los nuevos. Utilice la herramienta `memory_store` o habilite
`autoCapture` si desea una captura automática.

## Relacionado

- [Resumen de memoria](/es/concepts/memory)
- [Memoria activa](/es/concepts/active-memory)
- [Búsqueda de memoria](/es/concepts/memory-search)
- [Wiki de memoria](/es/plugins/memory-wiki)
- [Ollama](/es/providers/ollama)
