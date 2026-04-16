---
summary: "Ejecutar OpenClaw con LM Studio"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

# LM Studio

LM Studio es una aplicación amigable y potente para ejecutar modelos de pesos abiertos en su propio hardware. Permite ejecutar modelos llama.cpp (GGUF) o MLX (Apple Silicon). Disponible como aplicación con interfaz gráfica o como demonio headless (`llmster`). Para documentación del producto y de instalación, consulte [lmstudio.ai](https://lmstudio.ai/).

## Inicio rápido

1. Instale LM Studio (escritorio) o `llmster` (headless), luego inicie el servidor local:

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. Inicie el servidor

Asegúrese de iniciar la aplicación de escritorio o ejecutar el demonio con el siguiente comando:

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

Si está usando la aplicación, asegúrese de tener JIT habilitado para una experiencia fluida. Obtenga más información en la [guía JIT y TTL de LM Studio](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

3. OpenClaw requiere un valor de token de LM Studio. Establezca `LM_API_TOKEN`:

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

Si la autenticación de LM Studio está deshabilitada, use cualquier valor de token no vacío:

```bash
export LM_API_TOKEN="placeholder-key"
```

Para más detalles sobre la configuración de autenticación de LM Studio, consulte [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).

4. Ejecute el proceso de onboarding y elija `LM Studio`:

```bash
openclaw onboard
```

5. Durante el onboarding, use el prompt `Default model` para seleccionar su modelo de LM Studio.

También puede configurarlo o cambiarlo más tarde:

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

Las claves de modelo de LM Studio siguen el formato `author/model-name` (por ejemplo, `qwen/qwen3.5-9b`). Las referencias de modelo de OpenClaw anteponen el nombre del proveedor: `lmstudio/qwen/qwen3.5-9b`. Puede encontrar la clave exacta de un modelo ejecutando `curl http://localhost:1234/api/v1/models` y consultando el campo `key`.

## Onboarding no interactivo

Use el onboarding no interactivo cuando desee automatizar la configuración (CI, aprovisionamiento, arranque remoto):

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

O especifique la URL base o el modelo con la clave API:

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` toma la clave del modelo tal como la devuelve LM Studio (por ejemplo, `qwen/qwen3.5-9b`), sin el prefijo del proveedor `lmstudio/`.

El onboarding no interactivo requiere `--lmstudio-api-key` (o `LM_API_TOKEN` en el entorno). Para servidores LM Studio sin autenticación, cualquier valor de token no vacío funciona.

`--custom-api-key` sigue siendo compatible por razones de compatibilidad, pero se prefiere `--lmstudio-api-key` para LM Studio.

Esto escribe `models.providers.lmstudio`, establece el modelo predeterminado en `lmstudio/<custom-model-id>`, y escribe el perfil de autenticación `lmstudio:default`.

La configuración interactiva puede solicitar una longitud de contexto de carga preferida opcional y la aplica a los modelos de LM Studio descubiertos que se guardan en la configuración.

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

Asegúrese de que LM Studio esté en ejecución y de haber configurado `LM_API_TOKEN` (para servidores sin autenticación, cualquier valor de token no vacío funciona):

```bash
# Inicie mediante la aplicación de escritorio, o en modo headless:
lms server start --port 1234
```

Verifique que la API sea accesible:

```bash
curl http://localhost:1234/api/v1/models
```

### Errores de autenticación (HTTP 401)

Si la configuración informa un error HTTP 401, verifique su clave API:

- Verifique que `LM_API_TOKEN` coincida con la clave configurada en LM Studio.
- Para más detalles sobre la configuración de autenticación de LM Studio, consulte [Autenticación de LM Studio](https://lmstudio.ai/docs/developer/core/authentication).
- Si su servidor no requiere autenticación, use cualquier valor de token no vacío para `LM_API_TOKEN`.

### Carga de modelos justo a tiempo

LM Studio admite la carga de modelos justo a tiempo (JIT), donde los modelos se cargan en la primera solicitud. Asegúrese de tener esto habilitado para evitar errores de "Modelo no cargado".
