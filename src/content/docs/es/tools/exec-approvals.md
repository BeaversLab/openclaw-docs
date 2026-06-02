---
summary: "Aprobaciones de ejecución del host: controles de política, listas de permitidos y el flujo de trabajo YOLO/estricto"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "Aprobaciones de ejecución"
sidebarTitle: "Aprobaciones de ejecución"
---

Las aprobaciones de exec son la **red de seguridad de la aplicación complementaria / host del nodo** para permitir que un agente en sandbox ejecute comandos en un host real (`gateway` o `node`). Un interbloqueo de seguridad: los comandos se permiten solo cuando la política + la lista de permitidos + la aprobación de usuario (opcional) están todos de acuerdo. Las aprobaciones de exec se apilan **encima de** la política de herramientas y el control de acceso elevado (a menos que elevated se establezca en `full`, lo que omite las aprobaciones).

<Note>
  La política efectiva es la **más estricta** entre `tools.exec.*` y los valores predeterminados de aprobaciones; si se omite un campo de aprobaciones, se usa el valor `tools.exec`. La exec del host también usa el estado de aprobaciones locales en esa máquina: un `ask: "always"` local del host en `~/.openclaw/exec-approvals.json` sigue solicitando confirmación incluso si los valores
  predeterminados de la sesión o la configuración solicitan `ask: "on-miss"`.
</Note>

## Inspeccionar la política efectiva

| Comando                                                          | Lo que muestra                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | Política solicitada, fuentes de política del host y el resultado efectivo.                             |
| `openclaw exec-policy show`                                      | Vista combinada de la máquina local.                                                                   |
| `openclaw exec-policy set` / `preset`                            | Sincronice la política solicitada local con el archivo de aprobaciones del host local en un solo paso. |

Cuando un ámbito local solicita `host=node`, `exec-policy show` informa que
ese ámbito está gestionado por el nodo en tiempo de ejecución en lugar de fingir que el archivo
de aprobaciones locales es la fuente de la verdad.

Si la interfaz de usuario de la aplicación complementaria **no está disponible**, cualquier solicitud que
normalmente mostraría un aviso se resuelve mediante el **ask fallback** (predeterminado: `deny`).

<Tip>Los clientes de aprobación de chat nativos pueden sembrar facilidades específicas del canal en el mensaje de aprobación pendiente. Por ejemplo, Matrix siembra atajos de reacción (`✅` permitir una vez, `❌` denegar, `♾️` permitir siempre) mientras todavía deja los comandos `/approve ...` en el mensaje como alternativa.</Tip>

## Dónde se aplica

Las aprobaciones de ejecución se aplican localmente en el host de ejecución:

- **Host de puerta de enlace** → proceso `openclaw` en la máquina de puerta de enlace.
- **Host de nodo** → node runner (aplicación complementaria de macOS o host de nodo sin interfaz gráfica).

### Modelo de confianza

- Los llamantes autenticados por la puerta de enlace son operadores de confianza para esa puerta de enlace.
- Los nodos emparejados extienden esa capacidad de operador de confianza al host del nodo.
- Las aprobaciones de ejecución reducen el riesgo de ejecución accidental, pero **no** son un límite de autenticación por usuario ni una política de solo lectura del sistema de archivos.
- Una vez aprobado, un comando puede modificar archivos según los permisos del sistema de archivos del host o del sandbox seleccionado.
- Las ejecuciones de host de nodo aprobadas vinculan el contexto de ejecución canónico: cwd canónico, argv exacto, vinculación de env cuando está presente y ruta ejecutable fijada cuando corresponde.
- Para scripts de shell e invocaciones directas de archivos de intérprete/tiempo de ejecución, OpenClaw también intenta vincular un operando de archivo local concreto. Si ese archivo vinculado cambia después de la aprobación pero antes de la ejecución, la ejecución se deniega en lugar de ejecutar el contenido modificado.
- La vinculación de archivos es intencionalmente de mejor esfuerzo, **no** un modelo semántico completo de cada ruta de cargador de intérprete/tiempo de ejecución. Si el modo de aprobación no puede identificar exactamente un archivo local concreto para vincular, se niega a crear una ejecución respaldada por aprobación en lugar de fingir una cobertura completa.

### División de macOS

- El **servicio de host de nodo** reenvía `system.run` a la **aplicación macOS** a través de IPC local.
- La **aplicación macOS** hace cumplir las aprobaciones y ejecuta el comando en el contexto de la interfaz de usuario.

## Configuración y almacenamiento

Las aprobaciones residen en un archivo JSON local en el host de ejecución:

```text
~/.openclaw/exec-approvals.json
```

Esquema de ejemplo:

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## Controles de política

### `tools.exec.mode`

`tools.exec.mode` es la superficie de política normalizada preferida para la ejecución en el host. Los valores son:

- `deny` - bloquear la ejecución en el host.
- `allowlist` - ejecutar solo comandos en la lista de permitidos sin preguntar.
- `ask` - usar la política de lista de permitidos y preguntar en caso de fallos.
- `auto` - usar la política de lista de permitidos, ejecutar coincidencias deterministas directamente y enviar fallos de aprobación a través del revisor automático nativo de OpenClaw antes de recurrir a una ruta de aprobación humana.
- `full` - ejecutar en el host sin indicaciones de aprobación.

Los `tools.exec.security` / `tools.exec.ask` heredados siguen siendo compatibles y aún tienen prioridad
cuando se establecen en el ámbito de sesión o agente más estrecho.

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - bloquear todas las solicitudes de ejecución en el host.
  - `allowlist` - permitir solo comandos en la lista de permitidos.
  - `full` - permitir todo (equivalente a elevado).

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - nunca preguntar.
  - `on-miss` - preguntar solo cuando la lista de permitidos no coincida.
  - `always` - preguntar en cada comando. La confianza duradera de `allow-always` **no** suprime las indicaciones cuando el modo de pregunta efectivo es `always`.

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  Resolución cuando se requiere una indicación pero no se puede acceder a ninguna interfaz de usuario.

- `deny` - bloquear.
- `allowlist` - permitir solo si coincide con la lista de permitidos.
- `full` - permitir.

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  Cuando `true`, OpenClaw trata los formularios de evaluación de código en línea como solo de aprobación incluso si el binario del intérprete en sí está en la lista de permitidos. Defensa en profundidad para cargadores de intérpretes que no se asignan limpiamente a un operando de archivo estable.
</ParamField>

Ejemplos que detecta el modo estricto:

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

En modo estricto, estos comandos aún necesitan aprobación explícita y
`allow-always` no persiste nuevas entradas de lista de permitidos para ellos
automáticamente.

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  Controla solo la presentación en los avisos de aprobación de ejecución. Cuando está habilitado, OpenClaw puede adjuntar intervalos de comando derivados del analizador para que los avisos de aprobación web puedan resaltar los tokens de comando. Establézcalo en `true` para habilitar el resaltado de texto de comando.
</ParamField>

Esta configuración **no** cambia `security`, `ask`, la coincidencia de lista de permitidos,
el comportamiento estricto de evaluación en línea, el reenvío de aprobaciones o la ejecución de comandos.
Se puede configurar globalmente bajo `tools.exec.commandHighlighting` o por
agente bajo `agents.list[].tools.exec.commandHighlighting`.

## Modo YOLO (sin aprobación)

Si desea que la ejecución en el host se ejecute sin avisos de aprobación, debe abrir
**ambas** capas de política: política de ejecución solicitada en la configuración de OpenClaw
(`tools.exec.*`) **y** política de aprobaciones locales del host en
`~/.openclaw/exec-approvals.json`.

YOLO es el comportamiento predeterminado del host a menos que lo ajuste explícitamente:

| Capa                  | Configuración YOLO         |
| --------------------- | -------------------------- |
| `tools.exec.security` | `full` en `gateway`/`node` |
| `tools.exec.ask`      | `off`                      |
| Host `askFallback`    | `full`                     |

<Warning>
**Distinciones importantes:**

- `tools.exec.host=auto` elige **dónde** se ejecuta exec: sandbox cuando está disponible, de lo contrario gateway.
- YOLO elige **cómo** se aprueba el exec del host: `security=full` más `ask=off`.
- En modo YOLO, OpenClaw **no** añade una puerta de aprobación heurística separada de ofuscación de comandos ni una capa de rechazo de pre-vuelo de secuencias de comandos encima de la política de exec del host configurada.
- `auto` no convierte el enrutamiento gateway en una anulación gratuita desde una sesión sandbox. Una solicitud `host=node` por llamada se permite desde `auto`; `host=gateway` solo se permite desde `auto` cuando no hay ningún tiempo de ejecución sandbox activo. Para un valor predeterminado no automático y estable, establezca `tools.exec.host` o use `/exec host=...` explícitamente.

</Warning>

Los proveedores respaldados por CLI que exponen su propio modo de permiso no interactivo
pueden seguir esta política. Claude CLI añade
`--permission-mode bypassPermissions` cuando la política efectiva de exec
de OpenClaw es YOLO. Para las sesiones en vivo de Claude administradas por OpenClaw, la política
efectiva de exec de OpenClaw tiene autoridad sobre el modo de permiso nativo de Claude:
YOLO normaliza los lanzamientos en vivo a `--permission-mode bypassPermissions` y
la política efectiva de exec restrictiva normaliza los lanzamientos en vivo a
`--permission-mode default`, incluso si los argumentos del backend de Claude sin procesar especifican otro
modo.

Si desea una configuración más conservadora, vuelva a ajustar la política de exec de OpenClaw a
`allowlist` / `on-miss` o `deny`.

### Configuración "nunca preguntar" persistente para host de gateway

<Steps>
  <Step title="Establezca la política de configuración solicitada">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="Haga coincidir el archivo de aprobaciones del host">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### Acceso directo local

```bash
openclaw exec-policy preset yolo
```

Ese acceso directo local actualiza ambos:

- `tools.exec.host/security/ask` local.
- Valores predeterminados de `~/.openclaw/exec-approvals.json` locales.

Es intencionalmente solo local. Para cambiar las aprobaciones del gateway-host o node-host de forma remota, use `openclaw approvals set --gateway` o `openclaw approvals set --node <id|name|ip>`.

### Node host

Para un node host, aplique el mismo archivo de aprobaciones en ese nodo en su lugar:

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
**Limitaciones solo locales:**

- `openclaw exec-policy` no sincroniza las aprobaciones del nodo.
- `openclaw exec-policy set --host node` es rechazado.
- Las aprobaciones de ejecución del nodo se obtienen del nodo en tiempo de ejecución, por lo que las actualizaciones dirigidas al nodo deben usar `openclaw approvals --node ...`.

</Note>

### Acceso directo solo para la sesión

- `/exec security=full ask=off` cambia solo la sesión actual.
- `/elevated full` es un acceso directo de emergencia que omite las aprobaciones de ejecución solo cuando tanto la política solicitada como el archivo de aprobaciones del host se resuelven en `security: "full"` y `ask: "off"`. Un archivo de host más estricto, como `ask: "always"`, todavía solicitará confirmación.

Si el archivo de aprobaciones del host se mantiene más estricto que la configuración, la política del host más estricta aún prevalece.

## Lista blanca (por agente)

Las listas blancas son **por agente**. Si existen varios agentes, cambie el agente que está editando en la aplicación de macOS. Los patrones son coincidencias glob.

Los patrones pueden ser globos de ruta binaria resueltos o globos de nombre de comando simple. Los nombres simples coinciden solo con comandos invocados a través de `PATH`, por lo que `rg` puede coincidir con `/opt/homebrew/bin/rg` cuando el comando es `rg`, pero **no** `./rg` o `/tmp/rg`. Use un globo de ruta cuando desee confiar en una ubicación binaria específica.

Las entradas heredadas `agents.default` se migran a `agents.main` al cargar. Las cadenas de shell como `echo ok && pwd` aún necesitan que cada segmento de nivel superior satisfaga las reglas de la lista blanca.

Ejemplos:

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### Restringir argumentos con argPattern

Agregue `argPattern` cuando una entrada de la lista permitida debe coincidir con un binario y una forma de argumento específica. OpenClaw evalúa la expresión regular contra los argumentos de comando analizados, excluyendo el token ejecutable (`argv[0]`). Para las entradas creadas manualmente, los argumentos se unen con un solo espacio, por lo que debe anclar el patrón cuando necesite una coincidencia exacta.

```json
{
  "version": 1,
  "agents": {
    "main": {
      "allowlist": [
        {
          "pattern": "python3",
          "argPattern": "^safe\\.py$"
        }
      ]
    }
  }
}
```

Esa entrada permite `python3 safe.py`; `python3 other.py` es un fallo en la lista permitida. Si también está presente una entrada de solo ruta para el mismo binario, los argumentos sin coincidencia aún pueden volver a esa entrada de solo ruta. Omita la entrada de solo ruta cuando el objetivo es restringir el binario a los argumentos declarados.

Las entradas guardadas por los flujos de aprobación pueden usar un formato de separador interno para la coincidencia exacta de argv. Prefiera usar la interfaz de usuario o el flujo de aprobación para regenerar esas entradas en lugar de editar manualmente el valor codificado. Si OpenClaw no puede analizar argv para un segmento de comando, las entradas con `argPattern` no coinciden.

Cada entrada de la lista permitida admite:

| Campo              | Significado                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| `pattern`          | Ruta de binario resuelta glob o nombre de comando simple glob            |
| `argPattern`       | Regex de argv opcional; las entradas omitidas son de solo ruta           |
| `id`               | UUID estable utilizado para la identidad de la interfaz de usuario       |
| `source`           | Fuente de la entrada, como `allow-always`                                |
| `commandText`      | Texto de comando capturado cuando un flujo de aprobación creó la entrada |
| `lastUsedAt`       | Marca de tiempo de la última vez que se usó                              |
| `lastUsedCommand`  | Último comando que coincidió                                             |
| `lastResolvedPath` | Última ruta de binario resuelta                                          |

## Permitir automáticamente CLIs de habilidades

Cuando **Permitir automáticamente CLIs de habilidades** está habilitado, los ejecutables a los que se hace referencia por habilidades conocidas se tratan como permitidos en los nodos (nodo macOS o host de nodo sin interfaz). Esto usa `skills.bins` sobre el Gateway RPC para obtener la lista de binarios de la habilidad. Deshabilite esto si desea listas permitidas manuales estrictas.

<Warning>
- Esta es una **lista de permisos de conveniencia implícita**, separada de las entradas manuales de la lista de permisos de ruta.
- Está diseñada para entornos de operadores de confianza donde Gateway y el nodo están en el mismo límite de confianza.
- Si requiere una confianza explícita estricta, mantenga `autoAllowSkills: false` y use solo entradas manuales de la lista de permisos de ruta.

</Warning>

## Bins seguros y reenvío de aprobaciones

Para bins seguros (la ruta rápida de solo stdin), detalles de vinculación del intérprete y
cómo reenviar mensajes de aprobación a Slack/Discord/Telegram (o ejecutarlos como
clientes de aprobación nativos), consulte
[Exec approvals - advanced](/es/tools/exec-approvals-advanced).

## Edición de la interfaz de usuario de control

Use la tarjeta **Control UI → Nodes → Exec approvals** para editar los valores predeterminados, las anulaciones por agente y las listas de permisos. Elija un alcance (Defaults o un agente), ajuste la política, agregue/elimine patrones de lista de permisos y luego haga clic en **Save**. La interfaz de usuario muestra metadatos de último uso por patrón para que pueda mantener la lista ordenada.

El selector de destino elige **Gateway** (aprobaciones locales) o un **Node**. Los nodos deben anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz gráfica). Si un nodo aún no anuncia las aprobaciones de ejecución, edite su `~/.openclaw/exec-approvals.json` local directamente.

CLI: `openclaw approvals` admite la edición de puerta de enlace o nodo; consulte
[Approvals CLI](/es/cli/approvals).

## Flujo de aprobación

Cuando se requiere un aviso, la puerta de enlace transmite `exec.approval.requested` a los clientes del operador. La interfaz de usuario de Control y la aplicación macOS lo resuelven a través de `exec.approval.resolve`; luego, la puerta de enlace reenvía la solicitud aprobada al host del nodo.

Para `host=node`, las solicitudes de aprobación incluyen una carga útil canónica `systemRunPlan`. La puerta de enlace usa ese plan como contexto de comando/cwd/sesión autorizado al reenviar las solicitudes `system.run` aprobadas.

Eso es importante para la latencia de aprobación asíncrona:

- La ruta de ejecución del nodo prepara un plan canónico por adelantado.
- El registro de aprobación almacena ese plan y sus metadatos de enlace.
- Una vez aprobada, la llamada final reenviada `system.run` reutiliza el plan almacenado en lugar de confiar en ediciones posteriores de la persona que llama.
- Si el autor de la llamada cambia `command`, `rawCommand`, `cwd`, `agentId` o `sessionKey` después de que se haya creado la solicitud de aprobación, la puerta de enlace rechaza la ejecución reenviada como una discrepancia de aprobación.

## Eventos del sistema

El ciclo de vida de exec se expone como mensajes del sistema:

- `Exec running` (solo si el comando excede el umbral de aviso de ejecución).
- `Exec finished`.

Estos se publican en la sesión del agente después de que el nodo informa del evento.
Las aprobaciones de ejecución denegadas son terminales para el comando del host en sí: el comando
no se ejecuta. Para las aprobaciones asíncronas del agente principal con una sesión de origen,
OpenClaw publica la denegación en esa sesión como un seguimiento interno para que el
agente pueda dejar de esperar el comando asíncrono y evitar una reparación por falta de resultados.
Si no hay sesión o la sesión no se puede reanudar, OpenClaw aún puede
informar una denegación concisa al operador o a la ruta de chat directo. Las denegaciones para
las sesiones de subagente no se publican de nuevo en el subagente.
Las aprobaciones de ejecución del host de puerta de enlace emiten los mismos eventos del ciclo de vida cuando
el comando termina (y opcionalmente cuando se ejecuta más tiempo que el umbral).
Las ejecuciones con control de aprobación reutilizan el id de aprobación como el `runId` en estos
mensajes para facilitar la correlación.

## Comportamiento de aprobación denegada

Cuando se deniega una aprobación de ejecución asíncrona, OpenClaw trata el comando del host como
terminal y falla de forma segura (fail-closed). Para las sesiones del agente principal, la denegación se entrega como un
seguimiento de sesión interno que indica al agente que el comando asíncrono no se ejecutó.
Eso preserva la continuidad de la transcripción sin exponer una salida de comando obsoleta. Si
la entrega de la sesión no está disponible, OpenClaw recurre a una denegación concisa al operador o
denegación de chat directo cuando existe una ruta segura.

## Implicaciones

- **`full`** es potente; prefiera listas de permitidos (allowlists) cuando sea posible.
- **`ask`** lo mantiene informado y, al mismo tiempo, permite aprobaciones rápidas.
- Las listas de permitidos por agente evitan que las aprobaciones de un agente se filtren a otros.
- Las aprobaciones solo se aplican a las solicitudes de ejecución del host de **remitentes autorizados**. Los remitentes no autorizados no pueden emitir `/exec`.
- `/exec security=full` es una comodidad a nivel de sesión para operadores autorizados y omite aprobaciones por diseño. Para bloquear totalmente la ejecución en el host, configure la seguridad de aprobaciones en `deny` o deniegue la herramienta `exec` mediante la política de herramientas.

## Relacionado

<CardGroup cols={2}>
  <Card title="Aprobaciones de ejecución: avanzado" href="/es/tools/exec-approvals-advanced" icon="gear">
    Bins seguros, vinculación de intérpretes y reenvío de aprobaciones al chat.
  </Card>
  <Card title="Herramienta Exec" href="/es/tools/exec" icon="terminal">
    Herramienta de ejecución de comandos de shell.
  </Card>
  <Card title="Modo elevado" href="/es/tools/elevated" icon="shield-exclamation">
    Ruta de emergencia que también omite aprobaciones.
  </Card>
  <Card title="Sandboxing" href="/es/gateway/sandboxing" icon="box">
    Modos de espacio aislado (sandbox) y acceso al espacio de trabajo.
  </Card>
  <Card title="Seguridad" href="/es/gateway/security" icon="lock">
    Modelo de seguridad y endurecimiento.
  </Card>
  <Card title="Sandbox vs política de herramientas vs elevado" href="/es/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    Cuándo usar cada control.
  </Card>
  <Card title="Habilidades" href="/es/tools/skills" icon="sparkles">
    Comportamiento de autorización automática respaldado por habilidades.
  </Card>
</CardGroup>
