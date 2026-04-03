---
summary: "Autenticación de modelos: OAuth, claves API y tokens de configuración"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Autenticación"
---

# Autenticación (Proveedores de Modelos)

<Note>Esta página cubre la autenticación del **proveedor de modelos** (claves API, OAuth, tokens de configuración). Para la autenticación de la **conexión de puerta de enlace** (token, contraseña, proxy confiable), consulte [Configuración](/en/gateway/configuration) y [Autenticación de Proxy Confiable](/en/gateway/trusted-proxy-auth).</Note>

OpenClaw es compatible con OAuth y claves API para proveedores de modelos. Para hosts de puerta de enlace siempre activos, las claves API suelen ser la opción más predecible. Los flujos de suscripción/OAuth también son compatibles cuando coinciden con el modelo de cuenta de su proveedor.

Consulte [/concepts/oauth](/en/concepts/oauth) para conocer el flujo completo de OAuth y el diseño de almacenamiento.
Para la autenticación basada en SecretRef (proveedores `env`/`file`/`exec`), consulte [Gestión de Secretos](/en/gateway/secrets).
Para las reglas de elegibilidad de credenciales/códigos de motivo utilizadas por `models status --probe`, consulte
[Semántica de Credenciales de Autenticación](/en/auth-credential-semantics).

## Configuración recomendada (clave API, cualquier proveedor)

Si está ejecutando una puerta de enlace de larga duración, comience con una clave API para su proveedor elegido.
Específicamente para Anthropic, la autenticación con clave API es la ruta segura y se recomienda
sobre la autenticación con token de configuración de suscripción.

1. Cree una clave API en la consola de su proveedor.
2. Colóquela en el **host de la puerta de enlace** (la máquina que ejecuta `openclaw gateway`).

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

Luego reinicie el demonio (o reinicie su proceso de Puerta de enlace) y verifique nuevamente:

```bash
openclaw models status
openclaw doctor
```

Si prefiere no administrar las variables de entorno usted mismo, la incorporación puede almacenar
claves API para uso del demonio: `openclaw onboard`.

Consulte [Ayuda](/en/help) para obtener detalles sobre la herencia de entorno (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic: token de configuración (autenticación de suscripción)

Si está utilizando una suscripción a Claude, se admite el flujo de token de configuración. Ejecute
en el **host de la puerta de enlace**:

```bash
claude setup-token
```

Luego péguelo en OpenClaw:

```bash
openclaw models auth setup-token --provider anthropic
```

Si el token se creó en otra máquina, péguelo manualmente:

```bash
openclaw models auth paste-token --provider anthropic
```

Si ve un error de Anthropic como:

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…use una clave de API de Anthropic en su lugar.

<Warning>El soporte para setup-token de Anthropic es solo una compatibilidad técnica. Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado. Úselo solo si decide que el riesgo de la política es aceptable y verifique los términos actuales de Anthropic usted mismo.</Warning>

Entrada manual de token (cualquier proveedor; escribe `auth-profiles.json` + actualiza la configuración):

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

Las referencias de perfil de autenticación también son compatibles con credenciales estáticas:

- Las credenciales `api_key` pueden usar `keyRef: { source, provider, id }`
- Las credenciales `token` pueden usar `tokenRef: { source, provider, id }`
- Los perfiles en modo OAuth no admiten credenciales SecretRef; si `auth.profiles.<id>.mode` está establecido en `"oauth"`, la entrada de `keyRef`/`tokenRef` respaldada por SecretRef para ese perfil se rechaza.

Verificación apta para automatización (sale `1` cuando caduca/falta, `2` cuando está por caducar):

```bash
openclaw models status --check
```

Los scripts de operaciones opcionales (systemd/Termux) están documentados aquí:
[/automation/auth-monitoring](/en/automation/auth-monitoring)

> `claude setup-token` requiere un TTY interactivo.

## Anthropic: migración de Claude CLI

Si Claude CLI ya está instalado y ha iniciado sesión en el host de la puerta de enlace, puede
cambiar una configuración existente de Anthropic al backend de CLI en lugar de pegar un
setup-token:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Esto mantiene sus perfiles de autenticación de Anthropic existentes para revertir, pero cambia la
selección de modelo predeterminada a `claude-cli/...` y agrega entradas de lista de permitidos
coincidentes de Claude CLI bajo `agents.defaults.models`.

Acceso directo de incorporación:

```bash
openclaw onboard --auth-choice anthropic-cli
```

## Verificación del estado de autenticación del modelo

```bash
openclaw models status
openclaw doctor
```

## Comportamiento de rotación de claves de API (puerta de enlace)

Algunos proveedores admiten reintentar una solicitud con claves alternativas cuando una llamada a la API
alcanza un límite de velocidad del proveedor.

- Orden de prioridad:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (única anulación)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Los proveedores de Google también incluyen `GOOGLE_API_KEY` como respaldo adicional.
- La misma lista de claves se deduplica antes de su uso.
- OpenClaw reintenta con la siguiente clave solo para errores de límite de velocidad (por ejemplo
  `429`, `rate_limit`, `quota`, `resource exhausted`).
- Los errores que no son de límite de velocidad no se reintentan con claves alternativas.
- Si fallan todas las claves, se devuelve el error final del último intento.

## Controlar qué credencial se utiliza

### Por sesión (comando de chat)

Use `/model <alias-or-id>@<profileId>` para fijar una credencial de proveedor específica para la sesión actual (ids de perfil de ejemplo: `anthropic:default`, `anthropic:work`).

Use `/model` (o `/model list`) para un selector compacto; use `/model status` para la vista completa (candidatos + siguiente perfil de autenticación, más detalles del punto de conexión del proveedor cuando esté configurado).

### Por agente (anulación de CLI)

Establezca una anulación explícita del orden del perfil de autenticación para un agente (almacenado en `auth-profiles.json` de ese agente):

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Use `--agent <id>` para apuntar a un agente específico; omítalo para usar el agente predeterminado configurado.

## Solución de problemas

### "No se encontraron credenciales"

Si falta el perfil de token de Anthropic, ejecute `claude setup-token` en el
**host de la puerta de enlace** y luego vuelva a verificar:

```bash
openclaw models status
```

### Token caducando/caducado

Ejecute `openclaw models status` para confirmar qué perfil está caducando. Si falta el perfil,
vuelva a ejecutar `claude setup-token` y pegue el token nuevamente.

## Requisitos

- Cuenta de suscripción de Anthropic (para `claude setup-token`)
- CLI de Claude Code instalada (comando `claude` disponible)
