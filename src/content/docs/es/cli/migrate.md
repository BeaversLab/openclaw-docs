---
summary: "Referencia de CLI para `openclaw migrate` (importar estado desde otro sistema de agentes)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "Migrar"
---

# `openclaw migrate`

Importe el estado desde otro sistema de agentes a través de un proveedor de migración propiedad de un complemento. Los proveedores integrados cubren el estado de la CLI de Codex, [Claude](/es/install/migrating-claude) y [Hermes](/es/install/migrating-hermes); los complementos de terceros pueden registrar proveedores adicionales.

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
  Anular el directorio de estado de origen. Hermes por defecto es `~/.hermes`.
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  Importar las credenciales compatibles sin preguntar. La aplicación interactiva pregunta antes de importar las credenciales de autenticación detectadas, con sí seleccionado por defecto; la `--yes` no interactiva requiere `--include-secrets` para importarlas.
</ParamField>
<ParamField path="--no-auth-credentials" type="boolean">
  Omitir la importación de credenciales de autenticación, incluyendo el mensaje interactivo.
</ParamField>
<ParamField path="--overwrite" type="boolean">
  Permitir que la aplicación reemplace los objetivos existentes cuando el plan reporte conflictos.
</ParamField>
<ParamField path="--yes" type="boolean">
  Omitir el mensaje de confirmación. Requerido en modo no interactivo.
</ParamField>
<ParamField path="--skill <name>" type="string">
  Seleccione un elemento de copia de habilidad por nombre de habilidad o id de elemento. Repita la bandera para migrar múltiples habilidades. Cuando se omite, las migraciones interactivas de Codex muestran un selector de casillas de verificación y las migraciones no interactivas mantienen todas las habilidades planificadas.
</ParamField>
<ParamField path="--plugin <name>" type="string">
  Seleccione un elemento de instalación del complemento Codex por nombre de complemento o id de elemento. Repita la bandera para migrar múltiples complementos de Codex. Cuando se omite, las migraciones interactivas de Codex muestran un selector de casillas de verificación nativo de complementos de Codex y las migraciones no interactivas mantienen todos los complementos planificados. Esto solo se
  aplica a complementos de Codex `openai-curated` instalados por fuente descubiertos por el inventario del servidor de aplicaciones de Codex.
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  Solo Codex. Forzar un recorrido fresco del `app/list` del servidor de aplicaciones de origen de Codex antes de planificar la activación del complemento nativo. Desactivado por defecto para mantener la planificación de la migración rápida.
</ParamField>
<ParamField path="--no-backup" type="boolean">
  Omitir la copia de seguridad previa a la aplicación. Requiere `--force` cuando existe el estado local de OpenClaw.
</ParamField>
<ParamField path="--force" type="boolean">
  Requerido junto con `--no-backup` cuando la aplicación de otro modo se negaría a omitir la copia de seguridad.
</ParamField>
<ParamField path="--json" type="boolean">
  Imprimir el plan o el resultado de la aplicación como JSON. Con `--json` y sin `--yes`, la aplicación imprime el plan y no muta el estado.
</ParamField>

## Modelo de seguridad

`openclaw migrate` prioriza la vista previa.

<AccordionGroup>
  <Accordion title="Vista previa antes de aplicar">
    El proveedor devuelve un plan detallado antes de que cambie nada, incluyendo conflictos, elementos omitidos y elementos sensibles. Los planes JSON, la salida de aplicación y los informes de migración redactan claves anidadas que parezcan secretos, como claves de API, tokens, encabezados de autorización, cookies y contraseñas.

    `openclaw migrate apply <provider>` previsualiza el plan y solicita confirmación antes de cambiar el estado a menos que se establezca `--yes`. En el modo no interactivo, la aplicación requiere `--yes`.

  </Accordion>
  <Accordion title="Copias de seguridad">
    La aplicación crea y verifica una copia de seguridad de OpenClaw antes de aplicar la migración. Si aún no existe un estado local de OpenClaw, el paso de copia de seguridad se omite y la migración puede continuar. Para omitir una copia de seguridad cuando existe el estado, pasa tanto `--no-backup` como `--force`.
  </Accordion>
  <Accordion title="Conflictos">
    La aplicación se niega a continuar cuando el plan tiene conflictos. Revisa el plan y luego vuelve a ejecutar con `--overwrite` si la intención es reemplazar los objetivos existentes. Los proveedores aún pueden escribir copias de seguridad a nivel de elemento para los archivos sobrescritos en el directorio de informes de migración.
  </Accordion>
  <Accordion title="Secretos">
    La aplicación interactiva pregunta si se deben importar las credenciales de autenticación detectadas, con "sí" seleccionado por defecto. Usa `--no-auth-credentials` para omitirlas, o usa `--include-secrets` para la importación de credenciales desatendida con `--yes`.
  </Accordion>
</AccordionGroup>

## Proveedor de Claude

El proveedor Claude incluido detecta el estado de Claude Code en `~/.claude` por defecto. Usa `--from <path>` para importar un directorio home o raíz de proyecto específico de Claude Code.

<Tip>Para un tutorial orientado al usuario, consulta [Migrar desde Claude](/es/install/migrating-claude).</Tip>

### Qué importa Claude

- Proyecto `CLAUDE.md` y `.claude/CLAUDE.md` en el espacio de trabajo del agente OpenClaw.
- Usuario `~/.claude/CLAUDE.md` añadido al espacio de trabajo `USER.md`.
- Definiciones de servidor MCP del proyecto `.mcp.json`, Claude Code `~/.claude.json` y Claude Desktop `claude_desktop_config.json`.
- Directorios de habilidades de Claude que incluyen `SKILL.md`.
- Archivos Markdown de comandos de Claude convertidos en habilidades de OpenClaw solo con invocación manual.

### Estado de archivo y revisión manual

Los hooks, permisos, valores predeterminados de entorno, memoria local, reglas con ámbito de ruta, subagentes, cachés, planes e historial de proyectos de Claude se conservan en el informe de migración o se reportan como elementos de revisión manual. OpenClaw no ejecuta hooks, copia listas de permitidos amplias ni importa el estado de credenciales de OAuth/Escritorio automáticamente.

## Proveedor de Codex

El proveedor Codex incluido detecta el estado de Codex CLI en `~/.codex` de forma predeterminada, o
en `CODEX_HOME` cuando se establece esa variable de entorno. Use `--from <path>` para
inventariar un directorio de inicio de Codex específico.

Use este proveedor cuando se traslade al arnés Codex de OpenClaw y desee
promover activos personales útiles de Codex CLI de manera deliberada. Los lanzamientos
locales del servidor de aplicaciones de Codex usan un `CODEX_HOME` por agente, por lo que no leen su `~/.codex` personal
de forma predeterminada. El proceso normal `HOME` todavía se hereda, por lo que Codex
puede ver entradas compartidas del mercado de habilidades/complementos `$HOME/.agents/*` y
los subprocesos pueden encontrar la configuración y los tokens del directorio de inicio del usuario.

Ejecutar `openclaw migrate codex` en una terminal interactiva previsualiza el plan
completo y luego abre selectores de casillas de verificación antes de la confirmación final de aplicación. Los elementos de
copia de habilidades se solicitan primero. Use `Toggle all on` o `Toggle all off` para una selección
masiva. Presione Espacio para alternar filas, o presione Entrar para activar la fila
destacada y continuar. Las habilidades planificadas comienzan marcadas, las habilidades en conflicto comienzan sin marcar y
`Skip for now` omite las copias de habilidades en esta ejecución mientras continúa con la selección
de complementos. Cuando los complementos Codex curados instalados en la fuente son migrables y
no se proporcionó `--plugin`, la migración luego solicita la activación de complementos nativos de Codex
por nombre de complemento. Los elementos de complementos
comienzan marcados a menos que la configuración del complemento Codex de OpenClaw de destino ya tenga ese
complemento. Los complementos de destino existentes comienzan sin marcar y muestran una sugerencia de conflicto como
`conflict: plugin exists`; elija `Toggle all off` para no migrar complementos nativos de Codex
en esa ejecución, o `Skip for now` para detenerse antes de aplicar. Para ejecuciones con script o
exactas, pase `--skill <name>` una vez por habilidad, por ejemplo:

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

Use `--plugin <name>` para limitar la migración del complemento nativo de Codex de forma no interactiva a uno o más complementos curados instalados por fuente:

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Qué importa Codex

- Directorios de habilidades de Codex CLI bajo `$CODEX_HOME/skills`, excluyendo el caché `.system` de Codex.
- AgentSkills personales bajo `$HOME/.agents/skills`, copiados en el espacio de trabajo del agente OpenClaw actual cuando se desea propiedad por agente.
- Complementos de Codex `openai-curated` instalados por fuente descubiertos a través del servidor de aplicaciones `plugin/list` de Codex. La planificación lee `plugin/read` para cada complemento instalado habilitado. Los complementos respaldados por aplicaciones requieren que la respuesta de la cuenta del servidor de aplicaciones de origen de Codex sea una cuenta de suscripción ChatGPT; las respuestas de cuenta que no son de ChatGPT o faltantes se omiten con `codex_subscription_required`. De manera predeterminada, la migración no llama al origen `app/list`, por lo que los complementos respaldados por aplicaciones que pasan la puerta de cuenta se planifican sin verificación de accesibilidad de la aplicación de origen, y los fallos de transporte de búsqueda de cuenta se omiten con `codex_account_unavailable`. Pase `--verify-plugin-apps` cuando desee que la migración fuerce una instantánea fresca del origen `app/list` y requiera que cada aplicación propiedad esté presente, habilitada y accesible antes de planificar la activación nativa. En ese modo, los fallos de transporte de búsqueda de cuenta pasan a la verificación del inventario de aplicaciones de origen. La instantánea del inventario de aplicaciones de origen se mantiene en memoria para el proceso actual; no se escribe en la salida de migración ni en la configuración de destino. Los complementos deshabilitados, los detalles del complemento ilegibles, las cuentas de origen con puerta de suscripción y, cuando se solicita verificación, las aplicaciones faltantes, las aplicaciones deshabilitadas, las aplicaciones inaccesibles o los fallos del inventario de aplicaciones de origen se convierten en elementos omitidos manualmente con razones tipificadas en lugar de entradas de configuración de destino. Apply llama al servidor de aplicaciones `plugin/install` para cada complemento elegible seleccionado, incluso si el servidor de aplicaciones de destino ya informa que ese complemento está instalado y habilitado. Los complementos de Codex migrados solo se pueden usar en sesiones que seleccionan el arnés nativo de Codex; no están expuestos a ejecuciones del proveedor OpenClaw, enlaces de conversación ACP u otros arneses.

### Estado de Codex de revisión manual

Codex `config.toml`, native `hooks/hooks.json`, mercados no curados, paquetes de plugins en caché que no son plugins curados instalados desde la fuente y plugins instalados desde la fuente que no pasan el control de suscripción de la fuente no se activan automáticamente.
Cuando `--verify-plugin-apps` está establecido, los plugins que no pasan el control de inventario de aplicaciones de la fuente también se omiten. Se copian o se reportan en el informe de migración para su revisión manual.

Para los complementos curados instalados desde el origen migrados, apply escribe:

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- una entrada de plugin explícita con `marketplaceName: "openai-curated"` y
  `pluginName` para cada plugin seleccionado

La migración nunca escribe `plugins["*"]` y nunca almacena rutas de caché del marketplace local.
Los fallos de suscripción en el lado de la fuente se reportan en los elementos manuales con razones tipificadas tales como `codex_subscription_required`, `codex_account_unavailable`,
`plugin_disabled` o `plugin_read_unavailable`. Con `--verify-plugin-apps`,
los fallos de inventario de aplicaciones de la fuente también pueden aparecer como `app_inaccessible`,
`app_disabled`, `app_missing` o `app_inventory_unavailable`. Los plugins omitidos
no se escriben en la configuración de destino.
Las instalaciones que requieren autenticación en el lado de destino se reportan en el elemento de plugin afectado con
`status: "skipped"`, `reason: "auth_required"` e identificadores de aplicaciones saneados.
Sus entradas de configuración explícitas se escriben deshabilitadas hasta que las reautorice y
las habilite. Otros fallos de instalación son resultados `error` con alcance de elemento.

Si el inventario de complementos del servidor de aplicaciones de Codex no está disponible durante la planificación, la migración recurre a elementos informativos de paquetes en caché en lugar de fallar toda la migración.

## Proveedor Hermes

El proveedor Hermes incluido detecta el estado en `~/.hermes` por defecto. Use `--from <path>` cuando Hermes se encuentre en otro lugar.

### Lo que importa Hermes

- Configuración de modelo predeterminada de `config.yaml`.
- Proveedores de modelos configurados y endpoints personalizados compatibles con OpenAI de `providers` y `custom_providers`.
- Definiciones de servidor MCP de `mcp_servers` o `mcp.servers`.
- `SOUL.md` y `AGENTS.md` en el espacio de trabajo del agente OpenClaw.
- `memories/MEMORY.md` y `memories/USER.md` añadidos a los archivos de memoria del espacio de trabajo.
- Valores predeterminados de configuración de memoria para la memoria de archivos de OpenClaw, además de elementos de archivo o revisión manual para proveedores de memoria externos como Honcho.
- Habilidades que incluyen un archivo `SKILL.md` bajo `skills/<name>/`.
- Valores de configuración por habilidad de `skills.config`.
- Credenciales OAuth de OpenAI de OpenCode desde OpenCode `auth.json` cuando se acepta la migración interactiva de credenciales, o cuando `--include-secrets` está configurado. Las entradas OAuth de Hermes `auth.json` son un estado heredado informado para la reautenticación manual de OpenAI o la reparación con doctor.
- Claves de API y tokens compatibles de Hermes `.env` y OpenCode `auth.json` cuando se acepta la migración interactiva de credenciales, o cuando se establece `--include-secrets`.

### Claves `.env` compatibles

- `AI_GATEWAY_API_KEY`
- `ALIBABA_API_KEY`
- `ANTHROPIC_API_KEY`
- `ARCEEAI_API_KEY`
- `CEREBRAS_API_KEY`
- `CHUTES_API_KEY`
- `CLOUDFLARE_AI_GATEWAY_API_KEY`
- `COPILOT_GITHUB_TOKEN`
- `DASHSCOPE_API_KEY`
- `DEEPINFRA_API_KEY`
- `DEEPSEEK_API_KEY`
- `FIREWORKS_API_KEY`
- `GEMINI_API_KEY`
- `GH_TOKEN`
- `GITHUB_TOKEN`
- `GLM_API_KEY`
- `GOOGLE_API_KEY`
- `GROQ_API_KEY`
- `HF_TOKEN`
- `HUGGINGFACE_HUB_TOKEN`
- `KILOCODE_API_KEY`
- `KIMICODE_API_KEY`
- `KIMI_API_KEY`
- `MINIMAX_API_KEY`
- `MINIMAX_CODING_API_KEY`
- `MISTRAL_API_KEY`
- `MODELSTUDIO_API_KEY`
- `MOONSHOT_API_KEY`
- `NVIDIA_API_KEY`
- `OPENAI_API_KEY`
- `OPENCODE_API_KEY`
- `OPENCODE_GO_API_KEY`
- `OPENCODE_ZEN_API_KEY`
- `OPENROUTER_API_KEY`
- `QIANFAN_API_KEY`
- `QWEN_API_KEY`
- `TOGETHER_API_KEY`
- `VENICE_API_KEY`
- `XAI_API_KEY`
- `XIAOMI_API_KEY`
- `ZAI_API_KEY`
- `Z_AI_API_KEY`

### Estado de solo archivo

El estado de Hermes que OpenClaw no puede interpretar de manera segura se copia en el informe de migración para su revisión manual, pero no se carga en la configuración o las credenciales activas de OpenClaw. Esto preserva el estado opaco o inseguro sin pretender que OpenClaw pueda ejecutarlo o confiar en él automáticamente:

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
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

En tiempo de ejecución, el complemento llama a `api.registerMigrationProvider(...)`. El proveedor implementa `detect`, `plan` y `apply`. Core se encarga de la orquestación de la CLI, la política de respaldo, las indicaciones, la salida JSON y la verificación previa de conflictos. Core pasa el plan revisado a `apply(ctx, plan)`, y los proveedores pueden reconstruir el plan solo cuando ese argumento está ausente por compatibilidad.

Los complementos de proveedor pueden usar `openclaw/plugin-sdk/migration` para la construcción de elementos y los recuentos de resumen, además de `openclaw/plugin-sdk/migration-runtime` para copias de archivos con capacidad de detección de conflictos, copias de informes de solo archivo, contenedores de configuración en tiempo de ejecución en caché e informes de migración.

## Integración de incorporación

La incorporación puede ofrecer la migración cuando un proveedor detecta un origen conocido. Tanto `openclaw onboard --flow import` como `openclaw setup --wizard --import-from hermes` usan el mismo proveedor de migración del complemento y aún muestran una vista previa antes de aplicar.

<Note>Las importaciones de incorporación requieren una configuración nueva de OpenClaw. Restablezca la configuración, las credenciales, las sesiones y el espacio de trabajo primero si ya tiene un estado local. Las importaciones de copia de seguridad y sobrescritura o fusión están protegidas por funciones para las configuraciones existentes.</Note>

## Relacionado

- [Migración desde Hermes](/es/install/migrating-hermes): tutorial para el usuario.
- [Migración desde Claude](/es/install/migrating-claude): tutorial para el usuario.
- [Migración](/es/install/migrating): mover OpenClaw a una nueva máquina.
- [Doctor](/es/gateway/doctor): verificación de estado después de aplicar una migración.
- [Plugins](/es/tools/plugin): instalación y registro de complementos.
