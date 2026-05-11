---
summary: "Referencia de la CLI para `openclaw migrate` (importar estado desde otro sistema de agentes)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "Migrar"
---

# `openclaw migrate`

Importa el estado de otro sistema de agentes a través de un proveedor de migración propiedad de un complemento. Los proveedores incluidos cubren [Claude](/es/install/migrating-claude) y [Hermes](/es/install/migrating-hermes); los complementos de terceros pueden registrar proveedores adicionales.

<Tip>Para tutoriales dirigidos al usuario, consulta [Migrar desde Claude](/es/install/migrating-claude) y [Migrar desde Hermes](/es/install/migrating-hermes). El [centro de migración](/es/install/migrating) enumera todas las rutas.</Tip>

## Comandos

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
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
  Anular el directorio de estado de origen. Hermes por defecto es `~/.hermes`.
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  Importar las credenciales compatibles. Desactivado por defecto.
</ParamField>
<ParamField path="--overwrite" type="boolean">
  Permitir que apply reemplace los objetivos existentes cuando el plan reporte conflictos.
</ParamField>
<ParamField path="--yes" type="boolean">
  Saltar el aviso de confirmación. Requerido en modo no interactivo.
</ParamField>
<ParamField path="--no-backup" type="boolean">
  Saltar la copia de seguridad previa a la aplicación. Requiere `--force` cuando existe el estado local de OpenClaw.
</ParamField>
<ParamField path="--force" type="boolean">
  Requerido junto con `--no-backup` cuando apply de otro modo se negaría a saltar la copia de seguridad.
</ParamField>
<ParamField path="--json" type="boolean">
  Imprimir el plan o el resultado de apply como JSON. Con `--json` y sin `--yes`, apply imprime el plan y no muta el estado.
</ParamField>

## Modelo de seguridad

`openclaw migrate` es primero la vista previa.

<AccordionGroup>
  <Accordion title="Vista previa antes de aplicar">
    El proveedor devuelve un plan detallado antes de que cambie nada, incluyendo conflictos, elementos omitidos y elementos sensibles. Los planes JSON, la salida de aplicación y los informes de migración redactan claves anidadas que parezcan secretos, como claves de API, tokens, encabezados de autorización, cookies y contraseñas.

    `openclaw migrate apply <provider>` muestra una vista previa del plan y solicita confirmación antes de cambiar el estado, a menos que se establezca `--yes`. En el modo no interactivo, aplicar requiere `--yes`.

  </Accordion>
  <Accordion title="Copias de seguridad">
    Al aplicar se crea y verifica una copia de seguridad de OpenClaw antes de aplicar la migración. Si aún no existe un estado local de OpenClaw, el paso de copia de seguridad se omite y la migración puede continuar. Para omitir una copia de seguridad cuando existe el estado, pase tanto `--no-backup` como `--force`.
  </Accordion>
  <Accordion title="Conflictos">
    La aplicación se niega a continuar cuando el plan tiene conflictos. Revise el plan y luego vuelva a ejecutar con `--overwrite` si el reemplazo de los objetivos existentes es intencional. Los proveedores aún pueden escribir copias de seguridad a nivel de elemento para los archivos sobrescritos en el directorio de informes de migración.
  </Accordion>
  <Accordion title="Secretos">
    Los secretos nunca se importan de forma predeterminada. Use `--include-secrets` para importar las credenciales compatibles.
  </Accordion>
</AccordionGroup>

## Proveedor de Claude

El proveedor de Claude incluido detecta el estado de Claude Code en `~/.claude` de forma predeterminada. Use `--from <path>` para importar un directorio de inicio o una raíz de proyecto específicos de Claude Code.

<Tip>Para ver un tutorial para el usuario, consulte [Migrar desde Claude](/es/install/migrating-claude).</Tip>

### Qué importa Claude

- Proyecto `CLAUDE.md` y `.claude/CLAUDE.md` en el espacio de trabajo del agente de OpenClaw.
- Usuario `~/.claude/CLAUDE.md` añadido al espacio de trabajo `USER.md`.
- Definiciones de servidor MCP desde el proyecto `.mcp.json`, Claude Code `~/.claude.json` y Claude Desktop `claude_desktop_config.json`.
- Directorios de habilidades de Claude que incluyen `SKILL.md`.
- Archivos Markdown de comandos de Claude convertidos en habilidades de OpenClaw solo con invocación manual.

### Estado de archivo y revisión manual

Los hooks, permisos, valores predeterminados de entorno, memoria local, reglas con ámbito de ruta, subagentes, cachés, planes e historial de proyectos de Claude se conservan en el informe de migración o se reportan como elementos de revisión manual. OpenClaw no ejecuta hooks, copia listas de permitidos amplias ni importa el estado de credenciales de OAuth/Escritorio automáticamente.

## Proveedor Hermes

El proveedor Hermes incluido detecta el estado en `~/.hermes` de manera predeterminada. Use `--from <path>` cuando Hermes se encuentre en otro lugar.

### Qué importa Hermes

- Configuración predeterminada del modelo de `config.yaml`.
- Proveedores de modelos configurados y puntos de conexión personalizados compatibles con OpenAI de `providers` y `custom_providers`.
- Definiciones de servidor MCP de `mcp_servers` o `mcp.servers`.
- `SOUL.md` y `AGENTS.md` en el espacio de trabajo del agente OpenClaw.
- `memories/MEMORY.md` y `memories/USER.md` anexados a los archivos de memoria del espacio de trabajo.
- Valores predeterminados de configuración de memoria para la memoria de archivos de OpenClaw, además de elementos de archivo o revisión manual para proveedores de memoria externos como Honcho.
- Habilidades que incluyen un archivo `SKILL.md` bajo `skills/<name>/`.
- Valores de configuración por habilidad de `skills.config`.
- Claves de API compatibles de `.env`, solo con `--include-secrets`.

### Claves `.env` compatibles

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`.

### Estado solo de archivo

El estado de Hermes que OpenClaw no puede interpretar de forma segura se copia en el informe de migración para su revisión manual, pero no se carga en la configuración o las credenciales en vivo de OpenClaw. Esto preserva el estado opaco o inseguro sin pretender que OpenClaw pueda ejecutarlo o confiar en él automáticamente:

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

Los orígenes de migración son complementos. Un complemento declara sus identificadores de proveedor en `openclaw.plugin.json`:

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

En tiempo de ejecución, el complemento llama a `api.registerMigrationProvider(...)`. El proveedor implementa `detect`, `plan` y `apply`. Core es propietario de la orquestación de CLI, la política de respaldo, las indicaciones, la salida JSON y la verificación previa de conflictos. Core pasa el plan revisado a `apply(ctx, plan)`, y los proveedores pueden reconstruir el plan solo cuando ese argumento está ausente para la compatibilidad.

Los complementos del proveedor pueden usar `openclaw/plugin-sdk/migration` para la construcción de elementos y los conteos de resumen, además de `openclaw/plugin-sdk/migration-runtime` para las copias de archivos con conocimiento de conflictos, las copias de informes solo de archivo y los informes de migración.

## Integración de incorporación

La incorporación puede ofrecer migración cuando un proveedor detecta un origen conocido. Tanto `openclaw onboard --flow import` como `openclaw setup --wizard --import-from hermes` usan el mismo proveedor de migración de complementos y aún muestran una vista previa antes de aplicar.

<Note>Las importaciones de incorporación requieren una configuración nueva de OpenClaw. Restablezca la configuración, las credenciales, las sesiones y el espacio de trabajo primero si ya tiene un estado local. Las importaciones de respaldo y sobrescritura o combinación están limitadas por funciones para las configuraciones existentes.</Note>

## Relacionado

- [Migrar desde Hermes](/es/install/migrating-hermes): tutorial para el usuario.
- [Migrar desde Claude](/es/install/migrating-claude): tutorial para el usuario.
- [Migrar](/es/install/migrating): mover OpenClaw a una nueva máquina.
- [Doctor](/es/gateway/doctor): verificación de estado después de aplicar una migración.
- [Complementos](/es/tools/plugin): instalación y registro de complementos.
