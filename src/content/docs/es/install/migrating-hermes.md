---
summary: "Migrar de Hermes a OpenClaw con una importación previsualizada y reversible"
read_when:
  - You are coming from Hermes and want to keep your model config, prompts, memory, and skills
  - You want to know what OpenClaw imports automatically and what stays archive-only
  - You need a clean, scripted migration path (CI, fresh laptop, automation)
title: "Migrar desde Hermes"
---

OpenClaw importa el estado de Hermes a través de un proveedor de migración incluido. El proveedor previsualiza todo antes de cambiar el estado, redacta secretos en los planes e informes, y crea una copia de seguridad verificada antes de aplicar.

<Note>Las importaciones requieren una configuración fresca de OpenClaw. Si ya tienes un estado local de OpenClaw, restablece primero la configuración, las credenciales, las sesiones y el espacio de trabajo, o usa `openclaw migrate` directamente con `--overwrite` después de revisar el plan.</Note>

## Dos formas de importar

<Tabs>
  <Tab title="Asistente de incorporación">
    La ruta más rápida. El asistente detecta Hermes en `~/.hermes` y muestra una vista previa antes de aplicar.

    ```bash
    openclaw onboard --flow import
    ```

    O apunta a una fuente específica:

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLI">
    Usa `openclaw migrate` para ejecuciones programadas o repetibles. Consulta [`openclaw migrate`](/es/cli/migrate) para obtener la referencia completa.

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    Añade `--from <path>` cuando Hermes se encuentre fuera de `~/.hermes`.

  </Tab>
</Tabs>

## Qué se importa

<AccordionGroup>
  <Accordion title="Configuración del modelo">
    - Selección del modelo predeterminado de Hermes `config.yaml`.
    - Proveedores de modelos configurados y puntos de conexión personalizados compatibles con OpenAI desde `providers` y `custom_providers`.
  </Accordion>
  <Accordion title="Servidores MCP">
    Definiciones de servidores MCP desde `mcp_servers` o `mcp.servers`.
  </Accordion>
  <Accordion title="Archivos del espacio de trabajo">
    - `SOUL.md` y `AGENTS.md` se copian en el espacio de trabajo del agente OpenClaw.
    - `memories/MEMORY.md` y `memories/USER.md` se **agregan** a los archivos de memoria correspondientes de OpenClaw en lugar de sobrescribirlos.
  </Accordion>
  <Accordion title="Configuración de memoria">
    Valores predeterminados de configuración de memoria para la memoria de archivos de OpenClaw. Los proveedores de memoria externos como Honcho se registran como elementos de archivo o de revisión manual para que pueda moverlos deliberadamente.
  </Accordion>
  <Accordion title="Habilidades">
    Las habilidades con un archivo `SKILL.md` bajo `skills/<name>/` se copian, junto con los valores de configuración por habilidad de `skills.config`.
  </Accordion>
  <Accordion title="Claves de API (opcional)">
    Establezca `--include-secrets` para importar las claves `.env` admitidas: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`. Sin el indicador, los secretos nunca se copian.
  </Accordion>
</AccordionGroup>

## Lo que permanece solo en el archivo

El proveedor copia estos elementos en el directorio del informe de migración para su revisión manual, pero **no** los carga en la configuración o las credenciales en vivo de OpenClaw:

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

OpenClaw se niega a ejecutar o confiar en este estado automáticamente porque los formatos y las suposiciones de confianza pueden variar entre sistemas. Mueva lo que necesite manualmente después de revisar el archivo.

## Flujo recomendado

<Steps>
  <Step title="Vista previa del plan">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    El plan lista todo lo que cambiará, incluidos los conflictos, elementos omitidos y cualquier elemento sensible. La salida del plan oculta las claves anidadas que parezcan secretos.

  </Step>
  <Step title="Aplicar con copia de seguridad">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw crea y verifica una copia de seguridad antes de aplicar. Si necesitas que se importen las claves de API, añade `--include-secrets`.

  </Step>
  <Step title="Ejecutar doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/es/gateway/doctor) vuelve a aplicar cualquier migración de configuración pendiente y comprueba si hay problemas introducidos durante la importación.

  </Step>
  <Step title="Reiniciar y verificar">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    Confirma que la puerta de enlace está sana y que tu modelo, memoria y habilidades importados están cargados.

  </Step>
</Steps>

## Manejo de conflictos

Apply se niega a continuar cuando el plan reporta conflictos (un archivo o valor de configuración ya existe en el destino).

<Warning>Vuelve a ejecutar con `--overwrite` solo cuando reemplazar el destino existente sea intencional. Los proveedores aún pueden escribir copias de seguridad a nivel de elemento para los archivos sobrescritos en el directorio de reportes de migración.</Warning>

Para una instalación fresca de OpenClaw, los conflictos son inusuales. Típicamente aparecen cuando vuelves a ejecutar la importación en una configuración que ya tiene ediciones de usuario.

Si surge un conflicto a mitad de la aplicación (por ejemplo, una condición inesperada en un archivo de configuración), Hermes marca los elementos de configuración dependientes restantes como `skipped` con la razón `blocked by earlier apply conflict` en lugar de escribirlos parcialmente. El reporte de migración registra cada elemento bloqueado para que puedas resolver el conflicto original y volver a ejecutar la importación.

## Secretos

Los secretos nunca se importan de manera predeterminada.

- Ejecuta `openclaw migrate apply hermes --yes` primero para importar el estado que no es secreto.
- Si también quieres que las claves `.env` compatibles se copien, vuelve a ejecutar con `--include-secrets`.
- Para las credenciales administradas por SecretRef, configura la fuente de SecretRef después de que la importación se complete.

## Salida JSON para automatización

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

Con `--json` y sin `--yes`, apply imprime el plan y no muta el estado. Este es el modo más seguro para CI y scripts compartidos.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Apply se niega con conflictos">Inspeccione la salida del plan. Cada conflicto identifica la ruta de origen y el destino existente. Decida por elemento si omitir, editar el destino o volver a ejecutar con `--overwrite`.</Accordion>
  <Accordion title="Hermes se encuentra fuera de ~/.hermes">Pase `--from /actual/path` (CLI) o `--import-source /actual/path` (incorporación).</Accordion>
  <Accordion title="La incorporación se niega a importar en una configuración existente">Las importaciones de incorporación requieren una configuración nueva. Restablezca el estado y vuelva a realizar la incorporación, o use `openclaw migrate apply hermes` directamente, que admite `--overwrite` y control explícito de copias de seguridad.</Accordion>
  <Accordion title="Las claves API no se importaron">Se requiere `--include-secrets` y solo se reconocen las claves enumeradas anteriormente. Otras variables en `.env` se ignoran.</Accordion>
</AccordionGroup>

## Relacionado

- [`openclaw migrate`](/es/cli/migrate): referencia completa de la CLI, contrato de complemento y formas JSON.
- [Incorporación](/es/cli/onboard): flujo del asistente y marcas no interactivas.
- [Migración](/es/install/migrating): mover una instalación de OpenClaw entre máquinas.
- [Doctor](/es/gateway/doctor): verificación de salud posterior a la migración.
- [Espacio de trabajo del agente](/es/concepts/agent-workspace): donde residen `SOUL.md`, `AGENTS.md` y los archivos de memoria.
