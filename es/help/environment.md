---
summary: "Dónde OpenClaw carga las variables de entorno y el orden de precedencia"
read_when:
  - Necesitas saber qué variables de entorno se cargan y en qué orden
  - Estás depurando claves de API faltantes en el Gateway
  - Estás documentando la autenticación del proveedor o los entornos de despliegue
title: "Variables de Entorno"
---

# Variables de entorno

OpenClaw extrae variables de entorno de múltiples fuentes. La regla es **nunca sobrescribir los valores existentes**.

## Precedencia (más alta → más baja)

1. **Entorno de proceso** (lo que el proceso del Gateway ya tiene del shell/daemon principal).
2. **`.env` en el directorio de trabajo actual** (por defecto de dotenv; no sobrescribe).
3. **`.env` global** en `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`; no sobrescribe).
4. **Bloque `env` de configuración** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional del shell de inicio de sesión** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para claves esperadas faltantes.

Si falta completamente el archivo de configuración, se omite el paso 4; la importación del shell aún se ejecuta si está habilitada.

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

## Importación de entorno del shell

`env.shellEnv` ejecuta tu shell de inicio de sesión e importa solo las claves esperadas **faltantes**:

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

Variables de entorno equivalentes:

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Variables de entorno inyectadas en tiempo de ejecución

OpenClaw también inyecta marcadores de contexto en los procesos secundarios generados:

- `OPENCLAW_SHELL=exec`: establecido para comandos ejecutados a través de la herramienta `exec`.
- `OPENCLAW_SHELL=acp`: establecido para los procesos generados del backend del runtime ACP (por ejemplo `acpx`).
- `OPENCLAW_SHELL=acp-client`: establecido para `openclaw acp client` cuando genera el proceso del puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de la TUI local.

Estos son marcadores de tiempo de ejecución (no configuración de usuario requerida). Pueden usarse en la lógica del shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la IU

- `OPENCLAW_THEME=light`: fuerza la paleta clara de TUI cuando tu terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta oscura de TUI.
- `COLORFGBG`: si tu terminal la exporta, OpenClaw utiliza la pista de color de fondo para elegir automáticamente la paleta TUI.

## Sustitución de variables de entorno en la configuración

Puedes referenciar variables de entorno directamente en los valores de cadena de configuración utilizando la sintaxis `${VAR_NAME}`:

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

Consulta [Configuración: Sustitución de variables de entorno](/es/gateway/configuration#env-var-substitution-in-config) para obtener más detalles.

## Referencias secretas vs cadenas `${ENV}`

OpenClaw admite dos patrones basados en entorno:

- Sustitución de cadenas `${VAR}` en los valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que admiten referencias a secretos.

Ambos se resuelven a partir del entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Gestión de secretos](/es/gateway/secrets).

## Variables de entorno relacionadas con la ruta

| Variable               | Propósito                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | Anula el directorio de inicio utilizado para toda la resolución de rutas internas (`~/.openclaw/`, directorios de agentes, sesiones, credenciales). Útil al ejecutar OpenClaw como un usuario de servicio dedicado. |
| `OPENCLAW_STATE_DIR`   | Anula el directorio de estado (por defecto `~/.openclaw`).                                                                                                                                                          |
| `OPENCLAW_CONFIG_PATH` | Anula la ruta del archivo de configuración (por defecto `~/.openclaw/openclaw.json`).                                                                                                                               |

## Registro

| Variable             | Propósito                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | Anula el nivel de registro tanto para el archivo como para la consola (p. ej. `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Se ignoran los valores no válidos con una advertencia. |

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

`OPENCLAW_HOME` también se puede establecer en una ruta de tilde (por ejemplo, `~/svc`), que se expande usando `$HOME` antes de su uso.

## Relacionado

- [Configuración de Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Descripción general de modelos](/es/concepts/models)

import es from "/components/footer/es.mdx";

<es />
