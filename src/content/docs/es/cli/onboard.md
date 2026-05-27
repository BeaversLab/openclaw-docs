---
summary: "Referencia de CLI para `openclaw onboard` (incorporación interactiva)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "Incorporación"
---

# `openclaw onboard`

Incorporación guiada completa para la configuración local o remota de Gateway. Úselo cuando desee que OpenClaw recorra la autenticación del modelo, el espacio de trabajo, la puerta de enlace, los canales, las habilidades y el estado en un solo flujo.

## Guías relacionadas

<CardGroup cols={2}>
  <Card title="Centro de incorporación de la CLI" href="/es/start/wizard" icon="rocket">
    Recorrido del flujo interactivo de la CLI.
  </Card>
  <Card title="Descripción general de la incorporación" href="/es/start/onboarding-overview" icon="map">
    Cómo se integra la incorporación de OpenClaw.
  </Card>
  <Card title="Referencia de configuración de la CLI" href="/es/start/wizard-cli-reference" icon="book">
    Resultados, funcionamiento interno y comportamiento por paso.
  </Card>
  <Card title="Automatización de la CLI" href="/es/start/wizard-cli-automation" icon="terminal">
    Opciones no interactivas y configuraciones con scripts.
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

`--flow import` utiliza proveedores de migración propiedad de complementos como Hermes. Solo se ejecuta en una configuración nueva de OpenClaw; si existe una configuración, credenciales, sesiones o archivos de memoria/identidad del espacio de trabajo, restablezca o elija una configuración nueva antes de importar.

`--modern` inicia la vista previa de la incorporación conversacional de Crestodian. Sin
`--modern`, `openclaw onboard` mantiene el flujo de incorporación clásico.

En una instalación nueva donde falta el archivo de configuración activo o no tiene configuraciones creadas (vacío o solo metadatos), `openclaw` desnudo también inicia el flujo de incorporación clásico. Una vez que un archivo de configuración tiene configuraciones creadas, `openclaw` desnudo abre Crestodian en su lugar.

Se acepta `ws://` en texto sin formato para bucle de retorno, literales de IP privada, `.local` y URL de puerta de enlace de Tailnet `*.ts.net`. Para otros nombres de DNS privados de confianza, configure `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el entorno del proceso de incorporación.

## Configuración regional

La incorporación interactiva utiliza la configuración regional del asistente de CLI para el texto fijo de configuración. El orden de resolución es:

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. Respaldo en inglés

Las configuraciones regionales del asistente compatibles son `en`, `zh-CN` y `zh-TW`. Los valores de configuración regional pueden usar formas de sufijo de guion bajo o POSIX como `zh_CN.UTF-8`. Los nombres de productos, nombres de comandos, claves de configuración, URL, ID de proveedores, ID de modelos y etiquetas de complementos/canales permanecen literales.

Ejemplo:

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

Proveedor personalizado no interactivo:

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

`--custom-api-key` es opcional en modo no interactivo. Si se omite, la incorporación verifica `CUSTOM_API_KEY`. OpenClaw marca automáticamente los ID de modelos de visión comunes como capaces de procesar imágenes. Pase `--custom-image-input` para ID de visión personalizados desconocidos, o `--custom-text-input` para forzar metadatos de solo texto.

LM Studio también admite una clave de indicador específica del proveedor en modo no interactivo:

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

`--custom-base-url` tiene como valor predeterminado `http://127.0.0.1:11434`. `--custom-model-id` es opcional; si se omite, la incorporación utiliza los valores predeterminados sugeridos por Ollama. Los ID de modelos en la nube, como `kimi-k2.5:cloud`, también funcionan aquí.

Almacenar las claves del proveedor como referencias en lugar de texto sin formato:

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

Con `--secret-input-mode ref`, la incorporación escribe referencias respaldadas por env en lugar de valores de clave en texto plano.
Para proveedores respaldados por auth-profile esto escribe entradas `keyRef`; para proveedores personalizados esto escribe `models.providers.<id>.apiKey` como una referencia de env (por ejemplo `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`).

Contrato del modo `ref` no interactivo:

- Establezca la variable de env del proveedor en el entorno del proceso de incorporación (por ejemplo `OPENAI_API_KEY`).
- No pase flags de clave en línea (por ejemplo `--openai-api-key`) a menos que esa variable de env también esté establecida.
- Si se pasa un flag de clave en línea sin la variable de env requerida, la incorporación falla rápidamente con orientación.

Opciones de token de Gateway en modo no interactivo:

- `--gateway-auth token --gateway-token <token>` almacena un token en texto plano.
- `--gateway-auth token --gateway-token-ref-env <name>` almacena `gateway.auth.token` como un SecretRef de env.
- `--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.
- `--gateway-token-ref-env` requiere una variable de env no vacía en el entorno del proceso de incorporación.
- Con `--install-daemon`, cuando la autenticación de token requiere un token, los tokens de Gateway gestionados por SecretRef se validan pero no se persisten como texto plano resuelto en los metadatos del entorno del servicio supervisor.
- Con `--install-daemon`, si el modo de token requiere un token y el token SecretRef configurado no está resuelto, la incorporación falla cerrándose con orientación de corrección.
- Con `--install-daemon`, si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la incorporación bloquea la instalación hasta que el modo se establezca explícitamente.
- La incorporación local escribe `gateway.mode="local"` en la configuración. Si un archivo de configuración posterior carece de `gateway.mode`, trátese como daño de configuración o una edición manual incompleta, no como un acceso directo válido en modo local.
- La incorporación local instala los complementos descargables seleccionados cuando la ruta de configuración elegida los requiere.
- La incorporación remota solo escribe información de conexión para la Gateway remota y no instala paquetes de complementos locales.
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

- A menos que pases `--skip-health`, la incorporación espera una puerta de enlace local accesible antes de salir correctamente.
- `--install-daemon` inicia primero la ruta de instalación de la puerta de enlace administrada. Sin ella, ya debes tener una puerta de enlace local ejecutándose, por ejemplo `openclaw gateway run`.
- Si solo quieres escrituras de configuración/espacio de trabajo/inicialización en automatización, usa `--skip-health`.
- Si gestionas los archivos del espacio de trabajo tú mismo, pasa `--skip-bootstrap` para establecer `agents.defaults.skipBootstrap: true` y omitir la creación de `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` y `BOOTSTRAP.md`.
- En Windows nativo, `--install-daemon` intenta primero las Tareas Programadas y recurra a un elemento de inicio de sesión en la carpeta de Inicio por usuario si se deniega la creación de la tarea.

Comportamiento de incorporación interactiva con el modo de referencia:

- Elige **Usar referencia secreta** cuando se te solicite.
- Luego elige entre:
  - Variable de entorno
  - Proveedor de secretos configurado (`file` o `exec`)
- La incorporación realiza una validación previa rápida antes de guardar la referencia.
  - Si la validación falla, la incorporación muestra el error y te permite reintentar.

### Elecciones de endpoint Z.AI no interactivas

<Note>`--auth-choice zai-api-key` detecta automáticamente el mejor endpoint de Z.AI para tu clave (prefiere la API general con `zai/glm-5.1`). Si deseas específicamente los endpoints del Plan de Codificación GLM, elige `zai-coding-global` o `zai-coding-cn`.</Note>

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
    - `quickstart`: preguntas mínimas, genera automáticamente un token de gateway.
    - `manual`: preguntas completas para puerto, vinculación y autenticación (alias de `advanced`).
    - `import`: ejecuta un proveedor de migración detectado, previsualiza el plan y luego lo aplica después de la confirmación.

  </Accordion>
  <Accordion title="Prefiltrado de proveedores">
    Cuando una elección de autenticación implica un proveedor preferido, la incorporación prefiltra los selectores de modelo predeterminado y lista de permitidos para ese proveedor. Para Volcengine y BytePlus, esto también coincide con las variantes del plan de codificación (`volcengine-plan/*`, `byteplus-plan/*`).

    Si el filtro de proveedor preferido aún no arroja modelos cargados, la incorporación vuelve al catálogo sin filtrar en lugar de dejar el selector vacío.

  </Accordion>
  <Accordion title="Seguimientos de búsqueda web">
    Algunos proveedores de búsqueda web activan indicadores de seguimiento específicos del proveedor:

    - **Grok** puede ofrecer una configuración opcional de `x_search` con el mismo perfil OAuth o clave API de xAI y una elección de modelo `x_search`.
    - **Kimi** puede solicitar la región de la API de Moonshot (`api.moonshot.ai` frente a `api.moonshot.cn`) y el modelo de búsqueda web predeterminado de Kimi.

  </Accordion>
  <Accordion title="Otros comportamientos">
    - Comportamiento del alcance DM de incorporación local: [referencia de configuración de CLI](/es/start/wizard-cli-reference#outputs-and-internals).
    - Primer chat más rápido: `openclaw dashboard` (Control UI, sin configuración de canal).
    - Proveedor personalizado: conecte cualquier punto final compatible con OpenAI o Anthropic, incluidos los proveedores alojados no listados. Use Unknown para detectar automáticamente.
    - Si se detecta el estado de Hermes, la incorporación ofrece un flujo de migración. Use [Migrate](/es/cli/migrate) para planes de ejecución en seco, modo de sobrescritura, informes y asignaciones exactas.

  </Accordion>
</AccordionGroup>

## Comandos de seguimiento comunes

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

Use `openclaw setup` en su lugar cuando solo necesite la configuración/espacio de trabajo base. Use `openclaw configure` más tarde para cambios específicos y `openclaw channels add` para una configuración solo de canal.

<Note>`--json` no implica el modo no interactivo. Use `--non-interactive` para scripts.</Note>
