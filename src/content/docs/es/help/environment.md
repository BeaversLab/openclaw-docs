---
summary: "Dónde OpenClaw carga las variables de entorno y el orden de precedencia"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables de entorno"
---

OpenClaw obtiene variables de entorno de múltiples fuentes. La regla es **nunca sobrescribir los valores existentes**.
Los archivos `.env` del espacio de trabajo son una fuente de menor confianza: OpenClaw ignora las credenciales del proveedor y los controles de tiempo de ejecución protegidos del archivo `.env` del espacio de trabajo antes de aplicar la precedencia.

## Precedencia (más alta → más baja)

1. **Entorno de proceso** (lo que el proceso Gateway ya tiene del shell/demonio principal).
2. **`.env` en el directorio de trabajo actual** (predeterminado de dotenv; no sobrescribe; las credenciales del proveedor y los controles de tiempo de ejecución protegidos se ignoran).
3. **`.env` global** en `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`; recomendado para claves de API del proveedor; no sobrescribe).
4. **Bloque `env` de configuración** en `~/.openclaw/openclaw.json` (se aplica solo si falta).
5. **Importación opcional del shell de inicio de sesión** (`env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1`), aplicada solo para las claves esperadas que faltan.

En instalaciones nuevas de Ubuntu que usan el directorio de estado predeterminado, OpenClaw también trata `~/.config/openclaw/gateway.env` como una alternativa de compatibilidad después del `.env` global. Si ambos archivos existen y discrepan, OpenClaw mantiene `~/.openclaw/.env` e imprime una advertencia.

Si falta el archivo de configuración por completo, se omite el paso 4; la importación del shell aún se ejecuta si está habilitada.

## Credenciales del proveedor y espacio de trabajo `.env`

No mantenga las claves de API del proveedor solo en un `.env` del espacio de trabajo. OpenClaw ignora las variables de entorno de credenciales del proveedor de los archivos `.env` del espacio de trabajo, incluidas claves comunes como `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`, `BRAVE_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY` y `FIRECRAWL_API_KEY`.

Utilice una de estas fuentes de confianza para las credenciales del proveedor:

- El entorno de proceso de Gateway, como un shell, unidad launchd/systemd, secreto de contenedor o secreto de CI.
- El archivo dotenv de tiempo de ejecución global en `~/.openclaw/.env` o `$OPENCLAW_STATE_DIR/.env`.
- El bloque de configuración `env` en `~/.openclaw/openclaw.json`.
- Importación opcional del login-shell cuando `env.shellEnv.enabled` o `OPENCLAW_LOAD_SHELL_ENV=1` está habilitado.

Si anteriormente almacenaba las claves del proveedor solo en un espacio de trabajo `.env`, muévalas a una de las fuentes de confianza anteriores. El espacio de trabajo `.env` aún puede proporcionar variables de proyecto ordinarias que no sean credenciales, redirecciones de endpoint, anulaciones de host o controles de tiempo de ejecución `OPENCLAW_*`.

Consulte los [archivos del espacio de trabajo `.env`](/es/gateway/security#workspace-env-files) para conocer la justificación de seguridad.

## Bloque de configuración `env`

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

El bloque de configuración `env` acepta solo valores de cadena literal. No expande
los valores `file:...`; por ejemplo, `XAI_API_KEY: "file:secrets/xai-api-key.txt"`
se pasa a los proveedores como esa cadena exacta.

Para las claves de proveedor respaldadas por archivos, use un SecretRef en el campo de credencial que
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
[superficie de credenciales SecretRef](/es/reference/secretref-credential-surface) para obtener
información sobre los campos compatibles.

## Importación del entorno de Shell

`env.shellEnv` ejecuta su login shell e importa solo las claves esperadas **que faltan**:

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

## Instantáneas de shell de ejecución

En hosts de Gateway que no sean Windows, los comandos `exec` de bash y zsh utilizan una instantánea de inicio de forma predeterminada.
Establezca `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` en el entorno de procesos del Gateway para deshabilitar esta ruta.
Los valores `false`, `no` y `off` también la deshabilitan. Los valores `exec.env` por llamada no pueden alternar
instantáneas ni redirigir el caché de instantáneas.

## Variables de entorno inyectadas en tiempo de ejecución

OpenClaw también inyecta marcadores de contexto en los procesos secundarios generados:

- `OPENCLAW_SHELL=exec`: establecido para comandos ejecutados a través de la herramienta `exec`.
- `OPENCLAW_SHELL=acp`: establecido para las generaciones de procesos de backend del runtime ACP (por ejemplo `acpx`).
- `OPENCLAW_SHELL=acp-client`: establecido para `openclaw acp client` cuando genera el proceso del puente ACP.
- `OPENCLAW_SHELL=tui-local`: establecido para comandos de shell `!` de la TUI local.
- `OPENCLAW_CLI=1`: establecido para procesos secundarios generados por el punto de entrada de la CLI.

Estos son marcadores de tiempo de ejecución (no configuración de usuario requerida). Se pueden usar en la lógica de shell/perfil
para aplicar reglas específicas del contexto.

## Variables de entorno de la interfaz de usuario

- `OPENCLAW_THEME=light`: fuerza la paleta TUI clara cuando su terminal tiene un fondo claro.
- `OPENCLAW_THEME=dark`: fuerza la paleta TUI oscura.
- `COLORFGBG`: si su terminal la exporta, OpenClaw usa la sugerencia de color de fondo para elegir automáticamente la paleta TUI.

## Sustitución de variables de entorno en la configuración

Puede hacer referencia a variables de entorno directamente en los valores de cadena de configuración utilizando la sintaxis `${VAR_NAME}`:

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

Consulte [Configuración: Sustitución de variables de entorno](/es/gateway/configuration-reference#env-var-substitution) para obtener detalles completos.

## Referencias a secretos vs cadenas `${ENV}`

OpenClaw admite dos patrones basados en entorno:

- Sustitución de cadenas `${VAR}` en valores de configuración.
- Objetos SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) para campos que admiten referencias a secretos.

Ambos se resuelven desde el entorno del proceso en el momento de la activación. Los detalles de SecretRef están documentados en [Gestión de secretos](/es/gateway/secrets).
El bloque `env` de configuración en sí no resuelve SecretRefs ni valores abreviados de `file:...`.

## Variables de entorno relacionadas con la ruta

| Variable                 | Propósito                                                                                                                                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | Sobrescribe el directorio home utilizado para los valores predeterminados de ruta interna de OpenClaw (`~/.openclaw/`, directorios de agente, sesiones, credenciales, incorporación del instalador y el checkout de desarrollo predeterminado). Útil cuando se ejecuta OpenClaw como un usuario de servicio dedicado. |
| `OPENCLAW_STATE_DIR`     | Sobrescribe el directorio de estado (predeterminado `~/.openclaw`).                                                                                                                                                                                                                                                   |
| `OPENCLAW_CONFIG_PATH`   | Sobrescribe la ruta del archivo de configuración (predeterminado `~/.openclaw/openclaw.json`).                                                                                                                                                                                                                        |
| `OPENCLAW_INCLUDE_ROOTS` | Lista de rutas de directorios donde las directivas `$include` pueden resolver archivos fuera del directorio de configuración (predeterminado: ninguno — `$include` está confinado al directorio de configuración). Expande tilde (~).                                                                                 |

## Registro

| Variable                         | Propósito                                                                                                                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | Sobrescribe el nivel de registro tanto para archivo como para consola (ej. `debug`, `trace`). Tiene prioridad sobre `logging.level` y `logging.consoleLevel` en la configuración. Los valores no válidos se ignoran con una advertencia. |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | Emite diagnósticos de tiempo de solicitud/respuesta del modelo dirigidos en el nivel `info` sin habilitar registros de depuración globales.                                                                                              |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Diagnósticos de carga del modelo: `summary`, `tools` o `full-redacted`. `full-redacted` está limitado y redactado, pero puede incluir texto de prompt/mensaje.                                                                           |
| `OPENCLAW_DEBUG_SSE`             | Diagnósticos de transmisión: `events` para el tiempo de primer/listo, `peek` para incluir los primeros cinco eventos SSE redactados.                                                                                                     |
| `OPENCLAW_DEBUG_CODE_MODE`       | Diagnósticos de superficie de modelo en modo de código, que incluyen la ocultación de herramientas de proveedor y la aplicación forzosa de solo ejecución/espera.                                                                        |

### `OPENCLAW_HOME`

Cuando se establece, `OPENCLAW_HOME` reemplaza el directorio de inicio del sistema (`$HOME` / `os.homedir()`) para los valores predeterminados de ruta interna de OpenClaw. Esto incluye el directorio de estado predeterminado, la ruta de configuración, los directorios de agentes, las credenciales, el espacio de trabajo de incorporación del instalador y la desprotección de desarrollo predeterminada utilizada por `openclaw update --channel dev`.

**Precedencia:** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Alternativa de inicio de Termux `PREFIX` en Android > `os.homedir()`

**Ejemplo** (macOS LaunchDaemon):

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` también se puede establecer en una ruta con tilde (por ejemplo, `~/svc`), que se expande utilizando la misma cadena de alternativa de inicio del sistema operativo antes de su uso.

Las variables de ruta explícitas como `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH` y `OPENCLAW_GIT_DIR` todavía tienen prioridad. Las tareas de cuenta del sistema operativo, como la detección de archivos de inicio de shell, la configuración del administrador de paquetes y la expansión del host `~` aún pueden usar el directorio de inicio real del sistema.

## usuarios de nvm: fallos de TLS en web_fetch

Si Node.js se instaló mediante **nvm** (no el administrador de paquetes del sistema), el `fetch()` incorporado usa
el almacén de CA incluido en nvm, que puede carecer de CA raíz modernas (ISRG Root X1/X2 para Let's Encrypt,
DigiCert Global Root G2, etc.). Esto hace que `web_fetch` falle con `"fetch failed"` en la mayoría de los sitios HTTPS.

En Linux, OpenClaw detecta automáticamente nvm y aplica la solución en el entorno de inicio real:

- `openclaw gateway install` escribe `NODE_EXTRA_CA_CERTS` en el entorno del servicio systemd
- el punto de entrada de la CLI `openclaw` se vuelve a ejecutar con `NODE_EXTRA_CA_CERTS` establecido antes del inicio de Node

**Solución manual (para versiones anteriores o lanzamientos directos de `node ...`):**

Exporte la variable antes de iniciar OpenClaw:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

No confíes solo en escribir en `~/.openclaw/.env` para esta variable; Node lee
`NODE_EXTRA_CA_CERTS` al iniciar el proceso.

## Variables de entorno heredadas

OpenClaw solo lee variables de entorno `OPENCLAW_*`. Los prefijos heredados
`CLAWDBOT_*` y `MOLTBOT_*` de versiones anteriores se ignoran
silenciosamente.

Si alguno todavía está configurado en el proceso Gateway al inicio, OpenClaw emite una
sola advertencia de obsolescencia de Node (`OPENCLAW_LEGACY_ENV_VARS`) listando los
prefijos detectados y el recuento total. Cambia el nombre de cada valor reemplazando el
prefijo heredado con `OPENCLAW_` (por ejemplo `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`); los nombres antiguos no tienen ningún efecto.

## Relacionado

- [Configuración de Gateway](/es/gateway/configuration)
- [Preguntas frecuentes: variables de entorno y carga de .env](/es/help/faq#env-vars-and-env-loading)
- [Resumen de modelos](/es/concepts/models)
