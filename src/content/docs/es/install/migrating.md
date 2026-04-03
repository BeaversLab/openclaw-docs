---
summary: "Mover (migrar) una instalación de OpenClaw de una máquina a otra"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "Guía de Migración"
---

# Migrar OpenClaw a una Nueva Máquina

Esta guía mueve un gateway de OpenClaw a una nueva máquina sin tener que repetir el proceso de incorporación.

## Qué se Migra

Al copiar el **directorio de estado** (`~/.openclaw/` por defecto) y su **espacio de trabajo**, conserva:

- **Configuración** -- `openclaw.json` y todos los ajustes del gateway
- **Autenticación** -- claves API, tokens OAuth, perfiles de credenciales
- **Sesiones** -- historial de conversaciones y estado del agente
- **Estado del canal** -- inicio de sesión de WhatsApp, sesión de Telegram, etc.
- **Archivos del espacio de trabajo** -- `MEMORY.md`, `USER.md`, habilidades y prompts

<Tip>
Ejecute `openclaw status` en la máquina antigua para confirmar la ruta de su directorio de estado.
Los perfiles personalizados usan `~/.openclaw-<profile>/` o una ruta establecida mediante `OPENCLAW_STATE_DIR`.
</Tip>

## Pasos de Migración

<Steps>
  <Step title="Detenga el gateway y haga una copia de seguridad">
    En la máquina **antigua**, detenga el gateway para que los archivos no cambien a mitad de la copia, y luego archive:

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    Si utiliza varios perfiles (p. ej. `~/.openclaw-work`), archive cada uno por separado.

  </Step>

<Step title="Instalar OpenClaw en la nueva máquina">[Instala](/en/install) la CLI (y Node si es necesario) en la nueva máquina. No pasa nada si la incorporación crea una nueva `~/.openclaw/` -- la sobrescribirás a continuación.</Step>

  <Step title="Copiar el directorio de estado y el espacio de trabajo">
    Transfiera el archivo mediante `scp`, `rsync -a` o una unidad externa, y luego extráigalo:

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    Asegúrese de que se hayan incluido los directorios ocultos y que la propiedad de los archivos coincida con el usuario que ejecutará el gateway.

  </Step>

  <Step title="Ejecuta doctor y verifica">
    En la nueva máquina, ejecuta [Doctor](/en/gateway/doctor) para aplicar las migraciones de configuración y reparar los servicios:

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## Problemas comunes

<AccordionGroup>
  <Accordion title="Discrepancia de perfil o directorio de estado">
    Si la puerta de enlace antigua usaba `--profile` o `OPENCLAW_STATE_DIR` y la nueva no,
    los canales aparecerán desconectados y las sesiones estarán vacías.
    Inicia la puerta de enlace con el **mismo** perfil o directorio de estado que migraste, luego vuelve a ejecutar `openclaw doctor`.
  </Accordion>

<Accordion title="Copiar solo openclaw.">El archivo de configuración por sí solo no es suficiente. Las credenciales residen en `credentials/`, y el estado del agente reside en `agents/`. Migra siempre el directorio de estado **completo**.</Accordion>

<Accordion title="Permisos y propiedad">Si copiaste como root o cambiaste de usuario, la puerta de enlace podría fallar al leer las credenciales. Asegúrate de que el directorio de estado y el espacio de trabajo sean propiedad del usuario que ejecuta la puerta de enlace.</Accordion>

<Accordion title="Modo remoto">Si tu interfaz de usuario apunta a una puerta de enlace **remota**, el host remoto posee las sesiones y el espacio de trabajo. Migra el host de la puerta de enlace en sí, no tu portátil local. Consulta las [Preguntas frecuentes](/en/help/faq#where-things-live-on-disk).</Accordion>

  <Accordion title="Secretos en copias de seguridad">
    El directorio de estado contiene claves API, tokens de OAuth y credenciales de canales.
    Almacena las copias de seguridad cifradas, evita canales de transferencia inseguros y rota las claves si sospechas una exposición.
  </Accordion>
</AccordionGroup>

## Lista de verificación

En la nueva máquina, confirma:

- [ ] `openclaw status` muestra que la puerta de enlace se está ejecutando
- [ ] Los canales siguen conectados (no es necesario volver a emparejar)
- [ ] El panel se abre y muestra las sesiones existentes
- [ ] Los archivos del espacio de trabajo (memoria, configuraciones) están presentes
