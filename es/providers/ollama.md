---
summary: "Ejecuta OpenClaw con Ollama (modelos en la nube y locales)"
read_when:
  - Quieres ejecutar OpenClaw con modelos en la nube o locales a través de Ollama
  - Necesitas orientación sobre la configuración y puesta en marcha de Ollama
title: "Ollama"
---

# Ollama

Ollama es un tiempo de ejecución de LLM local que facilita ejecutar modelos de código abierto en tu máquina. OpenClaw se integra con la API nativa de Ollama (`/api/chat`), es compatible con la transmisión en tiempo real (streaming) y la llamada a herramientas (tool calling), y puede detectar automáticamente modelos locales de Ollama cuando activas la opción con `OLLAMA_API_KEY` (o un perfil de autenticación) y no defines una entrada explícita de `models.providers.ollama`.

<Warning>
**Usuarios de Ollama remoto**: No utilicen la URL compatible con OpenAI `/v1` (`http://host:11434/v1`) con OpenClaw. Esto interrumpe la llamada a herramientas y los modelos podrían generar el JSON de la herramienta en formato de texto sin formato. Utilicen en su lugar la URL de la API nativa de Ollama: `baseUrl: "http://host:11434"` (sin `/v1`).
</Warning>

## Inicio rápido

### Incorporación (recomendado)

La forma más rápida de configurar Ollama es a través de la incorporación:

```bash
openclaw onboard
```

Selecciona **Ollama** de la lista de proveedores. La incorporación:

1. Pedirá la URL base de Ollama donde se puede alcanzar tu instancia (por defecto `http://127.0.0.1:11434`).
2. Te permitirá elegir **Nube + Local** (modelos en la nube y locales) o **Local** (solo modelos locales).
3. Abrirá un flujo de inicio de sesión en el navegador si eliges **Nube + Local** y no has iniciado sesión en ollama.com.
4. Descubrirá los modelos disponibles y sugerirá los predeterminados.
5. Descargará automáticamente (pull) el modelo seleccionado si no está disponible localmente.

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

1. Instala Ollama: [https://ollama.com/download](https://ollama.com/download)

2. Descarga (pull) un modelo local si quieres inferencia local:

```bash
ollama pull glm-4.7-flash
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. Si también quieres modelos en la nube, inicia sesión:

```bash
ollama signin
```

4. Ejecuta la incorporación y elige `Ollama`:

```bash
openclaw onboard
```

- `Local`: solo modelos locales
- `Cloud + Local`: modelos locales más modelos en la nube
- Los modelos en la nube como `kimi-k2.5:cloud`, `minimax-m2.5:cloud` y `glm-5:cloud` **no** requieren un `ollama pull` local

Actualmente OpenClaw sugiere:

- predeterminado local: `glm-4.7-flash`
- valores predeterminados en la nube: `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`

5. Si prefieres la configuración manual, habilita Ollama para OpenClaw directamente (cualquier valor funciona; Ollama no requiere una clave real):

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. Para inspeccionar o cambiar modelos:

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

Cuando configuras `OLLAMA_API_KEY` (o un perfil de autenticación) y **no** defines `models.providers.ollama`, OpenClaw descubre modelos desde la instancia local de Ollama en `http://127.0.0.1:11434`:

- Consulta `/api/tags`
- Utiliza búsquedas de `/api/show` de mejor esfuerzo para leer `contextWindow` cuando esté disponible
- Marca `reasoning` con un heurístico de nombre de modelo (`r1`, `reasoning`, `think`)
- Establece `maxTokens` al límite máximo de tokens predeterminado de Ollama utilizado por OpenClaw
- Establece todos los costos en `0`

Esto evita entradas manuales de modelos manteniendo el catálogo alineado con la instancia local de Ollama.

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

Si configuras `models.providers.ollama` explícitamente, se omite el descubrimiento automático y debes definir los modelos manualmente (ver abajo).

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

Si `OLLAMA_API_KEY` está configurado, puedes omitir `apiKey` en la entrada del proveedor y OpenClaw lo llenará para las verificaciones de disponibilidad.

### URL base personalizada (configuración explícita)

Si Ollama se está ejecutando en un host o puerto diferente (la configuración explícita deshabilita el descubrimiento automático, por lo que debes definir los modelos manualmente):

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

<Warning>
No añadas `/v1` a la URL. La ruta `/v1` usa el modo compatible con OpenAI, donde la llamada a herramientas no es fiable. Usa la URL base de Ollama sin un sufijo de ruta.
</Warning>

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

Los modelos en la nube le permiten ejecutar modelos alojados en la nube (por ejemplo, `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`) junto con sus modelos locales.

Para utilizar modelos en la nube, seleccione el modo **Nube + Local** durante la configuración. El asistente verifica si ha iniciado sesión y abre un flujo de inicio de sesión en el navegador cuando es necesario. Si no se puede verificar la autenticación, el asistente vuelve a los valores predeterminados del modelo local.

También puede iniciar sesión directamente en [ollama.com/signin](https://ollama.com/signin).

## Avanzado

### Modelos de razonamiento

OpenClaw trata los modelos con nombres como `deepseek-r1`, `reasoning` o `think` como capaces de razonamiento de forma predeterminada:

```bash
ollama pull deepseek-r1:32b
```

### Costos del modelo

Ollama es gratuito y se ejecuta localmente, por lo que todos los costos del modelo se establecen en $0.

### Configuración de transmisión

La integración de OpenClaw con Ollama utiliza la **API nativa de Ollama** (`/api/chat`) de forma predeterminada, que admite completamente la transmisión y la llamada a herramientas simultáneamente. No se necesita una configuración especial.

#### Modo heredado compatible con OpenAI

<Warning>
**La llamada a herramientas no es confiable en modo compatible con OpenAI.** Use este modo solo si necesita el formato OpenAI para un proxy y no depende del comportamiento nativo de llamada a herramientas.
</Warning>

Si necesita utilizar el punto de conexión compatible con OpenAI en su lugar (por ejemplo, detrás de un proxy que solo admite el formato OpenAI), establezca `api: "openai-completions"` explícitamente:

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

Este modo puede no admitir la transmisión y la llamada a herramientas simultáneamente. Es posible que deba desactivar la transmisión con `params: { streaming: false }` en la configuración del modelo.

Cuando se usa `api: "openai-completions"` con Ollama, OpenClaw inyecta `options.num_ctx` de forma predeterminada para que Ollama no vuelva silenciosamente a una ventana de contexto de 4096. Si su proxy/servidor ascendente rechaza campos `options` desconocidos, desactive este comportamiento:

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

Para los modelos detectados automáticamente, OpenClaw utiliza la ventana de contexto reportada por Ollama cuando está disponible; de lo contrario, vuelve a la ventana de contexto predeterminada de Ollama utilizada por OpenClaw. Puede anular `contextWindow` y `maxTokens` en la configuración explícita del proveedor.

## Solución de problemas

### Ollama no detectado

Asegúrese de que Ollama se esté ejecutando y de que haya configurado `OLLAMA_API_KEY` (o un perfil de autenticación), y de que **no** haya definido una entrada explícita de `models.providers.ollama`:

```bash
ollama serve
```

Y de que la API sea accesible:

```bash
curl http://localhost:11434/api/tags
```

### No hay modelos disponibles

Si su modelo no está listado, realice una de las siguientes acciones:

- Extraiga el modelo localmente, o
- Defina el modelo explícitamente en `models.providers.ollama`.

Para agregar modelos:

```bash
ollama list  # See what's installed
ollama pull glm-4.7-flash
ollama pull gpt-oss:20b
ollama pull llama3.3     # Or another model
```

### Conexión rechazada

Compruebe que Ollama se esté ejecutando en el puerto correcto:

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## Véase también

- [Proveedores de modelos](/es/concepts/model-providers) - Resumen de todos los proveedores
- [Selección de modelos](/es/concepts/models) - Cómo elegir modelos
- [Configuración](/es/gateway/configuration) - Referencia completa de configuración

import en from "/components/footer/en.mdx";

<en />
