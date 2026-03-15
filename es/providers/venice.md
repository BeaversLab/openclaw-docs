---
summary: "Usa los modelos centrados en la privacidad de Venice AI en OpenClaw"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

# Venice AI (destacado de Venice)

**Venice** es nuestra configuración destacada de Venice para inferencia con prioridad de privacidad y acceso opcional anonimizado a modelos propietarios.

Venice AI proporciona inferencia de IA centrada en la privacidad con soporte para modelos sin censura y acceso a modelos propietarios importantes a través de su proxy anonimizado. Toda la inferencia es privada de forma predeterminada: sin entrenamiento con tus datos, sin registro.

## Por qué Venice en OpenClaw

- **Inferencia privada** para modelos de código abierto (sin registro).
- **Modelos sin censura** cuando los necesites.
- **Acceso anonimizado** a modelos propietarios (Opus/GPT/Gemini) cuando la calidad importa.
- Puntos finales `/v1` compatibles con OpenAI.

## Modos de privacidad

Venice ofrece dos niveles de privacidad; entender esto es clave para elegir tu modelo:

| Modo            | Descripción                                                                                                                                    | Modelos                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Privado**     | Completamente privado. Los indicadores y las respuestas **nunca se almacenan ni registran**. Efímero.                                          | Llama, Qwen, DeepSeek, Kimi, MiniMax, Venice Uncensored, etc. |
| **Anonimizado** | Proxied a través de Venice con los metadatos eliminados. El proveedor subyacente (OpenAI, Anthropic, Google, xAI) ve solicitudes anonimizadas. | Claude, GPT, Gemini, Grok                                     |

## Características

- **Centrado en la privacidad**: Elige entre los modos "privado" (completamente privado) y "anonimizado" (vía proxy)
- **Modelos sin censura**: Acceso a modelos sin restricciones de contenido
- **Acceso a modelos importantes**: Usa Claude, GPT, Gemini y Grok a través del proxy anonimizado de Venice
- **API compatible con OpenAI**: Puntos finales `/v1` estándar para una integración sencilla
- **Streaming**: ✅ Compatible con todos los modelos
- **Llamada a funciones (Function calling)**: ✅ Compatible con modelos seleccionados (consulta las capacidades del modelo)
- **Visión**: ✅ Compatible con modelos con capacidad de visión
- **Sin límites de tasa estrictos**: Es posible que se aplique una limitación de uso justo para un uso extremo

## Configuración

### 1. Obtener clave de API

1. Regístrate en [venice.ai](https://venice.ai)
2. Ve a **Configuración → Claves de API → Crear nueva clave**
3. Copia tu clave de API (formato: `vapi_xxxxxxxxxxxx`)

### 2. Configurar OpenClaw

**Opción A: Variable de entorno**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**Opción B: Configuración interactiva (Recomendado)**

```bash
openclaw onboard --auth-choice venice-api-key
```

Esto hará lo siguiente:

1. Solicita tu clave API (o usa la existente `VENICE_API_KEY`)
2. Mostrar todos los modelos de Venice disponibles
3. Permite elegir tu modelo predeterminado
4. Configurar el proveedor automáticamente

**Opción C: No interactiva**

```bash
openclaw onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. Verificar configuración

```bash
openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
```

## Selección de modelo

Después de la configuración, OpenClaw muestra todos los modelos de Venice disponibles. Elige según tus necesidades:

- **Modelo predeterminado**: `venice/kimi-k2-5` para un razonamiento privado sólido más visión.
- **Opción de alta capacidad**: `venice/claude-opus-4-6` para la ruta de Venice anonimizada más potente.
- **Privacidad**: Elige modelos "privados" para una inferencia totalmente privada.
- **Capacidad**: Elige modelos "anonimizados" para acceder a Claude, GPT, Gemini a través del proxy de Venice.

Cambia tu modelo predeterminado en cualquier momento:

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

Listar todos los modelos disponibles:

```bash
openclaw models list | grep venice
```

## Configurar mediante `openclaw configure`

1. Ejecutar `openclaw configure`
2. Seleccionar **Modelo/auth**
3. Elegir **Venice AI**

## ¿Qué modelo debo usar?

| Caso de uso                       | Modelo recomendado               | Por qué                                                         |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Chat general (predeterminado)** | `kimi-k2-5`                      | Razonamiento privado sólido más visión                          |
| **Mejor calidad general**         | `claude-opus-4-6`                | Opción de Venice anonimizada más potente                        |
| **Privacidad + programación**     | `qwen3-coder-480b-a35b-instruct` | Modelo de programación privado con contexto grande              |
| **Visión privada**                | `kimi-k2-5`                      | Soporte de visión sin salir del modo privado                    |
| **Rápido + económico**            | `qwen3-4b`                       | Modelo de razonamiento ligero                                   |
| **Tareas privadas complejas**     | `deepseek-v3.2`                  | Razonamiento fuerte, pero sin soporte de herramientas de Venice |
| **Sin censura**                   | `venice-uncensored`              | Sin restricciones de contenido                                  |

## Modelos disponibles (41 en total)

### Modelos privados (26) — Totalmente privados, sin registro

| ID del modelo                          | Nombre                              | Contexto | Características                           |
| -------------------------------------- | ----------------------------------- | -------- | ----------------------------------------- |
| `kimi-k2-5`                            | Kimi K2.5                           | 256k     | Predeterminado, razonamiento, visión      |
| `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k     | Razonamiento                              |
| `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k     | General                                   |
| `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k     | General                                   |
| `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B             | 128k     | General, herramientas deshabilitadas      |
| `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                 | 128k     | Razonamiento                              |
| `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                 | 128k     | General                                   |
| `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                    | 256k     | Programación                              |
| `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo              | 256k     | Programación                              |
| `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                     | 256k     | Razonamiento, visión                      |
| `qwen3-next-80b`                       | Qwen3 Next 80B                      | 256k     | General                                   |
| `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Visión)              | 256k     | Visión                                    |
| `qwen3-4b`                             | Venice Small (Qwen3 4B)             | 32k      | Rápido, razonamiento                      |
| `deepseek-v3.2`                        | DeepSeek V3.2                       | 160k     | Razonamiento, herramientas deshabilitadas |
| `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k      | Sin censura, herramientas deshabilitadas  |
| `mistral-31-24b`                       | Venice Medium (Mistral)             | 128k     | Visión                                    |
| `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct         | 198k     | Visión                                    |
| `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B                 | 128k     | General                                   |
| `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B          | 128k     | General                                   |
| `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic               | 128k     | Razonamiento                              |
| `zai-org-glm-4.6`                      | GLM 4.6                             | 198k     | General                                   |
| `zai-org-glm-4.7`                      | GLM 4.7                             | 198k     | Razonamiento                              |
| `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                       | 128k     | Razonamiento                              |
| `zai-org-glm-5`                        | GLM 5                               | 198k     | Razonamiento                              |
| `minimax-m21`                          | MiniMax M2.1                        | 198k     | Razonamiento                              |
| `minimax-m25`                          | MiniMax M2.5                        | 198k     | Razonamiento                              |

### Modelos anonimizados (15) — Vía proxy de Venice

| ID del modelo                   | Nombre                         | Contexto | Características                    |
| ------------------------------- | ------------------------------ | -------- | ---------------------------------- |
| `claude-opus-4-6`               | Claude Opus 4.6 (vía Venice)   | 1M       | Razonamiento, visión               |
| `claude-opus-4-5`               | Claude Opus 4.5 (vía Venice)   | 198k     | Razonamiento, visión               |
| `claude-sonnet-4-6`             | Claude Sonnet 4.6 (vía Venice) | 1M       | Razonamiento, visión               |
| `claude-sonnet-4-5`             | Claude Sonnet 4.5 (vía Venice) | 198k     | Razonamiento, visión               |
| `openai-gpt-54`                 | GPT-5.4 (vía Venice)           | 1M       | Razonamiento, visión               |
| `openai-gpt-53-codex`           | GPT-5.3 Codex (vía Venice)     | 400k     | Razonamiento, visión, programación |
| `openai-gpt-52`                 | GPT-5.2 (vía Venice)           | 256k     | Razonamiento                       |
| `openai-gpt-52-codex`           | GPT-5.2 Codex (vía Venice)     | 256k     | Razonamiento, visión, programación |
| `openai-gpt-4o-2024-11-20`      | GPT-4o (vía Venice)            | 128k     | Visión                             |
| `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini (vía Venice)       | 128k     | Visión                             |
| `gemini-3-1-pro-preview`        | Gemini 3.1 Pro (vía Venice)    | 1M       | Razonamiento, visión               |
| `gemini-3-pro-preview`          | Gemini 3 Pro (vía Venice)      | 198k     | Razonamiento, visión               |
| `gemini-3-flash-preview`        | Gemini 3 Flash (vía Venice)    | 256k     | Razonamiento, visión               |
| `grok-41-fast`                  | Grok 4.1 Fast (vía Venice)     | 1M       | Razonamiento, visión               |
| `grok-code-fast-1`              | Grok Code Fast 1 (vía Venice)  | 256k     | Razonamiento, programación         |

## Descubrimiento de modelos

OpenClaw descubre automáticamente los modelos de la API de Venice cuando `VENICE_API_KEY` está configurado. Si la API es inalcanzable, recurre a un catálogo estático.

El endpoint `/models` es público (no se requiere autenticación para listar), pero la inferencia requiere una clave de API válida.

## Soporte de transmisión y herramientas

| Característica           | Soporte                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| **Transmisión**          | ✅ Todos los modelos                                                     |
| **Llamada de funciones** | ✅ La mayoría de modelos (verifique `supportsFunctionCalling` en la API) |
| **Visión/Imágenes**      | ✅ Modelos marcados con la característica "Visión"                       |
| **Modo JSON**            | ✅ Soportado a través de `response_format`                               |

## Precios

Venice utiliza un sistema basado en créditos. Consulte [venice.ai/pricing](https://venice.ai/pricing) para las tarifas actuales:

- **Modelos privados**: Generalmente menor costo
- **Modelos anonimizados**: Similar a los precios de la API directa + pequeña tarifa de Venice

## Comparación: Venice vs API directa

| Aspecto             | Venice (Anonimizado)                     | API directa               |
| ------------------- | ---------------------------------------- | ------------------------- |
| **Privacidad**      | Metadatos eliminados, anonimizados       | Su cuenta vinculada       |
| **Latencia**        | +10-50ms (proxy)                         | Directo                   |
| **Características** | La mayoría de características soportadas | Características completas |
| **Facturación**     | Créditos de Venice                       | Facturación del proveedor |

## Ejemplos de uso

```bash
# Use the default private model
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# Use Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# Use uncensored model
openclaw agent --model venice/venice-uncensored --message "Draft options"

# Use vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Use coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
```

## Solución de problemas

### Clave de API no reconocida

```bash
echo $VENICE_API_KEY
openclaw models list | grep venice
```

Asegúrese de que la clave comience con `vapi_`.

### Modelo no disponible

El catálogo de modelos de Venice se actualiza dinámicamente. Ejecute `openclaw models list` para ver los modelos actualmente disponibles. Algunos modelos pueden estar temporalmente fuera de línea.

### Problemas de conexión

La API de Venice está en `https://api.venice.ai/api/v1`. Asegúrese de que su red permita conexiones HTTPS.

## Ejemplo de archivo de configuración

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2-5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## Enlaces

- [Venice AI](https://venice.ai)
- [Documentación de la API](https://docs.venice.ai)
- [Precios](https://venice.ai/pricing)
- [Estado](https://status.venice.ai)

import es from "/components/footer/es.mdx";

<es />
