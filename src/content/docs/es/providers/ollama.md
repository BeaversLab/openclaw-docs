---
summary: "Ejecutar OpenClaw con Ollama (modelos en la nube y locales)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama es un tiempo de ejecución de LLM local que facilita la ejecución de modelos de código abierto en su máquina. OpenClaw se integra con la API nativa de Ollama (`/api/chat`), admite streaming y llamadas a herramientas, y puede detectar automáticamente modelos locales de Ollama cuando se habilita con `OLLAMA_API_KEY` (o un perfil de autenticación) y no se define una entrada explícita de `models.providers.ollama`.

<Warning>**Usuarios remotos de Ollama**: No utilicen la URL compatible con OpenAI `/v1` (`http://host:11434/v1`) con OpenClaw. Esto rompe las llamadas a herramientas y los modelos pueden generar el JSON de la herramienta sin formato como texto plano. En su lugar, utilice la URL de la API nativa de Ollama: `baseUrl: "http://host:11434"` (sin `/v1`).</Warning>

## Inicio rápido

### Incorporación (recomendado)

La forma más rápida de configurar Ollama es a través de la incorporación:

```bash
openclaw onboard
```

Seleccione **Ollama** de la lista de proveedores. La incorporación:

1. Solicite la URL base de Ollama donde se puede alcanzar su instancia (por defecto `http://127.0.0.1:11434`).
2. Te permitirá elegir **Nube + Local** (modelos en la nube y modelos locales) o **Local** (solo modelos locales).
3. Abrirá un flujo de inicio de sesión en el navegador si eliges **Nube + Local** y no has iniciado sesión en ollama.com.
4. Descubrirá los modelos disponibles y sugerirá los predeterminados.
5. Descargará automáticamente el modelo seleccionado si no está disponible localmente.

También se admite el modo no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

Opcionalmente especifica una URL base o modelo personalizado:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### Configuración manual

1. Instale Ollama: [https://ollama.com/download](https://ollama.com/download)

2. Descarga un modelo local si deseas inferencia local:

```bash
ollama pull glm-4.7-flash
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. Si también deseas modelos en la nube, inicia sesión:

```bash
ollama signin
```

4. Ejecute la incorporación y elija `Ollama`:

```bash
openclaw onboard
```

- `Local`: solo modelos locales
- `Cloud + Local`: modelos locales más modelos en la nube
- Los modelos en la nube como `kimi-k2.5:cloud`, `minimax-m2.5:cloud` y `glm-5:cloud` **no** requieren un `ollama pull` local

Actualmente, OpenClaw sugiere:

- predeterminado local: `glm-4.7-flash`
- valores predeterminados en la nube: `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`

5. Si prefieres la configuración manual, habilita Ollama para OpenClaw directamente (cualquier valor funciona; Ollama no requiere una clave real):

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. Inspecciona o cambia los modelos:

```bash
openclaw models list
openclaw models set ollama/glm-4.7-flash
```

7. O establece el valor predeterminado en la configuración:

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/glm-4.7-flash" },
    },
  },
}
```

## Descubrimiento de modelos (proveedor implícito)

Cuando configura `OLLAMA_API_KEY` (o un perfil de autenticación) y **no** define `models.providers.ollama`, OpenClaw descubre modelos de la instancia local de Ollama en `http://127.0.0.1:11434`:

- Consulta `/api/tags`
- Utiliza búsquedas de `/api/show` de mejor esfuerzo para leer `contextWindow` cuando está disponible
- Marca `reasoning` con un heurístico de nombre de modelo (`r1`, `reasoning`, `think`)
- Establece `maxTokens` al límite máximo de tokens predeterminado de Ollama utilizado por OpenClaw
- Establece todos los costos en `0`

Esto evita entradas de modelo manuales manteniendo el catálogo alineado con la instancia local de Ollama.

Para ver qué modelos están disponibles:

```bash
ollama list
openclaw models list
```

Para añadir un nuevo modelo, simplemente descárgalo con Ollama:

```bash
ollama pull mistral
```

El nuevo modelo se descubrirá automáticamente y estará disponible para su uso.

Si estableces `models.providers.ollama` explícitamente, se omite el descubrimiento automático y debes definir los modelos manualmente (ver abajo).

## Configuración

### Configuración básica (descubrimiento implícito)

La forma más sencilla de habilitar Ollama es a través de una variable de entorno:

```bash
export OLLAMA_API_KEY="ollama-local"
```

### Configuración explícita (modelos manuales)

Usa la configuración explícita cuando:

- Ollama se ejecuta en otro host/puerto.
- Quieres forzar ventanas de contexto específicas o listas de modelos.
- Quieres definiciones de modelos completamente manuales.

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "gpt-oss:20b",
            name: "GPT-OSS 20B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

Si `OLLAMA_API_KEY` está configurado, puedes omitir `apiKey` en la entrada del proveedor y OpenClaw lo completará para las comprobaciones de disponibilidad.

### URL base personalizada (configuración explícita)

Si Ollama se está ejecutando en un host o puerto diferente (la configuración explícita deshabilita el autodescubrimiento, así que define los modelos manualmente):

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
        api: "ollama", // Set explicitly to guarantee native tool-calling behavior
      },
    },
  },
}
```

<Warning>No añadas `/v1` a la URL. La ruta `/v1` utiliza el modo compatible con OpenAI, donde la llamada a herramientas no es fiable. Utiliza la URL base de Ollama sin un sufijo de ruta.</Warning>

### Selección de modelo

Una vez configurados, todos sus modelos de Ollama están disponibles:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## Modelos en la nube

Los modelos en la nube te permiten ejecutar modelos alojados en la nube (por ejemplo `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`) junto con tus modelos locales.

Para usar modelos en la nube, seleccione el modo **Nube + Local** durante la configuración. El asistente verifica si ha iniciado sesión y abre un flujo de inicio de sesión en el navegador cuando es necesario. Si no se puede verificar la autenticación, el asistente recurre a los modelos locales predeterminados.

También puedes iniciar sesión directamente en [ollama.com/signin](https://ollama.com/signin).

## Ollama Web Search

OpenClaw también admite **Ollama Web Search** como un proveedor `web_search` incluido.

- Utiliza tu host de Ollama configurado (`models.providers.ollama.baseUrl` cuando
  está configurado, de lo contrario `http://127.0.0.1:11434`).
- No requiere clave.
- Requiere que Ollama se esté ejecutando y haber iniciado sesión con `ollama signin`.

Elige **Ollama Web Search** durante `openclaw onboard` o
`openclaw configure --section web`, o establece:

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

Para obtener detalles completos sobre la configuración y el comportamiento, consulte [Ollama Web Search](/en/tools/ollama-search).

## Avanzado

### Modelos de razonamiento

Por defecto, OpenClaw trata los modelos con nombres como `deepseek-r1`, `reasoning` o `think` como capaces de razonamiento:

```bash
ollama pull deepseek-r1:32b
```

### Costos del modelo

Ollama es gratuito y se ejecuta localmente, por lo que todos los costos del modelo se establecen en $0.

### Configuración de transmisión

La integración de Ollama de OpenClaw utiliza la **API nativa de Ollama** (`/api/chat`) por defecto, que admite completamente la transmisión y la llamada a herramientas simultáneamente. No se necesita ninguna configuración especial.

#### Modo heredado compatible con OpenAI

<Warning>**La llamada a herramientas no es fiable en el modo compatible con OpenAI.** Utilice este modo solo si necesita el formato OpenAI para un proxy y no depende del comportamiento de la llamada a herramientas nativa.</Warning>

Si necesitas usar el endpoint compatible con OpenAI en su lugar (por ejemplo, detrás de un proxy que solo admite el formato OpenAI), establece `api: "openai-completions"` explícitamente:

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: true, // default: true
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

Este modo puede no admitir el streaming y la llamada de herramientas (tool calling) simultáneamente. Es posible que necesites desactivar el streaming con `params: { streaming: false }` en la configuración del modelo.

Cuando se usa `api: "openai-completions"` con Ollama, OpenClaw inyecta `options.num_ctx` por defecto para que Ollama no vuelva silenciosamente a una ventana de contexto de 4096. Si tu proxy o servidor rechaza campos `options` desconocidos, desactiva este comportamiento:

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: false,
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

### Ventanas de contexto

Para modelos detectados automáticamente, OpenClaw utiliza la ventana de contexto reportada por Ollama cuando está disponible; de lo contrario, vuelve a la ventana de contexto predeterminada de Ollama utilizada por OpenClaw. Puedes anular `contextWindow` y `maxTokens` en la configuración explícita del proveedor.

## Solución de problemas

### Ollama no detectado

Asegúrate de que Ollama se esté ejecutando y de que hayas establecido `OLLAMA_API_KEY` (o un perfil de autenticación), y de que **no** hayas definido una entrada `models.providers.ollama` explícita:

```bash
ollama serve
```

Y de que la API sea accesible:

```bash
curl http://localhost:11434/api/tags
```

### No hay modelos disponibles

Si tu modelo no aparece en la lista:

- Descarga (pull) el modelo localmente, o
- Define el modelo explícitamente en `models.providers.ollama`.

Para añadir modelos:

```bash
ollama list  # See what's installed
ollama pull glm-4.7-flash
ollama pull gpt-oss:20b
ollama pull llama3.3     # Or another model
```

### Conexión rechazada

Comprueba que Ollama se esté ejecutando en el puerto correcto:

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## Véase también

- [Proveedores de modelos](/en/concepts/model-providers) - Resumen de todos los proveedores
- [Selección de modelos](/en/concepts/models) - Cómo elegir modelos
- [Configuración](/en/gateway/configuration) - Referencia completa de configuración
