---
summary: "Ejecutar OpenClaw con LM Studio"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

LM Studio es una aplicación amigable pero potente para ejecutar modelos de pesos abiertos en tu propio hardware. Te permite ejecutar modelos llama.cpp (GGUF) o MLX (Apple Silicon). Viene en un paquete con interfaz gráfica o como demonio sin cabeza (`llmster`). Para ver la documentación del producto y la configuración, consulta [lmstudio.ai](https://lmstudio.ai/).

## Inicio rápido

1. Instala LM Studio (escritorio) o `llmster` (sin cabeza), luego inicia el servidor local:

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. Iniciar el servidor

Asegúrate de iniciar la aplicación de escritorio o ejecutar el demonio usando el siguiente comando:

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

Si estás utilizando la aplicación, asegúrate de tener JIT habilitado para una experiencia fluida. Obtén más información en la [guía de JIT y TTL de LM Studio](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

3. Si la autenticación de LM Studio está habilitada, establece `LM_API_TOKEN`:

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

Si la autenticación de LM Studio está deshabilitada, puedes dejar la clave API en blanco durante la configuración interactiva de OpenClaw.

Para obtener detalles sobre la configuración de autenticación de LM Studio, consulta [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).

4. Ejecuta la incorporación (onboarding) y elige `LM Studio`:

```bash
openclaw onboard
```

5. Durante la incorporación, usa el mensaje `Default model` para elegir tu modelo de LM Studio.

También puedes establecerlo o cambiarlo más tarde:

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

Las claves de modelo de LM Studio siguen un formato `author/model-name` (por ejemplo, `qwen/qwen3.5-9b`). Las referencias de modelo de OpenClaw
anteponen el nombre del proveedor: `lmstudio/qwen/qwen3.5-9b`. Puedes encontrar la clave exacta para
un modelo ejecutando `curl http://localhost:1234/api/v1/models` y mirando el campo `key`.

## Incorporación no interactiva

Utiliza la incorporación no interactiva cuando desees automatizar la configuración (CI, aprovisionamiento, inicio remoto):

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

O especifica la URL base, el modelo y la clave API opcional:

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` toma la clave del modelo tal como la devuelve LM Studio (por ejemplo, `qwen/qwen3.5-9b`), sin
el prefijo del proveedor `lmstudio/`.

Para servidores de LM Studio autenticados, pasa `--lmstudio-api-key` o establece `LM_API_TOKEN`.
Para servidores de LM Studio no autenticados, omite la clave; OpenClaw almacena un marcador local no secreto.

`--custom-api-key` sigue siendo compatible, pero se prefiere `--lmstudio-api-key` para LM Studio.

Esto escribe `models.providers.lmstudio` y establece el modelo predeterminado en
`lmstudio/<custom-model-id>`. Cuando proporcionas una clave API, la configuración también escribe el
perfil de autenticación `lmstudio:default`.

La configuración interactiva puede solicitar una longitud de contexto de carga preferida opcional y la aplica en los modelos de LM Studio descubiertos que guarda en la configuración.
La configuración del complemento LM Studio confía en el punto final de LM Studio configurado para las solicitudes de modelo, incluidos los hosts de bucle local, LAN y tailnet. Puedes optar por no participar estableciendo `models.providers.lmstudio.request.allowPrivateNetwork: false`.

## Configuración

### Compatibilidad de uso de transmisión

LM Studio es compatible con el uso de transmisión. Cuando no emite un objeto
`usage` con formato OpenAI, OpenClaw recupera los recuentos de tokens de los metadatos
tipo llama.cpp `timings.prompt_n` / `timings.predicted_n` en su lugar.

El mismo comportamiento de uso de transmisión se aplica a estos backends locales compatibles con OpenAI:

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### Compatibilidad de pensamiento (Thinking)

Cuando el descubrimiento de `/api/v1/models` de LM Studio informa opciones de razonamiento específicas del modelo,
OpenClaw conserva esos valores nativos en los metadatos de compatibilidad del modelo. Para
modelos de pensamiento binario que anuncian `allowed_options: ["off", "on"]`,
OpenClaw asigna el pensamiento desactivado a `off` y los niveles activados `/think` a `on`
en lugar de enviar valores exclusivos de OpenAI como `low` o `medium`.

### Configuración explícita

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Solución de problemas

### No se detecta LM Studio

Asegúrate de que LM Studio se esté ejecutando. Si la autenticación está habilitada, también establece `LM_API_TOKEN`:

```bash
# Start via desktop app, or headless:
lms server start --port 1234
```

Verifica que la API sea accesible:

```bash
curl http://localhost:1234/api/v1/models
```

### Errores de autenticación (HTTP 401)

Si la configuración informa HTTP 401, verifica tu clave API:

- Comprueba que `LM_API_TOKEN` coincida con la clave configurada en LM Studio.
- Para obtener detalles sobre la configuración de autenticación de LM Studio, consulta [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).
- Si tu servidor no requiere autenticación, deja la clave en blanco durante la configuración.

### Carga de modelos justo a tiempo (Just-in-time)

LM Studio admite la carga de modelos justo a tiempo (JIT), donde los modelos se cargan en la primera solicitud. Asegúrate de tener esto habilitado para evitar errores de 'Modelo no cargado'.

### Host de LM Studio en LAN o tailnet

Utiliza la dirección accesible del host de LM Studio, mantén `/v1` y asegúrate de que LM Studio esté vinculado más allá del loopback en esa máquina:

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

A diferencia de los proveedores genéricos compatibles con OpenAI, `lmstudio` confía automáticamente en su punto final local/privado configurado para las solicitudes de modelos protegidas. Los ID de proveedores de loopback personalizados, como `localhost` o `127.0.0.1` también son de confianza automática; para ID de proveedores personalizados de LAN, tailnet o DNS privados, establezca `models.providers.<id>.request.allowPrivateNetwork: true` explícitamente.

## Relacionado

- [Selección de modelo](/es/concepts/model-providers)
- [Ollama](/es/providers/ollama)
- [Modelos locales](/es/gateway/local-models)
