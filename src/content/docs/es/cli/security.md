---
summary: "Referencia de CLI para `openclaw security` (auditar y corregir problemas comunes de seguridad)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (permissions, tighten defaults)
title: "security"
---

# `openclaw security`

Herramientas de seguridad (auditoría + correcciones opcionales).

Relacionado:

- Guía de seguridad: [Seguridad](/en/gateway/security)

## Auditoría

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

La auditoría advierte cuando varios remitentes de MD comparten la sesión principal y recomienda el **modo MD seguro**: `session.dmScope="per-channel-peer"` (o `per-account-channel-peer` para canales multicuenta) para bandejas de entrada compartidas.
Esto es para el fortalecimiento de bandejas de entrada cooperativas/compartidas. Una única Gateway compartida por operadores mutuamente no confiables/adversarios no es una configuración recomendada; separe los límites de confianza con gateways separados (o usuarios/hosts de sistema operativo separados).
También emite `security.trust_model.multi_user_heuristic` cuando la configuración sugiere un ingreso probable de usuario compartido (por ejemplo, política de MD/grupo abierto, objetivos de grupo configurados o reglas de remitente comodín) y le recuerda que OpenClaw es un modelo de confianza de asistente personal por defecto.
Para configuraciones intencionales de usuario compartido, la guía de auditoría es poner en sandbox todas las sesiones, mantener el acceso al sistema de archivos limitado al espacio de trabajo y mantener las identidades o credenciales personales/privadas fuera de ese tiempo de ejecución.
También advierte cuando se usan modelos pequeños (`<=300B`) sin sandbox y con herramientas web/navegador habilitadas.
Para el ingreso de webhook, advierte cuando `hooks.token` reutiliza el token de Gateway, cuando `hooks.token` es corto, cuando `hooks.path="/"`, cuando `hooks.defaultSessionKey` no está configurado, cuando `hooks.allowedAgentIds` es irrestricto, cuando las anulaciones de solicitud `sessionKey` están habilitadas y cuando las anulaciones están habilitadas sin `hooks.allowedSessionKeyPrefixes`.
También advierte cuando la configuración de Docker del sandbox está configurada mientras el modo sandbox está desactivado, cuando `gateway.nodes.denyCommands` usa entradas ineficaces tipo patrón/desconocidas (solo coincidencia exacta del nombre del comando del nodo, no filtrado de texto de shell), cuando `gateway.nodes.allowCommands` habilita explícitamente comandos de nodo peligrosos, cuando el `tools.profile="minimal"` global es anulado por perfiles de herramientas de agente, cuando los grupos abiertos exponen herramientas de tiempo de ejecución/sistema de archivos sin guardias de sandbox/espacio de trabajo y cuando las herramientas de complementos de extensión instaladas pueden ser accesibles bajo una política de herramientas permisiva.
También marca `gateway.allowRealIpFallback=true` (riesgo de suplantación de encabezado si los proxies están mal configurados) y `discovery.mdns.mode="full"` (fuga de metadatos a través de registros TXT mDNS).
También advierte cuando el navegador del sandbox usa la red Docker `bridge` sin `sandbox.browser.cdpSourceRange`.
También marca modos de red Docker de sandbox peligrosos (incluidas las uniones de espacio de nombres `host` y `container:*`).
También advierte cuando los contenedores Docker del navegador del sandbox existentes tienen etiquetas de hash faltantes/obsoletas (por ejemplo, contenedores previos a la migración que carecen de `openclaw.browserConfigEpoch`) y recomienda `openclaw sandbox recreate --browser --all`.
También advierte cuando los registros de instalación de complementos/ganchos basados en npm no están anclados, carecen de metadatos de integridad o difieren de las versiones de los paquetes instalados actualmente.
Advierte cuando las listas de permitidos de canales se basan en nombres/correos/etiquetas mutables en lugar de IDs estables (ámbitos de Discord, Slack, Google Chat, Microsoft Teams, Mattermost, IRC cuando corresponda).
Advierte cuando `gateway.auth.mode="none"` deja las API HTTP de Gateway accesibles sin un secreto compartido (`/tools/invoke` más cualquier punto final `/v1/*` habilitado).
Las configuraciones con el prefijo `dangerous`/`dangerously` son anulaciones explícitas del operador de "romper el cristal"; habilitar una no es, por sí misma, un informe de vulnerabilidad de seguridad.
Para el inventario completo de parámetros peligrosos, consulte la sección "Resumen de indicadores inseguros o peligrosos" en [Seguridad](/en/gateway/security).

Comportamiento de SecretRef:

- `security audit` resuelve los SecretRefs admitidos en modo de solo lectura para sus rutas objetivo.
- Si un SecretRef no está disponible en la ruta del comando actual, la auditoría continúa e informa `secretDiagnostics` (en lugar de fallar).
- `--token` y `--password` solo anulan la autenticación de sonda profunda para esa invocación de comando; no reescriben la configuración ni las asignaciones de SecretRef.

## Salida JSON

Use `--json` para comprobaciones de CI/políticas:

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

Si se combinan `--fix` y `--json`, la salida incluye tanto las acciones de corrección como el informe final:

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## Qué cambia `--fix`

`--fix` aplica correcciones seguras y deterministas:

- cambia los `groupPolicy="open"` comunes a `groupPolicy="allowlist"` (incluyendo variantes de cuenta en canales admitidos)
- cuando la política de grupo de WhatsApp cambia a `allowlist`, inicializa `groupAllowFrom` desde
  el archivo `allowFrom` almacenado cuando esa lista existe y la configuración aún no
  define `allowFrom`
- establece `logging.redactSensitive` de `"off"` a `"tools"`
- ajusta los permisos para estado/configuración y archivos confidenciales comunes
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, sesión
  `*.jsonl`)
- también ajusta los archivos de inclusión de configuración referenciados desde `openclaw.json`
- usa `chmod` en hosts POSIX y restablece `icacls` en Windows

`--fix` **no**:

- rota tokens/contraseñas/claves de API
- deshabilita herramientas (`gateway`, `cron`, `exec`, etc.)
- cambia las opciones de enlace/autenticación/exposición de red de la puerta de enlace
- elimina o reescribe complementos/habilidades
