---
summary: "Aprobaciones de ejecución del host: controles de política, listas de permitidos y el flujo de trabajo YOLO/estricto"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "Aprobaciones de ejecución"
sidebarTitle: "Aprobaciones de ejecución"
---

Las aprobaciones de ejecución son la **barra de protección de la aplicación complementaria / host del nodo** para permitir
que un agente en sandbox ejecute comandos en un host real (`gateway` o `node`). Un
interbloqueo de seguridad: los comandos solo se permiten cuando la política + lista de permitidos +
aprobación (opcional) del usuario están todos de acuerdo. Las aprobaciones de ejecución se apilan **encima de**
la política de herramientas y el filtrado elevado (a menos que elevado se establezca en `full`, lo que
omite las aprobaciones).

<Note>
  La política efectiva es la **más estricta** entre `tools.exec.*` y los valores predeterminados de aprobaciones; si se omite un campo de aprobaciones, se usa el valor de `tools.exec`. La ejecución del host también usa el estado local de aprobaciones en esa máquina: un `ask: "always"` local del host en `~/.openclaw/exec-approvals.json` sigue solicitando confirmación incluso si los valores
  predeterminados de la sesión o la configuración solicitan `ask: "on-miss"`.
</Note>

## Inspeccionar la política efectiva

| Comando                                                          | Lo que muestra                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | Política solicitada, fuentes de política del host y el resultado efectivo.                             |
| `openclaw exec-policy show`                                      | Vista combinada de la máquina local.                                                                   |
| `openclaw exec-policy set` / `preset`                            | Sincronice la política solicitada local con el archivo de aprobaciones del host local en un solo paso. |

Cuando un ámbito local solicita `host=node`, `exec-policy show` informa que
ese ámbito está gestionado por el nodo en tiempo de ejecución en lugar de fingir que el archivo local de
aprobaciones es la fuente de verdad.

Si la interfaz de usuario de la aplicación complementaria **no está disponible**, cualquier solicitud que normalmente
solicitaría confirmación se resuelve mediante el **respaldo de pregunta** (predeterminado: `deny`).

<Tip>Los clientes de aprobación de chat nativos pueden sembrar facilidades específicas del canal en el mensaje de aprobación pendiente. Por ejemplo, Matrix siembra atajos de reacción (`✅` permitir una vez, `❌` denegar, `♾️` permitir siempre) mientras todavía deja comandos `/approve ...` en el mensaje como respaldo.</Tip>

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

- El **servicio de host de nodo** reenvía `system.run` a la **aplicación macOS** a través del IPC local.
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

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - bloquear todas las solicitudes de ejecución del host.
  - `allowlist` - permitir solo los comandos en la lista de permitidos.
  - `full` - permitir todo (equivalente a elevado).

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - nunca preguntar.
  - `on-miss` - preguntar solo cuando la lista de permitidos no coincida.
  - `always` - preguntar en cada comando. `allow-always` La confianza duradera **no** suprime las preguntas cuando el modo de petición efectivo es `always`.

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  Resolución cuando se requiere una pregunta pero no se puede alcanzar ninguna interfaz de usuario.

- `deny` - bloquear.
- `allowlist` - permitir solo si la lista de permitidos coincide.
- `full` - permitir.

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  Cuando `true`, OpenClaw trata las formas de evaluación de código en línea como solo aprobación incluso si el binario del intérprete en sí está en la lista de permitidos. Defensa en profundidad para cargadores de intérpretes que no se mapean limpiamente a un archivo estable operando.
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
`allow-always` no guarda automáticamente nuevas entradas en la lista de permitidos para ellos.

## Modo YOLO (sin aprobación)

Si desea que la ejecución en el host se ejecute sin solicitudes de aprobación, debe abrir
**ambas** capas de política: la política de ejecución solicitada en la configuración de OpenClaw
(`tools.exec.*`) **y** la política de aprobaciones locales del host en
`~/.openclaw/exec-approvals.json`.

YOLO es el comportamiento predeterminado del host a menos que lo restrinja explícitamente:

| Capa                  | Configuración YOLO         |
| --------------------- | -------------------------- |
| `tools.exec.security` | `full` en `gateway`/`node` |
| `tools.exec.ask`      | `off`                      |
| Host `askFallback`    | `full`                     |

<Warning>
**Distinciones importantes:**

- `tools.exec.host=auto` elige **dónde** se ejecuta exec: en sandbox si está disponible, si no, en gateway.
- YOLO elige **cómo** se aprueba el exec del host: `security=full` más `ask=off`.
- En modo YOLO, OpenClaw **no** añade una puerta de aprobación heurística separada de ofuscación de comandos ni una capa de rechazo de pre-vuelta de guión sobre la política de exec del host configurada.
- `auto` no convierte el enrutamiento gateway en una anulación gratuita desde una sesión sandbox. Una solicitud `host=node` por llamada se permite desde `auto`; `host=gateway` solo se permite desde `auto` cuando no hay un tiempo de ejecución sandbox activo. Para un valor predeterminado estable no automático, establezca `tools.exec.host` o use `/exec host=...` explícitamente.

</Warning>

Los proveedores con respaldo de CLI que exponen su propio modo de permiso no interactivo
pueden seguir esta política. Claude CLI añade
`--permission-mode bypassPermissions` cuando la política exec solicitada por OpenClaw
es YOLO. Anule ese comportamiento del backend con argumentos explícitos de Claude
bajo `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` -
por ejemplo `--permission-mode default`, `acceptEdits`, o
`bypassPermissions`.

Si desea una configuración más conservadora, ajuste cualquier capa de nuevo a
`allowlist` / `on-miss` o `deny`.

### Configuración de "nunca preguntar" para host de gateway persistente

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

Es intencionalmente solo local. Para cambiar las aprobaciones del host gateway o del host nodo
de forma remota, use `openclaw approvals set --gateway` o
`openclaw approvals set --node <id|name|ip>`.

### Host nodo

Para un host nodo, aplique el mismo archivo de aprobaciones en ese nodo en su lugar:

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

- `openclaw exec-policy` no sincroniza las aprobaciones de nodos.
- `openclaw exec-policy set --host node` se rechaza.
- Las aprobaciones de ejecución de nodos se obtienen del nodo en tiempo de ejecución, por lo que las actualizaciones dirigidas al nodo deben usar `openclaw approvals --node ...`.

</Note>

### Acceso directo solo de sesión

- `/exec security=full ask=off` cambia solo la sesión actual.
- `/elevated full` es un acceso directo de ruptura de cristal que también omite las aprobaciones de ejecución para esa sesión.

Si el archivo de aprobaciones del host sigue siendo más estricto que la configuración, la política de host más estricta aún prevalece.

## Lista de permitidos (por agente)

Las listas de permitidos son **por agente**. Si existen varios agentes, cambie el agente que está editando en la aplicación macOS. Los patrones son coincidencias glob.

Los patrones pueden ser globs de ruta binaria resuelta o globs de nombre de comando simple. Los nombres simples coinciden solo con comandos invocados a través de `PATH`, por lo que `rg` puede coincidir con `/opt/homebrew/bin/rg` cuando el comando es `rg`, pero **no** `./rg` o `/tmp/rg`. Use un glob de ruta cuando desee confiar en una ubicación binaria específica.

Las entradas heredadas de `agents.default` se migran a `agents.main` al cargar. Las cadenas de shell como `echo ok && pwd` aún necesitan que cada segmento de nivel superior satisfaga las reglas de la lista de permitidos.

Ejemplos:

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### Restricción de argumentos con argPattern

Agregue `argPattern` cuando una entrada de la lista de permitidos debe coincidir con un binario y una forma de argumento específica. OpenClaw evalúa la expresión regular contra los argumentos del comando analizados, excluyendo el token ejecutable (`argv[0]`). Para las entradas creadas manualmente, los argumentos se unen con un solo espacio, por lo que debe anclar el patrón cuando necesite una coincidencia exacta.

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

Esa entrada permite `python3 safe.py`; `python3 other.py` es un fallo en la lista de permitidos.
Si también está presente una entrada de solo ruta para el mismo binario, los argumentos no coincidentes aún pueden volver a esa entrada de solo ruta. Omita la entrada de solo ruta cuando el objetivo sea restringir el binario a los argumentos declarados.

Las entradas guardadas por los flujos de aprobación pueden utilizar un formato de separador interno para la coincidencia exacta de argv. Prefiera la interfaz de usuario o el flujo de aprobación para regenerar esas entradas en lugar de editar manualmente el valor codificado. Si OpenClaw no puede analizar argv para un segmento de comando, las entradas con `argPattern` no coinciden.

Cada entrada de la lista de permitidos admite:

| Campo              | Significado                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| `pattern`          | Ruta de binario resuelta glob o nombre de comando simple glob            |
| `argPattern`       | Regex opcional de argv; las entradas omitidas son de solo ruta           |
| `id`               | UUID estable utilizado para la identidad de la interfaz de usuario       |
| `source`           | Origen de la entrada, como `allow-always`                                |
| `commandText`      | Texto de comando capturado cuando un flujo de aprobación creó la entrada |
| `lastUsedAt`       | Marca de tiempo de la última vez que se usó                              |
| `lastUsedCommand`  | Último comando que coincidió                                             |
| `lastResolvedPath` | Última ruta de binario resuelta                                          |

## Permitir automáticamente las CLIs de habilidades

Cuando **Permitir automáticamente las CLIs de habilidades** está habilitado, los ejecutables referenciados por habilidades conocidas se tratan como permitidos en los nodos (nodo macOS o host de nodo sin cabeza). Esto utiliza `skills.bins` a través de Gateway RPC para obtener la lista de binarios de la habilidad. Deshabilite esto si desea listas de permitidos manuales estrictas.

<Warning>
- Esta es una **lista de permitidos implícita por conveniencia**, separada de las entradas manuales de la lista de permitidos de rutas.
- Está destinada a entornos de operadores de confianza donde Gateway y el nodo están en el mismo límite de confianza.
- Si requiere una confianza explícita estricta, mantenga `autoAllowSkills: false` y use solo entradas manuales de la lista de permitidos de rutas.

</Warning>

## Bins seguros y reenvío de aprobaciones

Para bins seguros (la ruta rápida de solo stdin), detalles de vinculación del intérprete y cómo reenviar avisos de aprobación a Slack/Discord/Telegram (o ejecutarlos como clientes de aprobación nativos), consulte
[Exec approvals - advanced](/es/tools/exec-approvals-advanced).

## Edición de la interfaz de usuario de control

Use la tarjeta **Control UI → Nodes → Exec approvals** para editar los valores predeterminados, las anulaciones por agente y las listas de permitidos. Elija un ámbito (Predeterminados o un agente), ajuste la política, agregue/elimine patrones de lista de permitidos y luego haga clic en **Guardar**. La IU muestra los metadatos de última utilización por patrón para que pueda mantener la lista ordenada.

El selector de destino elige **Gateway** (aprobaciones locales) o un **Nodo**. Los nodos deben anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz gráfica). Si un nodo aún no anuncia aprobaciones de ejecución, edite su `~/.openclaw/exec-approvals.json` local directamente.

CLI: `openclaw approvals` admite la edición de gateway o de nodo; consulte [Approvals CLI](/es/cli/approvals).

## Flujo de aprobación

Cuando se requiere un aviso, la puerta de enlace transmite `exec.approval.requested` a los clientes del operador. La interfaz de usuario de control y la aplicación de macOS lo resuelven a través de `exec.approval.resolve`, y luego la puerta de enlace reenvía la solicitud aprobada al host del nodo.

Para `host=node`, las solicitudes de aprobación incluyen una carga útil `systemRunPlan` canónica. La puerta de enlace utiliza ese plan como contexto de comando/directorio de trabajo/sesión autorizado al reenviar solicitudes `system.run` aprobadas.

Esto es importante para la latencia de aprobación asíncrona:

- La ruta de ejecución del nodo prepara un plan canónico por adelantado.
- El registro de aprobación almacena ese plan y sus metadatos de vinculación.
- Una vez aprobada, la llamada `system.run` final reenviada reutiliza el plan almacenado en lugar de confiar en las ediciones posteriores del llamador.
- Si el llamador cambia `command`, `rawCommand`, `cwd`, `agentId` o `sessionKey` después de que se creó la solicitud de aprobación, la puerta de enlace rechaza la ejecución reenviada como una discrepancia de aprobación.

## Eventos del sistema

El ciclo de vida de ejecución se muestra como mensajes del sistema:

- `Exec running` (solo si el comando excede el umbral de aviso de ejecución).
- `Exec finished`.
- `Exec denied`.

Estos se publican en la sesión del agente después de que el nodo informa del evento.
Las aprobaciones de exec del host Gateway emiten los mismos eventos del ciclo de vida cuando
el comando finaliza (y opcionalmente cuando se ejecuta por más tiempo que el umbral).
Los execs con puerta de aprobación reutilizan el id de aprobación como el `runId` en estos
mensajes para facilitar la correlación.

## Comportamiento ante la denegación de aprobación

Cuando se deniega una aprobación de exec asíncrona, OpenClaw evita que el agente
reutilice la salida de cualquier ejecución anterior del mismo comando en la sesión.
El motivo de la denegación se pasa con una guía explícita de que no hay salida de comando
disponible, lo que evita que el agente afirme que hay una nueva salida o
repita el comando denegado con resultados obsoletos de una ejecución anterior exitosa.

## Implicaciones

- **`full`** es potente; se prefieren las listas de permitidos (allowlists) cuando sea posible.
- **`ask`** te mantiene informado mientras permite aprobaciones rápidas.
- Las listas de permitidos por agente evitan que las aprobaciones de un agente se filtren hacia otros.
- Las aprobaciones solo se aplican a solicitudes de exec de host de **remitentes autorizados**. Los remitentes no autorizados no pueden emitir `/exec`.
- `/exec security=full` es una conveniencia a nivel de sesión para operadores autorizados y omite aprobaciones por diseño. Para bloquear totalmente el exec de host, configure la seguridad de aprobaciones en `deny` o deniegue la herramienta `exec` mediante la política de herramientas.

## Relacionado

<CardGroup cols={2}>
  <Card title="Aprobaciones de exec - avanzadas" href="/es/tools/exec-approvals-advanced" icon="gear">
    Bins seguros, vinculación de intérprete y reenvío de aprobaciones al chat.
  </Card>
  <Card title="Herramienta Exec" href="/es/tools/exec" icon="terminal">
    Herramienta de ejecución de comandos de shell.
  </Card>
  <Card title="Modo elevado" href="/es/tools/elevated" icon="shield-exclamation">
    Ruta de emergencia que también omite aprobaciones.
  </Card>
  <Card title="Sandboxing" href="/es/gateway/sandboxing" icon="box">
    Modos de espacio aislado y acceso al espacio de trabajo.
  </Card>
  <Card title="Security" href="/es/gateway/security" icon="lock">
    Modelo de seguridad y endurecimiento.
  </Card>
  <Card title="Sandbox vs tool policy vs elevated" href="/es/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    Cuándo utilizar cada control.
  </Card>
  <Card title="Skills" href="/es/tools/skills" icon="sparkles">
    Comportamiento de auto-permitido respaldado por habilidades.
  </Card>
</CardGroup>
