---
summary: "Referencia de CLI para tarjetas, despacho y ejecuciones de trabajadores de `openclaw workboard`"
read_when:
  - You want to inspect or create Workboard cards from the terminal
  - You want to dispatch Workboard worker runs from the CLI
  - You are debugging Workboard CLI or slash command behavior
title: "CLI de Workboard"
---

`openclaw workboard` es la interfaz de terminal para el complemento
[Workboard plugin](/es/plugins/workboard) incluido. Permite a un operador listar tarjetas, crear una
tarjeta, inspeccionar una tarjeta y pedir al Gateway en ejecución que despache trabajo listo en
ejecuciones de trabajador subagente.

Habilite el complemento antes de usar el comando:

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## Uso

```bash
openclaw workboard list [--board <id>] [--status <status>] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard dispatch [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

El comando lee y escribe la misma base de datos SQLite propiedad del complemento que utilizan el
dashboard y las herramientas de agente de Workboard. Los ids de tarjetas se pueden pasar por id completo o por un
prefijo inequívoco cuando un comando acepta un id de tarjeta.

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

La salida de texto es compacta:

```text
7f4a2c10  ready     high    default agent-a  Fix stale worker heartbeat
```

Las columnas son prefijo de id, estado, prioridad, id de tablero, id de agente opcional y título.

Banderas:

| Bandera             | Propósito                                                   |
| ------------------- | ----------------------------------------------------------- |
| `--board <id>`      | Limitar los resultados a un espacio de nombres de tablero   |
| `--status <status>` | Limitar los resultados a un estado de Workboard             |
| `--json`            | Imprimir la lista completa de tarjetas como JSON de máquina |

## `create`

```bash
openclaw workboard create "Fix stale worker heartbeat" --priority high --labels bug,workboard
openclaw workboard create "Write Workboard docs" --status ready --agent docs-agent --board docs --notes "Cover CLI, slash command, dispatch, and SQLite state."
```

Banderas:

| Bandera                 | Propósito                                              |
| ----------------------- | ------------------------------------------------------ |
| `--notes <text>`        | Notas iniciales de la tarjeta                          |
| `--status <status>`     | Estado inicial, predeterminado `todo`                  |
| `--priority <priority>` | Prioridad, predeterminado `normal`                     |
| `--agent <id>`          | Asignar la tarjeta a un agente o id de propietario     |
| `--board <id>`          | Guardar la tarjeta en un espacio de nombres de tablero |
| `--labels <items>`      | Etiquetas separadas por comas                          |
| `--json`                | Imprimir la tarjeta creada como JSON de máquina        |

`create` escribe directamente en el estado SQLite de Workboard. La tarjeta es inmediatamente
visible en la pestaña Workboard de la Interfaz de Control y para las herramientas de Workboard.

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

La salida de texto imprime la línea compacta de la tarjeta y las notas. La salida JSON devuelve el registro
completo de la tarjeta, incluyendo metadatos de ejecución, intentos, comentarios, enlaces, pruebas,
artefactos, registros de trabajador, estado del protocolo, diagnósticos y metadatos de automatización.

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` primero llama al método RPC del Gateway en ejecución
`workboard.cards.dispatch`. Esa ruta utiliza el mismo tiempo de ejecución del subagente que la
acción de envío del panel, por lo que las tarjetas listas se convierten en ejecuciones de trabajador rastreadas por tareas con
claves de sesión vinculadas. Las tarjetas con un agente asignado utilizan claves de sesión de subagente con ámbito de agente;
las tarjetas no asignadas mantienen una clave de subagente sin ámbito para que se preserve el
agente predeterminado configurado del Gateway.

El bucle de envío:

1. Promueve los hijos listos para dependencias a `ready`.
2. Bloquea reclamaciones caducadas o ejecuciones de trabajador agotadas por tiempo.
3. Registra metadatos de envío en tarjetas listas.
4. Selecciona un pequeño lote de tarjetas listas sin reclamar.
5. Reclama cada tarjeta seleccionada para el despachador o el agente asignado.
6. Inicia una ejecución de trabajador de subagente con contexto de tarjeta delimitado y el token de
   reclamación de la tarjeta.
7. Almacena el id de la ejecución del trabajador, la clave de sesión, el vínculo de la tarea cuando el libro mayor de tareas del Gateway
   lo reporta, el estado de ejecución y el registro del trabajador en la tarjeta.

La selección es intencionalmente conservadora. Un envío inicia como máximo tres
trabajadores de manera predeterminada, omite tarjetas archivadas o ya reclamadas, e inicia solo una
tarjeta por propietario o agente en una sola pasada. Las tarjetas que ya son propiedad de trabajo activo en ejecución
o de revisión se dejan para un envío posterior.

Si el inicio del trabajador falla después de que se reclama una tarjeta, Workboard bloquea esa tarjeta,
borra la reclamación y registra el error en los metadatos de ejecución de la tarjeta y el registro del
trabajador. Esto mantiene visibles los inicios fallidos en lugar de devolver silenciosamente la
tarjeta a la cola.

Si no se proporciona un objetivo de Gateway explícito y el Gateway local no está disponible
o aún no expone el método de envío de Workboard, la CLI recurre al
envío solo de datos contra el estado local de Workboard. El envío solo de datos aún puede
promover dependencias, limpiar reclamaciones obsoletas y bloquear ejecuciones agotadas por tiempo, pero no
inicia trabajadores. Los fallos de autenticación, permisos, validación, y los fallos para un
objetivo `--url` o `--token` explícito se informan directamente.

La salida de texto informa los inicios de los trabajadores:

```text
dispatch complete: started=2 failures=0
```

La salida de respaldo es explícita:

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

La salida JSON incluye el resultado del envío. El envío respaldado por Gateway puede incluir
`started` y `startFailures`; la alternativa solo de datos incluye
`gatewayUnavailable: true`. Los tokens de reclamación se redactan de la salida JSON de la tarjeta.

En el panel, el mismo resultado de despacho se muestra como un breve resumen para que un operador pueda ver cuántas tarjetas se iniciaron, promovieron, bloquearon, recuperaron o fallaron sin abrir los detalles de la tarjeta.

## Paridad de comandos de barra

Los canales con capacidad de comandos pueden usar el comando de barra coincidente:

```text
/workboard list
/workboard show 7f4a2c10
/workboard create Fix stale worker heartbeat
/workboard dispatch
```

El despacho de comandos de barra también utiliza el tiempo de ejecución del subagente de Gateway, por lo que sigue el mismo comportamiento de reclamación, inicio de trabajador y falla que la ruta del panel y la CLI de Gateway.

`/workboard list` y `/workboard show` son comandos de lectura para remitentes de comandos autorizados. `/workboard create` y `/workboard dispatch` modifican el estado del tablero y requieren estado de propietario en las superficies de chat o un cliente de Gateway con `operator.write` o `operator.admin`.

## Permisos

La ruta de despacho de la CLI llama a Gateway RPC con alcances `operator.read` y `operator.write`. Un token de Gateway de solo lectura puede inspeccionar los datos de Workboard a través de métodos de lectura, pero no puede crear tarjetas ni despachar trabajadores.

Los comandos locales `list`, `create` y `show` operan en el directorio de estado local de OpenClaw utilizado por el perfil actual. Use `--dev` o `--profile <name>` en el comando `openclaw` de nivel superior cuando necesite una raíz de estado diferente.

## Solución de problemas

### No aparecen tarjetas

Confirme que el complemento está habilitado para el mismo perfil y raíz de estado:

```bash
openclaw plugins inspect workboard --runtime --json
```

Si el panel muestra tarjetas pero la CLI no, verifique que ambos comandos usen la misma configuración `--dev` o `--profile`.

### El despacho indica que solo son datos

Inicie o reinicie el Gateway:

```bash
openclaw gateway restart
openclaw gateway status --deep
```

Luego vuelva a intentar `openclaw workboard dispatch`. La alternativa de solo datos es útil para la limpieza del estado local, pero las ejecuciones de trabajadores necesitan un Gateway activo.

### El despacho no inicia nada

Busque al menos una tarjeta `ready` sin una reclamación activa:

```bash
openclaw workboard list --status ready
```

Las tarjetas también pueden omitirse cuando el mismo propietario ya tiene trabajo en ejecución o en revisión. Mueva el trabajo completado a `done`, libere las reclamaciones obsoletas a través de las herramientas de Workboard o vuelva a ejecutar el despacho después de que el trabajador activo finalice.

## Relacionado

- [Complemento Workboard](/es/plugins/workboard)
- [Referencia de la CLI](/es/cli)
- [Comandos de barra](/es/tools/slash-commands)
- [Interfaz de usuario de control](/es/web/control-ui)
