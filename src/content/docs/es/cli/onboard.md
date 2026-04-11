---
summary: "Referencia de CLI para `openclaw onboard` (incorporación interactiva)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "integración"
---

# `openclaw onboard`

Incorporación interactiva para la configuración de Gateway local o remota.

## Guías relacionadas

- Centro de incorporación de la CLI: [Incorporación (CLI)](/en/start/wizard)
- Resumen de incorporación: [Resumen de incorporación](/en/start/onboarding-overview)
- Referencia de incorporación de la CLI: [Referencia de configuración de la CLI](/en/start/wizard-cli-reference)
- Automatización de la CLI: [Automatización de la CLI](/en/start/wizard-cli-automation)
- Incorporación en macOS: [Incorporación (Aplicación macOS)](/en/start/onboarding)

## Ejemplos

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

Para destinos `ws://` de red privada en texto sin formato (solo redes de confianza), establezca
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el entorno del proceso de integración.

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

`--custom-api-key` es opcional en el modo no interactivo. Si se omite, la integración comprueba `CUSTOM_API_KEY`.

Ollama no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` es `http://127.0.0.1:11434` de forma predeterminada. `--custom-model-id` es opcional; si se omite, la integración usa los valores predeterminados sugeridos por Ollama. Los IDs de modelos en la nube, como `kimi-k2.5:cloud`, también funcionan aquí.

Almacenar claves de proveedor como referencias en lugar de texto sin formato:

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Con `--secret-input-mode ref`, la integración escribe referencias respaldadas por variables de entorno en lugar de valores de clave en texto sin formato.
Para proveedores respaldados por perfiles de autenticación, esto escribe entradas de `keyRef`; para proveedores personalizados, esto escribe `models.providers.<id>.apiKey` como una referencia de entorno (por ejemplo, `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrato del modo no interactivo `ref`:

- Establezca la variable de entorno del proveedor en el entorno del proceso de integración (por ejemplo, `OPENAI_API_KEY`).
- No pase flags de clave en línea (por ejemplo, `--openai-api-key`) a menos que esa variable de entorno también esté establecida.
- Si se pasa un flag de clave en línea sin la variable de entorno requerida, la integración falla rápidamente con una guía.

Opciones de token de Gateway en modo no interactivo:

- `--gateway-auth token --gateway-token <token>` almacena un token en texto sin formato.
- `--gateway-auth token --gateway-token-ref-env <name>` almacena `gateway.auth.token` como un SecretRef de entorno.
- `--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.
- `--gateway-token-ref-env` requiere una variable de entorno no vacía en el entorno del proceso de integración.
- Con `--install-daemon`, cuando la autenticación por token requiere un token, los tokens de puerta de enlace administrados por SecretRef se validan pero no se persisten como texto sin resolver en los metadatos del entorno del servicio supervisor.
- Con `--install-daemon`, si el modo de token requiere un token y el SecretRef del token configurado no está resuelto, la integración falla de forma cerrada con orientación para la corrección.
- Con `--install-daemon`, si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, la integración bloquea la instalación hasta que el modo se establece explícitamente.
- La incorporación local escribe `gateway.mode="local"` en la configuración. Si un archivo de configuración posterior carece de `gateway.mode`, trátelo como un daño en la configuración o una edición manual incompleta, no como un acceso directo válido en modo local.
- `--allow-unconfigured` es una salida de emergencia separada del tiempo de ejecución de la puerta de enlace. No significa que la incorporación pueda omitir `gateway.mode`.

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

Estado de salud de la puerta de enlace local no interactiva:

- A menos que pases `--skip-health`, la incorporación esperará a que una puerta de enlace local sea accesible antes de salir con éxito.
- `--install-daemon` inicia primero la ruta de instalación de la puerta de enlace administrada. Sin ella, ya debes tener una puerta de enlace local ejecutándose, por ejemplo `openclaw gateway run`.
- Si solo deseas escrituras de configuración/espacio de trabajo/inicialización en la automatización, usa `--skip-health`.
- En Windows nativo, `--install-daemon` intenta primero las Tareas programadas y recurre a un elemento de inicio de sesión en la carpeta Inicio por usuario si se deniega la creación de la tarea.

Comportamiento de la incorporación interactiva con el modo de referencia:

- Elige **Usar referencia secreta** cuando se te solicite.
- Luego elige cualquiera:
  - Variable de entorno
  - Proveedor de secretos configurado (`file` o `exec`)
- La incorporación realiza una validación previa rápida antes de guardar la referencia.
  - Si la validación falla, la incorporación muestra el error y te permite reintentar.

Opciones de punto final de Z.AI no interactivas:

Nota: `--auth-choice zai-api-key` ahora detecta automáticamente el mejor punto de conexión de Z.AI para tu clave (prefiere la API general con `zai/glm-5.1`).
Si específicamente deseas los puntos de conexión del Plan de codificación GLM, elige `zai-coding-global` o `zai-coding-cn`.

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
- `manual`: indicaciones completas para puerto/vinculación/auth (alias de `advanced`).
- Cuando una elección de autenticación implica un proveedor preferido, la incorporación prefiltra los selectores de modelo predeterminado y lista de permitidos a ese proveedor. Para Volcengine y BytePlus, esto también coincide con las variantes del plan de codificación (`volcengine-plan/*`, `byteplus-plan/*`).
- Si el filtro de proveedor preferido aún no produce modelos cargados, la incorporación recurre al catálogo sin filtrar en lugar de dejar el selector vacío.
- En el paso de búsqueda web, algunos proveedores pueden activar indicaciones de seguimiento específicas del proveedor:
  - **Grok** puede ofrecer configuración opcional de `x_search` con el mismo `XAI_API_KEY` y una elección de modelo `x_search`.
  - **Kimi** puede solicitar la región de la API de Moonshot (`api.moonshot.ai` vs `api.moonshot.cn`) y el modelo de búsqueda web de Kimi predeterminado.
- Comportamiento del alcance de DM de incorporación local: [Referencia de configuración de CLI](/en/start/wizard-cli-reference#outputs-and-internals).
- Primera chat más rápida: `openclaw dashboard` (Interfaz de usuario de control, sin configuración de canal).
- Proveedor personalizado: conecte cualquier punto final compatible con OpenAI o Anthropic, incluidos los proveedores alojados no enumerados. Use Desconocido para detectar automáticamente.

## Comandos de seguimiento comunes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Use `--non-interactive` para scripts.</Note>
