---
summary: "Centro de migración: importaciones entre sistemas, traslados de máquina a máquina y actualizaciones de complementos"
read_when:
  - You are moving OpenClaw to a new laptop or server
  - You are coming from another agent system and want to keep state
  - You are upgrading an in-place plugin
title: "Guía de migración"
---

OpenClaw admite tres rutas de migración: importar desde otro sistema de agentes, mover una instalación existente a una nueva máquina y actualizar un complemento en su lugar.

## Importar desde otro sistema de agentes

Utilice los proveedores de migración incluidos para traer instrucciones, servidores MCP, habilidades, configuración de modelo y (opcional) claves API a OpenClaw. Los planes se previsualizan antes de cualquier cambio, los secretos se redactan en los informes y la aplicación está respaldada por una copia de seguridad verificada.

<CardGroup cols={2}>
  <Card title="Migración desde Claude" href="/es/install/migrating-claude" icon="brain">
    Importe el estado de Claude Code y Claude Desktop, incluyendo `CLAUDE.md`, servidores MCP, habilidades y comandos de proyecto.
  </Card>
  <Card title="Migración desde Hermes" href="/es/install/migrating-hermes" icon="feather">
    Importe la configuración de Hermes, proveedores, servidores MCP, memoria, habilidades y claves `.env` compatibles.
  </Card>
</CardGroup>

El punto de entrada de la CLI es [`openclaw migrate`](/es/cli/migrate). El proceso de incorporación también puede ofrecer la migración cuando detecta un origen conocido (`openclaw onboard --flow import`).

## Mover OpenClaw a una nueva máquina

Copie el **directorio de estado** (`~/.openclaw/` por defecto) y su **espacio de trabajo** para preservar:

- **Configuración** — `openclaw.json` y todas las configuraciones de puerta de enlace.
- **Autenticación** — `auth-profiles.json` por agente (claves API más OAuth), además de cualquier estado de canal o proveedor bajo `credentials/`.
- **Sesiones** — historial de conversaciones y estado del agente.
- **Estado del canal** — inicio de sesión de WhatsApp, sesión de Telegram y similares.
- **Archivos del espacio de trabajo** — `MEMORY.md`, `USER.md`, habilidades y prompts.

<Tip>
Ejecute `openclaw status` en la máquina antigua para confirmar la ruta de su directorio de estado. Los perfiles personalizados utilizan `~/.openclaw-<profile>/` o una ruta establecida mediante `OPENCLAW_STATE_DIR`.
</Tip>

### Pasos de la migración

<Steps>
  <Step title="Detenga la puerta de enlace y haga una copia de seguridad">
    En la máquina **antigua**, detenga la puerta de enlace para que los archivos no cambien a mitad de la copia, y luego archive:

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    Si utiliza varios perfiles (por ejemplo `~/.openclaw-work`), archive cada uno por separado.

  </Step>

<Step title="Instalar OpenClaw en la nueva máquina">[Instale](/es/install) la CLI (y Node si es necesario) en la nueva máquina. Es aceptable que la incorporación cree un `~/.openclaw/` nuevo. Lo sobrescribirá a continuación.</Step>

  <Step title="Copiar el directorio de estado y el espacio de trabajo">
    Transfiera el archivo mediante `scp`, `rsync -a` o una unidad externa, y luego extráigalo:

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    Asegúrese de que se hayan incluido los directorios ocultos y que la propiedad de los archivos coincida con el usuario que ejecutará la puerta de enlace.

  </Step>

  <Step title="Ejecutar doctor y verificar">
    En la nueva máquina, ejecute [Doctor](/es/gateway/doctor) para aplicar migraciones de configuración y reparar servicios:

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

### Problemas comunes

<AccordionGroup>
  <Accordion title="Discrepancia de perfil o directorio de estado">
    Si la puerta de enlace antigua utilizaba `--profile` o `OPENCLAW_STATE_DIR` y la nueva no, los canales aparecerán desconectados y las sesiones estarán vacías. Inicie la puerta de enlace con el **mismo** perfil o directorio de estado que migró, y luego vuelva a ejecutar `openclaw doctor`.
  </Accordion>

  <Accordion title="Copiar solo openclaw.">
    El archivo de configuración por sí solo no es suficiente. Los perfiles de autenticación del modelo se encuentran en `agents/<agentId>/agent/auth-profiles.json`, y el estado de los canales y proveedores se encuentra en `credentials/`. Migre siempre el directorio de estado **completo**.
  </Accordion>

<Accordion title="Permisos y propiedad">Si copió como root o cambió de usuario, la puerta de enlace podría fallar al leer las credenciales. Asegúrese de que el directorio de estado y el espacio de trabajo sean propiedad del usuario que ejecuta la puerta de enlace.</Accordion>

<Accordion title="Modo remoto">Si su interfaz apunta a una puerta de enlace **remota**, el host remoto es el propietario de las sesiones y el espacio de enlace. Migre el host de la puerta de enlace en sí, no su computadora portátil local. Consulte las [Preguntas frecuentes](/es/help/faq#where-things-live-on-disk).</Accordion>

  <Accordion title="Secretos en las copias de seguridad">
    El directorio de estado contiene perfiles de autenticación, credenciales de canal y otro estado del proveedor. Almacene las copias de seguridad cifradas, evite canales de transferencia inseguros y rote las claves si sospecha de una exposición.
  </Accordion>
</AccordionGroup>

### Lista de verificación

En la nueva máquina, confirme:

- [ ] `openclaw status` muestra que la puerta de enlace se está ejecutando.
- [ ] Los canales siguen conectados (no es necesario volver a emparejar).
- [ ] El panel se abre y muestra las sesiones existentes.
- [ ] Los archivos del espacio de trabajo (memoria, configuraciones) están presentes.

## Actualizar un complemento en su lugar

Las actualizaciones de complementos en su lugar conservan el mismo id de complemento y claves de configuración, pero pueden mover el estado en disco al diseño actual. Las guías de actualización específicas del complemento se encuentran junto a sus canales:

- [Migración de Matrix](/es/channels/matrix-migration): límites de recuperación de estado cifrado, comportamiento de instantáneas automáticas y comandos de recuperación manual.

## Relacionado

- [`openclaw migrate`](/es/cli/migrate): referencia de CLI para importaciones entre sistemas.
- [Resumen de instalación](/es/install): todos los métodos de instalación.
- [Doctor](/es/gateway/doctor): verificación de salud posterior a la migración.
- [Desinstalar](/es/install/uninstall): eliminación limpia de OpenClaw.
