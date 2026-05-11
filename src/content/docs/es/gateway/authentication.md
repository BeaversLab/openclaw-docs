---
summary: "Autenticación del modelo: OAuth, claves de API, reutilización de Claude CLI y token de configuración de Anthropic"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Autenticación"
---

<Note>Esta página es la referencia de autenticación del **proveedor de modelos** (claves de API, OAuth, reutilización de Claude CLI y token de configuración de Anthropic). Para la autenticación de la **conexión de puerta de enlace** (token, contraseña, proxy de confianza), consulte [Configuration](/es/gateway/configuration) y [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth).</Note>

OpenClaw admite OAuth y claves de API para proveedores de modelos. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser la opción más predecible. Los flujos de Suscripción/OAuth también son compatibles cuando coinciden con el modelo de cuenta de su proveedor.

Consulte [/concepts/oauth](/es/concepts/oauth) para obtener el flujo de OAuth completo y el diseño de almacenamiento.
Para la autenticación basada en SecretRef (proveedores `env`/`file`/`exec`), consulte [Secrets Management](/es/gateway/secrets).
Para las reglas de elegibilidad de credenciales/códigos de razón utilizadas por `models status --probe`, consulte
[Auth Credential Semantics](/es/auth-credential-semantics).

## Configuración recomendada (clave de API, cualquier proveedor)

Si está ejecutando una puerta de enlace de larga duración, comience con una clave de API para su proveedor elegido.
Específicamente para Anthropic, la autenticación con clave de API sigue siendo la configuración de servidor más predecible, pero OpenClaw también admite reutilizar un inicio de sesión local de Claude CLI.

1. Cree una clave de API en la consola de su proveedor.
2. Póngala en el **host de la puerta de enlace** (la máquina que ejecuta `openclaw gateway`).

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. Si la Puerta de enlace se ejecuta bajo systemd/launchd, prefiera poner la clave en
   `~/.openclaw/.env` para que el demonio pueda leerla:

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

Luego reinicie el demonio (o reinicie su proceso de puerta de enlace) y verifique nuevamente:

```bash
openclaw models status
openclaw doctor
```

Si prefiere no administrar las variables de entorno usted mismo, la incorporación puede almacenar
claves de API para el uso del demonio: `openclaw onboard`.

Consulte [Help](/es/help) para obtener detalles sobre la herencia de entorno (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic: Claude CLI y compatibilidad de tokens

La autenticación con token de configuración de Anthropic aún está disponible en OpenClaw como una ruta de token compatible. El personal de Anthropic nos ha informado desde entonces que el uso de Claude CLI al estilo OpenClaw está
permitido nuevamente, por lo que OpenClaw trata la reutilización de Claude CLI y el uso de `claude -p` como
aprobados para esta integración, a menos que Anthropic publique una nueva política. Cuando
la reutilización de Claude CLI está disponible en el host, esa es ahora la ruta preferida.

Para hosts de puerta de enlace de larga duración, una clave de API de Anthropic sigue siendo la opción más predecible. Si desea reutilizar un inicio de sesión de Claude existente en el mismo host, utilice la ruta de la CLI de Claude de Anthropic en onboarding/configure.

Configuración recomendada del host para reutilizar la CLI de Claude:

```bash
# Run on the gateway host
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Esta es una configuración de dos pasos:

1. Inicie sesión en Claude Code en Anthropic en el host de la puerta de enlace.
2. Indique a OpenClaw que cambie la selección del modelo de Anthropic al backend local `claude-cli`
   y almacene el perfil de autenticación de OpenClaw correspondiente.

Si `claude` no está en `PATH`, instale primero Claude Code o establezca
`agents.defaults.cliBackends.claude-cli.command` en la ruta real del binario.

Entrada manual de token (cualquier proveedor; escribe `auth-profiles.json` + actualiza la configuración):

```bash
openclaw models auth paste-token --provider openrouter
```

Las referencias de perfil de autenticación también son compatibles con credenciales estáticas:

- Las credenciales `api_key` pueden usar `keyRef: { source, provider, id }`
- Las credenciales `token` pueden usar `tokenRef: { source, provider, id }`
- Los perfiles en modo OAuth no admiten credenciales SecretRef; si `auth.profiles.<id>.mode` está establecido en `"oauth"`, la entrada `keyRef`/`tokenRef` respaldada por SecretRef para ese perfil se rechaza.

Verificación compatible con automatización (sale con `1` cuando ha caducado/falta, `2` cuando está por caducar):

```bash
openclaw models status --check
```

Sondas de autenticación en vivo:

```bash
openclaw models status --probe
```

Notas:

- Las filas de sondas pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
- Si un `auth.order.<provider>` explícito omite un perfil almacenado, la sonda informa
  `excluded_by_auth_order` para ese perfil en lugar de intentarlo.
- Si existe autenticación pero OpenClaw no puede resolver un candidato de modelo sondeable para
  ese proveedor, la sonda informa `status: no_model`.
- Los tiempos de espera por límite de velocidad pueden estar limitados al modelo. Un perfil enfriándose por un
  modelo todavía puede ser utilizable para un modelo hermano en el mismo proveedor.

Los scripts de operaciones opcionales (systemd/Termux) están documentados aquí:
[Scripts de monitoreo de autenticación](/es/help/scripts#auth-monitoring-scripts)

## Nota de Anthropic

El backend de Anthropic `claude-cli` vuelve a ser compatible.

- El personal de Anthropic nos informó que esta ruta de integración de OpenClaw vuelve a estar permitida.
- Por lo tanto, OpenClaw trata el reuso de Claude CLI y el uso de `claude -p` como autorizados
  para las ejecuciones respaldadas por Anthropic, a menos que Anthropic publique una nueva política.
- Las claves de API de Anthropic siguen siendo la opción más predecible para los hosts de puerta de enlace
  de larga duración y el control explícito de la facturación del lado del servidor.

## Verificar el estado de autenticación del modelo

```bash
openclaw models status
openclaw doctor
```

## Comportamiento de la rotación de claves de API (puerta de enlace)

Algunos proveedores admiten reintentar una solicitud con claves alternativas cuando una llamada a la API
alcanza un límite de velocidad del proveedor.

- Orden de prioridad:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (única anulación)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Los proveedores de Google también incluyen `GOOGLE_API_KEY` como alternativa adicional.
- La misma lista de claves se deduplica antes de su uso.
- OpenClaw reintentos con la siguiente clave solo para errores de límite de velocidad (por ejemplo
  `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`, o
  `workers_ai ... quota limit exceeded`).
- Los errores que no son de límite de velocidad no se reintentan con claves alternativas.
- Si fallan todas las claves, se devuelve el error final del último intento.

## Controlar qué credencial se utiliza

### Por sesión (comando de chat)

Use `/model <alias-or-id>@<profileId>` para anclar una credencial de proveedor específica para la sesión actual (ids de perfil de ejemplo: `anthropic:default`, `anthropic:work`).

Use `/model` (o `/model list`) para un selector compacto; use `/model status` para la vista completa (candidatos + siguiente perfil de autenticación, más detalles del endpoint del proveedor cuando esté configurado).

### Por agente (anulación de CLI)

Establezca una anulación explícita del orden del perfil de autenticación para un agente (almacenado en el `auth-state.json` de ese agente):

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Use `--agent <id>` para apuntar a un agente específico; omítalo para usar el agente predeterminado configurado.
Cuando depure problemas de orden, `openclaw models status --probe` muestra los
perfiles almacenados omitidos como `excluded_by_auth_order` en lugar de omitirlos silenciosamente.
Cuando depure problemas de tiempo de espera, recuerde que los tiempos de espera de límites de tasa pueden estar vinculados
a un id de modelo en lugar de al perfil completo del proveedor.

## Solución de problemas

### "No se encontraron credenciales"

Si falta el perfil de Anthropic, configure una clave de API de Anthropic en el
**host de puerta de enlace** o configure la ruta del token de configuración de Anthropic y luego vuelva a verificar:

```bash
openclaw models status
```

### Token caducando/caducado

Ejecute `openclaw models status` para confirmar qué perfil está caducando. Si un
perfil de token de Anthropic falta o ha caducado, actualice esa configuración a través del
token de configuración o migre a una clave de API de Anthropic.

## Relacionado

- [Gestión de secretos](/es/gateway/secrets)
- [Acceso remoto](/es/gateway/remote)
- [Almacenamiento de autenticación](/es/concepts/oauth)
