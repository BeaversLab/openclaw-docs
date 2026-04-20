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

En instalaciones nuevas de Ubuntu que usan el directorio de estado predeterminado, OpenClaw también trata `~/.config/openclaw/gateway.env` como un respaldo de compatibilidad después del `.env` global. Si ambos archivos existen y discrepan, OpenClaw mantiene `~/.openclaw/.env` e imprime una advertencia.

Si falta por completo el archivo de configuración, se omite el paso 4; la importación del shell todavía se ejecuta si está habilitada.

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

## Importación de variables de entorno del shell

`env.shellEnv` ejecuta tu shell de inicio de sesión e importa solo las claves esperadas **que faltan**:

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
- `OPENCLAW_SHELL=acp`: establecido para las generaciones de procesos de backend del tiempo de ejecución de ACP (por ejemplo `acpx`).
- `OPENCLAW_SHELL=acp-client`: establecido para `openclaw acp client` cuando genera el proceso del puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de la interfaz de usuario de texto (TUI) local.

Estos son marcadores de tiempo de ejecución (no requieren configuración del usuario). Pueden usarse en la lógica del shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la interfaz de usuario

- `OPENCLAW_THEME=light`: fuerza la paleta clara de TUI cuando tu terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta oscura de TUI.
- `COLORFGBG`: si tu terminal la exporta, OpenClaw usa la pista del color de fondo para seleccionar automáticamente la paleta TUI.

## Sustitución de variables de entorno en la configuración

Puedes referenciar variables de entorno directamente en los valores de cadena de configuración usando la sintaxis `${VAR_NAME}`:

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

Consulta [Configuración: Sustitución de variables de entorno](/es/gateway/configuration-reference#env-var-substitution) para obtener detalles completos.

## Referencias secretas frente a cadenas `${ENV}`

OpenClaw admite dos patrones basados en el entorno:

- Sustitución de cadenas `${VAR}` en valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que admiten referencias a secretos.

Ambos se resuelven desde las variables de entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Secrets Management](/es/gateway/secrets).

## Variables de entorno relacionadas con la ruta

| Variable               | Propósito                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | Anula el directorio de inicio utilizado para toda la resolución de rutas internas (`~/.openclaw/`, directorios de agentes, sesiones, credenciales). Útil al ejecutar OpenClaw como un usuario de servicio dedicado. |
| `OPENCLAW_STATE_DIR`   | Anula el directorio de estado (por defecto `~/.openclaw`).                                                                                                                                                          |
| `OPENCLAW_CONFIG_PATH` | Anula la ruta del archivo de configuración (por defecto `~/.openclaw/openclaw.json`).                                                                                                                               |

## Registro (Logging)

| Variable             | Propósito                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | Anula el nivel de registro tanto para archivo como para consola (ej. `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Los valores no válidos se ignoran con una advertencia. |

### `OPENCLAW_HOME`

Cuando se establece, `OPENCLAW_HOME` reemplaza el directorio de inicio del sistema (`$HOME` / `os.homedir()`) para toda la resolución de rutas internas. Esto habilita el aislamiento completo del sistema de archivos para cuentas de servicio sin interfaz gráfica.

**Precedencia:** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Ejemplo** (macOS LaunchDaemon):

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` también se puede establecer en una ruta con tilde (ej. `~/svc`), que se expande usando `$HOME` antes de su uso.

## usuarios de nvm: fallos de TLS en web_fetch

Si Node.js se instaló a través de **nvm** (no mediante el gestor de paquetes del sistema), el `fetch()` integrado utiliza
el almacén de CA incluido en nvm, que puede carecer de CA raíz modernas (ISRG Root X1/X2 para Let's Encrypt,
DigiCert Global Root G2, etc.). Esto hace que `web_fetch` falle con `"fetch failed"` en la mayoría de los sitios HTTPS.

En Linux, OpenClaw detecta automáticamente nvm y aplica la solución en el entorno de inicio real:

- `openclaw gateway install` escribe `NODE_EXTRA_CA_CERTS` en el entorno del servicio systemd
- el punto de entrada `openclaw` de la CLI se vuelve a ejecutar a sí mismo con `NODE_EXTRA_CA_CERTS` establecido antes del inicio de Node

**Solución manual (para versiones anteriores o inicios directos de `node ...`):**

Exporte la variable antes de iniciar OpenClaw:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

No confíe en escribir solo en `~/.openclaw/.env` para esta variable; Node lee
`NODE_EXTRA_CA_CERTS` al inicio del proceso.

## Relacionado

- [Configuración de Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Resumen de modelos](/es/concepts/models)
