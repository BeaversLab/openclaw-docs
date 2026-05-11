---
summary: "Captura experimental de procedimientos reutilizables como habilidades del espacio de trabajo con revisión, aprobación, cuarentena y actualización en caliente de habilidades"
title: "Plugin del taller de habilidades"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

El Taller de Habilidades es **experimental**. Está deshabilitado por defecto, sus heurísticas
de captura y las indicaciones del revisor pueden cambiar entre versiones, y las
escrituras automáticas deben usarse solo en espacios de trabajo de confianza después
de revisar primero la salida del modo pendiente.

El Taller de Habilidades es la memoria de procedimientos para las habilidades del espacio de trabajo. Permite que un agente convierta
flujos de trabajo reutilizables, correcciones de usuario, soluciones difíciles de lograr y problemas recurrentes
en archivos `SKILL.md` en:

```text
<workspace>/skills/<skill-name>/SKILL.md
```

Esto es diferente de la memoria a largo plazo:

- **Memoria** almacena hechos, preferencias, entidades y contexto pasado.
- **Habilidades** almacenan procedimientos reutilizables que el agente debe seguir en tareas futuras.
- **Taller de Habilidades** es el puente desde una interacción útil hasta una habilidad duradera del
  espacio de trabajo, con comprobaciones de seguridad y aprobación opcional.

El Taller de Habilidades es útil cuando el agente aprende un procedimiento como:

- cómo validar activos de GIF animados de origen externo
- cómo reemplazar activos de capturas de pantalla y verificar dimensiones
- cómo ejecutar un escenario de QA específico del repositorio
- cómo depurar un fallo recurrente del proveedor
- cómo reparar una nota de flujo de trabajo local obsoleta

No está destinado para:

- hechos como "al usuario le gusta el azul"
- memoria autobiográfica amplia
- archivo de transcripciones sin procesar
- secretos, credenciales o texto de indicación oculto
- instrucciones únicas que no se repetirán

## Estado predeterminado

El plugin incluido es **experimental** y está **deshabilitado por defecto** a menos que se
haya habilitado explícitamente en `plugins.entries.skill-workshop`.

El manifiesto del plugin no establece `enabledByDefault: true`. El valor predeterminado de `enabled: true`
dentro del esquema de configuración del plugin se aplica solo después de que la entrada del plugin ya
ha sido seleccionada y cargada.

Experimental significa:

- el plugin tiene soporte suficiente para pruebas opt-in y uso interno (dogfooding)
- el almacenamiento de propuestas, los umbrales del revisor y las heurísticas de captura pueden evolucionar
- la aprobación pendiente es el modo de inicio recomendado
- la aplicación automática es para configuraciones personales/de espacio de trabajo confiables, no para entornos compartidos o hostiles
  con mucha entrada externa

## Habilitar

Configuración mínima segura:

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "pending",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

Con esta configuración:

- la herramienta `skill_workshop` está disponible
- las correcciones reutilizables explícitas se ponen en cola como propuestas pendientes
- las pasadas del revisor basadas en umbrales pueden proponer actualizaciones de habilidades
- no se escribe ningún archivo de habilidad hasta que se aplica una propuesta pendiente

Use las escrituras automáticas solo en espacios de trabajo de confianza:

```json5
{
  plugins: {
    entries: {
      "skill-workshop": {
        enabled: true,
        config: {
          autoCapture: true,
          approvalPolicy: "auto",
          reviewMode: "hybrid",
        },
      },
    },
  },
}
```

`approvalPolicy: "auto"` todavía usa el mismo escáner y ruta de cuarentena. No
aplica propuestas con hallazgos críticos.

## Configuración

| Clave                | Predeterminado | Rango / valores                             | Significado                                                                         |
| -------------------- | -------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `enabled`            | `true`         | booleano                                    | Habilita el complemento después de cargar la entrada del complemento.               |
| `autoCapture`        | `true`         | booleano                                    | Habilita la captura/revisión posterior al turno en turnos exitosos del agente.      |
| `approvalPolicy`     | `"pending"`    | `"pending"`, `"auto"`                       | Poner en cola propuestas o escribir propuestas seguras automáticamente.             |
| `reviewMode`         | `"hybrid"`     | `"off"`, `"heuristic"`, `"llm"`, `"hybrid"` | Elige captura de corrección explícita, revisor LLM, ambos o ninguno.                |
| `reviewInterval`     | `15`           | `1..200`                                    | Ejecutar el revisor después de esta cantidad de turnos exitosos.                    |
| `reviewMinToolCalls` | `8`            | `1..500`                                    | Ejecutar el revisor después de esta cantidad de llamadas a herramientas observadas. |
| `reviewTimeoutMs`    | `45000`        | `5000..180000`                              | Tiempo de espera para la ejecución del revisor integrado.                           |
| `maxPending`         | `50`           | `1..200`                                    | Máximo de propuestas pendientes/en cuarentena mantenidas por espacio de trabajo.    |
| `maxSkillBytes`      | `40000`        | `1024..200000`                              | Tamaño máximo de archivo de habilidad/soporte generado.                             |

Perfiles recomendados:

```json5
// Conservative: explicit tool use only, no automatic capture.
{
  autoCapture: false,
  approvalPolicy: "pending",
  reviewMode: "off",
}
```

```json5
// Review-first: capture automatically, but require approval.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "hybrid",
}
```

```json5
// Trusted automation: write safe proposals immediately.
{
  autoCapture: true,
  approvalPolicy: "auto",
  reviewMode: "hybrid",
}
```

```json5
// Low-cost: no reviewer LLM call, only explicit correction phrases.
{
  autoCapture: true,
  approvalPolicy: "pending",
  reviewMode: "heuristic",
}
```

## Rutas de captura

Skill Workshop tiene tres rutas de captura.

### Sugerencias de herramientas

El modelo puede llamar a `skill_workshop` directamente cuando ve un procedimiento reutilizable
o cuando el usuario le pide que guarde/actualice una habilidad.

Esta es la ruta más explícita y funciona incluso con `autoCapture: false`.

### Captura heurística

Cuando `autoCapture` está habilitado y `reviewMode` es `heuristic` o `hybrid`, el
complemento escanea los turnos exitosos en busca de frases explícitas de corrección del usuario:

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

La heurística crea una propuesta a partir de la última instrucción del usuario que coincida. Utiliza
pistas de temas para elegir nombres de habilidades para flujos de trabajo comunes:

- tareas de GIF animado -> `animated-gif-workflow`
- tareas de captura de pantalla o activos -> `screenshot-asset-workflow`
- tareas de control de calidad o escenarios -> `qa-scenario-workflow`
- tareas de Pull Requests de GitHub -> `github-pr-workflow`
- alternativa -> `learned-workflows`

La captura heurística es intencionalmente estrecha. Está diseñada para correcciones claras y
notas de procesos repetibles, no para el resumen general de transcripciones.

### Revisor LLM

Cuando `autoCapture` está habilitado y `reviewMode` es `llm` o `hybrid`, el complemento
ejecuta un revisor integrado compacto después de alcanzar los umbrales.

El revisor recibe:

- el texto de la transcripción reciente, limitado a los últimos 12,000 caracteres
- hasta 12 habilidades existentes del espacio de trabajo
- hasta 2,000 caracteres de cada habilidad existente
- instrucciones solo en formato JSON

El revisor no tiene herramientas:

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

El revisor devuelve `{ "action": "none" }` o una propuesta. El campo `action` es `create`, `append` o `replace` — se prefiere `append`/`replace` cuando ya existe una habilidad relevante; use `create` solo cuando ninguna habilidad existente se ajuste.

Ejemplo de `create`:

```json
{
  "action": "create",
  "skillName": "media-asset-qa",
  "title": "Media Asset QA",
  "reason": "Reusable animated media acceptance workflow",
  "description": "Validate externally sourced animated media before product use.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution.\n- Store a local approved copy.\n- Verify in product UI before final reply."
}
```

`append` añade `section` + `body`. `replace` intercambia `oldText` por `newText` en la habilidad nombrada.

## Ciclo de vida de la propuesta

Cada actualización generada se convierte en una propuesta con:

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- `agentId` opcional
- `sessionId` opcional
- `skillName`
- `title`
- `reason`
- `source`: `tool`, `agent_end` o `reviewer`
- `status`
- `change`
- `scanFindings` opcional
- `quarantineReason` opcional

Estados de las propuestas:

- `pending` - esperando aprobación
- `applied` - escrito en `<workspace>/skills`
- `rejected` - rechazado por el operador/modelo
- `quarantined` - bloqueado por hallazgos críticos del escáner

El estado se almacena por área de trabajo en el directorio de estado de Gateway:

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

Las propuestas pendientes y en cuarentena se deduplican por nombre de habilidad y carga de cambio.
El almacén mantiene las propuestas pendientes/en cuarentena más recientes hasta
`maxPending`.

## Referencia de herramientas

El complemento registra una herramienta de agente:

```text
skill_workshop
```

### `status`

Cuenta propuestas por estado para el área de trabajo activa.

```json
{ "action": "status" }
```

Formato del resultado:

```json
{
  "workspaceDir": "/path/to/workspace",
  "pending": 1,
  "quarantined": 0,
  "applied": 3,
  "rejected": 0
}
```

### `list_pending`

Lista las propuestas pendientes.

```json
{ "action": "list_pending" }
```

Para listar otro estado:

```json
{ "action": "list_pending", "status": "applied" }
```

Valores `status` válidos:

- `pending`
- `applied`
- `rejected`
- `quarantined`

### `list_quarantine`

Lista las propuestas en cuarentena.

```json
{ "action": "list_quarantine" }
```

Use esto cuando la captura automática parece no hacer nada y los registros mencionan
`skill-workshop: quarantined <skill>`.

### `inspect`

Obtiene una propuesta por id.

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

Crear una propuesta. Con `approvalPolicy: "pending"` (predeterminado), esto pone en cola en lugar de escribir.

```json
{
  "action": "suggest",
  "skillName": "animated-gif-workflow",
  "title": "Animated GIF Workflow",
  "reason": "User established reusable GIF validation rules.",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify the URL resolves to image/gif.\n- Confirm it has multiple frames.\n- Record attribution and license.\n- Avoid hotlinking when a local asset is needed."
}
```

<AccordionGroup>
  <Accordion title="Forzar una escritura segura (apply: true)">

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

  </Accordion>

  <Accordion title="Forzar pendiente bajo política automática (apply: false)">

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

  </Accordion>

  <Accordion title="Añadir a una sección con nombre">

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

  </Accordion>

  <Accordion title="Reemplazar texto exacto">

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

  </Accordion>
</AccordionGroup>

### `apply`

Aplicar una propuesta pendiente.

```json
{
  "action": "apply",
  "id": "proposal-id"
}
```

`apply` rechaza las propuestas en cuarentena:

```text
quarantined proposal cannot be applied
```

### `reject`

Marcar una propuesta como rechazada.

```json
{
  "action": "reject",
  "id": "proposal-id"
}
```

### `write_support_file`

Escribir un archivo de soporte dentro de un directorio de habilidad existente o propuesto.

Directorios de soporte de nivel superior permitidos:

- `references/`
- `templates/`
- `scripts/`
- `assets/`

Ejemplo:

```json
{
  "action": "write_support_file",
  "skillName": "release-workflow",
  "relativePath": "references/checklist.md",
  "body": "# Release Checklist\n\n- Run release docs.\n- Verify changelog.\n"
}
```

Los archivos de soporte tienen alcance de espacio de trabajo, están verificados por ruta, limitados en bytes por
`maxSkillBytes`, se escanean y se escriben de forma atómica.

## Escrituras de habilidades

Skill Workshop solo escribe en:

```text
<workspace>/skills/<normalized-skill-name>/
```

Los nombres de las habilidades se normalizan:

- en minúsculas
- las ejecuciones que no son de `[a-z0-9_-]` se convierten en `-`
- se eliminan los caracteres no alfanuméricos al principio y al final
- la longitud máxima es de 80 caracteres
- el nombre final debe coincidir con `[a-z0-9][a-z0-9_-]{1,79}`

Para `create`:

- si la habilidad no existe, Skill Workshop escribe un nuevo `SKILL.md`
- si ya existe, Skill Workshop añade el cuerpo a `## Workflow`

Para `append`:

- si la habilidad existe, Skill Workshop añade a la sección solicitada
- si no existe, Skill Workshop crea una habilidad mínima y luego añade

Para `replace`:

- la habilidad ya debe existir
- `oldText` debe estar presente exactamente
- solo se reemplaza la primera coincidencia exacta

Todas las escrituras son atómicas y actualizan la instantánea de habilidades en memoria inmediatamente, por lo que
la habilidad nueva o actualizada puede hacerse visible sin reiniciar el Gateway.

## Modelo de seguridad

Skill Workshop tiene un escáner de seguridad en el contenido `SKILL.md` generado y en los
documentos de soporte.

Los hallazgos críticos ponen en cuarentena las propuestas:

| ID de regla                            | Bloquea el contenido que...                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `prompt-injection-ignore-instructions` | indica al agente que ignore instrucciones previas/superiores                             |
| `prompt-injection-system`              | hace referencia a prompts del sistema, mensajes de desarrollador o instrucciones ocultas |
| `prompt-injection-tool`                | anula el permiso/aprobación de herramientas                                              |
| `shell-pipe-to-shell`                  | incluye `curl`/`wget` canalizados hacia `sh`, `bash` o `zsh`                             |
| `secret-exfiltration`                  | parece enviar datos de entorno/proceso a través de la red                                |

Los hallazgos de advertencia se conservan pero no bloquean por sí mismos:

| ID de regla          | Advierte sobre...                     |
| -------------------- | ------------------------------------- |
| `destructive-delete` | comandos de estilo `rm -rf` amplios   |
| `unsafe-permissions` | uso de permisos de estilo `chmod 777` |

Propuestas en cuarentena:

- mantienen `scanFindings`
- mantienen `quarantineReason`
- aparecen en `list_quarantine`
- no se pueden aplicar a través de `apply`

Para recuperarse de una propuesta en cuarentena, cree una nueva propuesta segura con el
contenido no seguro eliminado. No edite el JSON del almacén manualmente.

## Guía de prompts

Cuando está habilitado, Skill Workshop inyecta una sección breve de prompt que le indica al agente
que use `skill_workshop` para memoria de procedimientos duradera.

La guía enfatiza:

- procedimientos, no hechos/preferencias
- correcciones del usuario
- procedimientos exitosos no obvios
- errores recurrentes
- reparación de habilidades obsoletas/insuficientes/incorrectas mediante anexión/reemplazo
- guardar procedimientos reutilizables después de bucles de herramientas largos o correcciones difíciles
- texto de habilidad imperativo corto
- sin volcados de transcripciones

El texto del modo de escritura cambia con `approvalPolicy`:

- modo pendiente: poner en cola sugerencias; aplicar solo después de la aprobación explícita
- modo automático: aplicar actualizaciones de habilidades del espacio de trabajo seguras cuando sean claramente reutilizables

## Costos y comportamiento en tiempo de ejecución

La captura heurística no llama a ningún modelo.

La revisión LLM utiliza una ejecución integrada en el modelo de agente activo/predeterminado. Se basa en umbrales, por lo que no se ejecuta en cada turno de forma predeterminada.

El revisor:

- utiliza el mismo proveedor/modelo de contexto configurado cuando está disponible
- recurre a los valores predeterminados del agente en tiempo de ejecución
- tiene `reviewTimeoutMs`
- utiliza un contexto de arranque ligero
- no tiene herramientas
- no escribe nada directamente
- solo puede emitir una propuesta que pase por el escáner normal y la ruta de aprobación/cuarentena

Si el revisor falla, se agota el tiempo o devuelve un JSON no válido, el complemento registra un mensaje de advertencia/depuración y omite ese paso de revisión.

## Patrones de operación

Use Skill Workshop cuando el usuario diga:

- «la próxima vez, haz X»
- «a partir de ahora, prefiere Y»
- «asegúrate de verificar Z»
- «guarda esto como un flujo de trabajo»
- «esto tomó un tiempo; recuerda el proceso»
- «actualiza la habilidad local para esto»

Texto de habilidad bueno:

```markdown
## Workflow

- Verify the GIF URL resolves to `image/gif`.
- Confirm the file has multiple frames.
- Record source URL, license, and attribution.
- Store a local copy when the asset will ship with the product.
- Verify the local asset renders in the target UI before final reply.
```

Texto de habilidad deficiente:

```markdown
The user asked about a GIF and I searched two websites. Then one was blocked by
Cloudflare. The final answer said to check attribution.
```

Razones por las que no se debe guardar la versión deficiente:

- con forma de transcripción
- no es imperativo
- incluye detalles únicos y con ruido
- no le dice al siguiente agente qué hacer

## Depuración

Compruebe si el complemento está cargado:

```bash
openclaw plugins list --enabled
```

Verifique los recuentos de propuestas desde un contexto de agente/herramienta:

```json
{ "action": "status" }
```

Inspeccione las propuestas pendientes:

```json
{ "action": "list_pending" }
```

Inspeccione las propuestas en cuarentena:

```json
{ "action": "list_quarantine" }
```

Síntomas comunes:

| Síntoma                                                | Causa probable                                                                                          | Verificar                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| La herramienta no está disponible                      | La entrada del complemento no está habilitada                                                           | `plugins.entries.skill-workshop.enabled` y `openclaw plugins list`               |
| No aparece ninguna propuesta automática                | `autoCapture: false`, `reviewMode: "off"`, o umbrales no cumplidos                                      | Configuración, estado de la propuesta, registros de Gateway                      |
| La heurística no capturó                               | Las palabras del usuario no coincidieron con los patrones de corrección                                 | Use `skill_workshop.suggest` explícito o habilite el revisor LLM                 |
| El revisor no creó una propuesta                       | El revisor devolvió `none`, JSON no válido o se agotó el tiempo                                         | Registros de Gateway, `reviewTimeoutMs`, umbrales                                |
| La propuesta no se aplica                              | `approvalPolicy: "pending"`                                                                             | `list_pending`, luego `apply`                                                    |
| La propuesta desapareció de pendientes                 | Se reutilizó una propuesta duplicada, poda máxima de pendientes, o se aplicó/rechazó/puso en cuarentena | `status`, `list_pending` con filtros de estado, `list_quarantine`                |
| El archivo de habilidad existe pero el modelo lo omite | La instantánea de habilidades no se ha actualizado o el filtrado de habilidades la excluye              | Estado de `openclaw skills` y elegibilidad de habilidades del espacio de trabajo |

Registros relevantes:

- `skill-workshop: queued <skill>`
- `skill-workshop: applied <skill>`
- `skill-workshop: quarantined <skill>`
- `skill-workshop: heuristic capture skipped: ...`
- `skill-workshop: reviewer skipped: ...`
- `skill-workshop: reviewer found no update`

## Escenarios de QA

Escenarios de QA respaldados por repositorio:

- `qa/scenarios/plugins/skill-workshop-animated-gif-autocreate.md`
- `qa/scenarios/plugins/skill-workshop-pending-approval.md`
- `qa/scenarios/plugins/skill-workshop-reviewer-autonomous.md`

Ejecutar la cobertura determinista:

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

Ejecutar la cobertura del revisor:

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

El escenario del revisor está separado intencionalmente porque habilita
`reviewMode: "llm"` y ejerce el pase del revisor incorporado.

## Cuándo no habilitar la autoaplicación

Evite `approvalPolicy: "auto"` cuando:

- el espacio de trabajo contiene procedimientos sensibles
- el agente está trabajando en entradas no confiables
- las habilidades se comparten en un equipo amplio
- aún está ajustando los prompts o las reglas del escáner
- el modelo maneja con frecuencia contenido web/correo electrónico hostil

Use primero el modo pendiente. Cambie al modo automático solo después de revisar el tipo de
habilidades que el agente propone en ese espacio de trabajo.

## Documentos relacionados

- [Habilidades](/es/tools/skills)
- [Complementos](/es/tools/plugin)
- [Pruebas](/es/reference/test)
