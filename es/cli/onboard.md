---
summary: "Referencia de la CLI para `openclaw onboard` (incorporación interactiva)"
read_when:
  - Deseas una configuración guiada para gateway, workspace, auth, channels y skills
title: "onboard"
---

# `openclaw onboard`

Incorporación interactiva para la configuración de Gateway local o remota.

## Guías relacionadas

- Centro de incorporación de la CLI: [Onboarding (CLI)](/es/start/wizard)
- Descripción general de la incorporación: [Onboarding Overview](/es/start/onboarding-overview)
- Referencia de incorporación de la CLI: [CLI Setup Reference](/es/start/wizard-cli-reference)
- Automatización de la CLI: [CLI Automation](/es/start/wizard-cli-automation)
- Incorporación en macOS: [Onboarding (macOS App)](/es/start/onboarding)

## Ejemplos

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

Para objetivos `ws://` de red privada en texto plano (solo redes confiables), establece
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

Ollama no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` tiene como valor predeterminado `http://127.0.0.1:11434`. `--custom-model-id` es opcional; si se omite, la incorporación usa los valores predeterminados sugeridos por Ollama. Los ID de modelos en la nube, como `kimi-k2.5:cloud`, también funcionan aquí.

Almacenar claves de proveedor como referencias en lugar de texto sin formato:

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Con `--secret-input-mode ref`, la incorporación escribe referencias respaldadas por variables de entorno en lugar de valores de clave en texto plano.
Para proveedores respaldados por perfiles de autenticación, esto escribe entradas `keyRef`; para proveedores personalizados, esto escribe `models.providers.<id>.apiKey` como una referencia de entorno (por ejemplo, `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrato del modo `ref` no interactivo:

- Establezca la variable de entorno del proveedor en el entorno del proceso de incorporación (por ejemplo, `OPENAI_API_KEY`).
- No pase indicadores de clave en línea (por ejemplo, `--openai-api-key`) a menos que esa variable de entorno también esté establecida.
- Si se pasa un flag de clave en línea sin la variable de entorno requerida, la integración falla rápidamente con una guía.

Opciones de token de Gateway en modo no interactivo:

- `--gateway-auth token --gateway-token <token>` almacena un token en texto plano.
- `--gateway-auth token --gateway-token-ref-env <name>` almacena `gateway.auth.token` como una referencia secreta del entorno (SecretRef).
- `--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.
- `--gateway-token-ref-env` requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
- Con `--install-daemon`, cuando la autenticación por token requiere un token, los tokens de puerta de enlace gestionados por SecretRef se validan pero no se conservan como texto plano resuelto en los metadatos del entorno del servicio supervisor.
- Con `--install-daemon`, si el modo de token requiere un token y el SecretRef del token configurado no está resuelto, la integración falla cerrándose con orientación para la corrección.
- Con `--install-daemon`, si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, la integración bloquea la instalación hasta que el modo se establezca explícitamente.

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

- A menos que pases `--skip-health`, la integración espera a que haya una puerta de enlace local accesible antes de salir correctamente.
- `--install-daemon` inicia primero la ruta de instalación de la puerta de enlace gestionada. Sin él, ya debes tener una puerta de enlace local en ejecución, por ejemplo `openclaw gateway run`.
- Si solo quieres escrituras de config/workspace/bootstrap en automatización, usa `--skip-health`.
- En Windows nativo, `--install-daemon` intenta primero las Tareas Programadas y recurre a un elemento de inicio de sesión en la carpeta de Inicio por usuario si se deniega la creación de la tarea.

Comportamiento de la integración interactiva con el modo de referencia:

- Elige **Usar referencia secreta** cuando se te solicite.
- A continuación, elige una de las siguientes opciones:
  - Variable de entorno
  - Proveedor de secretos configurado (`file` o `exec`)
- La integración realiza una validación previa rápida antes de guardar la referencia.
  - Si la validación falla, la integración muestra el error y te permite reintentarlo.

Opciones de endpoint de Z.AI no interactivas:

Nota: `--auth-choice zai-api-key` ahora detecta automáticamente el mejor punto final de Z.AI para tu clave (prefiere la API general con `zai/glm-5`).
Si específicamente deseas los puntos finales del Plan de Codificación GLM, elige `zai-coding-global` o `zai-coding-cn`.

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

Notas sobre el flujo:

- `quickstart`: indicaciones mínimas, genera automáticamente un token de puerta de enlace.
- `manual`: indicaciones completas para puerto/bind/auth (alias de `advanced`).
- Comportamiento del ámbito DM de integración local: [Referencia de configuración de CLI](/es/start/wizard-cli-reference#outputs-and-internals).
- Primer chat más rápido: `openclaw dashboard` (UI de Control, sin configuración de canal).
- Proveedor personalizado: conecta cualquier punto final compatible con OpenAI o Anthropic,
  incluidos proveedores alojados no listados. Usa Desconocido para autodetectar.

## Comandos de seguimiento comunes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Usa `--non-interactive` para scripts.</Note>

import es from "/components/footer/es.mdx";

<es />
