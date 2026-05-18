---
summary: "Referencia de la CLI para `openclaw migrate` (importar estado desde otro sistema de agente)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "Migrar"
---

# `openclaw migrate`

Importar estado desde otro sistema de agentes a través de un proveedor de migración propiedad de un complemento. Los proveedores integrados cubren el estado de la CLI de Codex, [Claude](/es/install/migrating-claude) y [Hermes](/es/install/migrating-hermes); los complementos de terceros pueden registrar proveedores adicionales.

<Tip>Para tutoriales orientados al usuario, consulte [Migrar desde Claude](/es/install/migrating-claude) y [Migrar desde Hermes](/es/install/migrating-hermes). El [centro de migración](/es/install/migrating) enumera todas las rutas.</Tip>

## Comandos

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate codex --plugin google-calendar --verify-plugin-apps --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --plugin google-calendar
openclaw migrate apply codex --yes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  Nombre de un proveedor de migración registrado, por ejemplo `hermes`. Ejecute `openclaw migrate list` para ver los proveedores instalados.
</ParamField>
<ParamField path="--dry-run" type="boolean">
  Construya el plan y salga sin cambiar el estado.
</ParamField>
<ParamField path="--from <path>" type="string">
  Anule el directorio de estado de origen. Hermes predetermina a `~/.hermes`.
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  Importe las credenciales compatibles. Desactivado por defecto.
</ParamField>
<ParamField path="--overwrite" type="boolean">
  Permita que apply reemplace los destinos existentes cuando el plan reporte conflictos.
</ParamField>
<ParamField path="--yes" type="boolean">
  Omita el mensaje de confirmación. Requerido en modo no interactivo.
</ParamField>
<ParamField path="--skill <name>" type="string">
  Seleccione un elemento de copia de habilidad por nombre de habilidad o id de elemento. Repita la opción para migrar múltiples habilidades. Cuando se omite, las migraciones interactivas de Codex muestran un selector de casillas y las migraciones no interactivas mantienen todas las habilidades planificadas.
</ParamField>
<ParamField path="--plugin <name>" type="string">
  Seleccione un elemento de instalación de complemento de Codex por nombre de complemento o id de elemento. Repita la opción para migrar múltiples complementos de Codex. Cuando se omite, las migraciones interactivas de Codex muestran un selector de casillas nativo de complementos de Codex y las migraciones no interactivas mantienen todos los complementos planificados. Esto solo se aplica a
  complementos de Codex instalados en la fuente `openai-curated` descubiertos por el inventario del servidor de aplicaciones de Codex.
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  Solo Codex. Fuerce un recorrido fresco del servidor de aplicaciones de Codex de origen `app/list` antes de planificar la activación de complementos nativos. Desactivado por defecto para mantener la planificación de la migración rápida.
</ParamField>
<ParamField path="--no-backup" type="boolean">
  Omita la copia de seguridad previa a la aplicación. Requiere `--force` cuando existe el estado local de OpenClaw.
</ParamField>
<ParamField path="--force" type="boolean">
  Requerido junto con `--no-backup` cuando apply de otro modo se rehusaría a omitir la copia de seguridad.
</ParamField>
<ParamField path="--json" type="boolean">
  Imprima el plan o el resultado de apply como JSON. Con `--json` y sin `--yes`, apply imprime el plan y no muta el estado.
</ParamField>

## Modelo de seguridad

`openclaw migrate` es primero la vista previa.

<AccordionGroup>
  <Accordion title="Vista previa antes de aplicar">
    El proveedor devuelve un plan detallado antes de que cambie cualquier cosa, incluyendo conflictos, elementos omitidos y elementos sensibles. Los planes JSON, la salida de la aplicación y los informes de migración redactan claves anidadas que parezcan secretos, como claves de API, tokens, encabezados de autorización, cookies y contraseñas.

    `openclaw migrate apply <provider>` previsualiza el plan y solicita confirmación antes de cambiar el estado a menos que se establezca `--yes`. En el modo no interactivo, aplicar requiere `--yes`.

  </Accordion>
  <Accordion title="Copias de seguridad">
    Aplicar crea y verifica una copia de seguridad de OpenClaw antes de aplicar la migración. Si aún no existe un estado local de OpenClaw, el paso de copia de seguridad se omite y la migración puede continuar. Para omitir una copia de seguridad cuando existe el estado, pase tanto `--no-backup` como `--force`.
  </Accordion>
  <Accordion title="Conflictos">
    Aplicar se niega a continuar cuando el plan tiene conflictos. Revise el plan y luego vuelva a ejecutar con `--overwrite` si reemplazar los objetivos existentes es intencional. Los proveedores aún pueden escribir copias de seguridad a nivel de elemento para los archivos sobrescritos en el directorio de informes de migración.
  </Accordion>
  <Accordion title="Secretos">
    Los secretos nunca se importan de forma predeterminada. Use `--include-secrets` para importar las credenciales admitidas.
  </Accordion>
</AccordionGroup>

## Proveedor de Claude

El proveedor de Claude incluido detecta el estado de Claude Code en `~/.claude` de forma predeterminada. Use `--from <path>` para importar un directorio de inicio o una raíz de proyecto específico de Claude Code.

<Tip>Para un tutorial orientado al usuario, consulte [Migrar desde Claude](/es/install/migrating-claude).</Tip>

### Qué importa Claude

- Proyecto `CLAUDE.md` y `.claude/CLAUDE.md` en el espacio de trabajo del agente OpenClaw.
- Usuario `~/.claude/CLAUDE.md` agregado al espacio de trabajo `USER.md`.
- Definiciones de servidor MCP desde el proyecto `.mcp.json`, Claude Code `~/.claude.json` y Claude Desktop `claude_desktop_config.json`.
- Directorios de habilidades de Claude que incluyen `SKILL.md`.
- Archivos Markdown de comandos de Claude convertidos en habilidades de OpenClaw solo con invocación manual.

### Estado de archivo y revisión manual

Los hooks, permisos, valores predeterminados de entorno, memoria local, reglas con ámbito de ruta, subagentes, cachés, planes e historial de proyectos de Claude se conservan en el informe de migración o se reportan como elementos de revisión manual. OpenClaw no ejecuta hooks, copia listas de permitidos amplias ni importa el estado de credenciales de OAuth/Escritorio automáticamente.

## Proveedor de Codex

El proveedor de Codex incluido detecta el estado de la CLI de Codex en `~/.codex` de forma predeterminada, o
en `CODEX_HOME` cuando se establece esa variable de entorno. Use `--from <path>` para
inventariar un hogar de Codex específico.

Use este proveedor cuando se traslade al arnés de Codex de OpenClaw y desee
promover deliberadamente activos personales útiles de la CLI de Codex. Los lanzamientos
locales del servidor de aplicaciones de Codex usan un `CODEX_HOME` por agente, por lo que no leen su
`~/.codex` personal de manera predeterminada. El proceso normal `HOME` todavía se hereda, por lo que Codex
puede ver entradas compartidas de `$HOME/.agents/*` de habilidades/mercado de complementos y
los subprocesos pueden encontrar la configuración y los tokens del directorio principal del usuario.

Ejecutar `openclaw migrate codex` en una terminal interactiva muestra una vista previa del plan completo y luego abre selectores de casillas de verificación antes de la confirmación final de aplicación. Primero se solicitan los elementos de copia de habilidades. Use `Toggle all on` o `Toggle all off` para selección masiva. Presione Espacio para alternar las filas, o presione Enter para activar la fila resaltada y continuar. Las habilidades planificadas comienzan marcadas, las habilidades en conflicto comienzan sin marcar, y `Skip for now` omite las copias de habilidades en esta ejecución mientras continúa con la selección de complementos. Cuando los complementos de Codex curados instalados en la fuente son migrables y no se proporcionó `--plugin`, la migración luego solicita la activación de complementos nativos de Codex por nombre de complemento. Los elementos de complemento comienzan marcados a menos que la configuración del complemento Codex de OpenClaw de destino ya tenga ese complemento. Los complementos de destino existentes comienzan sin marcar y muestran una sugerencia de conflicto como `conflict: plugin exists`; elija `Toggle all off` para no migrar complementos nativos de Codex en esa ejecución, o `Skip for now` para detenerse antes de aplicar. Para ejecuciones programadas o exactas, pase `--skill <name>` una vez por habilidad, por ejemplo:

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

Use `--plugin <name>` para limitar la migración de complementos nativos de Codex de forma no interactiva a uno o más complementos curados instalados en la fuente:

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Qué importa Codex

- Directorios de habilidades de la CLI de Codex bajo `$CODEX_HOME/skills`, excluyendo el caché de Codex `.system`.
- AgentSkills personales bajo `$HOME/.agents/skills`, copiadas en el espacio de trabajo del agente de OpenClaw actual cuando se desea propiedad por agente.
- Complementos de Codex instalados desde la fuente `openai-curated` descubiertos a través del servidor de aplicaciones `plugin/list` de Codex. La planificación lee `plugin/read` para cada complemento instalado y habilitado. Los complementos respaldados por aplicaciones requieren que la respuesta de cuenta del servidor de aplicaciones Codex de origen sea una cuenta de suscripción a ChatGPT; las respuestas de cuenta que no son de ChatGPT o que faltan se omiten con `codex_subscription_required`. De forma predeterminada, la migración no llama al origen `app/list`, por lo que los complementos respaldados por aplicaciones que pasan la puerta de cuenta se planifican sin verificación de accesibilidad a la aplicación de origen, y los fallos de transporte de búsqueda de cuentas se omiten con `codex_account_unavailable`. Pase `--verify-plugin-apps` cuando desee que la migración fuerce una instantánea `app/list` de origen nueva y requiera que cada aplicación propiedad esté presente, habilitada y accesible antes de planificar la activación nativa. En ese modo, los fallos de transporte de búsqueda de cuentas pasan a la verificación del inventario de aplicaciones de origen. La instantánea del inventario de aplicaciones de origen se mantiene en memoria para el proceso actual; no se escribe en la salida de migración ni en la configuración de destino. Los complementos deshabilitados, los detalles de complementos ilegibles, las cuentas de origen con puerta de suscripción y, cuando se solicita verificación, las aplicaciones faltantes, las aplicaciones deshabilitadas, las aplicaciones inaccesibles o los fallos del inventario de aplicaciones de origen se convierten en elementos omitidos manualmente con razones tipificadas en lugar de entradas de configuración de destino. Apply llama al servidor de aplicaciones `plugin/install` para cada complemento eligible seleccionado, incluso si el servidor de aplicaciones de destino ya informa que ese complemento está instalado y habilitado. Los complementos de Codex migrados solo se pueden usar en sesiones que seleccionan el arnés nativo de Codex; no están expuestos a Pi, ejecuciones normales del proveedor de OpenAI, enlaces de conversación de ACP u otros arneses.

### Estado de Codex de revisión manual

Los `config.toml` de Codex, los `hooks/hooks.json` nativos, los mercados no curados, los paquetes de complementos en caché que no son complementos curados instalados desde la fuente y los complementos instalados desde la fuente que no pasan la puerta de suscripción de origen no se activan automáticamente. Cuando se establece `--verify-plugin-apps`, también se omiten los complementos que no pasan la puerta del inventario de aplicaciones de origen. Se copian o se reportan en el informe de migración para su revisión manual.

Para los complementos curados instalados desde el origen migrados, apply escribe:

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- una entrada de complemento explícita con `marketplaceName: "openai-curated"` y
  `pluginName` para cada complemento seleccionado

La migración nunca escribe `plugins["*"]` y nunca almacena rutas de caché
del mercado local. Los fallos de suscripción del lado de origen se informan en elementos manuales con razones
tipificadas como `codex_subscription_required`, `codex_account_unavailable`,
`plugin_disabled` o `plugin_read_unavailable`. Con `--verify-plugin-apps`,
los fallos de inventario de aplicaciones del lado de origen también pueden aparecer como `app_inaccessible`,
`app_disabled`, `app_missing` o `app_inventory_unavailable`. Los complementos omitidos
no se escriben en la configuración de destino.
Las instalaciones que requieren autenticación del lado de destino se informan en el elemento del complemento afectado con
`status: "skipped"`, `reason: "auth_required"` e identificadores de aplicaciones saneados.
Sus entradas de configuración explícitas se escriben deshabilitadas hasta que las autorice y
las habilite. Otros fallos de instalación son resultados `error` con ámbito de elemento.

Si el inventario de complementos del servidor de aplicaciones de Codex no está disponible durante la planificación, la migración recurre a elementos informativos de paquetes en caché en lugar de fallar toda la migración.

## Proveedor Hermes

El proveedor de Hermes incluido detecta el estado en `~/.hermes` de manera predeterminada. Use `--from <path>` cuando Hermes se encuentre en otro lugar.

### Lo que importa Hermes

- Configuración de modelo predeterminada de `config.yaml`.
- Proveedores de modelos configurados y endpoints personalizados compatibles con OpenAI de `providers` y `custom_providers`.
- Definiciones de servidor MCP de `mcp_servers` o `mcp.servers`.
- `SOUL.md` y `AGENTS.md` en el espacio de trabajo del agente OpenClaw.
- `memories/MEMORY.md` y `memories/USER.md` agregados a los archivos de memoria del espacio de trabajo.
- Valores predeterminados de configuración de memoria para la memoria de archivos de OpenClaw, además de elementos de archivo o revisión manual para proveedores de memoria externos como Honcho.
- Habilidades que incluyen un archivo `SKILL.md` en `skills/<name>/`.
- Valores de configuración por habilidad de `skills.config`.
- Claves de API compatibles de `.env`, solo con `--include-secrets`.

### Claves `.env` compatibles

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`.

### Estado de solo archivo

El estado de Hermes que OpenClaw no puede interpretar de manera segura se copia en el informe de migración para su revisión manual, pero no se carga en la configuración o las credenciales en vivo de OpenClaw. Esto preserva el estado opaco o inseguro sin fingir que OpenClaw puede ejecutarlo o confiar en él automáticamente:

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### Después de aplicar

```bash
openclaw doctor
```

## Contrato del complemento

Los orígenes de migración son complementos. Un complemento declara sus IDs de proveedor en `openclaw.plugin.json`:

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

En tiempo de ejecución, el complemento llama a `api.registerMigrationProvider(...)`. El proveedor implementa `detect`, `plan` y `apply`. Core posee la orquestación de CLI, la política de respaldo, las solicitudes, la salida JSON y la verificación previa de conflictos. Core pasa el plan revisado a `apply(ctx, plan)`, y los proveedores pueden reconstruir el plan solo cuando ese argumento está ausente por compatibilidad.

Los complementos del proveedor pueden usar `openclaw/plugin-sdk/migration` para la construcción de elementos y los contadores de resumen, además de `openclaw/plugin-sdk/migration-runtime` para las copias de archivos con conocimiento de conflictos, las copias de informes solo de archivo, los contenedores de configuración en tiempo de ejecución en caché y los informes de migración.

## Integración de incorporación

La incorporación puede ofrecer la migración cuando un proveedor detecta un origen conocido. Tanto `openclaw onboard --flow import` como `openclaw setup --wizard --import-from hermes` utilizan el mismo proveedor de migración de complementos y aún muestran una vista previa antes de aplicar.

<Note>Las importaciones de incorporación requieren una configuración nueva de OpenClaw. Restablezca la configuración, las credenciales, las sesiones y el espacio de trabajo primero si ya tiene un estado local. Las importaciones de copia de seguridad y sobrescritura o combinación están restringidas por características para configuraciones existentes.</Note>

## Relacionado

- [Migrar desde Hermes](/es/install/migrating-hermes): tutorial para el usuario.
- [Migrar desde Claude](/es/install/migrating-claude): tutorial para el usuario.
- [Migración](/es/install/migrating): mover OpenClaw a una nueva máquina.
- [Doctor](/es/gateway/doctor): verificación de estado después de aplicar una migración.
- [Complementos](/es/tools/plugin): instalación y registro de complementos.
