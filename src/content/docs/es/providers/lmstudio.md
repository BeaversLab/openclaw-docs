---
summary: "Ejecutar OpenClaw con LM Studio"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

# LM Studio

LM Studio es una aplicación amigable pero potente para ejecutar modelos de pesos abiertos en su propio hardware. Le permite ejecutar modelos llama.cpp (GGUF) o MLX (Apple Silicon). Viene en un paquete con interfaz gráfica o como demonio sin cabeza (`llmster`). Para obtener documentación del producto y la configuración, consulte [lmstudio.ai](https://lmstudio.ai/).

## Inicio rápido

1. Instale LM Studio (escritorio) o `llmster` (sin cabeza), luego inicie el servidor local:

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. Iniciar el servidor

Asegúrese de iniciar la aplicación de escritorio o ejecutar el demonio utilizando el siguiente comando:

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

Si está utilizando la aplicación, asegúrese de tener JIT habilitado para una experiencia fluida. Obtenga más información en la [guía de LM Studio JIT y TTL](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

3. OpenClaw requiere un valor de token de LM Studio. Configure `LM_API_TOKEN`:

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

Si la autenticación de LM Studio está deshabilitada, use cualquier valor de token que no esté vacío:

```bash
export LM_API_TOKEN="placeholder-key"
```

Para obtener detalles sobre la configuración de autenticación de LM Studio, consulte [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).

4. Ejecute la incorporación y elija `LM Studio`:

```bash
openclaw onboard
```

5. En la incorporación, use el mensaje `Default model` para elegir su modelo de LM Studio.

También puede configurarlo o cambiarlo más tarde:

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

Las claves de modelo de LM Studio siguen un formato `author/model-name` (por ejemplo, `qwen/qwen3.5-9b`). Las referencias de modelo de OpenClaw
antepone el nombre del proveedor: `lmstudio/qwen/qwen3.5-9b`. Puede encontrar la clave exacta para
un modelo ejecutando `curl http://localhost:1234/api/v1/models` y mirando el campo `key`.

## Incorporación no interactiva

Use la incorporación no interactiva cuando desee automatizar la configuración (CI, aprovisionamiento, arranque remoto):

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

O especifique la URL base o el modelo con la clave de API:

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

La incorporación no interactiva requiere `--lmstudio-api-key` (o `LM_API_TOKEN` en las variables de entorno).
Para servidores LM Studio no autenticados, funciona cualquier valor de token que no esté vacío.

`--custom-api-key` sigue siendo compatible, pero se prefiere `--lmstudio-api-key` para LM Studio.

Esto escribe `models.providers.lmstudio`, establece el modelo predeterminado en
`lmstudio/<custom-model-id>` y escribe el perfil de autenticación `lmstudio:default`.

La configuración interactiva puede solicitar una longitud de contexto de carga preferida opcional y la aplica en los modelos de LM Studio descubiertos que guarda en la configuración.

## Configuración

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

### LM Studio no detectado

Asegúrese de que LM Studio se esté ejecutando y de que haya configurado `LM_API_TOKEN` (para servidores sin autenticación, funciona cualquier valor de token que no esté vacío):

```bash
# Start via desktop app, or headless:
lms server start --port 1234
```

Verifique que la API sea accesible:

```bash
curl http://localhost:1234/api/v1/models
```

### Errores de autenticación (HTTP 401)

Si la configuración informa un error HTTP 401, verifique su clave de API:

- Compruebe que `LM_API_TOKEN` coincida con la clave configurada en LM Studio.
- Para obtener más detalles sobre la configuración de autenticación de LM Studio, consulte [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication).
- Si su servidor no requiere autenticación, utilice cualquier valor de token que no esté vacío para `LM_API_TOKEN`.

### Carga de modelos justo a tiempo (JIT)

LM Studio admite la carga de modelos justo a tiempo (JIT), donde los modelos se cargan en la primera solicitud. Asegúrese de tener esto habilitado para evitar errores de 'Modelo no cargado'.
