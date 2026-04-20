---
summary: "Referencia de la CLI para `openclaw onboard` (incorporación interactiva)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "incorporación"
---

# `openclaw onboard`

Incorporación interactiva para la configuración de Gateway local o remota.

## Guías relacionadas

- Centro de incorporación de la CLI: [Incorporación (CLI)](/es/start/wizard)
- Descripción general de la incorporación: [Descripción general de la incorporación](/es/start/onboarding-overview)
- Referencia de incorporación de la CLI: [Referencia de configuración de la CLI](/es/start/wizard-cli-reference)
- Automatización de la CLI: [Automatización de la CLI](/es/start/wizard-cli-automation)
- Incorporación en macOS: [Incorporación (Aplicación macOS)](/es/start/onboarding)

## Ejemplos

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

Para destinos `ws://` de red privada en texto plano (solo redes de confianza), establezca
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el entorno del proceso de incorporación.

Proveedor personalizado no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai
```

`--custom-api-key` es opcional en el modo no interactivo. Si se omite, la incorporación verifica `CUSTOM_API_KEY`.

LM Studio también admite una marca de clave específica del proveedor en modo no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

Ollama no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` predeterminado es `http://127.0.0.1:11434`. `--custom-model-id` es opcional; si se omite, la incorporación usa los valores predeterminados sugeridos por Ollama. Los ID de modelos en la nube, como `kimi-k2.5:cloud`, también funcionan aquí.

Almacenar claves de proveedor como referencias en lugar de texto plano:

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Con `--secret-input-mode ref`, la incorporación escribe referencias respaldadas por variables de entorno en lugar de valores de clave en texto plano.
Para proveedores respaldados por perfil de autenticación, esto escribe entradas `keyRef`; para proveedores personalizados, esto escribe `models.providers.<id>.apiKey` como una referencia de entorno (por ejemplo, `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrato del modo no interactivo `ref`:

- Establezca la variable de entorno del proveedor en el entorno del proceso de incorporación (por ejemplo, `OPENAI_API_KEY`).
- No pase marcas de clave en línea (por ejemplo, `--openai-api-key`) a menos que esa variable de entorno también esté establecida.
- Si se pasa una marca de clave en línea sin la variable de entorno requerida, la incorporación falla rápidamente con orientación.

Opciones de token de Gateway en modo no interactivo:

- `--gateway-auth token --gateway-token <token>` almacena un token en texto plano.
- `--gateway-auth token --gateway-token-ref-env <name>` almacena `gateway.auth.token` como un env SecretRef.
- `--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.
- `--gateway-token-ref-env` requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
- Con `--install-daemon`, cuando la autenticación de token requiere un token, los tokens de puerta de enlace administrados por SecretRef se validan pero no se persisten como texto plano resuelto en los metadatos del entorno del servicio supervisor.
- Con `--install-daemon`, si el modo de token requiere un token y el SecretRef del token configurado no está resuelto, la incorporación falla de forma cerrada con orientación de reparación.
- Con `--install-daemon`, si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la incorporación bloquea la instalación hasta que el modo se establece explícitamente.
- La incorporación local escribe `gateway.mode="local"` en la configuración. Si un archivo de configuración posterior carece de `gateway.mode`, trátelo como un daño en la configuración o una edición manual incompleta, no como un acceso directo válido en modo local.
- `--allow-unconfigured` es una escotilla de escape de tiempo de ejecución de puerta de enlace separada. No significa que la incorporación pueda omitir `gateway.mode`.

Ejemplo:

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

Salud no interactiva de la puerta de enlace local:

- A menos que pase `--skip-health`, la incorporación espera una puerta de enlace local accesible antes de salir con éxito.
- `--install-daemon` inicia primero la ruta de instalación de la puerta de enlace administrada. Sin ella, ya debe tener una puerta de enlace local en ejecución, por ejemplo `openclaw gateway run`.
- Si solo desea escrituras de configuración/espacio de trabajo/inicio en automatización, use `--skip-health`.
- En Windows nativo, `--install-daemon` intenta primero las Tareas Programadas y recurrires a un elemento de inicio de sesión en la carpeta de Inicio por usuario si se deniega la creación de la tarea.

Comportamiento de incorporación interactiva con modo de referencia:

- Elija **Usar referencia secreta** cuando se le solicite.
- Luego elija entre:
  - Variable de entorno
  - Proveedor de secretos configurado (`file` o `exec`)
- La incorporación realiza una validación previa rápida antes de guardar la referencia.
  - Si la validación falla, la incorporación muestra el error y le permite reintentar.

Opciones de endpoint Z.AI no interactivas:

Nota: `--auth-choice zai-api-key` ahora detecta automáticamente el mejor endpoint de Z.AI para su clave (prefiere la API general con `zai/glm-5.1`).
Si específicamente desea los endpoints del Plan de Codificación GLM, elija `zai-coding-global` o `zai-coding-cn`.

```bash
# Promptless endpoint selection
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# Other Z.AI endpoint choices:
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

Ejemplo no interactivo de Mistral:

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

Notas de flujo:

- `quickstart`: indicaciones mínimas, genera automáticamente un token de puerta de enlace.
- `manual`: indicaciones completas para puerto/bind/auth (alias de `advanced`).
- Cuando una elección de autenticación implica un proveedor preferido, la incorporación prefiltra los
  selectores de modelo predeterminado y lista blanca para ese proveedor. Para Volcengine y
  BytePlus, esto también coincide con las variantes del plan de codificación
  (`volcengine-plan/*`, `byteplus-plan/*`).
- Si el filtro del proveedor preferido aún no arroja modelos cargados, la incorporación
  recurre al catálogo sin filtrar en lugar de dejar el selector vacío.
- En el paso de búsqueda web, algunos proveedores pueden activar indicaciones
  de seguimiento específicas del proveedor:
  - **Grok** puede ofrecer una configuración opcional `x_search` con el mismo `XAI_API_KEY`
    y una elección de modelo `x_search`.
  - **Kimi** puede solicitar la región de la API de Moonshot (`api.moonshot.ai` vs
    `api.moonshot.cn`) y el modelo de búsqueda web predeterminado de Kimi.
- Comportamiento del alcance DM en la incorporación local: [Referencia de configuración de CLI](/es/start/wizard-cli-reference#outputs-and-internals).
- Primer chat más rápido: `openclaw dashboard` (UI de control, sin configuración de canal).
- Proveedor personalizado: conecte cualquier endpoint compatible con OpenAI o Anthropic,
  incluidos los proveedores alojados no listados. Use Desconocido para detectar automáticamente.

## Comandos de seguimiento comunes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Use `--non-interactive` para scripts.</Note>
