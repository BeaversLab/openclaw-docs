---
summary: "Dónde OpenClaw carga las variables de entorno y el orden de precedencia"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables de entorno"
---

# Variables de entorno

OpenClaw obtiene variables de entorno de múltiples fuentes. La regla es **nunca sobrescribir los valores existentes**.

## Precedencia (más alta → más baja)

1. **Entorno de proceso** (lo que el proceso Gateway ya tiene del shell/daemon principal).
2. **`.env` en el directorio de trabajo actual** (predeterminado de dotenv; no anula).
3. **`.env` global** en `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`; no anula).
4. **Bloque config `env`** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional de login-shell** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para claves esperadas faltantes.

Si falta el archivo de configuración por completo, se omite el paso 4; la importación del shell aún se ejecuta si está habilitada.

## Bloque config `env`

Dos formas equivalentes de establecer variables de entorno en línea (ambas no sobrescriben):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Importación de entorno de shell

`env.shellEnv` ejecuta tu login shell e importa solo las claves esperadas **que faltan**:

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

Equivalentes de variables de entorno:

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Variables de entorno inyectadas en tiempo de ejecución

OpenClaw también inyecta marcadores de contexto en los procesos secundarios generados:

- `OPENCLAW_SHELL=exec`: establecido para comandos ejecutados a través de la herramienta `exec`.
- `OPENCLAW_SHELL=acp`: establecido para spawns de procesos de backend de runtime ACP (por ejemplo, `acpx`).
- `OPENCLAW_SHELL=acp-client`: establecido para `openclaw acp client` cuando genera el proceso puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de TUI local.

Estos son marcadores de tiempo de ejecución (no configuración de usuario requerida). Se pueden usar en la lógica de shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la interfaz de usuario

- `OPENCLAW_THEME=light`: fuerza la paleta TUI clara cuando tu terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta TUI oscura.
- `COLORFGBG`: si tu terminal lo exporta, OpenClaw usa la pista del color de fondo para elegir automáticamente la paleta TUI.

## Sustitución de variables de entorno en la configuración

Puedes referenciar variables de entorno directamente en valores de cadena de configuración usando la sintaxis `${VAR_NAME}`:

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

Consulta [Configuración: Sustitución de variables de entorno](/en/gateway/configuration-reference#env-var-substitution) para obtener detalles completos.

## Referencias a secretos vs cadenas `${ENV}`

OpenClaw admite dos patrones basados en entorno:

- Sustitución de cadenas `${VAR}` en valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que soportan referencias a secretos.

Ambos se resuelven a partir del entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Gestión de secretos](/en/gateway/secrets).

## Variables de entorno relacionadas con la ruta

| Variable               | Propósito                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | Anula el directorio de inicio utilizado para toda la resolución de rutas internas (`~/.openclaw/`, directorios de agentes, sesiones, credenciales). Útil al ejecutar OpenClaw como un usuario de servicio dedicado. |
| `OPENCLAW_STATE_DIR`   | Anula el directorio de estado (por defecto `~/.openclaw`).                                                                                                                                                          |
| `OPENCLAW_CONFIG_PATH` | Anula la ruta del archivo de configuración (por defecto `~/.openclaw/openclaw.json`).                                                                                                                               |

## Registro

| Variable             | Propósito                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_LOG_LEVEL` | Anula el nivel de registro para archivo y consola (p. ej., `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Los valores no válidos se ignoran con una advertencia. |

### `OPENCLAW_HOME`

Cuando se establece, `OPENCLAW_HOME` reemplaza el directorio de inicio del sistema (`$HOME` / `os.homedir()`) para toda la resolución de rutas internas. Esto permite un aislamiento completo del sistema de archivos para cuentas de servicio sin cabeza.

**Precedencia:** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Ejemplo** (macOS LaunchDaemon):

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` también se puede establecer en una ruta con tilde (p. ej., `~/svc`), que se expande usando `$HOME` antes de su uso.

## usuarios de nvm: fallos de TLS en web_fetch

Si Node.js se instaló mediante **nvm** (no mediante el gestor de paquetes del sistema), el `fetch()` integrado usa
el almacén de CA incluido en nvm, que puede carecer de CA raíz modernas (ISRG Root X1/X2 para Let's Encrypt,
DigiCert Global Root G2, etc.). Esto provoca que `web_fetch` falle con `"fetch failed"` en la mayoría de los sitios HTTPS.

En Linux, OpenClaw detecta automáticamente nvm y aplica la solución en el entorno de inicio real:

- `openclaw gateway install` escribe `NODE_EXTRA_CA_CERTS` en el entorno del servicio systemd
- el punto de entrada de la CLI `openclaw` se vuelve a ejecutar a sí mismo con `NODE_EXTRA_CA_CERTS` establecido antes del inicio de Node

**Solución manual (para versiones anteriores o ejecuciones directas de `node ...`):**

Exporte la variable antes de iniciar OpenClaw:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

No dependa únicamente de escribir en `~/.openclaw/.env` para esta variable; Node lee
`NODE_EXTRA_CA_CERTS` al iniciar el proceso.

## Relacionado

- [Configuración de Gateway](/en/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/en/help/faq#env-vars-and-env-loading)
- [Resumen de modelos](/en/concepts/models)
