---
summary: "Referencia de la CLI para `openclaw onboard` (incorporación interactiva)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "Incorporación"
---

# `openclaw onboard`

Incorporación interactiva para la configuración de Gateway local o remota.

## Guías relacionadas

<CardGroup cols={2}>
  <Card title="Centro de incorporación de la CLI" href="/es/start/wizard" icon="rocket">
    Recorrido del flujo interactivo de la CLI.
  </Card>
  <Card title="Descripción general de la incorporación" href="/es/start/onboarding-overview" icon="map">
    Cómo se integra la incorporación de OpenClaw.
  </Card>
  <Card title="Referencia de configuración de la CLI" href="/es/start/wizard-cli-reference" icon="book">
    Salidas, aspectos internos y comportamiento por paso.
  </Card>
  <Card title="Automatización de la CLI" href="/es/start/wizard-cli-automation" icon="terminal">
    Opciones no interactivas y configuraciones con secuencias de comandos.
  </Card>
  <Card title="Incorporación de la aplicación de macOS" href="/es/start/onboarding" icon="apple">
    Flujo de incorporación para la aplicación de la barra de menús de macOS.
  </Card>
</CardGroup>

## Ejemplos

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import` utiliza proveedores de migración propiedad del complemento, como Hermes. Solo se ejecuta en una configuración nueva de OpenClaw; si existen configuraciones, credenciales, sesiones o archivos de memoria/identidad del espacio de trabajo, restablezca o elija una configuración nueva antes de importar.

`--modern` inicia la vista previa de incorporación conversacional de Crestodian. Sin
`--modern`, `openclaw onboard` mantiene el flujo de incorporación clásico.

Para destinos `ws://` de red privada en texto plano (solo redes de confianza), configure
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el entorno del proceso de incorporación.
No hay equivalente de `openclaw.json` para este transporte del lado del cliente
de emergencia.

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

`--custom-api-key` es opcional en el modo no interactivo. Si se omite, la integración verifica `CUSTOM_API_KEY`.

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

`--custom-base-url` por defecto es `http://127.0.0.1:11434`. `--custom-model-id` es opcional; si se omite, la integración utiliza los valores predeterminados sugeridos por Ollama. Los ID de modelos en la nube, como `kimi-k2.5:cloud`, también funcionan aquí.

Almacene las claves del proveedor como referencias en lugar de texto sin formato:

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Con `--secret-input-mode ref`, la integración escribe referencias respaldadas por variables de entorno en lugar de valores de clave en texto sin formato.
Para los proveedores respaldados por perfiles de autenticación, esto escribe entradas `keyRef`; para proveedores personalizados, esto escribe `models.providers.<id>.apiKey` como una referencia de entorno (por ejemplo, `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrato del modo no interactivo `ref`:

- Establezca la variable de entorno del proveedor en el entorno del proceso de integración (por ejemplo, `OPENAI_API_KEY`).
- No pase marcas de clave en línea (por ejemplo, `--openai-api-key`) a menos que esa variable de entorno también esté establecida.
- Si se pasa una marca de clave en línea sin la variable de entorno requerida, la integración falla rápidamente con orientación.

Opciones de token de Gateway en modo no interactivo:

- `--gateway-auth token --gateway-token <token>` almacena un token en texto sin formato.
- `--gateway-auth token --gateway-token-ref-env <name>` almacena `gateway.auth.token` como un SecretRef de entorno.
- `--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.
- `--gateway-token-ref-env` requiere una variable de entorno no vacía en el entorno del proceso de integración.
- Con `--install-daemon`, cuando la autenticación de token requiere un token, los tokens de puerta de enlace administrados por SecretRef se validan pero no se conservan como texto sin formato resuelto en los metadatos del entorno del servicio supervisor.
- Con `--install-daemon`, si el modo de token requiere un token y el SecretRef del token configurado no está resuelto, la integración falla de forma cerrada con orientación de corrección.
- Con `--install-daemon`, si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la integración bloquea la instalación hasta que el modo se establece explícitamente.
- La incorporación local escribe `gateway.mode="local"` en la configuración. Si un archivo de configuración posterior carece de `gateway.mode`, trátelo como un daño en la configuración o una edición manual incompleta, no como un atajo válido en modo local.
- `--allow-unconfigured` es una vía de escape de tiempo de ejecución de puerta de enlace separada. No significa que la incorporación pueda omitir `gateway.mode`.

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

- A menos que pase `--skip-health`, la incorporación espera a que una puerta de enlace local sea accesible antes de salir con éxito.
- `--install-daemon` inicia primero la ruta de instalación de la puerta de enlace administrada. Sin ella, ya debe tener una puerta de enlace local en ejecución, por ejemplo `openclaw gateway run`.
- Si solo desea escrituras de configuración/espacio de trabajo/inicialización en automatización, use `--skip-health`.
- Si gestiona los archivos del espacio de trabajo usted mismo, pase `--skip-bootstrap` para establecer `agents.defaults.skipBootstrap: true` y omitir la creación de `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` y `BOOTSTRAP.md`.
- En Windows nativo, `--install-daemon` intenta primero las Tareas programadas y recurre a un elemento de inicio de sesión de carpeta de Inicio por usuario si se deniega la creación de la tarea.

Comportamiento de la incorporación interactiva con modo de referencia:

- Elija **Usar referencia secreta** cuando se le solicite.
- Luego elija cualquiera:
  - Variable de entorno
  - Proveedor de secretos configurado (`file` o `exec`)
- La incorporación realiza una validación previa rápida antes de guardar la referencia.
  - Si la validación falla, la incorporación muestra el error y le permite reintentar.

### Elecciones de punto final de Z.AI no interactivas

<Note>`--auth-choice zai-api-key` detecta automáticamente el mejor punto final de Z.AI para su clave (prefiere la API general con `zai/glm-5.1`). Si específicamente desea los puntos finales del Plan de Codificación GLM, elija `zai-coding-global` o `zai-coding-cn`.</Note>

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

## Notas de flujo

<AccordionGroup>
  <Accordion title="Tipos de flujo">
    - `quickstart`: indicaciones mínimas, genera automáticamente un token de puerta de enlace.
    - `manual`: indicaciones completas para puerto, enlace y autenticación (alias de `advanced`).
    - `import`: ejecuta un proveedor de migración detectado, previsualiza el plan y luego lo aplica después de la confirmación.
  </Accordion>
  <Accordion title="Prefiltrado del proveedor">
    Cuando una elección de autenticación implica un proveedor preferido, el proceso de incorporación prefiltra los selectores de modelo predeterminado y lista de permitidos (allowlist) para ese proveedor. Para Volcengine y BytePlus, esto también coincide con las variantes del plan de codificación (`volcengine-plan/*`, `byteplus-plan/*`).

    Si el filtro del proveedor preferido aún no arroja modelos cargados, el proceso de incorporación vuelve al catálogo sin filtrar en lugar de dejar el selector vacío.

  </Accordion>
  <Accordion title="Consultas de seguimiento de búsqueda web">
    Algunos proveedores de búsqueda web activan indicaciones de seguimiento específicas del proveedor:

    - **Grok** puede ofrecer una configuración opcional de `x_search` con el mismo `XAI_API_KEY` y una elección de modelo `x_search`.
    - **Kimi** puede pedir la región de la API de Moonshot (`api.moonshot.ai` vs `api.moonshot.cn`) y el modelo de búsqueda web de Kimi predeterminado.

  </Accordion>
  <Accordion title="Otros comportamientos">
    - Comportamiento del alcance de DM en la incorporación local: [referencia de configuración de CLI](/es/start/wizard-cli-reference#outputs-and-internals).
    - Primer chat más rápido: `openclaw dashboard` (Interfaz de usuario de control, sin configuración de canal).
    - Proveedor personalizado: conecte cualquier punto de conexión compatible con OpenAI o Anthropic, incluidos los proveedores alojados que no están en la lista. Use Desconocido (Unknown) para detectar automáticamente.
    - Si se detecta el estado de Hermes, el proceso de incorporación ofrece un flujo de migración. Use [Migrar](/es/cli/migrate) para planes de simulación (dry-run), modo de sobrescritura, informes y asignaciones exactas.
  </Accordion>
</AccordionGroup>

## Comandos de seguimiento comunes

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Use `--non-interactive` para scripts.</Note>
