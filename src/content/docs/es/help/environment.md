---
summary: "Dónde OpenClaw carga las variables de entorno y el orden de precedencia"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables de entorno"
---

OpenClaw obtiene variables de entorno de múltiples fuentes. La regla es **nunca sobrescribir los valores existentes**.

## Precedencia (más alta → más baja)

1. **Entorno de proceso** (lo que el proceso Gateway ya tiene del shell/demonio principal).
2. **`.env` en el directorio de trabajo actual** (dotenv por defecto; no anula).
3. **`.env` global** en `~/.openclaw/.env` (alias de `$OPENCLAW_STATE_DIR/.env`; no anula).
4. **Bloque `env` de configuración** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional de login-shell** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para claves esperadas faltantes.

En instalaciones nuevas de Ubuntu que usan el directorio de estado predeterminado, OpenClaw también trata `~/.config/openclaw/gateway.env` como un respaldo de compatibilidad después del `.env` global. Si ambos archivos existen y discrepan, OpenClaw mantiene `~/.openclaw/.env` e imprime una advertencia.

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

El bloque `env` de configuración solo acepta valores de cadena literales. No expande
los valores de `file:...`; por ejemplo, `XAI_API_KEY: "file:secrets/xai-api-key.txt"`
se pasa a los proveedores como esa cadena exacta.

Para claves de proveedor respaldadas por archivos, use un SecretRef en el campo de credencial que
lo admita:

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

Consulte [Gestión de secretos](/es/gateway/secrets) y la
[superficie de credencial SecretRef](/es/reference/secretref-credential-surface) para obtener los
campos admitidos.

## Importación de entorno de Shell

`env.shellEnv` ejecuta su shell de inicio de sesión e importa solo las claves esperadas **faltantes**:

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

- `OPENCLAW_SHELL=exec`: se establece para los comandos ejecutados a través de la herramienta `exec`.
- `OPENCLAW_SHELL=acp`: se establece para las generaciones de procesos de backend del runtime ACP (por ejemplo, `acpx`).
- `OPENCLAW_SHELL=acp-client`: se establece para `openclaw acp client` cuando genera el proceso del puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de TUI local.

Estos son marcadores de tiempo de ejecución (no configuración de usuario requerida). Pueden usarse en la lógica de shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la UI

- `OPENCLAW_THEME=light`: fuerza la paleta de TUI clara cuando tu terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta de TUI oscura.
- `COLORFGBG`: si tu terminal la exporta, OpenClaw usa la pista del color de fondo para elegir automáticamente la paleta de TUI.

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

Consulta [Configuración: Sustitución de variables de entorno](/es/gateway/configuration-reference#env-var-substitution) para obtener todos los detalles.

## Referencias a secretos vs cadenas `${ENV}`

OpenClaw admite dos patrones basados en entorno:

- Sustitución de cadenas `${VAR}` en valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que admiten referencias a secretos.

Ambos se resuelven desde el entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Gestión de secretos](/es/gateway/secrets).
El bloque de configuración `env` en sí mismo no resuelve SecretRefs ni valores abreviados `file:...`.

## Variables de entorno relacionadas con rutas

| Variable                 | Propósito                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_HOME`          | Anula el directorio de inicio utilizado para toda la resolución de rutas interna (`~/.openclaw/`, directorios de agentes, sesiones, credenciales). Útil al ejecutar OpenClaw como un usuario de servicio dedicado.             |
| `OPENCLAW_STATE_DIR`     | Anula el directorio de estado (por defecto `~/.openclaw`).                                                                                                                                                                     |
| `OPENCLAW_CONFIG_PATH`   | Anula la ruta del archivo de configuración (por defecto `~/.openclaw/openclaw.json`).                                                                                                                                          |
| `OPENCLAW_INCLUDE_ROOTS` | Lista de rutas de directorios donde las directivas `$include` pueden resolver archivos fuera del directorio de configuración (por defecto: ninguno — `$include` está confinado al directorio de configuración). Expande tilde. |

## Registro

| Variable                         | Propósito                                                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | Anula el nivel de registro tanto para archivo como para consola (p. ej., `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Los valores no válidos se ignoran con una advertencia. |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | Emite diagnósticos de sincronización de solicitud/respuesta del modelo específicos en el nivel `info` sin habilitar los registros de depuración globales.                                                                              |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Diagnósticos de carga útil del modelo: `summary`, `tools` o `full-redacted`. `full-redacted` está limitado y redactado, pero puede incluir texto de aviso/mensaje.                                                                     |
| `OPENCLAW_DEBUG_SSE`             | Diagnósticos de transmisión: `events` para la sincronización de inicio/finalización, `peek` para incluir los primeros cinco eventos SSE redactados.                                                                                    |
| `OPENCLAW_DEBUG_CODE_MODE`       | Diagnósticos de superficie del modelo en modo de código, que incluyen la ocultación de herramientas del proveedor y el cumplimiento de solo ejecución/espera.                                                                          |

### `OPENCLAW_HOME`

Cuando se establece, `OPENCLAW_HOME` reemplaza el directorio de inicio del sistema (`$HOME` / `os.homedir()`) para toda la resolución de rutas internas. Esto habilita el aislamiento completo del sistema de archivos para cuentas de servicio sin interfaz.

**Precedencia:** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Ejemplo** (macOS LaunchDaemon):

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` también se puede establecer en una ruta de tilde (p. ej., `~/svc`), que se expande usando `$HOME` antes de su uso.

## Usuarios de nvm: fallos de TLS en web_fetch

Si Node.js se instaló mediante **nvm** (no el gestor de paquetes del sistema), el `fetch()` integrado usa
el almacén de CA incluido en nvm, que puede carecer de CA raíz modernas (ISRG Root X1/X2 para Let's Encrypt,
DigiCert Global Root G2, etc.). Esto hace que `web_fetch` falle con `"fetch failed"` en la mayoría de los sitios HTTPS.

En Linux, OpenClaw detecta automáticamente nvm y aplica la solución en el entorno de inicio real:

- `openclaw gateway install` escribe `NODE_EXTRA_CA_CERTS` en el entorno del servicio systemd
- el punto de entrada de la CLI `openclaw` se vuelve a ejecutar a sí mismo con `NODE_EXTRA_CA_CERTS` establecido antes del inicio de Node

**Solución manual (para versiones anteriores o inicios directos de `node ...`):**

Exporte la variable antes de iniciar OpenClaw:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

No confíe en escribir solo en `~/.openclaw/.env` para esta variable; Node lee
`NODE_EXTRA_CA_CERTS` al iniciar el proceso.

## Variables de entorno heredadas

OpenClaw solo lee variables de entorno `OPENCLAW_*`. Los prefijos heredados
`CLAWDBOT_*` y `MOLTBOT_*` de versiones anteriores se ignoran
silenciosamente.

Si alguna todavía está establecida en el proceso Gateway al inicio, OpenClaw emite una
sola advertencia de obsolescencia de Node (`OPENCLAW_LEGACY_ENV_VARS`) que lista los
prefijos detectados y el conteo total. Cambie el nombre de cada valor reemplazando el
prefijo heredado con `OPENCLAW_` (por ejemplo `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`); los nombres antiguos no tienen ningún efecto.

## Relacionado

- [Configuración de Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Descripción general de modelos](/es/concepts/models)
