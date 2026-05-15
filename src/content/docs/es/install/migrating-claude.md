---
summary: "Mover el estado local de Claude Code y Claude Desktop a OpenClaw con una importación previsualizada"
read_when:
  - You are coming from Claude Code or Claude Desktop and want to keep instructions, MCP servers, and skills
  - You need to understand what OpenClaw imports automatically and what stays archive-only
title: "Migrar desde Claude"
---

OpenClaw importa el estado local de Claude a través del proveedor de migración de Claude incluido. El proveedor previsualiza cada elemento antes de cambiar el estado, redacta secretos en los planes e informes, y crea una copia de seguridad verificada antes de aplicar.

<Note>Las importaciones de incorporación requieren una configuración nueva de OpenClaw. Si ya tienes un estado local de OpenClaw, restablece la configuración, las credenciales, las sesiones y el espacio de trabajo primero, o usa `openclaw migrate` directamente con `--overwrite` después de revisar el plan.</Note>

## Dos formas de importar

<Tabs>
  <Tab title="Asistente de incorporación">
    El asistente ofrece Claude cuando detecta un estado local de Claude.

    ```bash
    openclaw onboard --flow import
    ```

    O apunta a una fuente específica:

    ```bash
    openclaw onboard --import-from claude --import-source ~/.claude
    ```

  </Tab>
  <Tab title="CLI">
    Usa `openclaw migrate` para ejecuciones programadas o repetibles. Consulta [`openclaw migrate`](/es/cli/migrate) para la referencia completa.

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    Añade `--from <path>` para importar un directorio home de Claude Code o una raíz de proyecto específica.

  </Tab>
</Tabs>

## Qué se importa

<AccordionGroup>
  <Accordion title="Instrucciones y memoria">
    - El contenido del proyecto `CLAUDE.md` y `.claude/CLAUDE.md` se copia o anexa al espacio de trabajo del agente OpenClaw `AGENTS.md`.
    - El contenido del usuario `~/.claude/CLAUDE.md` se anexa al espacio de trabajo `USER.md`.

  </Accordion>
  <Accordion title="Servidores MCP">
    Las definiciones de servidores MCP se importan del proyecto `.mcp.json`, Claude Code `~/.claude.json` y Claude Desktop `claude_desktop_config.json` cuando están presentes.
  </Accordion>
  <Accordion title="Habilidades y comandos">
    - Las habilidades de Claude con un archivo `SKILL.md` se copian al directorio de habilidades del espacio de trabajo OpenClaw.
    - Los archivos Markdown de comandos de Claude bajo `.claude/commands/` o `~/.claude/commands/` se convierten en habilidades de OpenClaw con `disable-model-invocation: true`.

  </Accordion>
</AccordionGroup>

## Lo que permanece solo en el archivo

El proveedor copia estos elementos en el informe de migración para su revisión manual, pero **no** los carga en la configuración en vivo de OpenClaw:

- Ganchos de Claude (Claude hooks)
- Permisos de Claude y listas de permitidos amplias de herramientas
- Valores predeterminados del entorno de Claude
- `CLAUDE.local.md`
- `.claude/rules/`
- Subagentes de Claude bajo `.claude/agents/` o `~/.claude/agents/`
- Cachés, planes y directorios de historial de proyectos de Claude Code
- Extensiones de Claude Desktop y credenciales almacenadas en el sistema operativo

OpenClaw se niega a ejecutar ganchos, confiar en listas de permitidos de permisos o decodificar automáticamente el estado opaco de credenciales de OAuth y Desktop. Mueva lo que necesite manualmente después de revisar el archivo.

## Selección de origen

Sin `--from`, OpenClaw inspecciona el hogar predeterminado de Claude Code en `~/.claude`, el archivo de estado `~/.claude.json` muestreado de Claude Code y la configuración MCP de Claude Desktop en macOS.

Cuando `--from` apunta a una raíz de proyecto, OpenClaw importa solo los archivos de Claude de ese proyecto, como `CLAUDE.md`, `.claude/settings.json`, `.claude/commands/`, `.claude/skills/` y `.mcp.json`. No lee su hogar global de Claude durante una importación de raíz de proyecto.

## Flujo recomendado

<Steps>
  <Step title="Vista previa del plan">
    ```bash
    openclaw migrate claude --dry-run
    ```

    El plan lista todo lo que cambiará, incluidos conflictos, elementos omitidos y valores sensibles redactados de campos `env` o `headers` de MCP anidados.

  </Step>
  <Step title="Aplicar con copia de seguridad">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw crea y verifica una copia de seguridad antes de aplicar.

  </Step>
  <Step title="Ejecutar doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/es/gateway/doctor) busca problemas de configuración o estado después de la importación.

  </Step>
  <Step title="Reiniciar y verificar">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    Confirme que la puerta de enlace está sana y que sus instrucciones, servidores MCP y habilidades importados están cargados.

  </Step>
</Steps>

## Manejo de conflictos

Apply se niega a continuar cuando el plan reporta conflictos (un archivo o valor de configuración ya existe en el destino).

<Warning>Vuelva a ejecutar con `--overwrite` solo cuando reemplazar el destino existente sea intencional. Los proveedores aún pueden escribir copias de seguridad a nivel de elemento para los archivos sobrescritos en el directorio del informe de migración.</Warning>

Para una instalación nueva de OpenClaw, los conflictos son inusuales. Generalmente aparecen cuando vuelve a ejecutar la importación en una configuración que ya tiene ediciones de usuario.

## Salida JSON para automatización

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

Con `--json` y sin `--yes`, apply imprime el plan y no muta el estado. Este es el modo más seguro para CI y scripts compartidos.

## Solución de problemas

<AccordionGroup>
  <Accordion title="El estado de Claude reside fuera de ~/.claude">Pase `--from /actual/path` (CLI) o `--import-source /actual/path` (incorporación).</Accordion>
  <Accordion title="La incorporación se niega a importar en una configuración existente">Las importaciones de incorporación requieren una configuración nueva. Reinicie el estado y vuelva a incorporar, o use `openclaw migrate apply claude` directamente, que admite `--overwrite` y control explícito de copias de seguridad.</Accordion>
  <Accordion title="Los servidores MCP de Claude Desktop no se importaron">Claude Desktop lee `claude_desktop_config.json` desde una ruta específica de la plataforma. Apunte `--from` al directorio de ese archivo si OpenClaw no lo detectó automáticamente.</Accordion>
  <Accordion title="Los comandos de Claude se convirtieron en habilidades con la invocación del modelo deshabilitada">Por diseño. Los comandos de Claude son activados por el usuario, por lo que OpenClaw los importa como habilidades con `disable-model-invocation: true`. Edite los metadatos de cada habilidad si desea que el agente las invoque automáticamente.</Accordion>
</AccordionGroup>

## Relacionado

- [`openclaw migrate`](/es/cli/migrate): referencia completa de la CLI, contrato del complemento y formas JSON.
- [Guía de migración](/es/install/migrating): todas las rutas de migración.
- [Migrar desde Hermes](/es/install/migrating-hermes): la otra ruta de importación entre sistemas.
- [Incorporación](/es/cli/onboard): flujo del asistente y marcas no interactivas.
- [Doctor](/es/gateway/doctor): verificación de estado posterior a la migración.
- [Espacio de trabajo del agente](/es/concepts/agent-workspace): donde residen `AGENTS.md`, `USER.md` y las habilidades.
