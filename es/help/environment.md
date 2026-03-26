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
2. **`.env` en el directorio de trabajo actual** (dotenv por defecto; no sobrescribe).
3. **`.env` global** en `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`; no sobrescribe).
4. **Bloque `env` de configuración** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional de shell de inicio de sesión** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para claves esperadas que faltan.

Si falta el archivo de configuración por completo, se omite el paso 4; la importación del shell aún se ejecuta si está habilitada.

## Bloque `env` de configuración

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

`env.shellEnv` ejecuta su shell de inicio de sesión e importa solo las claves esperadas que **faltan**:

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
- `OPENCLAW_SHELL=acp`: establecido para generaciones de procesos de backend del tiempo de ejecución ACP (por ejemplo, `acpx`).
- `OPENCLAW_SHELL=acp-client`: establecido para `openclaw acp client` cuando genera el proceso del puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de la TUI local.

Estos son marcadores de tiempo de ejecución (no configuración de usuario requerida). Se pueden usar en la lógica de shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la interfaz de usuario

- `OPENCLAW_THEME=light`: fuerza la paleta TUI clara cuando su terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta TUI oscura.
- `COLORFGBG`: si su terminal lo exporta, OpenClaw usa la sugerencia de color de fondo para elegir automáticamente la paleta TUI.

## Sustitución de variables de entorno en la configuración

Puede referenciar variables de entorno directamente en los valores de cadena de configuración utilizando la sintaxis `${VAR_NAME}`:

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

Consulte [Configuration: Env var substitution](/es/gateway/configuration-reference#env-var-substitution) para obtener detalles completos.

## Referencias secretas vs cadenas `${ENV}`

OpenClaw admite dos patrones basados en entorno:

- Sustitución de cadenas `${VAR}` en los valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que admiten referencias a secretos.

Ambos se resuelven desde el entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Gestión de secretos](/es/gateway/secrets).

## Variables de entorno relacionadas con la ruta

| Variable               | Propósito                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | Anula el directorio de inicio utilizado para toda la resolución de rutas internas (`~/.openclaw/`, directorios de agente, sesiones, credenciales). Útil cuando se ejecuta OpenClaw como usuario de servicio dedicado. |
| `OPENCLAW_STATE_DIR`   | Anula el directorio de estado (por defecto `~/.openclaw`).                                                                                                                                                            |
| `OPENCLAW_CONFIG_PATH` | Anula la ruta del archivo de configuración (por defecto `~/.openclaw/openclaw.json`).                                                                                                                                 |

## Registro

| Variable             | Propósito                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | Anula el nivel de registro tanto para archivo como para consola (por ejemplo, `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Los valores no válidos se ignoran con una advertencia. |

### `OPENCLAW_HOME`

Cuando se establece, `OPENCLAW_HOME` reemplaza el directorio de inicio del sistema (`$HOME` / `os.homedir()`) para toda la resolución de rutas internas. Esto habilita el aislamiento completo del sistema de archivos para cuentas de servicio sin interfaz gráfica.

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

## Relacionado

- [Configuración de Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Resumen de modelos](/es/concepts/models)

import es from "/components/footer/es.mdx";

<es />
