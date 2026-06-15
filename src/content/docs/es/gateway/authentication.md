---
summary: "Autenticación de modelo: OAuth, claves de API, reutilización de Claude CLI y token de configuración de Anthropic"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "Autenticación"
---

<Note>
  Esta página es la referencia de autenticación del **proveedor de modelo** (claves de API, OAuth, reutilización de Claude CLI y token de configuración de Anthropic). Para la autenticación de **conexión de puerta de enlace** (token, contraseña, proxy de confianza), consulte [Configuración](/es/gateway/configuration) y [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth).
</Note>

OpenClaw admite OAuth y claves de API para proveedores de modelos. Para hosts de puerta de enlace siempre activos, las claves de API suelen ser la opción más predecible. Los flujos de Suscripción/OAuth también son compatibles cuando coinciden con el modelo de cuenta de su proveedor.

Consulte [/concepts/oauth](/es/concepts/oauth) para obtener el flujo de OAuth completo y el diseño de almacenamiento.
Para la autenticación basada en SecretRef (proveedores `env`/`file`/`exec`), consulte [Gestión de secretos](/es/gateway/secrets).
Para las reglas de elegibilidad de credenciales/códigos de motivo utilizadas por `models status --probe`, consulte
[Semántica de credenciales de autenticación](/es/auth-credential-semantics).

## Configuración recomendada (clave de API, cualquier proveedor)

Si está ejecutando una puerta de enlace de larga duración, comience con una clave de API para su proveedor elegido.
Específicamente para Anthropic, la autenticación con clave de API sigue siendo la configuración de servidor más predecible, pero OpenClaw también admite reutilizar un inicio de sesión local de Claude CLI.

1. Cree una clave de API en la consola de su proveedor.
2. Póngalo en el **host de la puerta de enlace** (la máquina que ejecuta `openclaw gateway`).

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
claves de API para uso del demonio: `openclaw onboard`.

Consulte [Ayuda](/es/help) para obtener detalles sobre la herencia de entorno (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## Anthropic: Claude CLI y compatibilidad de tokens

La autenticación con token de configuración de Anthropic todavía está disponible en OpenClaw como una ruta de token compatible. El personal de Anthropic nos ha informado que el uso de Claude CLI al estilo de OpenClaw está
permitido nuevamente, por lo que OpenClaw trata la reutilización de Claude CLI y el uso de `claude -p` como
autorizados para esta integración, a menos que Anthropic publique una nueva política. Cuando
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
2. Indique a OpenClaw que cambie la selección del modelo Anthropic al backend `claude-cli`
   local y almacene el perfil de autenticación de OpenClaw coincidente.

Si `claude` no está en `PATH`, instale Claude Code primero o establezca
`agents.defaults.cliBackends.claude-cli.command` en la ruta binaria real.

Entrada manual de token (cualquier proveedor; escribe `auth-profiles.json` + actualiza la configuración):

```bash
openclaw models auth paste-token --provider openrouter
```

`auth-profiles.json` almacena solo las credenciales. La forma canónica es:

```json
{
  "version": 1,
  "profiles": {
    "openrouter:default": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "OPENROUTER_API_KEY"
    }
  }
}
```

OpenClaw espera la forma canónica `version` + `profiles` en tiempo de ejecución. Si una instalación antigua todavía tiene un archivo plano como `{ "openrouter": { "apiKey": "..." } }`, ejecute `openclaw doctor --fix` para reescribirlo como un perfil de clave de API `openrouter:default`; doctor mantiene una copia `.legacy-flat.*.bak` junto al original. Los detalles del endpoint, como `baseUrl`, `api`, ids de modelo, encabezados y tiempos de espera, pertenecen debajo de `models.providers.<id>` en `openclaw.json` o `models.json`, no en `auth-profiles.json`.

Las rutas de autenticación externas como Bedrock `auth: "aws-sdk"` tampoco son credenciales. Si desea una ruta con nombre de Bedrock, ponga `auth.profiles.<id>.mode: "aws-sdk"` en `openclaw.json`; no escriba `type: "aws-sdk"` en `auth-profiles.json`. `openclaw doctor --fix` mueve los marcadores heredados del AWS SDK del almacén de credenciales a los metadatos de configuración.

Las referencias de perfil de autenticación también son compatibles con credenciales estáticas:

- Las credenciales `api_key` pueden usar `keyRef: { source, provider, id }`
- Las credenciales `token` pueden usar `tokenRef: { source, provider, id }`
- Los perfiles en modo OAuth no admiten credenciales SecretRef; si `auth.profiles.<id>.mode` está configurado en `"oauth"`, la entrada `keyRef`/`tokenRef` respaldada por SecretRef para ese perfil se rechaza.

Verificación amigable para automatización (salida `1` cuando caduca/falta, `2` cuando está por caducar):

```bash
openclaw models status --check
```

Sondas de autenticación en vivo:

```bash
openclaw models status --probe
```

Notas:

- Las filas de prueba pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
- Si un `auth.order.<provider>` explícito omite un perfil almacenado, la prueba informa
  `excluded_by_auth_order` para ese perfil en lugar de intentarlo.
- Si existe autenticación pero OpenClaw no puede resolver un candidato de modelo comprobable para
  ese proveedor, la prueba informa `status: no_model`.
- Los períodos de enfriamiento por límites de tasa pueden estar limitados al modelo. Un perfil en enfriamiento por un
  modelo todavía puede ser utilizable para un modelo hermano en el mismo proveedor.

Los scripts de operaciones opcionales (systemd/Termux) están documentados aquí:
[Auth monitoring scripts](/es/help/scripts#auth-monitoring-scripts)

## Nota de Anthropic

El backend `claude-cli` de Anthropic vuelve a ser compatible.

- El personal de Anthropic nos informó que esta ruta de integración de OpenClaw está permitida nuevamente.
- Por lo tanto, OpenClaw trata el reuso de Claude CLI y el uso de `claude -p` como aprobados
  para ejecuciones respaldadas por Anthropic, a menos que Anthropic publique una nueva política.
- Las claves de API de Anthropic siguen siendo la opción más predecible para hosts de puerta de enlace
  de larga duración y control de facturación explícito del lado del servidor.

## Verificar el estado de autenticación del modelo

```bash
openclaw models status
openclaw doctor
```

## Comportamiento de rotación de claves de API (puerta de enlace)

Algunos proveedores admiten reintentar una solicitud con claves alternativas cuando una llamada a la API
alcanza un límite de tasa del proveedor.

- Orden de prioridad:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (única anulación)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Los proveedores de Google también incluyen `GOOGLE_API_KEY` como alternativa adicional.
- La misma lista de claves se deduplica antes de su uso.
- OpenClaw reintentará con la siguiente clave solo para errores de límite de velocidad (por ejemplo
  `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`, o
  `workers_ai ... quota limit exceeded`).
- Los errores que no sean de límite de tasa no se reintentan con claves alternativas.
- Si fallan todas las claves, se devuelve el error final del último intento.

## Eliminar la autenticación del proveedor mientras la puerta de enlace está en ejecución

Cuando se elimina la autenticación del proveedor a través del plano de control de Gateway, OpenClaw elimina
los perfiles de autenticación guardados para ese proveedor y aborta las ejecuciones activas de chat o agente
cuyo proveedor de modelo seleccionado coincida con el proveedor eliminado. Las ejecuciones abortadas emiten
los eventos normales de cancelación de chat y ciclo de vida con
`stopReason: "auth-revoked"`, por lo que los clientes conectados pueden mostrar que la ejecución se
detuvo porque se eliminaron las credenciales.

Eliminar la autenticación guardada no revoca las claves en el proveedor. Rote o revoque la
clave en el panel del proveedor cuando necesite una invalidación del lado del proveedor.

## Controlar qué credencial se utiliza

### Durante el inicio de sesión (CLI)

Use `openclaw models auth login --provider <id> --profile-id <profileId>` para
los proveedores que admiten perfiles de autenticación con nombre durante el inicio de sesión.

```bash
openclaw models auth login --provider openai --profile-id openai:ritsuko
openclaw models auth login --provider openai --profile-id openai:lain
```

Esta es la forma más fácil de mantener múltiples inicios de sesión OAuth para el mismo proveedor
separados dentro de un solo agente.

Use `--force` cuando un perfil de proveedor guardado está atascado, ha caducado o está vinculado a la
cuenta incorrecta y el comando de inicio de sesión normal sigue reutilizándolo. `--force` elimina
los perfiles de autenticación guardados para ese proveedor en el directorio de agente seleccionado y luego
vuelve a ejecutar el mismo flujo de autenticación del proveedor. No revoca las credenciales en el
proveedor; rótelas o revóquelas en el panel del proveedor cuando necesite
invalidación del lado del proveedor.

```bash
openclaw models auth login --provider anthropic --force
```

### Por sesión (comando de chat)

Use `/model <alias-or-id>@<profileId>` para fijar una credencial de proveedor específica para la sesión actual (ids de perfil de ejemplo: `anthropic:default`, `anthropic:work`).

Use `/model` (o `/model list`) para un selector compacto; use `/model status` para la vista completa (candidatos + siguiente perfil de autenticación, más detalles del endpoint del proveedor cuando esté configurado).

### Por agente (anulación de CLI)

Establezca un orden explícito de anulación del perfil de autenticación para un agente (almacenado en el `auth-state.json` de ese agente):

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

Use `--agent <id>` para apuntar a un agente específico; omítalo para usar el agente predeterminado configurado.
Cuando depure problemas de orden, `openclaw models status --probe` muestra los perfiles
almacenados omitidos como `excluded_by_auth_order` en lugar de omitirlos silenciosamente.
Cuando depure problemas de enfriamiento (cooldown), recuerde que los enfriamientos por límites de velocidad pueden estar vinculados
a un ID de modelo en lugar de al perfil completo del proveedor.

Si cambia el orden de autenticación o la fijación de perfiles para un chat que ya está en ejecución,
envíe `/new` o `/reset` en ese chat para iniciar una sesión nueva. Las sesiones
existentes pueden mantener su selección de modelo/perfil actual hasta que se restablezcan.

## Solución de problemas

### "No credentials found"

Si falta el perfil de Anthropic, configure una clave de API de Anthropic en el
**gateway host** o configure la ruta del token de configuración de Anthropic y luego vuelva a verificar:

```bash
openclaw models status
```

### Token caducando/caducado

Ejecute `openclaw models status` para confirmar qué perfil está caducando. Si falta
o ha caducado un perfil de token de Anthropic, actualice esa configuración a través del
token de configuración o migre a una clave de API de Anthropic.

## Relacionado

- [Gestión de secretos](/es/gateway/secrets)
- [Acceso remoto](/es/gateway/remote)
- [Almacenamiento de autenticación](/es/concepts/oauth)
