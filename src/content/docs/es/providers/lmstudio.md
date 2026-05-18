---
summary: "Ejecutar OpenClaw con LM Studio"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

LM Studio es una aplicación amigable pero potente para ejecutar modelos de pesos abiertos en su propio hardware. Le permite ejecutar modelos llama.cpp (GGUF) o MLX (Apple Silicon). Viene en un paquete con interfaz gráfica o como demonio sin interfaz (`llmster`). Para ver la documentación del producto y la configuración, consulte [lmstudio.ai](https://lmstudio.ai/).

## Inicio rápido

1. Instale LM Studio (escritorio) o `llmster` (sin interfaz), luego inicie el servidor local:

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

Si está utilizando la aplicación, asegúrese de tener JIT habilitado para una experiencia fluida. Obtenga más información en la [guía de LM Studio JIT y TTL](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

3. Si la autenticación de LM Studio está habilitada, configure `LM_API_TOKEN`:

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

Si la autenticación de LM Studio está deshabilitada, puedes dejar la clave API en blanco durante la configuración interactiva de OpenClaw.

Para obtener detalles sobre la configuración de autenticación de LM Studio, consulte [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).

4. Ejecute la incorporación y elija `LM Studio`:

```bash
openclaw onboard
```

5. Durante la incorporación, use el mensaje `Default model` para elegir su modelo de LM Studio.

También puedes establecerlo o cambiarlo más tarde:

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

Las claves de modelo de LM Studio siguen un formato `author/model-name` (p. ej. `qwen/qwen3.5-9b`). Las referencias de modelo de OpenClaw anteponen el nombre del proveedor: `lmstudio/qwen/qwen3.5-9b`. Puede encontrar la clave exacta de un modelo ejecutando `curl http://localhost:1234/api/v1/models` y mirando el campo `key`.

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

`--custom-model-id` toma la clave del modelo tal como la devuelve LM Studio (p. ej. `qwen/qwen3.5-9b`), sin el prefijo del proveedor `lmstudio/`.

Para servidores LM Studio autenticados, pase `--lmstudio-api-key` o configure `LM_API_TOKEN`.
Para servidores LM Studio no autenticados, omita la clave; OpenClaw almacena un marcador local no secreto.

`--custom-api-key` sigue siendo compatible, pero se prefiere `--lmstudio-api-key` para LM Studio.

Esto escribe `models.providers.lmstudio` y establece el modelo predeterminado en `lmstudio/<custom-model-id>`. Cuando proporciona una clave de API, la configuración también escribe el perfil de autenticación `lmstudio:default`.

La configuración interactiva puede solicitar una longitud de contexto de carga preferida opcional y la aplica en los modelos de LM Studio descubiertos que guarda en la configuración.
La configuración del complemento LM Studio confía en el punto de conexión de LM Studio configurado para las solicitudes de modelo, incluidos los hosts de loopback, LAN y tailnet. Los orígenes de metadatos/enlace local todavía requieren consentimiento explícito. Puede optar por no participar estableciendo `models.providers.lmstudio.request.allowPrivateNetwork: false`.

## Configuración

### Compatibilidad de uso de transmisión

LM Studio es compatible con el uso en streaming. Cuando no emite un objeto
`usage` con formato OpenAI, OpenClaw recupera los recuentos de tokens de los metadatos
`timings.prompt_n` / `timings.predicted_n` estilo llama.cpp.

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
OpenClaw expone los valores `reasoning_effort` compatibles con OpenAI correspondientes
en los metadatos de compatibilidad del modelo. Las compilaciones actuales de LM Studio pueden anunciar opciones de interfaz binarias
tales como `allowed_options: ["off", "on"]` mientras rechazan esos valores
en `/v1/chat/completions`; OpenClaw normaliza esa forma de descubrimiento binario a
`none`, `minimal`, `low`, `medium`, `high` y `xhigh` antes de enviar solicitudes.
La configuración antigua guardada de LM Studio que contiene mapas de razonamiento `off`/`on` se
normaliza de la misma manera cuando se carga el catálogo.

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

Asegúrese de que LM Studio se esté ejecutando. Si la autenticación está habilitada, también establezca `LM_API_TOKEN`:

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

- Compruebe que `LM_API_TOKEN` coincida con la clave configurada en LM Studio.
- Para obtener detalles sobre la configuración de autenticación de LM Studio, consulte [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).
- Si tu servidor no requiere autenticación, deja la clave en blanco durante la configuración.

### Carga de modelos justo a tiempo (Just-in-time)

LM Studio admite la carga de modelos justo a tiempo (JIT), donde los modelos se cargan en la primera solicitud. OpenClaw precarga los modelos a través del punto final de carga nativo de LM Studio de forma predeterminada, lo cual ayuda cuando JIT está deshabilitado. Para permitir que el comportamiento JIT, TTL de inactividad y desalojo automático de LM Studio controlen el ciclo de vida del modelo, desactive el paso de precarga de OpenClaw:

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        api: "openai-completions",
        params: { preload: false },
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

### Host de LM Studio en LAN o tailnet

Use la dirección accesible del host de LM Studio, mantenga `/v1` y asegúrese de que LM Studio esté vinculado más allá del loopback en esa máquina:

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

`lmstudio` confía automáticamente en su punto de conexión local/privado configurado para las solicitudes de modelo protegidas. Las entradas de proveedores personalizadas/local compatibles con OpenAI también confían en su origen `baseUrl` configurado exacto, excepto los orígenes de metadatos/enlace local; las solicitudes a diferentes puertos privados o destinos todavía requieren `models.providers.<id>.request.allowPrivateNetwork: true`. Establezca `models.providers.<id>.request.allowPrivateNetwork: false` para no participar en la confianza de origen exacto.

## Relacionado

- [Selección de modelo](/es/concepts/model-providers)
- [Ollama](/es/providers/ollama)
- [Modelos locales](/es/gateway/local-models)
