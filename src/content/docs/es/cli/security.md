---
summary: "Referencia de CLI para `openclaw security` (auditar y corregir errores de seguridad comunes)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (permissions, tighten defaults)
title: "Seguridad"
---

# `openclaw security`

Herramientas de seguridad (auditoría + correcciones opcionales).

Relacionado:

- Guía de seguridad: [Seguridad](/es/gateway/security)

## Auditoría

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

El `security audit` normal se mantiene en la ruta de configuración en frío/sistema de archivos/solo lectura. De forma predeterminada, no detecta recopiladores de seguridad en tiempo de ejecución de complementos, por lo que las auditorías de rutina no cargan todos los tiempos de ejecución de complementos instalados. Use `--deep` para incluir sondas en vivo de Gateway de mejor esfuerzo y recopiladores de auditoría de seguridad propiedad de complementos; los llamadores internos explícitos también pueden optar por esos recopiladores propiedad de complementos cuando ya tienen un alcance de tiempo de ejecución apropiado.

La auditoría advierte cuando varios remitentes de MD comparten la sesión principal y recomienda el **modo MD seguro**: `session.dmScope="per-channel-peer"` (o `per-account-channel-peer` para canales multicuenta) para bandejas de entrada compartidas.
Esto es para el endurecimiento de bandejas de entrada cooperativas/compartidas. Una sola puerta de enlace compartida por operadores mutuamente no confiables/adversarios no es una configuración recomendada; separe los límites de confianza con puertas de enlace separadas (o usuarios/hosts de sistema operativo separados).
También emite `security.trust_model.multi_user_heuristic` cuando la configuración sugiere un ingreso probable de usuario compartido (por ejemplo, política de MD/grupo abierto, objetivos de grupo configurados o reglas de remitente comodín) y le recuerda que OpenClaw es un modelo de confianza de asistente personal por defecto.
Para configuraciones intencionales de usuario compartido, la guía de auditoría es poner en zona de pruebas todas las sesiones, mantener el acceso al sistema de archivos con ámbito de espacio de trabajo y mantener identidades o credenciales personales/privadas fuera de ese tiempo de ejecución.
También advierte cuando se usan modelos pequeños (`<=300B`) sin zona de pruebas y con herramientas web/navegador habilitadas.
Para el ingreso de webhook, los registros de inicio registran una advertencia de seguridad no fatal y la auditoría marca `hooks.token` el reúso de valores de autenticación de secreto compartido de la puerta de enlace activa, incluyendo `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` y `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`. También advierte cuando:

- `hooks.token` es corto
- `hooks.path="/"`
- `hooks.defaultSessionKey` no está establecido
- `hooks.allowedAgentIds` es sin restricciones
- las anulaciones de solicitud `sessionKey` están habilitadas
- las anulaciones están habilitadas sin `hooks.allowedSessionKeyPrefixes`

Si la autenticación por contraseña de la puerta de enlace se proporciona solo al inicio, pase el mismo valor a `openclaw security audit --auth password --password <password>` para que la auditoría pueda verificarlo contra `hooks.token`.
Ejecute `openclaw doctor --fix` para rotar un `hooks.token` reutilizado persistente y luego actualice los remitentes de enlace externo para usar el nuevo token de enlace.

También advierte cuando la configuración de Docker de sandbox está establecida mientras el modo sandbox está desactivado, cuando `gateway.nodes.denyCommands` usa entradas de patrones ineficaces/desconocidas (solo coincidencia exacta del nombre del comando del nodo, no filtrado de texto de shell), cuando `gateway.nodes.allowCommands` habilita explícitamente comandos de nodos peligrosos, cuando el `tools.profile="minimal"` global se anula mediante los perfiles de herramientas del agente, cuando las herramientas de escritura/edición están deshabilitadas pero `exec` todavía está disponible sin un límite del sistema de archivos de sandbox restrictivo, cuando los grupos abiertos exponen herramientas de tiempo de ejecución/sistema de archivos sin protecciones de sandbox/espacio de trabajo, y cuando las herramientas de complementos instaladas pueden ser accesibles bajo una política de herramientas permisiva.
También marca `gateway.allowRealIpFallback=true` (riesgo de suplantación de encabezados si los servidores proxy están mal configurados) y `discovery.mdns.mode="full"` (fuga de metadatos a través de registros TXT mDNS).
También advierte cuando el navegador sandbox usa la red `bridge` de Docker sin `sandbox.browser.cdpSourceRange`.
También marca modos de red de Docker de sandbox peligrosos (incluidas las uniones de espacios de nombres `host` y `container:*`).
También advierte cuando los contenedores Docker del navegador sandbox existentes tienen etiquetas de hash faltantes/obsoletas (por ejemplo, contenedores previos a la migración que carecen de `openclaw.browserConfigEpoch`) y recomienda `openclaw sandbox recreate --browser --all`.
También advierte cuando los registros de instalación de complementos/enlaces basados en npm no están anclados, carecen de metadatos de integridad o difieren de las versiones de paquetes instaladas actualmente.
Advierte cuando las listas de permitidos de canales se basan en nombres/correos/etiquetas mutables en lugar de ID estables (ámbitos de Discord, Slack, Google Chat, Microsoft Teams, Mattermost, IRC cuando corresponda).
Advierte cuando `gateway.auth.mode="none"` deja las API HTTP de Gateway accesibles sin un secreto compartido (`/tools/invoke` más cualquier punto final `/v1/*` habilitado).
La configuración con el prefijo `dangerous`/`dangerously` son anulaciones explícitas del operador de ruptura de vidrio; habilitar una de ellas por sí sola no es un informe de vulnerabilidad de seguridad.
Para ver el inventario completo de parámetros peligrosos, consulte la sección "Resumen de indicadores inseguros o peligrosos" en [Security](/es/gateway/security).

Los hallazgos intencionales persistentes pueden aceptarse con `security.audit.suppressions`.
Cada supresión coincide con un `checkId` exacto y se puede limitar con
subcadenas `titleIncludes` y/o `detailIncludes` que no distinguen entre mayúsculas y minúsculas:

```json
{
  "security": {
    "audit": {
      "suppressions": [
        {
          "checkId": "plugins.tools_reachable_permissive_policy",
          "detailIncludes": "Enabled extension plugins: gbrain",
          "reason": "trusted local operator plugin"
        }
      ]
    }
  }
}
```

Los hallazgos suprimidos se eliminan de la lista `summary` y `findings` activa.
La salida JSON los mantiene en `suppressedFindings` para su auditoría.
Cuando se configuran supresiones, la salida activa también mantiene un hallazgo
de información `security.audit.suppressions.active` no suprimible para que los lectores puedan saber que la auditoría
fue filtrada. Las marcas de configuración peligrosas se emiten una marca por hallazgo, por lo que
aceptar una marca peligrosa no oculta otras marcas habilitadas que comparten el
mismo `config.insecure_or_dangerous_flags` checkId.
Debido a que las supresiones pueden ocultar riesgos persistentes, agregarlas o eliminarlas a través
de comandos de shell de ejecución de agente requiere aprobación de ejecución, a menos que la ejecución ya se esté ejecutando
con `security="full"` y `ask="off"` para automatización local confiable.

Comportamiento de SecretRef:

- `security audit` resuelve los SecretRefs admitidos en modo de solo lectura para sus rutas de destino.
- Si un SecretRef no está disponible en la ruta del comando actual, la auditoría continúa e informa `secretDiagnostics` (en lugar de fallar).
- `--token` y `--password` solo anulan la autenticación de sondeo profundo para esa invocación de comando; no reescriben la configuración ni las asignaciones de SecretRef.

## Salida JSON

Use `--json` para verificaciones de CI/políticas:

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

Si se combinan `--fix` y `--json`, la salida incluye tanto las acciones de corrección como el informe final:

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## Qué cambia `--fix`

`--fix` aplica remedios seguros y deterministas:

- cambia `groupPolicy="open"` comunes a `groupPolicy="allowlist"` (incluyendo variantes de cuenta en canales admitidos)
- cuando la política de grupo de WhatsApp cambia a `allowlist`, siembra `groupAllowFrom` desde
  el archivo `allowFrom` almacenado cuando esa lista existe y la configuración no define
  `allowFrom`
- establece `logging.redactSensitive` de `"off"` a `"tools"`
- estrecha los permisos para el estado/la configuración y los archivos confidenciales comunes
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, sesión
  `*.jsonl`)
- también estrecha los archivos de inclusión de configuración a los que se hace referencia desde `openclaw.json`
- usa `chmod` en hosts POSIX y restablece `icacls` en Windows

`--fix` **no**:

- rota tokens/contraseñas/claves de API
- deshabilita herramientas (`gateway`, `cron`, `exec`, etc.)
- cambia las opciones de enlace/autenticación/exposición de red de la puerta de enlace
- elimina o reescribe complementos/habilidades

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Auditoría de seguridad](/es/gateway/security)
