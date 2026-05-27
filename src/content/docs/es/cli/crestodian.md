---
summary: "Referencia de CLI y modelo de seguridad de Crestodian, el asistente de configuración y reparación seguro sin configuración"
read_when:
  - You run openclaw with no command after setup and want to understand Crestodian
  - You need a configless-safe way to inspect or repair OpenClaw
  - You are designing or enabling message-channel rescue mode
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian es el asistente local de configuración, reparación y configuración de OpenClaw. Está diseñado para permanecer accesible cuando la ruta del agente normal está rota.

Ejecutar `openclaw` sin comando inicia primero la incorporación clásica cuando el archivo de configuración activo falta o no tiene configuraciones creadas (está vacío o solo tiene metadatos). Después de que un archivo de configuración tenga configuraciones creadas, ejecutar `openclaw` sin comando inicia Crestodian en una terminal interactiva. Ejecutar `openclaw crestodian` inicia explícitamente el mismo asistente.

## Lo que muestra Crestodian

Al iniciarse, Crestodian interactivo abre el mismo shell TUI utilizado por `openclaw tui`, con un backend de chat de Crestodian. El registro de chat comienza con un breve saludo:

- cuándo iniciar Crestodian
- el modelo o la ruta del planificador determinista que Crestodian está utilizando realmente
- validez de la configuración y el agente predeterminado
- accesibilidad de la Gateway desde la primera sonda de inicio
- la siguiente acción de depuración que Crestodian puede tomar

No vuelca secretos ni carga comandos CLI de complementos solo para iniciarse. La TUI
aún proporciona el encabezado normal, el registro de chat, la línea de estado, el pie de página, el autocompletado
y los controles del editor.

Use `status` para el inventario detallado con la ruta de configuración, rutas de documentos/fuente, sondas locales de CLI, presencia de clave API, agentes, modelo y detalles de Gateway.

Crestodian utiliza el mismo descubrimiento de referencia de OpenClaw que los agentes regulares. En una comprobación de Git, se apunta al `docs/` local y al árbol de fuentes local. En una instalación de paquete npm, utiliza los documentos del paquete incluidos y enlaces a [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw), con orientación explícita para revisar la fuente siempre que los documentos no sean suficientes.

## Ejemplos

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

Dentro de la TUI de Crestodian:

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
plugin uninstall openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## Inicio seguro

La ruta de inicio de Crestodian es deliberadamente pequeña. Puede ejecutarse cuando:

- `openclaw.json` falta
- `openclaw.json` no es válido
- la Gateway está caída
- el registro de comandos de complementos no está disponible
- no se ha configurado ningún agente todavía

`openclaw --help` y `openclaw --version` todavía usan las rutas rápidas normales. El `openclaw` desnudo no interactivo sale con un mensaje corto en lugar de imprimir la ayuda raíz. En una instalación nueva, el mensaje apunta a la incorporación no interactiva; después de la configuración, apunta a comandos Crestodian de un solo uso.

## Operaciones y aprobación

Crestodian utiliza operaciones tipadas en lugar de editar la configuración ad hoc.

Las operaciones de solo lectura pueden ejecutarse inmediatamente:

- mostrar descripción general
- listar agentes
- listar los complementos instalados
- buscar complementos en ClawHub
- mostrar el estado del modelo/backend
- ejecutar comprobaciones de estado o salud
- verificar la accesibilidad del Gateway
- ejecutar doctor sin reparaciones interactivas
- validar la configuración
- mostrar la ruta del registro de auditoría

Las operaciones persistentes requieren aprobación conversacional en modo interactivo a menos que pase `--yes` para un comando directo:

- escribir configuración
- ejecutar `config set`
- establecer valores admitidos de SecretRef a través de `config set-ref`
- ejecutar el arranque de configuración/incorporación
- cambiar el modelo predeterminado
- iniciar, detener o reiniciar el Gateway
- crear agentes
- instalar complementos desde ClawHub o npm
- desinstalar complementos
- ejecutar reparaciones del doctor que reescriben la configuración o el estado

Las escrituras aplicadas se registran en:

```text
~/.openclaw/audit/crestodian.jsonl
```

El descubrimiento no se audita. Solo se registran las operaciones aplicadas y las escrituras.

`openclaw onboard --modern` inicia Crestodian como vista previa de incorporación moderna. `openclaw onboard` simple todavía ejecuta la incorporación clásica.

## Arranque de configuración

`setup` es la inicialización (bootstrap) de incorporación con prioridad de chat. Escribe solo a través de operaciones de configuración tipificadas y pide aprobación primero.

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

Cuando no hay ningún modelo configurado, la configuración selecciona el primer backend utilizable en este
orden y te indica lo que eligió:

- modelo explícito existente, si ya está configurado
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-7`
- Claude Code CLI -> `claude-cli/claude-opus-4-7`
- Codex -> `openai/gpt-5.5` a través del arnés del servidor de aplicaciones Codex

Si ninguno está disponible, la configuración aún escribe el espacio de trabajo predeterminado y deja el modelo sin configurar. Instale o inicie sesión en Codex/Claude Code, o exponga `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, luego ejecute la configuración nuevamente.

## Planificador asistido por modelo

Crestodian siempre se inicia en modo determinista. Para comandos difusos que el analizador determinista no entiende, el Crestodian local puede realizar un ciclo limitado del planificador a través de las rutas de tiempo de ejecución normales de OpenClaw. Primero utiliza el modelo OpenClaw configurado. Si aún no hay ningún modelo configurado utilizable, puede recurrir a los tiempos de ejecución locales ya presentes en la máquina:

- Claude Code CLI: `claude-cli/claude-opus-4-7`
- Arnés del servidor de aplicaciones Codex: `openai/gpt-5.5`

El planificador asistido por modelo no puede mutar la configuración directamente. Debe traducir la solicitud en uno de los comandos tipificados de Crestodian, y luego se aplican las reglas normales de aprobación y auditoría. Crestodian imprime el modelo que utilizó y el comando interpretado antes de ejecutar cualquier cosa. Los turnos del planificador de respaldo sin configuración son temporales, con herramientas deshabilitadas donde el tiempo de ejecución lo admite, y utilizan un espacio de trabajo/sesión temporal.

El modo de rescate por canal de mensajes no utiliza el planificador asistido por modelo. El rescate remoto permanece determinista para que una ruta de agente normal rota o comprometida no pueda utilizarse como un editor de configuración.

## Cambiar a un agente

Use un selector en lenguaje natural para salir de Crestodian y abrir la TUI normal:

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`, `openclaw chat` y `openclaw terminal` aún abren directamente el TUI del agente normal. No inician Crestodian.

Después de cambiar al TUI normal, use `/crestodian` para volver a Crestodian.
Puede incluir una solicitud de seguimiento:

```text
/crestodian
/crestodian restart gateway
```

Los cambios de agente dentro del TUI dejan una pista de que `/crestodian` está disponible.

## Modo de rescate de mensajes

El modo de rescate de mensajes es el punto de entrada del canal de mensajes para Crestodian. Es para el caso en que su agente normal está muerto, pero un canal confiable como WhatsApp aún recibe comandos.

Comando de texto admitido:

- `/crestodian <request>`

Flujo del operador:

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian rescue mode. Gateway reachable: no. Config valid: no.
You: /crestodian restart gateway
OpenClaw: Plan: restart the Gateway. Reply /crestodian yes to apply.
You: /crestodian yes
OpenClaw: Applied. Audit entry written.
```

La creación de agentes también se puede poner en cola desde el indicador local o el modo de rescate:

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

El modo de rescate remoto es una superficie de administración. Debe tratarse como una reparación remota de configuración, no como un chat normal.

Contrato de seguridad para el rescate remoto:

- Deshabilitado cuando el sandbox está activo. Si un agente/sesión está en sandbox, Crestodian debe rechazar el rescate remoto y explicar que se requiere reparación local de CLI.
- El estado efectivo predeterminado es `auto`: permitir el rescate remoto solo en la operación YOLO de confianza,
  donde el tiempo de ejecución ya tiene autoridad local sin sandbox.
- Requerir una identidad de propietario explícita. El rescate no debe aceptar reglas de remitente comodín, políticas de grupo abierto, webhooks no autenticados o canales anónimos.
- Solo DMs del propietario de forma predeterminada. El rescate de grupo/canal requiere una participación explícita (opt-in).
- La búsqueda y lista de complementos son de solo lectura. La instalación de complementos es solo local de forma predeterminada porque descarga código ejecutable. La desinstalación de complementos se puede permitir como una operación de reparación aprobada cuando la política de rescate permite escrituras persistentes.
- El rescate remoto no puede abrir el TUI local ni cambiar a una sesión de agente
  interactiva. Use `openclaw` local para la entrega del agente.
- Las escrituras persistentes aún requieren aprobación, incluso en modo de rescate.
- Auditar cada operación de rescate aplicada. El rescate del canal de mensajes registra los metadatos del canal, cuenta, remitente y dirección de origen. Las operaciones que mutan la configuración también registran los hashes de configuración antes y después.
- Nunca repetir (eco) secretos. La inspección de SecretRef debe informar la disponibilidad, no los valores.
- Si el Gateway está activo, preferir operaciones de tipo Gateway. Si el Gateway está inactivo, usar solo la superficie de reparación local mínima que no dependa del bucle de agente normal.

Forma de la configuración:

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
    },
  },
}
```

`enabled` debería aceptar:

- `"auto"`: predeterminado. Permitir solo cuando el tiempo de ejecución efectivo es YOLO y
  el sandbox está desactivado.
- `false`: nunca permitir el rescate del canal de mensajes.
- `true`: permitir explícitamente el rescate cuando pasan las verificaciones de propietario/canal. Esto
  aún no debe omitir la denegación del sandbox.

La postura YOLO predeterminada `"auto"` es:

- el modo sandbox se resuelve en `off`
- `tools.exec.security` se resuelve en `full`
- `tools.exec.ask` se resuelve en `off`

El rescate remoto está cubierto por el carril de Docker:

```bash
pnpm test:docker:crestodian-rescue
```

La alternativa de planificador local sin configuración está cubierta por:

```bash
pnpm test:docker:crestodian-planner
```

Una superficie de comando de canal en vivo opcional realiza pruebas de humo de `/crestodian status` más un
viaje de aprobación persistente a través del controlador de rescate:

```bash
pnpm test:live:crestodian-rescue-channel
```

La configuración sin configuración a través de comandos explícitos de Crestodian está cubierta por:

```bash
pnpm test:docker:crestodian-first-run
```

Ese carril comienza con un directorio de estado vacío, verifica el punto de entrada moderno de Crestodian, establece el modelo predeterminado, crea un agente adicional, configura Discord a través de la activación de un complemento más el token SecretRef, valida la configuración y verifica el registro de auditoría. QA Lab también tiene un escenario respaldado por repositorio para el mismo flujo del Anillo 0:

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## Relacionado

- [Referencia de CLI](/es/cli)
- [Doctor](/es/cli/doctor)
- [TUI](/es/cli/tui)
- [Sandbox](/es/cli/sandbox)
- [Seguridad](/es/cli/security)
