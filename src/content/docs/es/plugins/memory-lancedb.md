---
summary: "Configura el plugin de memoria LanceDB incluido, incluyendo incrustaciones locales compatibles con Ollama"
read_when:
  - You are configuring the bundled memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "Memoria LanceDB"
sidebarTitle: "Memoria LanceDB"
---

`memory-lancedb` es un plugin de memoria incluido que almacena memoria a largo plazo en
LanceDB y utiliza incrustaciones para la recuperación. Puede recuperar automáticamente recuerdos
relevantes antes de un turno del modelo y capturar hechos importantes después de una respuesta.

Úsalo cuando quieras una base de datos de vectores local para la memoria, necesites un
punto final de incrustación compatible con OpenAI o quieras mantener una base de datos de memoria fuera
del almacén de memoria integrado predeterminado.

<Note>`memory-lancedb` es un plugin de memoria activo. Actívalo seleccionando la ranura de memoria con `plugins.slots.memory = "memory-lancedb"`. Los complementos como `memory-wiki` pueden ejecutarse junto a él, pero solo un plugin posee la ranura de memoria activa.</Note>

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

Reinicia la puerta de enlace (Gateway) después de cambiar la configuración del plugin:

```bash
openclaw gateway restart
```

Luego verifica que el plugin esté cargado:

```bash
openclaw plugins list
```

## Incrustaciones con proveedores

`memory-lancedb` puede usar los mismos adaptadores de proveedor de incrustaciones de memoria que
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

Esta ruta funciona con perfiles de autenticación de proveedores que exponen credenciales de incrustación.
Por ejemplo, GitHub Copilot se puede usar cuando el perfil/plan Copilot admite
incrustaciones:

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
incrustación de la plataforma OpenAI. Para incrustaciones de OpenAI, usa un perfil de autenticación de clave de API de OpenAI,
`OPENAI_API_KEY` o `models.providers.openai.apiKey`. Los usuarios que solo usen OAuth pueden usar
otro proveedor compatible con incrustaciones como GitHub Copilot u Ollama.

## Incrustaciones de Ollama

Para incrustaciones de Ollama, prefiere el proveedor de incrustaciones Ollama incluido. Utiliza el
punto final nativo de Ollama `/api/embed` y sigue las mismas reglas de URL de autenticación/base que
el proveedor Ollama documentado en [Ollama](/es/providers/ollama).

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

Configure `dimensions` para modelos de incrustación no estándar. OpenClaw conoce las
dimensiones de `text-embedding-3-small` y `text-embedding-3-large`; los modelos
personalizados necesitan el valor en la configuración para que LanceDB pueda crear la columna de vectores.

Para modelos de incrustación locales pequeños, reduzca `recallMaxChars` si ve errores de
longitud de contexto del servidor local.

## Proveedores compatibles con OpenAI

Algunos proveedores de incrustación compatibles con OpenAI rechazan el parámetro
`encoding_format`, mientras que otros lo ignoran y siempre devuelven vectores
`number[]`. Por lo tanto, `memory-lancedb` omite `encoding_format` en las solicitudes de incrustación
y acepta respuestas de tipo float-array o respuestas float32 codificadas en base64.

Si tiene un punto final de incrustación sin procesar compatible con OpenAI que no tiene un
adaptador de proveedor incluido, omita `embedding.provider` (o déjelo como `openai`) y
configure `embedding.apiKey` más `embedding.baseUrl`. Esto preserva la ruta directa
del cliente compatible con OpenAI.

Configure `embedding.dimensions` para proveedores cuyas dimensiones de modelo no estén
incorporadas. Por ejemplo, ZhiPu `embedding-3` utiliza dimensiones `2048`:

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

| Configuración     | Predeterminado | Rango     | Se aplica a                                              |
| ----------------- | -------------- | --------- | -------------------------------------------------------- |
| `recallMaxChars`  | `1000`         | 100-10000 | texto enviado a la API de incrustación para recuperación |
| `captureMaxChars` | `500`          | 100-10000 | longitud del mensaje del asistente elegible para captura |

`recallMaxChars` controla la recuperación automática, la herramienta `memory_recall`,
la ruta de consulta `memory_forget` y `openclaw ltm search`. La recuperación automática prefiere
el último mensaje de usuario del turno y recurre al mensaje completo solo cuando no hay
ningún mensaje de usuario disponible. Esto mantiene los metadatos del canal y los grandes bloques de
prompt fuera de la solicitud de incrustación.

`captureMaxChars` controla si una respuesta es lo suficientemente corta como para ser
considerada para captura automática. No limita las incrustaciones de consultas de recuperación.

## Comandos

Cuando `memory-lancedb` es el complemento de memoria activo, registra el espacio de nombres de la CLI `ltm`:

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

El complemento también extiende `openclaw memory` con un subcomando `query` no vectorial que se ejecuta directamente contra la tabla LanceDB:

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`: lista de permitidos de columnas separadas por comas (por defecto `id`, `text`, `importance`, `category`, `createdAt`).
- `--filter <condition>`: cláusula WHERE estilo SQL; limitada a 200 caracteres y restringida a caracteres alfanuméricos, operadores de comparación, comillas, paréntesis y un pequeño conjunto de puntuación segura.
- `--limit <n>`: entero positivo; por defecto `10`.
- `--order-by <column>:<asc|desc>`: ordenamiento en memoria aplicado después del filtro; la columna de ordenamiento se incluye automáticamente en la proyección.

Los agentes también obtienen herramientas de memoria LanceDB del complemento de memoria activo:

- `memory_recall` para la recuperación respaldada por LanceDB
- `memory_store` para guardar hechos importantes, preferencias, decisiones y entidades
- `memory_forget` para eliminar las memorias coincidentes

## Almacenamiento

De manera predeterminada, los datos de LanceDB se encuentran en `~/.openclaw/memory/lancedb`. Anule la ruta con `dbPath`:

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

`storageOptions` acepta pares clave/valor de cadena para los backends de almacenamiento de LanceDB y admite la expansión de `${ENV_VAR}`:

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

`memory-lancedb` depende del paquete nativo `@lancedb/lancedb`. OpenClaw empaquetado trata ese paquete como parte del paquete del complemento. El inicio de Gateway no repara las dependencias de los complementos; si falta la dependencia, reinstale o actualice el paquete del complemento y reinicie el Gateway.

Si una instalación antigua registra un error de `dist/package.json` faltante o de `@lancedb/lancedb` faltante durante la carga del complemento, actualice OpenClaw y reinicie el Gateway.

Si el complemento registra que LanceDB no está disponible en `darwin-x64`, use el
backend de memoria predeterminado en esa máquina, mueva el Gateway a una plataforma compatible o
deshabilite `memory-lancedb`.

## Solución de problemas

### La longitud de la entrada excede la longitud del contexto

Esto generalmente significa que el modelo de incrustación rechazó la consulta de recuerdo:

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

Sin `dimensions`, solo se conocen las dimensiones de incrustación de OpenAI integradas.
Para modelos de incrustación locales o personalizados, establezca `embedding.dimensions` en el tamaño
del vector informado por ese modelo.

### El complemento se carga pero no aparecen memorias

Verifique que `plugins.slots.memory` apunte a `memory-lancedb` y luego ejecute:

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

Si `autoCapture` está deshabilitado, el complemento recordará las memorias existentes pero no
almacenará automáticamente nuevas. Use la herramienta `memory_store` o habilite
`autoCapture` si desea una captura automática.

## Relacionado

- [Resumen de memoria](/es/concepts/memory)
- [Memoria activa](/es/concepts/active-memory)
- [Búsqueda de memoria](/es/concepts/memory-search)
- [Wiki de memoria](/es/plugins/memory-wiki)
- [Ollama](/es/providers/ollama)
