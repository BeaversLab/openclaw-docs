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
- **Auth** -- por agente `auth-profiles.json` (claves de API + OAuth), más cualquier estado de canal/proveedor en `credentials/`
- **Sesiones** -- historial de conversaciones y estado del agente
- **Estado del canal** -- inicio de sesión de WhatsApp, sesión de Telegram, etc.
- **Archivos del espacio de trabajo** -- `MEMORY.md`, `USER.md`, habilidades y prompts

<Tip>
Ejecute `openclaw status` en la máquina antigua para confirmar la ruta de su directorio de estado.
Los perfiles personalizados utilizan `~/.openclaw-<profile>/` o una ruta establecida a través de `OPENCLAW_STATE_DIR`.
</Tip>

## Pasos de Migración

<Steps>
  <Step title="Detenga la puerta de enlace y haga una copia de seguridad">
    En la máquina **antigua**, detenga la puerta de enlace para que los archivos no cambien a mitad de la copia, luego archive:

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    Si utiliza varios perfiles (por ejemplo, `~/.openclaw-work`), archive cada uno por separado.

  </Step>

<Step title="Instalar OpenClaw en la nueva máquina">[Instale](/en/install) la CLI (y Node si es necesario) en la nueva máquina. No pasa nada si el onboarding crea un `~/.openclaw/` nuevo: lo sobrescribirá a continuación.</Step>

  <Step title="Copiar el directorio de estado y el espacio de trabajo">
    Transfiera el archivo a través de `scp`, `rsync -a` o una unidad externa, luego extráigalo:

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    Asegúrese de que se incluyeron los directorios ocultos y que la propiedad de los archivos coincide con el usuario que ejecutará la puerta de enlace.

  </Step>

  <Step title="Ejecutar doctor y verificar">
    En la nueva máquina, ejecute [Doctor](/en/gateway/doctor) para aplicar migraciones de configuración y reparar servicios:

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## Problemas comunes

<AccordionGroup>
  <Accordion title="Discrepancia de perfil o state-dir">
    Si la puerta de enlace antigua usaba `--profile` o `OPENCLAW_STATE_DIR` y la nueva no,
    los canales aparecerán cerrados y las sesiones estarán vacías.
    Inicie la puerta de enlace con el **mismo** perfil o state-dir que migró, luego vuelva a ejecutar `openclaw doctor`.
  </Accordion>

  <Accordion title="Copiar solo openclaw.">
    Solo el archivo de configuración no es suficiente. Los perfiles de autenticación del modelo residen en
    `agents/<agentId>/agent/auth-profiles.json`, y el estado del canal/proveedor todavía
    reside en `credentials/`. Migra siempre el directorio de estado **completo**.
  </Accordion>

<Accordion title="Permisos y propiedad">Si copiaste como root o cambiaste de usuario, la puerta de enlace podría fallar al leer las credenciales. Asegúrate de que el directorio de estado y el espacio de trabajo sean propiedad del usuario que ejecuta la puerta de enlace.</Accordion>

<Accordion title="Modo remoto">Si su interfaz de usuario apunta a una puerta de enlace **remota**, el host remoto es el propietario de las sesiones y el espacio de trabajo. Migre el host de la puerta de enlace en sí, no su portátil local. Vea [FAQ](/en/help/faq#where-things-live-on-disk).</Accordion>

  <Accordion title="Secretos en las copias de seguridad">
    El directorio de estado contiene perfiles de autenticación, credenciales de canal y otro
    estado del proveedor.
    Almacene las copias de seguridad cifradas, evite canales de transferencia inseguros y rote las claves si sospecha una exposición.
  </Accordion>
</AccordionGroup>

## Lista de verificación

En la nueva máquina, confirma:

- [ ] `openclaw status` muestra que la puerta de enlace se está ejecutando
- [ ] Los canales siguen conectados (no es necesario volver a emparejar)
- [ ] El panel se abre y muestra las sesiones existentes
- [ ] Los archivos del espacio de trabajo (memoria, configuraciones) están presentes
