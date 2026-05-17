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
2. **`.env` en el directorio de trabajo actual** (dotenv por defecto; no sobrescribe).
3. **`.env` global** en `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`; no sobrescribe).
4. **Bloque `env` de configuración** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional del shell de inicio de sesión** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para las claves esperadas que faltan.

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

## Importación de entorno de shell

`env.shellEnv` ejecuta su shell de inicio de sesión e importa solo las claves esperadas **que faltan**:

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
- `OPENCLAW_SHELL=acp`: establecido para las creaciones de procesos del backend de tiempo de ejecución de ACP (por ejemplo `acpx`).
- `OPENCLAW_SHELL=acp-client`: establecido para `openclaw acp client` cuando crea el proceso del puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de la TUI local.

Estos son marcadores de tiempo de ejecución (no configuración de usuario requerida). Se pueden usar en la lógica de shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la interfaz de usuario

- `OPENCLAW_THEME=light`: fuerza la paleta TUI clara cuando su terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta TUI oscura.
- `COLORFGBG`: si su terminal la exporta, OpenClaw usa la pista del color de fondo para elegir automáticamente la paleta TUI.

## Sustitución de variables de entorno en la configuración

Puede referenciar variables de entorno directamente en los valores de cadena de configuración usando la sintaxis `${VAR_NAME}`:

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

## Referencias secretas frente a cadenas `${ENV}`

OpenClaw admite dos patrones basados en entorno:

- Sustitución de cadenas `${VAR}` en valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que admiten referencias a secretos.

Ambos se resuelven desde el entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Secrets Management](/es/gateway/secrets).

## Variables de entorno relacionadas con la ruta

| Variable                 | Propósito                                                                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | Anula el directorio de inicio utilizado para toda la resolución de rutas internas (`~/.openclaw/`, directorios de agente, sesiones, credenciales). Útil cuando se ejecuta OpenClaw como usuario de servicio dedicado.                          |
| `OPENCLAW_STATE_DIR`     | Anula el directorio de estado (predeterminado `~/.openclaw`).                                                                                                                                                                                  |
| `OPENCLAW_CONFIG_PATH`   | Anula la ruta del archivo de configuración (predeterminado `~/.openclaw/openclaw.json`).                                                                                                                                                       |
| `OPENCLAW_INCLUDE_ROOTS` | Lista de rutas de directorios donde las directivas `$include` pueden resolver archivos fuera del directorio de configuración (predeterminado: ninguno — `$include` está limitado al directorio de configuración). Expansión de tilde aplicada. |

## Registro

| Variable                         | Propósito                                                                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | Anula el nivel de registro tanto para archivo como para consola (por ejemplo, `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Se ignoran los valores no válidos con una advertencia. |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | Emitir diagnósticos de tiempo de solicitud/respuesta del modelo dirigidos en el nivel `info` sin habilitar los registros de depuración globales.                                                                                            |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Diagnósticos de carga útil del modelo: `summary`, `tools`, o `full-redacted`. `full-redacted` está limitado y redactado, pero puede incluir texto de prompt/mensaje.                                                                        |
| `OPENCLAW_DEBUG_SSE`             | Diagnósticos de transmisión: `events` para el tiempo de inicio/fin, `peek` para incluir los primeros cinco eventos de SSE redactados.                                                                                                       |
| `OPENCLAW_DEBUG_CODE_MODE`       | Diagnósticos de superficie del modelo en modo de código, incluyendo la ocultación de herramientas del proveedor y la aplicación exclusiva de ejecución/espera.                                                                              |

### `OPENCLAW_HOME`

Cuando se establece, `OPENCLAW_HOME` reemplaza al directorio de inicio del sistema (`$HOME` / `os.homedir()`) para toda la resolución de rutas internas. Esto habilita el aislamiento completo del sistema de archivos para cuentas de servicio sin interfaz gráfica.

**Precedencia:** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Ejemplo** (macOS LaunchDaemon):

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` también se puede establecer en una ruta con tilde (p. ej. `~/svc`), que se expande usando `$HOME` antes de su uso.

## usuarios de nvm: fallos TLS de web_fetch

Si Node.js se instaló mediante **nvm** (no el administrador de paquetes del sistema), el `fetch()` integrado usa
el almacén de CA incluido en nvm, que puede carecer de CA raíz modernas (ISRG Root X1/X2 para Let's Encrypt,
DigiCert Global Root G2, etc.). Esto hace que `web_fetch` falle con `"fetch failed"` en la mayoría de los sitios HTTPS.

En Linux, OpenClaw detecta automáticamente nvm y aplica la corrección en el entorno de inicio real:

- `openclaw gateway install` escribe `NODE_EXTRA_CA_CERTS` en el entorno del servicio systemd
- el punto de entrada de la CLI de `openclaw` se vuelve a ejecutar a sí mismo con `NODE_EXTRA_CA_CERTS` establecido antes del inicio de Node

**Solución manual (para versiones anteriores o lanzamientos directos de `node ...`):**

Exporte la variable antes de iniciar OpenClaw:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

No confíe solo en escribir en `~/.openclaw/.env` para esta variable; Node lee
`NODE_EXTRA_CA_CERTS` al inicio del proceso.

## Variables de entorno heredadas

OpenClaw solo lee variables de entorno `OPENCLAW_*`. Los prefijos heredados
`CLAWDBOT_*` y `MOLTBOT_*` de versiones anteriores se ignoran
silenciosamente.

Si alguno todavía está establecido en el proceso de Gateway al inicio, OpenClaw emite una
sola advertencia de obsolescencia de Node (`OPENCLAW_LEGACY_ENV_VARS`) listando los
prefijos detectados y el conteo total. Cambie el nombre de cada valor reemplazando el
prefijo heredado con `OPENCLAW_` (por ejemplo `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`); los nombres antiguos no tienen ningún efecto.

## Relacionado

- [Configuración de Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Descripción general de modelos](/es/concepts/models)
