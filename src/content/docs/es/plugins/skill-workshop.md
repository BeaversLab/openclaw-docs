---
title: "Plugin del Taller de Habilidades"
summary: "Captura experimental de procedimientos reutilizables como habilidades del espacio de trabajo con revisión, aprobación, cuarentena y actualización en caliente de habilidades"
read_when:
  - You want agents to turn corrections or reusable procedures into workspace skills
  - You are configuring procedural skill memory
  - You are debugging skill_workshop tool behavior
  - You are deciding whether to enable automatic skill creation
---

# Plugin del Taller de Habilidades

El Taller de Habilidades es **experimental**. Está deshabilitado de forma predeterminada, sus heurísticas
de captura y las indicaciones del revisor pueden cambiar entre versiones, y las escrituras
automáticas deben usarse solo en espacios de trabajo confiables después de revisar primero el resultado
en modo pendiente.

El Taller de Habilidades es la memoria procesal para las habilidades del espacio de trabajo. Permite que un agente convierta
flujos de trabajo reutilizables, correcciones de usuario, soluciones difíciles de conseguir y problemas recurrentes
en archivos `SKILL.md` en:

```text
<workspace>/skills/<skill-name>/SKILL.md
```

Esto es diferente de la memoria a largo plazo:

- **Memoria** almacena hechos, preferencias, entidades y contexto pasado.
- **Habilidades** almacenan procedimientos reutilizables que el agente debe seguir en futuras tareas.
- **Taller de Habilidades** es el puente desde una interacción útil hasta una habilidad
  durable del espacio de trabajo, con comprobaciones de seguridad y aprobación opcional.

El Taller de Habilidades es útil cuando el agente aprende un procedimiento como:

- cómo validar activos de GIF animados obtenidos externamente
- cómo reemplazar activos de capturas de pantalla y verificar las dimensiones
- cómo ejecutar un escenario de control de calidad específico del repositorio
- cómo depurar un fallo recurrente del proveedor
- cómo reparar una nota de flujo de trabajo local obsoleta

No está pensado para:

- hechos como "al usuario le gusta el azul"
- memoria autobiográfica amplia
- archivado de transcripciones sin procesar
- secretos, credenciales o texto de indicación oculto
- instrucciones únicas que no se repetirán

## Estado Predeterminado

El complemento incluido es **experimental** y está **deshabilitado de forma predeterminada** a menos que se
haya habilitado explícitamente en `plugins.entries.skill-workshop`.

El manifiesto del complemento no establece `enabledByDefault: true`. El valor predeterminado
`enabled: true`
dentro del esquema de configuración del complemento se aplica solo después de que la entrada del complemento ya
ha sido seleccionada y cargada.

Experimental significa:

- el complemento tiene suficiente soporte para pruebas opcionales y uso interno
- el almacenamiento de propuestas, los umbrales del revisor y las heurísticas de captura pueden evolucionar
- la aprobación pendiente es el modo de inicio recomendado
- la aplicación automática es para configuraciones personales/de espacio de trabajo confiables, no para entornos
  compartidos o con mucha entrada hostil

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
- los pasos del revisor basados en umbrales pueden proponer actualizaciones de habilidades
- no se escribe ningún archivo de habilidad hasta que se aplica una propuesta pendiente

Use escrituras automáticas solo en espacios de trabajo de confianza:

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
| `enabled`            | `true`         | booleano                                    | Activa el complemento después de cargar la entrada del complemento.                 |
| `autoCapture`        | `true`         | booleano                                    | Activa la captura/revisión posterior al turno en turnos de agente exitosos.         |
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

El modelo puede llamar a `skill_workshop` directamente cuando ve un procedimiento
reutilizable o cuando el usuario le pide que guarde/actualice una habilidad.

Esta es la ruta más explícita y funciona incluso con `autoCapture: false`.

### Captura Heurística

Cuando `autoCapture` está habilitado y `reviewMode` es `heuristic` o `hybrid`, el
complemento escanea los turnos exitosos en busca de frases explícitas de corrección del usuario:

- `next time`
- `from now on`
- `remember to`
- `make sure to`
- `always ... use/check/verify/record/save/prefer`
- `prefer ... when/for/instead/use`
- `when asked`

El heurístico crea una propuesta a partir de la última instrucción del usuario coincidente. Utiliza
sugerencias de temas para elegir nombres de habilidades para flujos de trabajo comunes:

- tareas de GIF animado -> `animated-gif-workflow`
- tareas de captura de pantalla o activos -> `screenshot-asset-workflow`
- tareas de control de calidad (QA) o escenarios -> `qa-scenario-workflow`
- tareas de PR de GitHub -> `github-pr-workflow`
- alternativa -> `learned-workflows`

La captura heurística es intencionalmente limitada. Sirve para correcciones claras y
notas de procesos repetibles, no para el resumen general de transcripciones.

### Revisor LLM

Cuando `autoCapture` está habilitado y `reviewMode` es `llm` o `hybrid`, el complemento
ejecuta un revisor integrado compacto después de alcanzar los umbrales.

El revisor recibe:

- el texto de la transcripción reciente, limitado a los últimos 12,000 caracteres
- hasta 12 habilidades de espacio de trabajo existentes
- hasta 2,000 caracteres de cada habilidad existente
- instrucciones solo en JSON

El revisor no tiene herramientas:

- `disableTools: true`
- `toolsAllow: []`
- `disableMessageTool: true`

Puede devolver:

```json
{ "action": "none" }
```

o una propuesta de habilidad:

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

También puede agregar a una habilidad existente:

```json
{
  "action": "append",
  "skillName": "qa-scenario-workflow",
  "title": "QA Scenario Workflow",
  "reason": "Animated media QA needs reusable checks",
  "description": "QA scenario workflow.",
  "section": "Workflow",
  "body": "- For animated GIF tasks, verify frame count and attribution before passing."
}
```

O reemplazar texto exacto en una habilidad existente:

```json
{
  "action": "replace",
  "skillName": "screenshot-asset-workflow",
  "title": "Screenshot Asset Workflow",
  "reason": "Old validation missed image optimization",
  "oldText": "- Replace the screenshot asset.",
  "newText": "- Replace the screenshot asset, preserve dimensions, optimize the PNG, and run the relevant validation gate."
}
```

Prefiera `append` o `replace` cuando ya exista una habilidad relevante. Use `create`
solo cuando ninguna habilidad existente se ajuste.

## Ciclo de Vida de la Propuesta

Cada actualización generada se convierte en una propuesta con:

- `id`
- `createdAt`
- `updatedAt`
- `workspaceDir`
- opcional `agentId`
- opcional `sessionId`
- `skillName`
- `title`
- `reason`
- `source`: `tool`, `agent_end` o `reviewer`
- `status`
- `change`
- opcional `scanFindings`
- opcional `quarantineReason`

Estados de las propuestas:

- `pending` - esperando aprobación
- `applied` - escrito en `<workspace>/skills`
- `rejected` - rechazado por el operador/modelo
- `quarantined` - bloqueado por hallazgos críticos del escáner

El estado se almacena por espacio de trabajo en el directorio de estado del Gateway:

```text
<stateDir>/skill-workshop/<workspace-hash>.json
```

Las propuestas pendientes y en cuarentena se deduplican por el nombre de la habilidad y el
payload de cambio. El almacén mantiene las propuestas pendientes/en cuarentena más recientes hasta
`maxPending`.

## Referencia de herramientas

El complemento registra una herramienta de agente:

```text
skill_workshop
```

### `status`

Contar propuestas por estado para el espacio de trabajo activo.

```json
{ "action": "status" }
```

Forma del resultado:

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

Listar propuestas pendientes.

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

Listar propuestas en cuarentena.

```json
{ "action": "list_quarantine" }
```

Use esto cuando la captura automática parece no hacer nada y los registros mencionan
`skill-workshop: quarantined <skill>`.

### `inspect`

Obtener una propuesta por id.

```json
{
  "action": "inspect",
  "id": "proposal-id"
}
```

### `suggest`

Crear una propuesta. Con `approvalPolicy: "pending"`, esto se pone en cola por defecto.

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

Forzar una escritura segura:

```json
{
  "action": "suggest",
  "apply": true,
  "skillName": "animated-gif-workflow",
  "description": "Validate animated GIF assets before using them.",
  "body": "## Workflow\n\n- Verify true animation.\n- Record attribution."
}
```

Forzar pendiente incluso en `approvalPolicy: "auto"`:

```json
{
  "action": "suggest",
  "apply": false,
  "skillName": "screenshot-asset-workflow",
  "description": "Screenshot replacement workflow.",
  "body": "## Workflow\n\n- Verify dimensions.\n- Optimize the PNG.\n- Run the relevant gate."
}
```

Añadir a una sección:

```json
{
  "action": "suggest",
  "skillName": "qa-scenario-workflow",
  "section": "Workflow",
  "description": "QA scenario workflow.",
  "body": "- For media QA, verify generated assets render and pass final assertions."
}
```

Reemplazar texto exacto:

```json
{
  "action": "suggest",
  "skillName": "github-pr-workflow",
  "oldText": "- Check the PR.",
  "newText": "- Check unresolved review threads, CI status, linked issues, and changed files before deciding."
}
```

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

Escribe un archivo de soporte dentro de un directorio de habilidad existente o propuesto.

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

Los archivos de soporte tienen ámbito de espacio de trabajo, verificación de ruta,
limitados por bytes por `maxSkillBytes`, escaneados y escritos atómicamente.

## Escrituras de habilidades

Skill Workshop escribe solo en:

```text
<workspace>/skills/<normalized-skill-name>/
```

Los nombres de las habilidades se normalizan:

- en minúsculas
- las ejecuciones que no son `[a-z0-9_-]` se convierten en `-`
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

Todas las escrituras son atómicas y actualizan la instantánea de habilidades en memoria
inmediatamente, por lo que la habilidad nueva o actualizada puede hacerse visible sin
reiniciar el Gateway.

## Modelo de seguridad

Skill Workshop tiene un escáner de seguridad en el contenido `SKILL.md` generado
y archivos de soporte.

Los hallazgos críticos ponen en cuarentena las propuestas:

| Id. de regla                           | Bloquea el contenido que...                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `prompt-injection-ignore-instructions` | indica al agente que ignore instrucciones previas o superiores                             |
| `prompt-injection-system`              | hace referencia a mensajes del sistema, mensajes del desarrollador o instrucciones ocultas |
| `prompt-injection-tool`                | fomenta omitir el permiso/aprobación de la herramienta                                     |
| `shell-pipe-to-shell`                  | incluye `curl`/`wget` canalizado hacia `sh`, `bash` o `zsh`                                |
| `secret-exfiltration`                  | parece enviar datos de entorno/proceso de entorno a través de la red                       |

Los hallazgos de advertencia se conservan pero no bloquean por sí mismos:

| ID de regla          | Advierte sobre...                     |
| -------------------- | ------------------------------------- |
| `destructive-delete` | comandos de estilo `rm -rf` amplios   |
| `unsafe-permissions` | uso de permisos de estilo `chmod 777` |

Propuestas en cuarentena:

- conservar `scanFindings`
- conservar `quarantineReason`
- aparecen en `list_quarantine`
- no se pueden aplicar a través de `apply`

Para recuperarse de una propuesta en cuarentena, cree una nueva propuesta segura con el
contenido inseguro eliminado. No edite el JSON del almacén manualmente.

## Guía del Prompt

Cuando está habilitado, Skill Workshop inyecta una sección breve del prompt que le dice al agente
que use `skill_workshop` para memoria de procedimientos duradera.

La guía enfatiza:

- procedimientos, no datos/hechos
- correcciones del usuario
- procedimientos exitosos no obvios
- problemas recurrentes
- reparación de habilidades obsoletas/insuficientes/incorrectas mediante anexión/reemplazo
- guardar procedimientos reutilizables después de bucles de herramientas largos o correcciones difíciles
- texto de habilidad imperativo corto
- sin volcados de transcripciones

El texto del modo de escritura cambia con `approvalPolicy`:

- modo pendiente: poner sugerencias en cola; aplicar solo después de la aprobación explícita
- modo automático: aplicar actualizaciones seguras de habilidades del espacio de trabajo cuando sean claramente reutilizables

## Costos y Comportamiento en Tiempo de Ejecución

La captura heurística no llama a un modelo.

La revisión LLM utiliza una ejecución integrada en el modelo de agente activo/predeterminado. Es
basada en umbrales, por lo que no se ejecuta en cada turno de forma predeterminada.

El revisor:

- usa el mismo contexto de proveedor/modelo configurado cuando está disponible
- recurre a los valores predeterminados del agente en tiempo de ejecución
- tiene `reviewTimeoutMs`
- usa un contexto de arranque ligero
- no tiene herramientas
- no escribe nada directamente
- solo puede emitir una propuesta que pase por el escáner normal y la
  ruta de aprobación/cuarentena

Si el revisor falla, agota el tiempo de espera o devuelve un JSON no válido, el complemento registra un
mensaje de advertencia/depuración y omite ese pase de revisión.

## Patrones Operativos

Use Skill Workshop cuando el usuario diga:

- “la próxima vez, haz X”
- “de ahora en adelante, prefiere Y”
- “asegúrate de verificar Z”
- “guarda esto como un flujo de trabajo”
- “esto tomó un tiempo; recuerda el proceso”
- “actualiza la habilidad local para esto”

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
- no imperativo
- incluye detalles únicos con ruido
- no le dice al siguiente agente qué hacer

## Depuración

Compruebe si el complemento está cargado:

```bash
openclaw plugins list --enabled
```

Compruebe los conteos de propuestas desde un contexto de agente/herramienta:

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

| Síntoma                                                | Causa probable                                                                                            | Verificar                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| La herramienta no está disponible                      | La entrada del complemento no está habilitada                                                             | `plugins.entries.skill-workshop.enabled` y `openclaw plugins list`             |
| No aparece ninguna propuesta automática                | `autoCapture: false`, `reviewMode: "off"`, o umbrales no cumplidos                                        | Configuración, estado de la propuesta, registros de Gateway                    |
| La heurística no capturó                               | La redacción del usuario no coincidió con los patrones de corrección                                      | Use `skill_workshop.suggest` explícito o habilite el revisor LLM               |
| El revisor no creó una propuesta                       | El revisor devolvió `none`, JSON no válido o se agotó el tiempo                                           | Registros de Gateway, `reviewTimeoutMs`, umbrales                              |
| La propuesta no se aplica                              | `approvalPolicy: "pending"`                                                                               | `list_pending`, luego `apply`                                                  |
| La propuesta desapareció de pendientes                 | Propuesta duplicada reutilizada, poda máxima de pendientes, o fue aplicada/rechazada/puesta en cuarentena | `status`, `list_pending` con filtros de estado, `list_quarantine`              |
| El archivo de habilidad existe pero el modelo lo omite | La instantánea de habilidad no se actualizó o la exclusión de habilidad la excluye                        | Estado de `openclaw skills` y elegibilidad de habilidad del espacio de trabajo |

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

Ejecute la cobertura determinista:

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-animated-gif-autocreate \
  --scenario skill-workshop-pending-approval \
  --concurrency 1
```

Ejecute la cobertura del revisor:

```bash
pnpm openclaw qa suite \
  --scenario skill-workshop-reviewer-autonomous \
  --concurrency 1
```

El escenario del revisor es intencionalmente separado porque habilita
`reviewMode: "llm"` y ejerce el pase del revisor integrado.

## Cuándo no habilitar la aplicación automática

Evite `approvalPolicy: "auto"` cuando:

- el espacio de trabajo contiene procedimientos confidenciales
- el agente está trabajando en entrada no confiable
- las habilidades se comparten en un equipo amplio
- todavía estás ajustando los indicadores o las reglas del escáner
- el modelo maneja con frecuencia contenido web/correo electrónico hostil

Use primero el modo pendiente. Cambie al modo automático solo después de revisar el tipo de
habilidades que el agente propone en ese espacio de trabajo.

## Documentos relacionados

- [Habilidades](/es/tools/skills)
- [Complementos](/es/tools/plugin)
- [Pruebas](/es/reference/test)
