---
summary: "Preguntas frecuentes sobre la configuración, uso y configuración de OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "Preguntas frecuentes"
---

# Preguntas frecuentes

Respuestas rápidas y solución de problemas más profunda para configuraciones del mundo real (desarrollo local, VPS, multiagente, claves OAuth/API, conmutación por error del modelo). Para el diagnóstico en tiempo de ejecución, consulte [Solución de problemas](/en/gateway/troubleshooting). Para la referencia completa de configuración, consulte [Configuración](/en/gateway/configuration).

## Primeros 60 segundos si algo está roto

1. **Estado rápido (primera comprobación)**

   ```bash
   openclaw status
   ```

   Resumen local rápido: sistema operativo + actualización, accesibilidad de puerta de enlace/servicio, agentes/sesiones, configuración del proveedor + problemas de tiempo de ejecución (cuando la puerta de enlace es accesible).

2. **Informe copiable (seguro para compartir)**

   ```bash
   openclaw status --all
   ```

   Diagnóstico de solo lectura con registro de cola (tokens redactados).

3. **Demonio + estado de puerto**

   ```bash
   openclaw gateway status
   ```

   Muestra el tiempo de ejecución del supervisor frente a la accesibilidad RPC, la URL de destino de la sonda y qué configuración usó probablemente el servicio.

4. **Sondas profundas**

   ```bash
   openclaw status --deep
   ```

   Ejecuta una prueba de estado del gateway en vivo, incluyendo pruebas de canal cuando sea compatible
   (requiere un gateway accesible). Consulte [Estado](/en/gateway/health).

5. **Ver el último registro**

   ```bash
   openclaw logs --follow
   ```

   Si el RPC está caído, recurra a:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Los registros de archivos son separados de los registros del servicio; consulte [Registro](/en/logging) y [Solución de problemas](/en/gateway/troubleshooting).

6. **Ejecutar el doctor (reparaciones)**

   ```bash
   openclaw doctor
   ```

   Repara/migra la configuración/estado + ejecuta comprobaciones de estado. Consulte [Doctor](/en/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Solicita al gateway en ejecución una instantánea completa (solo WS). Consulte [Estado](/en/gateway/health).

## Inicio rápido y configuración de la primera ejecución

<AccordionGroup>
  <Accordion title="Estoy atascado, forma más rápida de desatascarse">
    Use un agente de IA local que pueda **ver su máquina**. Eso es mucho más efectivo que preguntar
    en Discord, porque la mayoría de los casos de "estoy atascado" son **problemas de configuración local o del entorno** que
    los asistentes remotos no pueden inspeccionar.

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a corregir la configuración
    a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Déles la **copia completa del código fuente** a través de
    la instalación 'hackable' (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto instala OpenClaw **desde una copia de git**, por lo que el agente puede leer el código + los documentos y
    razonar sobre la versión exacta que está ejecutando. Siempre puede volver a la versión estable más tarde
    volviendo a ejecutar el instalador sin `--install-method git`.

    Consejo: pida al agente que **planifique y supervise** la solución (paso a paso), y luego ejecute solo los
    comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

    Si descubre un error real o una solución, por favor envíe un issue en GitHub o envíe un PR:
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Comience con estos comandos (comparta los resultados cuando pida ayuda):

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Lo que hacen:

    - `openclaw status`: instantánea rápida del estado de la puerta de enlace/agente + configuración básica.
    - `openclaw models status`: verifica la autenticación del proveedor + disponibilidad del modelo.
    - `openclaw doctor`: valida y repara problemas comunes de configuración/estado.

    Otras comprobaciones útiles de CLI: `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Bucle de depuración rápida: [Primeros 60 segundos si algo está roto](#first-60-seconds-if-something-is-broken).
    Documentos de instalación: [Instalar](/en/install), [Opciones del instalador](/en/install/installer), [Actualización](/en/install/updating).

  </Accordion>

  <Accordion title="El latido (Heartbeat) sigue saltándose. ¿Qué significan las razones del salto?">
    Razones comunes por las que se salta el latido:

    - `quiet-hours`: fuera de la ventana de horas activas configurada
    - `empty-heartbeat-file`: `HEARTBEAT.md` existe pero solo contiene un andamiaje vacío/solo de encabezados
    - `no-tasks-due`: el modo de tarea `HEARTBEAT.md` está activo pero aún no vence ninguno de los intervalos de tarea
    - `alerts-disabled`: toda la visibilidad del latido está desactivada (`showOk`, `showAlerts` y `useIndicator` están todos desactivados)

    En el modo de tarea, las marcas de tiempo de vencimiento solo avanzan después de que se completa una ejecución real del latido.
    Las ejecuciones omitidas no marcan las tareas como completadas.

    Docs: [Heartbeat](/en/gateway/heartbeat), [Automation & Tasks](/en/automation).

  </Accordion>

  <Accordion title="Forma recomendada de instalar y configurar OpenClaw">
    El repositorio recomienda ejecutar desde el código fuente y usar la incorporación (onboarding):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    El asistente también puede construir los activos de la interfaz de usuario automáticamente. Después de la incorporación, generalmente ejecutas el Gateway en el puerto **18789**.

    Desde el código fuente (colaboradores/desarrolladores):

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    Si aún no tienes una instalación global, ejecútalo a través de `pnpm openclaw onboard`.

  </Accordion>

<Accordion title="¿Cómo abro el panel después de la incorporación?">El asistente abre tu navegador con una URL limpia (sin token) del panel justo después de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no se abrió, copia y pega la URL impresa en la misma máquina.</Accordion>

  <Accordion title="¿Cómo autentico el panel de control en localhost frente a remoto?">
    **Localhost (misma máquina):**

    - Abra `http://127.0.0.1:18789/`.
    - Si solicita autenticación de secreto compartido, pegue el token o contraseña configurada en la configuración de Control UI.
    - Fuente del token: `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
    - Fuente de la contraseña: `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aún no se ha configurado ningún secreto compartido, genere un token con `openclaw doctor --generate-gateway-token`.

    **No en localhost:**

    - **Tailscale Serve** (recomendado): mantenga el enlace loopback, ejecute `openclaw gateway --tailscale serve`, abra `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de Control UI/WebSocket (sin secreto compartido pegado, asume host de puerta de enlace confiable); las API HTTP aún requieren autenticación de secreto compartido a menos que use deliberadamente private-ingress `none` o autenticación HTTP de proxy confiable.
      Los intentos de autenticación simultáneos fallidos de Serve del mismo cliente se serializan antes de que el limitador de autenticación fallida los registre, por lo que el segundo reintento incorrecto ya puede mostrar `retry later`.
    - **Tailnet bind**: ejecute `openclaw gateway --bind tailnet --token "<token>"` (o configure la autenticación por contraseña), abra `http://<tailscale-ip>:18789/`, luego pegue el secreto compartido correspondiente en la configuración del panel.
    - **Proxy inverso con reconocimiento de identidad**: mantenga la Gateway detrás de un proxy confiable que no sea loopback, configure `gateway.auth.mode: "trusted-proxy"`, luego abra la URL del proxy.
    - **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` luego abra `http://127.0.0.1:18789/`. La autenticación de secreto compartido aún se aplica a través del túnel; pegue el token o contraseña configurado si se le solicita.

    Consulte [Dashboard](/en/web/dashboard) y [Web surfaces](/en/web) para obtener detalles sobre modos de enlace y autenticación.

  </Accordion>

  <Accordion title="¿Por qué hay dos configuraciones de aprobación de exec para las aprobaciones de chat?">
    Controlan diferentes capas:

    - `approvals.exec`: reenvía los mensajes de aprobación a destinos de chat
    - `channels.<channel>.execApprovals`: hace que ese canal actúe como un cliente de aprobación nativo para aprobaciones de ejecución

    La política de ejecución del host sigue siendo la puerta de aprobación real. La configuración del chat solo controla dónde aparecen los mensajes de aprobación y cómo pueden responder las personas.

    En la mayoría de configuraciones **no** necesitas ambas:

    - Si el chat ya admite comandos y respuestas, el `/approve` del mismo chat funciona a través de la ruta compartida.
    - Si un canal nativo compatible puede inferir los aprobadores de forma segura, OpenClaw ahora habilita automáticamente las aprobaciones nativas优先 (prioridad de mensaje directo) cuando `channels.<channel>.execApprovals.enabled` no está establecido o `"auto"`.
    - Cuando están disponibles las tarjetas/botones de aprobación nativos, esa interfaz de usuario nativa es la ruta principal; el agente solo debe incluir un comando manual `/approve` si el resultado de la herramienta indica que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.
    - Usa `approvals.exec` solo cuando los mensajes también deban reenviarse a otros chats o salas de operaciones explícitas.
    - Usa `channels.<channel>.execApprovals.target: "channel"` o `"both"` solo cuando quieras explícitamente que los mensajes de aprobación se publiquen nuevamente en la sala/tema de origen.
    - Las aprobaciones de complementos son separadas nuevamente: usan `/approve` del mismo chat por defecto, reenvío opcional `approvals.plugin`, y solo algunos canales nativos mantienen el manejo nativo de aprobaciones de complementos activado.

    Versión corta: el reenvío es para el enrutamiento, la configuración del cliente nativo es para una experiencia de usuario específica del canal más rica.
    Consulta [Aprobaciones de ejecución](/en/tools/exec-approvals).

  </Accordion>

  <Accordion title="¿Qué tiempo de ejecución necesito?">
    Se requiere Node **>= 22**. Se recomienda `pnpm`. Bun **no es recomendado** para la Gateway.
  </Accordion>

  <Accordion title="¿Funciona en Raspberry Pi?">
    Sí. El Gateway es ligero: la documentación indica que **512MB-1GB de RAM**, **1 núcleo** y unos **500MB**
    de disco son suficientes para uso personal, y se observa que una **Raspberry Pi 4 puede ejecutarlo**.

    Si desea un margen adicional (registros, medios, otros servicios), se recomiendan **2GB**, pero no es
    un mínimo estricto.

    Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puede emparejar **nodos** en su portátil/teléfono para
    pantalla local/cámara/lienzo o ejecución de comandos. Consulte [Nodos](/en/nodes).

  </Accordion>

  <Accordion title="¿Algún consejo para las instalaciones en Raspberry Pi?">
    Versión corta: funciona, pero espere imperfecciones.

    - Use un sistema operativo de **64 bits** y mantenga Node >= 22.
    - Prefiera la **instalación hackable (git)** para poder ver los registros y actualizar rápidamente.
    - Comience sin canales/habilidades, luego agréguelos uno por uno.
    - Si encuentra problemas extraños con binarios, generalmente es un problema de **compatibilidad ARM**.

    Documentación: [Linux](/en/platforms/linux), [Instalación](/en/install).

  </Accordion>

  <Accordion title="Está atascado en despierta mi amigo / la incorporación no se abrirá. ¿Qué ahora?">
    Esa pantalla depende de que el Gateway sea accesible y autenticado. La TUI también envía
    "¡Despierta, mi amigo!" automáticamente en la primera apertura. Si ve esa línea con **sin respuesta**
    y los tokens se mantienen en 0, el agente nunca se ejecutó.

    1. Reinicie el Gateway:

    ```bash
    openclaw gateway restart
    ```

    2. Verifique el estado y la autenticación:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. Si aún se cuelga, ejecute:

    ```bash
    openclaw doctor
    ```

    Si el Gateway es remoto, asegúrese de que la conexión túnel/Tailscale esté activa y que la interfaz de usuario
    apunte al Gateway correcto. Consulte [Acceso remoto](/en/gateway/remote).

  </Accordion>

  <Accordion title="¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir el incorporamiento?">
    Sí. Copie el **directorio de estado** y el **espacio de trabajo**, y luego ejecute Doctor una vez. Esto
    mantiene su bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado
    del canal) siempre que copie **ambas** ubicaciones:

    1. Instale OpenClaw en la nueva máquina.
    2. Copie `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) desde la máquina antigua.
    3. Copie su espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
    4. Ejecute `openclaw doctor` y reinicie el servicio Gateway.

    Esto preserva la configuración, los perfiles de autenticación, las credenciales de WhatsApp, las sesiones y la memoria. Si está en
    modo remoto, recuerde que el host de la gateway es el propietario del almacenamiento de sesiones y del espacio de trabajo.

    **Importante:** si solo confirma/envía su espacio de trabajo a GitHub, está haciendo una copia de seguridad
    de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Esos residen
    en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

    Relacionado: [Migrating](/en/install/migrating), [Where things live on disk](#where-things-live-on-disk),
    [Agent workspace](/en/concepts/agent-workspace), [Doctor](/en/gateway/doctor),
    [Remote mode](/en/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde puedo ver las novedades de la última versión?">
    Consulte el registro de cambios de GitHub:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Las entradas más recientes están arriba. Si la sección superior está marcada como **Unreleased** (Sin publicar), la siguiente sección
    con fecha es la última versión publicada. Las entradas se agrupan en **Highlights** (Aspectos destacados), **Changes** (Cambios) y
    **Fixes** (Correcciones) (más secciones de documentos/u otras cuando sea necesario).

  </Accordion>

  <Accordion title="No se puede acceder a docs.openclaw.ai (error SSL)">
    Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de Xfinity
    Advanced Security. Desactívelo o añada `docs.openclaw.ai` a la lista de permitidos, luego inténtelo de nuevo.
    Por favor, ayúdenos a desbloquearlo informando aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si aún no puede acceder al sitio, la documentación está reflejada en GitHub:
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Diferencia entre estable y beta">
    **Stable** y **beta** son **etiquetas de distribución de npm** (npm dist-tags), no líneas de código separadas:

    - `latest` = estable
    - `beta` = versión preliminar para pruebas

    Por lo general, un lanzamiento estable llega primero a **beta** y luego un paso de
    promoción explícito mueve esa misma versión a `latest`. Los mantenedores también pueden
    publicar directamente en `latest` cuando sea necesario. Por eso beta y stable pueden
    apuntar a la **misma versión** después de la promoción.

    Consulte qué cambió:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Para comandos de instalación de una línea y la diferencia entre beta y dev, consulte el acordeón de abajo.

  </Accordion>

  <Accordion title="¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?">
    **Beta** es la etiqueta de distribución de npm `beta` (puede coincidir con `latest` después de la promoción).
    **Dev** es la cabeza móvil de `main` (git); cuando se publica, utiliza la etiqueta de distribución de npm `dev`.

    Comandos de una línea (macOS/Linux):

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Instalador de Windows (PowerShell):
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Más detalles: [Canales de desarrollo](/en/install/development-channels) y [Opciones del instalador](/en/install/installer).

  </Accordion>

  <Accordion title="¿Cómo pruebo las últimas novedades?">
    Dos opciones:

    1. **Canal de desarrollo (git checkout):**

    ```bash
    openclaw update --channel dev
    ```

    Esto cambia a la rama `main` y actualiza desde el código fuente.

    2. **Instalación hackeable (desde el sitio del instalador):**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto le proporciona un repositorio local que puede editar y luego actualizar a través de git.

    Si prefiere hacer una clonación limpia manualmente, use:

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    Documentación: [Actualizar](/en/cli/update), [Canales de desarrollo](/en/install/development-channels),
    [Instalación](/en/install).

  </Accordion>

  <Accordion title="¿Cuánto tiempo suele tardar la instalación y el proceso de incorporación?">
    Guía aproximada:

    - **Instalación:** 2-5 minutos
    - **Incorporación:** 5-15 minutos, dependiendo de cuántos canales/modelos configure

    Si se bloquea, use [Instalador atascado](#quick-start-and-first-run-setup)
    y el bucle de depuración rápida en [Estoy atascado](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="¿Instalador atascado? ¿Cómo obtengo más información?">
    Vuelva a ejecutar el instalador con **salida detallada**:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Instalación beta con modo detallado:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Para una instalación modificable (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Equivalente en Windows (PowerShell):

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    Más opciones: [Opciones del instalador](/en/install/installer).

  </Accordion>

  <Accordion title="La instalación en Windows dice que no se encontró git o que openclaw no se reconoce">
    Dos problemas comunes en Windows:

    **1) error de npm spawn git / git not found**

    - Instale **Git for Windows** y asegúrese de que `git` esté en su PATH.
    - Cierre y vuelva a abrir PowerShell, luego vuelva a ejecutar el instalador.

    **2) openclaw no se reconoce después de la instalación**

    - Su carpeta bin global de npm no está en el PATH.
    - Compruebe la ruta:

      ```powershell
      npm config get prefix
      ```

    - Añada ese directorio a su PATH de usuario (no se necesita sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
    - Cierre y vuelva a abrir PowerShell después de actualizar el PATH.

    Si desea la configuración de Windows más fluida, use **WSL2** en lugar de Windows nativo.
    Documentación: [Windows](/en/platforms/windows).

  </Accordion>

  <Accordion title="La salida de ejecución de Windows muestra caracteres ilegibles en chino - ¿qué debo hacer?">
    Esto suele ser una discordancia en la página de códigos de la consola en los shells nativos de Windows.

    Síntomas:

    - La salida `system.run`/`exec` muestra el chino como caracteres ilegibles (mojibake)
    - El mismo comando se ve bien en otro perfil de terminal

    Solución rápida en PowerShell:

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Luego reinicie el Gateway y reintente su comando:

    ```powershell
    openclaw gateway restart
    ```

    Si todavía reproduce esto en la última versión de OpenClaw, haga seguimiento/reportelo en:

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentación no respondió a mi pregunta - ¿cómo obtengo una mejor respuesta?">
    Use la **instalación hackable (git)** para tener el código fuente y la documentación completos localmente, luego pregunte
    a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Más detalles: [Instalación](/en/install) y [Opciones del instalador](/en/install/installer).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en Linux?">
    Respuesta corta: siga la guía de Linux y luego ejecute la incorporación (onboarding).

    - Ruta rápida de Linux + instalación de servicio: [Linux](/en/platforms/linux).
    - Tutorial completo: [Primeros pasos](/en/start/getting-started).
    - Instalador + actualizaciones: [Instalación y actualizaciones](/en/install/updating).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en un VPS?">
    Funciona con cualquier VPS Linux. Instale en el servidor y luego use SSH/Tailscale para acceder al Gateway.

    Guías: [exe.dev](/en/install/exe-dev), [Hetzner](/en/install/hetzner), [Fly.io](/en/install/fly).
    Acceso remoto: [Gateway remoto](/en/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde están las guías de instalación en la nube/VPS?">
    Mantenemos un **centro de alojamiento** con los proveedores más comunes. Elige uno y sigue la guía:

    - [Alojamiento VPS](/en/vps) (todos los proveedores en un solo lugar)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    Cómo funciona en la nube: el **Gateway se ejecuta en el servidor** y usted accede a él
    desde su portátil/teléfono mediante la interfaz de Control (o Tailscale/SSH). Su estado + espacio de trabajo
    residen en el servidor, así que trate el host como la fuente de verdad y haga copias de seguridad.

    Puede emparejar **nodos** (Mac/iOS/Android/headless) con ese Gateway en la nube para acceder
    a la pantalla/cámara/lienzo local o ejecutar comandos en su portátil manteniendo
    el Gateway en la nube.

    Centro: [Plataformas](/en/platforms). Acceso remoto: [Gateway remoto](/en/gateway/remote).
    Nodos: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo pedirle a OpenClaw que se actualice a sí mismo?">
    Respuesta corta: **es posible, pero no se recomienda**. El flujo de actualización puede reiniciar el
    Gateway (lo cual termina la sesión activa), puede necesitar una comprobación git limpia, y
    puede solicitar confirmación. Más seguro: ejecute las actualizaciones desde un shell como operador.

    Use la CLI:

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    Si debe automatizarlo desde un agente:

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    Documentación: [Actualizar](/en/cli/update), [Actualización](/en/install/updating).

  </Accordion>

  <Accordion title="¿Qué hace realmente la incorporación?">
    `openclaw onboard` es la ruta de configuración recomendada. En **modo local** te guía a través de:

    - **Configuración de modelo/autenticación** (OAuth del proveedor, claves API, token de configuración heredado de Anthropic, además de opciones de modelos locales como LM Studio)
    - Ubicación del **espacio de trabajo** + archivos de arranque
    - Configuración de **puerta de enlace** (bind/puerto/auth/tailscale)
    - **Canales** (WhatsApp, Telegram, Discord, Mattermost, Signal, iMessage, además de complementos de canal incluidos como QQ Bot)
    - **Instalación del demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
    - **Verificaciones de estado** y selección de **habilidades**

    También advierte si el modelo configurado es desconocido o falta la autenticación.

  </Accordion>

  <Accordion title="¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?">
    No. Puedes ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/u otros) o con
    **modelos solo locales** para que tus datos permanezcan en tu dispositivo. Las suscripciones (Claude
    Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

    Para Anthropic en OpenClaw, la división práctica es:

    - **Clave API de Anthropic**: facturación normal de la API de Anthropic
    - **Autenticación de suscripción Claude en OpenClaw**: Anthropic informó a los usuarios de OpenClaw el
      **4 de abril de 2026 a las 12:00 PM PT / 8:00 PM BST** que esto requiere
      **Uso Extra** facturado por separado de la suscripción

    Nuestras reproducciones locales también muestran que `claude -p --append-system-prompt ...` puede
    encontrar la misma protección de Uso Extra cuando el prompt adjunto identifica
    a OpenClaw, mientras que la misma cadena de prompt **no** reproduce ese bloqueo en
    la ruta del SDK de Anthropic + clave API. OAuth de OpenAI Codex es explícitamente
    compatible con herramientas externas como OpenClaw.

    OpenClaw también admite otras opciones de estilo de suscripción alojadas, incluyendo
    **Plan de codificación en la nube de Qwen**, **Plan de codificación de MiniMax** y
    **Plan de codificación Z.AI / GLM**.

    Documentación: [Anthropic](/en/providers/anthropic), [OpenAI](/en/providers/openai),
    [Qwen Cloud](/en/providers/qwen),
    [MiniMax](/en/providers/minimax), [Modelos GLM](/en/providers/glm),
    [Modelos locales](/en/gateway/local-models), [Modelos](/en/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar la suscripción Claude Max sin una clave de API?">
    Sí, pero trátala como **autenticación de suscripción Claude con Uso Adicional**.

    Las suscripciones Claude Pro/Max no incluyen una clave de API. En OpenClaw, eso
    significa que se aplica el aviso de facturación específico de OpenClaw de Anthropic: el tráfico de suscripción
    requiere **Uso Adicional**. Si quieres tráfico de Anthropic sin
    esa ruta de Uso Adicional, usa una clave de API de Anthropic en su lugar.

  </Accordion>

  <Accordion title="¿Admiten la autenticación por suscripción Claude (Claude Pro o Max)?">
    Sí, pero la interpretación admitida ahora es:

    - Anthropic en OpenClaw con una suscripción significa **Uso Adicional**
    - Anthropic en OpenClaw sin esa ruta significa **clave de API**

    El token de configuración de Anthropic todavía está disponible como una ruta heredada/manual de OpenClaw,
    y el aviso de facturación específico de OpenClaw de Anthropic todavía se aplica allí. También
    reproducimos la misma protección de facturación localmente con el uso directo de
    `claude -p --append-system-prompt ...` cuando el prompt adjunto
    identifica OpenClaw, mientras que la misma cadena de prompt **no** reprodujo en
    la ruta del SDK de Anthropic + clave de API.

    Para cargas de trabajo de producción o multiusuario, la autenticación con clave de API de Anthropic es la
    opción más segura y recomendada. Si quieres otras opciones alojadas de estilo suscripción
    en OpenClaw, consulta [OpenAI](/en/providers/openai), [Qwen / Model
    Cloud](/en/providers/qwen), [MiniMax](/en/providers/minimax) y
    [GLM Models](/en/providers/glm).

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="¿Por qué veo HTTP 429 rate_limit_error de Anthropic?">
Eso significa que su **cuota/límite de velocidad de Anthropic** se ha agotado para la ventana actual. Si
usa **Claude CLI**, espere a que la ventana se restablezca o actualice su plan. Si
usa una **clave de API de Anthropic**, verifique la consola de Anthropic
para ver el uso/facturación y aumente los límites según sea necesario.

    Si el mensaje es específicamente:
    `Extra usage is required for long context requests`, la solicitud está tratando de usar
    la beta de contexto de 1M de Anthropic (`context1m: true`). Eso solo funciona cuando su
    credencial es elegible para la facturación de contexto largo (facturación de clave de API o la
    ruta de inicio de sesión Claude de OpenClaw con Uso Extra habilitado).

    Consejo: configure un **modelo alternativo** para que OpenClaw pueda seguir respondiendo mientras un proveedor tiene límites de velocidad.
    Vea [Modelos](/en/cli/models), [OAuth](/en/concepts/oauth) y
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="¿Se admite AWS Bedrock?">
  Sí. OpenClaw tiene un proveedor **Amazon Bedrock (Converse)** incluido. Con los marcadores de entorno de AWS presentes, OpenClaw puede detectar automáticamente el catálogo de Bedrock de streaming/texto y fusionarlo como un proveedor implícito `amazon-bedrock`; de lo contrario, puede habilitar explícitamente `plugins.entries.amazon-bedrock.config.discovery.enabled` o agregar una entrada de
  proveedor manual. Vea [Amazon Bedrock](/en/providers/bedrock) y [Proveedores de modelos](/en/providers/models). Si prefiere un flujo de clave administrada, un proxy compatible con OpenAI delante de Bedrock sigue siendo una opción válida.
</Accordion>

<Accordion title="¿Cómo funciona la autenticación de Codex?">
  OpenClaw admite **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). El proceso de incorporación puede ejecutar el flujo de OAuth y establecerá el modelo predeterminado en `openai-codex/gpt-5.4` cuando corresponda. Vea [Proveedores de modelos](/en/concepts/model-providers) y [Incorporación (CLI)](/en/start/wizard).
</Accordion>

  <Accordion title="¿Admiten la autenticación de suscripción de OpenAI (Codex OAuth)?">
    Sí. OpenClaw es totalmente compatible con **OAuth de suscripción de OpenAI Code (Codex)**.
    OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujos de trabajo externos
    como OpenClaw. El proceso de incorporación (Onboarding) puede ejecutar el flujo de OAuth por usted.

    Consulte [OAuth](/en/concepts/oauth), [Proveedores de modelos](/en/concepts/model-providers) y [Incorporación (CLI)](/en/start/wizard).

  </Accordion>

  <Accordion title="¿Cómo configuro OAuth de CLI de Gemini?">
    Gemini CLI utiliza un **flujo de autenticación de complemento (plugin)**, no un ID de cliente ni un secreto en `openclaw.json`.

    Utilice el proveedor de API de Gemini en su lugar:

    1. Habilite el complemento: `openclaw plugins enable google`
    2. Ejecute `openclaw onboard --auth-choice gemini-api-key`
    3. Configure un modelo de Google como `google/gemini-3.1-pro-preview`

  </Accordion>

<Accordion title="¿Es válido un modelo local para charlas casuales?">
  Generalmente no. OpenClaw necesita un contexto amplio y una seguridad sólida; las tarjetas pequeñas se truncan y tienen fugas. Si debe hacerlo, ejecute la compilación del modelo **más grande** que pueda localmente (LM Studio) y consulte [/gateway/local-models](/en/gateway/local-models). Los modelos más pequeños/cuantizados aumentan el riesgo de inyección de avisos; consulte
  [Seguridad](/en/gateway/security).
</Accordion>

<Accordion title="¿Cómo mantengo el tráfico del modelo alojado en una región específica?">
  Elija puntos finales fijados a la región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax, Kimi y GLM; elija la variante alojada en EE. UU. para mantener los datos en la región. Aún puede listar Anthropic/OpenAI junto a estos usando `models.mode: "merge"` para que las alternativas sigan disponibles respetando el proveedor regional que seleccione.
</Accordion>

  <Accordion title="¿Tengo que comprar un Mac Mini para instalar esto?">
    No. OpenClaw se ejecuta en macOS o Linux (Windows a través de WSL2). Un Mac mini es opcional: algunas personas
    compran uno como un host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja tipo Raspberry Pi también funcionan.

    Solo necesitas un Mac **para herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/en/channels/bluebubbles) (recomendado): el servidor de BlueBubbles se ejecuta en cualquier Mac, y el Gateway puede ejecutarse en Linux o en otro lugar. Si quieres otras herramientas exclusivas de macOS, ejecuta el Gateway en un Mac o empareja un nodo macOS.

    Documentación: [BlueBubbles](/en/channels/bluebubbles), [Nodos](/en/nodes), [Modo remoto de Mac](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Necesito un Mac mini para la compatibilidad con iMessage?">
    Necesitas **algún dispositivo macOS** iniciado en Messages. **No** tiene que ser un Mac mini:
    cualquier Mac funciona. **Usa [BlueBubbles](/en/channels/bluebubbles)** (recomendado) para iMessage: el servidor de BlueBubbles se ejecuta en macOS, mientras que el Gateway puede ejecutarse en Linux o en otro lugar.

    Configuraciones comunes:

    - Ejecuta el Gateway en Linux/VPS y ejecuta el servidor de BlueBubbles en cualquier Mac iniciado en Messages.
    - Ejecuta todo en el Mac si quieres la configuración más sencilla de una sola máquina.

    Documentación: [BlueBubbles](/en/channels/bluebubbles), [Nodos](/en/nodes),
    [Modo remoto de Mac](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro?">
    Sí. El **Mac mini puede ejecutar el Gateway**, y tu MacBook Pro puede conectarse como un
    **nodo** (dispositivo complementario). Los nodos no ejecutan el Gateway; proporcionan capacidades
    adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

    Patrón común:

    - Gateway en el Mac mini (siempre activo).
    - El MacBook Pro ejecuta la aplicación de macOS o un host de nodo y se empareja con el Gateway.
    - Usa `openclaw nodes status` / `openclaw nodes list` para verlo.

    Documentación: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo usar Bun?">
    Bun **no está recomendado**. Vemos errores de ejecución, especialmente con WhatsApp y Telegram.
    Usa **Node** para puertas de enlace estables.

    Si todavía quieres experimentar con Bun, hazlo en una puerta de enlace no productiva
    sin WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram: ¿qué va en allowFrom?">
    `channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

    El onboarding acepta entrada `@username` y la resuelve a un ID numérico, pero la autorización de OpenClaw usa solo IDs numéricos.

    Más seguro (sin bot de terceros):

    - Envía un MD a tu bot, luego ejecuta `openclaw logs --follow` y lee `from.id`.

    Bot API Oficial:

    - Envía un MD a tu bot, luego llama `https://api.telegram.org/bot<bot_token>/getUpdates` y lee `message.from.id`.

    Terceros (menos privado):

    - Envía un MD a `@userinfobot` o `@getidsbot`.

    Consulte [/channels/telegram](/en/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?">
  Sí, a través del **enrutamiento multi-agente**. Vincula el **MD** de WhatsApp de cada remitente (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, para que cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún provienen de la **misma cuenta de WhatsApp**, y el control de acceso de MD (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp. Consulte [Enrutamiento Multi-Agente](/en/concepts/multi-agent) y [WhatsApp](/en/channels/whatsapp).
</Accordion>

<Accordion title='¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para codificar"?'>
  Sí. Utiliza el enrutamiento multiagente: asigna a cada agente su propio modelo predeterminado y, a continuación, vincula las rutas entrantes (cuenta de proveedor o pares específicos) a cada agente. Un ejemplo de configuración se encuentra en [Enrutamiento multiagente](/en/concepts/multi-agent). Consulta también [Modelos](/en/concepts/models) y [Configuración](/en/gateway/configuration).
</Accordion>

  <Accordion title="¿Homebrew funciona en Linux?">
    Sí. Homebrew es compatible con Linux (Linuxbrew). Configuración rápida:

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si ejecutas OpenClaw mediante systemd, asegúrate de que la ruta de servicio (PATH) incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells que no son de inicio de sesión.
    Las compilaciones recientes también anteponen directorios comunes de bin de usuario en los servicios systemd de Linux (por ejemplo, `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

  </Accordion>

  <Accordion title="Diferencia entre la instalación hackable de git y la instalación con npm">
    - **Instalación hackable (git):** descarga completa del código fuente, editable, lo mejor para los colaboradores.
      Ejecutas las compilaciones localmente y puedes parchear el código/la documentación.
    - **npm install:** instalación global de la CLI, sin repositorio, lo mejor para "simplemente ejecútalo".
      Las actualizaciones provienen de las etiquetas de distribución (dist-tags) de npm.

    Documentación: [Introducción](/en/start/getting-started), [Actualización](/en/install/updating).

  </Accordion>

  <Accordion title="¿Puedo cambiar entre las instalaciones npm y git más adelante?">
    Sí. Instale la otra variante y luego ejecute Doctor para que el servicio de puerta de enlace apunte al nuevo punto de entrada.
    Esto **no borra sus datos** - solo cambia la instalación del código de OpenClaw. Su estado
    (`~/.openclaw`) y su espacio de trabajo (`~/.openclaw/workspace`) permanecen intactos.

    De npm a git:

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    De git a npm:

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor detecta una discordancia en el punto de entrada del servicio de puerta de enlace y ofrece reescribir la configuración del servicio para que coincida con la instalación actual (use `--repair` en automatización).

    Consejos de copia de seguridad: consulte [Estrategia de copia de seguridad](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="¿Debo ejecutar el Gateway en mi portátil o en un VPS?">
    Respuesta corta: **si desea confiabilidad 24/7, use un VPS**. Si desea la
    menor fricción y le parece bien el dormir/reinicios, ejecútelo localmente.

    **Portátil (Gateway local)**

    - **Ventajas:** sin costo de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
    - **Desventajas:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del sistema operativo interrumpen, debe mantenerse encendido.

    **VPS / nube**

    - **Ventajas:** siempre activo, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
    - **Desventajas:** a menudo se ejecuta sin interfaz gráfica (use capturas de pantalla), acceso remoto a archivos solo, debe usar SSH para actualizaciones.

    **Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost/Discord funcionan bien desde un VPS. La única compensación real es entre un **navegador sin interfaz gráfica** y una ventana visible. Consulte [Navegador](/en/tools/browser).

    **Recomendación predeterminada:** VPS si ha tenido desconexiones de la puerta de enlace anteriormente. Lo local es excelente cuando está usando activamente el Mac y desea acceso a archivos locales o automatización de interfaz de usuario con un navegador visible.

  </Accordion>

  <Accordion title="¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?">
    No es obligatorio, pero **recomendado para la confiabilidad y el aislamiento**.

    - **Host dedicado (VPS/Mac mini/Pi):** siempre encendido, menos interrupciones por suspensión/reinicio, permisos más limpios, más fácil de mantener en ejecución.
    - **Portátil/escritorio compartido:** totalmente bien para pruebas y uso activo, pero espera pausas cuando la máquina se suspenda o se actualice.

    Si quieres lo mejor de ambos mundos, mantén el Gateway en un host dedicado y empareja tu portátil como un **nodo** para herramientas locales de pantalla/cámara/exec. Consulta [Nodos](/en/nodes).
    Para obtener orientación sobre seguridad, lee [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?">
    OpenClaw es ligero. Para un Gateway básico + un canal de chat:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
    - **Recomendado:** 1-2 vCPU, 2GB de RAM o más para un margen de seguridad (registros, medios, múltiples canales). Las herramientas de nodo y la automatización del navegador pueden consumir muchos recursos.

    Sistema operativo: use **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación de Linux es la mejor probada allí.

    Documentación: [Linux](/en/platforms/linux), [Hospedaje VPS](/en/vps).

  </Accordion>

  <Accordion title="¿Puedo ejecutar OpenClaw en una máquina virtual y cuáles son los requisitos?">
    Sí. Trate una máquina virtual igual que un VPS: debe estar siempre encendida, accesible y tener suficiente
    RAM para el Gateway y cualquier canal que habilite.

    Guía básica:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
    - **Recomendado:** 2GB de RAM o más si ejecuta múltiples canales, automatización del navegador o herramientas de medios.
    - **Sistema operativo:** Ubuntu LTS u otro Debian/Ubuntu moderno.

    Si está en Windows, **WSL2 es la configuración de estilo VM más fácil** y tiene la mejor compatibilidad de herramientas.
    Consulte [Windows](/en/platforms/windows), [Hospedaje VPS](/en/vps).
    Si está ejecutando macOS en una máquina virtual, consulte [VM macOS](/en/install/macos-vm).

  </Accordion>
</AccordionGroup>

## ¿Qué es OpenClaw?

<AccordionGroup>
  <Accordion title="¿Qué es OpenClaw, en un párrafo?">
    OpenClaw es un asistente de IA personal que ejecutas en tus propios dispositivos. Responde en las plataformas de mensajería que ya utilizas (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat y complementos de canal incluidos como QQ Bot) y también puede hacer voz + un Canvas en vivo en las plataformas compatibles. El **Gateway** es el plano de control siempre activo; el asistente es el producto.
  </Accordion>

  <Accordion title="Propuesta de valor">
    OpenClaw no es "simplemente un envoltorio de Claude". Es un **plano de control con prioridad local** que te permite ejecutar un
    asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
    sesiones con estado, memoria y herramientas, sin entregar el control de tus flujos de trabajo a un
    SaaS alojado.

    Aspectos destacados:

    - **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
      espacio de trabajo + historial de sesiones local.
    - **Canales reales, no un sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      además de voz móvil y Canvas en las plataformas compatibles.
    - **Agnóstico al modelo:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
      y conmutación por error por agente.
    - **Opción solo local:** ejecuta modelos locales para que **todos los datos pueden permanecer en tu dispositivo** si lo deseas.
    - **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
      espacio de trabajo y valores predeterminados.
    - **Código abierto y modificable:** inspecciona, amplía y autoaloja sin bloqueo de proveedor.

    Docs: [Gateway](/en/gateway), [Channels](/en/channels), [Multi-agent](/en/concepts/multi-agent),
    [Memory](/en/concepts/memory).

  </Accordion>

  <Accordion title="Acabo de configurarlo, ¿qué debería hacer primero?">
    Buenos primeros proyectos:

    - Crear un sitio web (WordPress, Shopify o un sitio estático sencillo).
    - Prototipar una aplicación móvil (esquema, pantallas, plan de API).
    - Organizar archivos y carpetas (limpieza, nomenclatura, etiquetado).
    - Conectar Gmail y automatizar resúmenes o seguimientos.

    Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
    usas subagentes para el trabajo en paralelo.

  </Accordion>

  <Accordion title="¿Cuáles son los cinco casos de uso cotidianos principales para OpenClaw?">
    Los logros cotidianos generalmente se ven así:

    - **Briefings personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que te interesan.
    - **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores para correos electrónicos o documentos.
    - **Recordatorios y seguimientos:** avisos y listas de verificación impulsados por cron o latido.
    - **Automatización del navegador:** completar formularios, recopilar datos y repetir tareas web.
    - **Coordinación entre dispositivos:** envía una tarea desde tu teléfono, deja que la Gateway la ejecute en un servidor y recibe el resultado en el chat.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ayudar con la generación de leads, alcance, anuncios y blogs para un SaaS?">
    Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
    resumir prospectos y escribir borradores de textos de alcance o anuncios.

    Para **campañas de alcance o anuncios**, mantén a un humano en el ciclo. Evita el spam, sigue las leyes locales y
    las políticas de la plataforma, y revisa todo antes de enviarlo. El patrón más seguro es dejar que
    OpenClaw redacte y tú apruebes.

    Documentos: [Security](/en/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?">
    OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo del IDE. Usa
    Claude Code o Codex para el ciclo de codificación directa más rápido dentro de un repositorio. Usa OpenClaw cuando desees
    memoria duradera, acceso entre dispositivos y orquestación de herramientas.

    Ventajas:

    - **Memoria persistente + espacio de trabajo** a través de sesiones
    - **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
    - **Orquestación de herramientas** (navegador, archivos, programación, enlaces)
    - **Gateway siempre activa** (ejecuta en un VPS, interactúa desde cualquier lugar)
    - **Nodos** para navegador/pantalla/cámara/exec local

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Habilidades y automatización

<AccordionGroup>
  <Accordion title="¿Cómo personalizo las habilidades sin mantener el repositorio sucio?">
    Utilice anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o añada una carpeta a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`, por lo que las anulaciones administradas todavía ganan sobre las habilidades empaquetadas sin tocar git. Si necesita la habilidad instalada globalmente pero solo visible para algunos agentes, mantenga la copia compartida en `~/.openclaw/skills` y controle la visibilidad con `agents.defaults.skills` y `agents.list[].skills`. Solo las ediciones dignas de upstream deben vivir en el repositorio y salir como PRs.
  </Accordion>

  <Accordion title="¿Puedo cargar habilidades desde una carpeta personalizada?">
    Sí. Añada directorios adicionales a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (precedencia más baja). La precedencia predeterminada es `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de forma predeterminada, lo cual OpenClaw trata como `<workspace>/skills` en la siguiente sesión. Si la habilidad solo debe ser visible para ciertos agentes, combine eso con `agents.defaults.skills` o `agents.list[].skills`.
  </Accordion>

  <Accordion title="¿Cómo puedo usar diferentes modelos para diferentes tareas?">
    Hoy los patrones compatibles son:

    - **Cron jobs**: los trabajos aislados pueden establecer una `model` de anulación por trabajo.
    - **Sub-agentes**: enruta tareas a agentes separados con diferentes modelos predeterminados.
    - **Cambio a pedido**: usa `/model` para cambiar el modelo de la sesión actual en cualquier momento.

    Consulta [Cron jobs](/en/automation/cron-jobs), [Multi-Agent Routing](/en/concepts/multi-agent) y [Slash commands](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="El bot se congela mientras realiza trabajos pesados. ¿Cómo puedo descargar eso?">
    Usa **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
    devuelven un resumen y mantienen tu chat principal receptivo.

    Pide a tu bot que "genere un sub-agente para esta tarea" o usa `/subagents`.
    Usa `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

    Consejo sobre tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, establece un
    modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

    Documentos: [Sub-agentes](/en/tools/subagents), [Background Tasks](/en/automation/tasks).

  </Accordion>

  <Accordion title="¿Cómo funcionan las sesiones de subagentes vinculadas a hilos en Discord?">
    Usa enlaces de hilos. Puedes vincular un hilo de Discord a un subagente o un objetivo de sesión para que los mensajes de seguimiento en ese hilo se mantengan en esa sesión vinculada.

    Flujo básico:

    - Genera con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para un seguimiento persistente).
    - O vincula manualmente con `/focus <target>`.
    - Usa `/agents` para inspeccionar el estado del vínculo.
    - Usa `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el auto-enfoque.
    - Usa `/unfocus` para desvincular el hilo.

    Configuración requerida:

    - Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Sobrescripciones de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Auto-vinculación al generar: establece `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Documentación: [Sub-agentes](/en/tools/subagents), [Discord](/en/channels/discord), [Referencia de configuración](/en/gateway/configuration-reference), [Comandos de barra](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Un subagente terminó, pero la actualización de finalización fue al lugar equivocado o nunca se publicó. ¿Qué debería verificar?">
    Verifique primero la ruta del solicitante resuelta:

    - La entrega de subagente en modo de finalización prefiere cualquier ruta de hilo o conversación enlazada cuando existe una.
    - Si el origen de la finalización solo lleva un canal, OpenClaw recurre a la ruta almacenada de la sesión del solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa aún pueda tener éxito.
    - Si no existe una ruta enlazada ni una ruta almacenada utilizable, la entrega directa puede fallar y el resultado recurre a la entrega en cola de la sesión en lugar de publicarse inmediatamente en el chat.
    - Los objetivos inválidos o obsoletos aún pueden forzar la retirada a la cola o el fallo final de la entrega.
    - Si la última respuesta visible del asistente del hijo es el token silencioso exacto `NO_REPLY` / `no_reply`, o exactamente `ANNOUNCE_SKIP`, OpenClaw suprime intencionalmente el anuncio en lugar de publicar un progreso anterior obsoleto.
    - Si el hijo expiró después de solo llamadas a herramientas, el anuncio puede colapsarlo en un breve resumen de progreso parcial en lugar de reproducir la salida cruda de la herramienta.

    Depuración:

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentación: [Sub-agentes](/en/tools/subagents), [Tareas en segundo plano](/en/automation/tasks), [Herramientas de sesión](/en/concepts/session-tool).

  </Accordion>

  <Accordion title="Cron o recordatorios no se disparan. ¿Qué debería verificar?">
    Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
    los trabajos programados no se ejecutarán.

    Lista de verificación:

    - Confirme que cron está habilitado (`cron.enabled`) y `OPENCLAW_SKIP_CRON` no está configurado.
    - Verifique que el Gateway se esté ejecutando 24/7 (sin suspensión/reinicios).
    - Verifique la configuración de zona horaria para el trabajo (`--tz` vs zona horaria del host).

    Depuración:

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Documentación: [Trabajos Cron](/en/automation/cron-jobs), [Automatización y tareas](/en/automation).

  </Accordion>

  <Accordion title="Cron fired, but nothing was sent to the channel. Why?">
    Primero verifique el modo de entrega:

    - `--no-deliver` / `delivery.mode: "none"` significa que no se espera ningún mensaje externo.
    - Falta o no es válido el objetivo de anuncio (`channel` / `to`), lo que significa que el ejecutor omitió la entrega saliente.
    - Los fallos de autenticación del canal (`unauthorized`, `Forbidden`) significan que el ejecutor intentó entregar pero las credenciales lo bloquearon.
    - Un resultado aislado silencioso (solo `NO_REPLY` / `no_reply`) se trata como intencionalmente no entregable, por lo que el ejecutor también suprime la entrega alternativa en cola.

    Para los trabajos cron aislados, el ejecutor se encarga de la entrega final. Se espera
    que el agente devuelva un resumen de texto plano para que el ejecutor lo envíe. `--no-deliver` mantiene
    ese resultado internamente; no permite que el agente envíe directamente con la
    herramienta de mensaje en su lugar.

    Depurar:

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentos: [Cron jobs](/en/automation/cron-jobs), [Background Tasks](/en/automation/tasks).

  </Accordion>

  <Accordion title="Why did an isolated cron run switch models or retry once?">
    Esa suele ser la ruta de cambio de modelo en vivo, no una programación duplicada.

    El cron aislado puede persistir en un traspaso de modelo en tiempo de ejecución y reintentar cuando la ejecución
    activa arroja `LiveSessionModelSwitchError`. El reintento mantiene el proveedor/modelo
    cambiado, y si el cambio conllevaba una nueva anulación de perfil de autenticación, cron
    también lo persiste antes de reintentar.

    Reglas de selección relacionadas:

    - La anulación del modelo del enlace de Gmail gana primero cuando es aplicable.
    - Luego el `model` por trabajo.
    - Luego cualquier anulación de modelo de sesión de cron almacenada.
    - Luego la selección normal de modelo predeterminado/agente.

    El bucle de reintento está limitado. Después del intento inicial más 2 reintentos de cambio,
    el cron aborta en lugar de buclear para siempre.

    Depurar:

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentos: [Cron jobs](/en/automation/cron-jobs), [cron CLI](/en/cli/cron).

  </Accordion>

  <Accordion title="¿Cómo instalo habilidades en Linux?">
    Utilice comandos nativos de `openclaw skills` o suelte habilidades en su espacio de trabajo. La interfaz de usuario de habilidades de macOS no está disponible en Linux.
    Explore habilidades en [https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    El `openclaw skills install` nativo escribe en el directorio del espacio de trabajo activo `skills/`
    . Instale la CLI `clawhub` por separado solo si desea publicar o
    sincronizar sus propias habilidades. Para instalaciones compartidas entre agentes, coloque la habilidad en
    `~/.openclaw/skills` y use `agents.defaults.skills` o
    `agents.list[].skills` si desea limitar qué agentes pueden verla.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ejecutar tareas programadas o continuamente en segundo plano?">
    Sí. Utilice el programador de Gateway:

    - **Trabajos Cron** para tareas programadas o recurrentes (persisten tras los reinicios).
    - **Heartbeat** para comprobaciones periódicas de la "sesión principal".
    - **Trabajos aislados** para agentes autónomos que publican resúmenes o entregan a chats.

    Documentación: [Trabajos Cron](/en/automation/cron-jobs), [Automatización y Tareas](/en/automation),
    [Heartbeat](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title="¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?">
    No directamente. Las habilidades de macOS están limitadas por `metadata.openclaw.os` además de los binarios necesarios, y las habilidades solo aparecen en el prompt del sistema cuando son elegibles en el **host Gateway**. En Linux, las habilidades exclusivas de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que anules la limitación.

    Tienes tres patrones compatibles:

    **Opción A: ejecutar el Gateway en una Mac (lo más sencillo).**
    Ejecuta el Gateway donde existen los binarios de macOS, luego conéctate desde Linux en [modo remoto](#gateway-ports-already-running-and-remote-mode) o a través de Tailscale. Las habilidades se cargan normalmente porque el host Gateway es macOS.

    **Opción B: usar un nodo macOS (sin SSH).**
    Ejecuta el Gateway en Linux, empareja un nodo macOS (aplicación de la barra de menús) y establece **Node Run Commands** en "Always Ask" (Preguntar siempre) o "Always Allow" (Permitir siempre) en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios necesarios existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si eliges "Preguntar siempre", aprobar "Permitir siempre" en el prompt añade ese comando a la lista de permitidos.

    **Opción C: proxy de binarios macOS a través de SSH (avanzado).**
    Mantén el Gateway en Linux, pero haz que los binarios de CLI necesarios resuelvan a envoltorios SSH que se ejecutan en una Mac. Luego anula la habilidad para permitir Linux de modo que permanezca elegible.

    1. Crea un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Pon el envoltorio en `PATH` en el host Linux (por ejemplo `~/bin/memo`).
    3. Anula los metadatos de la habilidad (workspace o `~/.openclaw/skills`) para permitir Linux:

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. Inicia una nueva sesión para que se actualice la instantánea de habilidades.

  </Accordion>

  <Accordion title="¿Tienes una integración con Notion o HeyGen?">
    No está integrado de forma nativa hoy en día.

    Opciones:

    - **Habilidad / complemento personalizado:** lo mejor para un acceso API confiable (tanto Notion como HeyGen tienen API).
    - **Automatización del navegador:** funciona sin código pero es más lento y más frágil.

    Si deseas mantener el contexto por cliente (flujos de trabajo de agencia), un patrón sencillo es:

    - Una página de Notion por cliente (contexto + preferencias + trabajo activo).
    - Pide al agente que recupere esa página al inicio de una sesión.

    Si deseas una integración nativa, abre una solicitud de función o crea una habilidad
    destinada a esas API.

    Instalar habilidades:

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Las instalaciones nativas aterrizan en el directorio del espacio de trabajo activo `skills/`. Para habilidades compartidas entre agentes, colócalas en `~/.openclaw/skills/<name>/SKILL.md`. Si solo algunos agentes deben ver una instalación compartida, configura `agents.defaults.skills` o `agents.list[].skills`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulta la entrada de Homebrew Linux en las preguntas frecuentes anteriores). Consulta [Habilidades](/en/tools/skills), [Configuración de habilidades](/en/tools/skills-config) y [ClawHub](/en/tools/clawhub).

  </Accordion>

  <Accordion title="¿Cómo uso mi Chrome con sesión iniciada existente con OpenClaw?">
    Usa el perfil de navegador `user` integrado, que se conecta a través de Chrome DevTools MCP:

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si deseas un nombre personalizado, crea un perfil MCP explícito:

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    Esta ruta es local del host. Si la Gateway se ejecuta en otro lugar, ejecuta un host de nodo en la máquina del navegador o usa CDP remoto en su lugar.

    Límites actuales en `existing-session` / `user`:

    - las acciones están impulsadas por referencias, no por selectores CSS
    - las cargas requieren `ref` / `inputRef` y actualmente admiten un archivo a la vez
    - `responsebody`, exportación de PDF, interceptación de descargas y acciones por lotes aún necesitan un navegador administrado o un perfil CDP sin procesar

  </Accordion>
</AccordionGroup>

## Sandboxing y memoria

<AccordionGroup>
  <Accordion title="¿Existe un documento dedicado al sandboxing?">
    Sí. Consulte [Sandboxing](/en/gateway/sandboxing). Para la configuración específica de Docker (gateway completo en Docker o imágenes de sandbox), consulte [Docker](/en/install/docker).
  </Accordion>

  <Accordion title="Docker se siente limitado: ¿cómo habilito todas las funciones?">
    La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no
    incluye paquetes del sistema, Homebrew ni navegadores integrados. Para una configuración más completa:

    - Persista `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
    - Integre dependencias del sistema en la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Instale los navegadores de Playwright a través de la CLI integrada:
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Establezca `PLAYWRIGHT_BROWSERS_PATH` y asegúrese de que la ruta se persista.

    Documentación: [Docker](/en/install/docker), [Navegador](/en/tools/browser).

  </Accordion>

  <Accordion title="¿Puedo mantener los MD personales pero hacer que los grupos sean públicos/sandboxed con un solo agente?">
    Sí, si su tráfico privado son los **MD** y su tráfico público son los **grupos**.

    Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en Docker, mientras que la sesión principal de MD se mantenga en el host. Luego, restringa las herramientas disponibles en las sesiones con sandbox mediante `tools.sandbox.tools`.

    Tutorial de configuración + ejemplo de configuración: [Grupos: MD personales + grupos públicos](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Referencia clave de configuración: [Configuración del gateway](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="¿Cómomonto una carpeta del host en el sandbox?">
    Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (p. ej., `"/home/user/src:/src:ro"`). Los montajes globales + por agente se fusionan; los montajes por agente se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que los montajes omiten las paredes del sistema de archivos del sandbox.

    OpenClaw valida los orígenes de los montajes tanto con la ruta normalizada como con la ruta canónica resuelta a través del ancestro existente más profundo. Eso significa que los escapes de enlaces simbólicos principales (symlink-parent) seguirán fallando cerrados incluso cuando el último segmento de la ruta aún no existe, y las comprobaciones de raíz permitida (allowed-root) todavía se aplican después de la resolución del enlace simbólico.

    Consulte [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para ver ejemplos y notas de seguridad.

  </Accordion>

  <Accordion title="¿Cómo funciona la memoria?">
    La memoria de OpenClaw son simplemente archivos Markdown en el espacio de trabajo del agente:

    - Notas diarias en `memory/YYYY-MM-DD.md`
    - Notas a largo plazo curadas en `MEMORY.md` (solo sesiones principales/privadas)

    OpenClaw también ejecuta un **vaciado silencioso de memoria precompactación** para recordar al modelo
    que escriba notas duraderas antes de la compactación automática. Esto solo se ejecuta cuando el espacio de trabajo
    es escribible (los sandboxes de solo lectura lo omiten). Consulte [Memory](/en/concepts/memory).

  </Accordion>

  <Accordion title="La memoria sigue olvidando cosas. ¿Cómo hago que se guarde?">
    Pida al bot que **escriba el dato en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
    el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

    Esta es todavía un área que estamos mejorando. Ayuda recordar al modelo que guarde memorias;
    sabrá qué hacer. Si sigue olvidando, verifique que el Gateway esté usando el mismo
    espacio de trabajo en cada ejecución.

    Documentación: [Memory](/en/concepts/memory), [Agent workspace](/en/concepts/agent-workspace).

  </Accordion>

  <Accordion title="¿La memoria persiste para siempre? ¿Cuáles son los límites?">
    Los archivos de memoria residen en el disco y persisten hasta que los eliminas. El límite es tu
    almacenamiento, no el modelo. El **contexto de sesión** todavía está limitado por la ventana de contexto
    del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Por eso
    existe la búsqueda de memoria: recupera solo las partes relevantes al contexto.

    Documentación: [Memoria](/en/concepts/memory), [Contexto](/en/concepts/context).

  </Accordion>

  <Accordion title="¿La búsqueda de memoria semántica requiere una clave de API de OpenAI?">
    Solo si usas **incrustaciones (embeddings) de OpenAI**. Codex OAuth cubre chat/completions y
    **no** otorga acceso a las incrustaciones, por lo que **iniciar sesión con Codex (OAuth o el
    inicio de sesión de la CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Las incrustaciones de OpenAI
    aún necesitan una clave de API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

    Si no configuras un proveedor explícitamente, OpenClaw selecciona automáticamente un proveedor cuando puede
    resolver una clave de API (perfiles de autenticación, `models.providers.*.apiKey`, o variables de entorno).
    Prefiere OpenAI si se resuelve una clave de OpenAI, de lo contrario Gemini si se resuelve una clave de Gemini,
    luego Voyage, luego Mistral. Si no hay ninguna clave remota disponible, la búsqueda
    de memoria permanece deshabilitada hasta que la configures. Si tienes una ruta de modelo local
    configurada y presente, OpenClaw
    prefiere `local`. Ollama es compatible cuando configuras explícitamente
    `memorySearch.provider = "ollama"`.

    Si prefieres mantenerte local, establece `memorySearch.provider = "local"` (y opcionalmente
    `memorySearch.fallback = "none"`). Si quieres incrustaciones de Gemini, establece
    `memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
    `memorySearch.remote.apiKey`). Admitimos modelos de incrustación **OpenAI, Gemini, Voyage, Mistral, Ollama o locales**
    - consulta [Memoria](/en/concepts/memory) para obtener detalles de configuración.

  </Accordion>
</AccordionGroup>

## Dónde residen las cosas en el disco

<AccordionGroup>
  <Accordion title="¿Todos los datos utilizados con OpenClaw se guardan localmente?">
    No: **el estado de OpenClaw es local**, pero **los servicios externos todavía ven lo que les envías**.

    - **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de la puerta de enlace
      (`~/.openclaw` + tu directorio de espacio de trabajo).
    - **Remoto por necesidad:** los mensajes que envías a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
      sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
      servidores.
    - **Controlas la huella:** el uso de modelos locales mantiene los prompts en tu máquina, pero el tráfico
      del canal todavía pasa a través de los servidores del canal.

    Relacionado: [Espacio de trabajo del agente](/en/concepts/agent-workspace), [Memoria](/en/concepts/memory).

  </Accordion>

  <Accordion title="¿Dónde almacena OpenClaw sus datos?">
    Todo se encuentra bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

    | Ruta                                                            | Propósito                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación heredada de OAuth (copiada en los perfiles de autenticación en el primer uso)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y opcional `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga útil de secreto respaldada por archivo opcional para proveedores `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas `api_key` estáticas depuradas)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (por ejemplo, `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de la conversación (por agente)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de sesión (por agente)                                       |

    Ruta heredada de agente único: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

    Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) está separado y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="¿Dónde deben estar AGENTS.md / SOUL.md / USER.md / MEMORY.md?">
    Estos archivos se encuentran en el **espacio de trabajo del agente**, no en `~/.openclaw`.

    - **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (o respaldo heredado `memory.md` cuando `MEMORY.md` está ausente),
      `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` opcional.
    - **Dir. de estado (`~/.openclaw`)**: config, estado del canal/proveedor, perfiles de autenticación, sesiones, registros,
      y habilidades compartidas (`~/.openclaw/skills`).

    El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable a través de:

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si el bot "olvida" después de un reinicio, confirma que el Gateway está usando el mismo
    espacio de trabajo en cada lanzamiento (y recuerda: el modo remoto usa el espacio de trabajo
    del **host de la puerta de enlace**, no de tu computadora portátil local).

    Consejo: si deseas un comportamiento o preferencia duradero, pide al bot que **lo escriba en
    AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

    Consulta [Espacio de trabajo del agente](/en/concepts/agent-workspace) y [Memoria](/en/concepts/memory).

  </Accordion>

  <Accordion title="Estrategia de respaldo recomendada">
    Pon tu **espacio de trabajo del agente** en un repositorio git **privado** y haz una copia de seguridad en algún lugar
    privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
    y te permite restaurar la "mente" del asistente más tarde.

    **No** confirmes (commitees) nada en `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
    Si necesitas una restauración completa, haz una copia de seguridad del espacio de trabajo y del directorio de estado
    por separado (consulta la pregunta sobre migración anterior).

    Documentos: [Espacio de trabajo del agente](/en/concepts/agent-workspace).

  </Accordion>

<Accordion title="¿Cómo desinstalo completamente OpenClaw?">Consulta la guía dedicada: [Desinstalación](/en/install/uninstall).</Accordion>

  <Accordion title="¿Pueden trabajar los agentes fuera del espacio de trabajo?">
    Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un sandbox rígido.
    Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
    ubicaciones del host a menos que se habilite el sandbox. Si necesitas aislamiento, usa
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) o configuraciones de sandbox por agente. Si
    quieres que un repositorio sea el directorio de trabajo predeterminado, apunta el
    `workspace` de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantén el
    espacio de trabajo separado a menos que quieras intencionalmente que el agente trabaje dentro de él.

    Ejemplo (repositorio como cwd predeterminado):

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Modo remoto: ¿dónde está el almacenamiento de sesiones?">
    El estado de la sesión es propiedad del **host de la puerta de enlace**. Si estás en modo remoto, el almacenamiento de sesiones que te importa está en la máquina remota, no en tu portátil local. Consulta [Gestión de sesiones](/en/concepts/session).
  </Accordion>
</AccordionGroup>

## Conceptos básicos de configuración

<AccordionGroup>
  <Accordion title="¿Qué formato tiene la configuración? ¿Dónde está?">
    OpenClaw lee una configuración opcional de **JSON5** desde `$OPENCLAW_CONFIG_PATH` (predeterminado: `~/.openclaw/openclaw.json`):

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si falta el archivo, utiliza valores predeterminados seguros (incluyendo un espacio de trabajo predeterminado de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='Establecí gateway.bind: "lan" (o "tailnet") y ahora nada escucha / la interfaz de usuario dice no autorizado'>
    Los enlaces que no son de bucle local **requieren una ruta de autenticación de puerta de enlace válida**. En la práctica, eso significa:

    - autenticación de secreto compartido: token o contraseña
    - `gateway.auth.mode: "trusted-proxy"` detrás de un proxy inverso con conciencia de identidad y que no sea de bucle local, configurado correctamente

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    Notas:

    - `gateway.remote.token` / `.password` **no** habilitan la autenticación de puerta de enlace local por sí mismos.
    - Las rutas de llamada locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está establecido.
    - Para la autenticación por contraseña, establezca `gateway.auth.mode: "password"` más `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`) en su lugar.
    - Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente a través de SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de reserva remota).
    - Las configuraciones de la interfaz de usuario de control con secreto compartido se autentican mediante `connect.params.auth.token` o `connect.params.auth.password` (almacenados en la configuración de la aplicación/interfaz de usuario). Los modos con identidad, como Tailscale Serve o `trusted-proxy`, utilizan encabezados de solicitud en su lugar. Evite poner secretos compartidos en las URL.
    - Con `gateway.auth.mode: "trusted-proxy"`, los proxies inversos de bucle local del mismo host todavía **no** satisfacen la autenticación de proxy de confianza. El proxy de confianza debe ser una fuente configurada que no sea de bucle local.

  </Accordion>

  <Accordion title="¿Por qué necesito un token en localhost ahora?">
    OpenClaw exige la autenticación de la puerta de enlace por defecto, incluido el bucle local (loopback). En la ruta predeterminada normal, esto significa autenticación por token: si no se configura una ruta de autenticación explícita, el inicio de la puerta de enlace se resuelve al modo token y genera uno automáticamente, guardándolo en `gateway.auth.token`, por lo que **los clientes WS locales deben autenticarse**. Esto bloquea que otros procesos locales llamen a la Gateway.

    Si prefieres una ruta de autenticación diferente, puedes elegir explícitamente el modo contraseña (o, para proxies inversos con identidad que no sean de bucle local, `trusted-proxy`). Si **realmente** quieres un bucle local abierto, establece `gateway.auth.mode: "none"` explícitamente en tu configuración. El Doctor puede generar un token para ti en cualquier momento: `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="¿Tengo que reiniciar después de cambiar la configuración?">
    La Gateway observa la configuración y admite la recarga en caliente (hot-reload):

    - `gateway.reload.mode: "hybrid"` (predeterminado): aplica cambios seguros en caliente, reinicia para los críticos
    - `hot`, `restart`, `off` también son compatibles

  </Accordion>

  <Accordion title="¿Cómo desactivo los lemas divertidos de la CLI?">
    Establece `cli.banner.taglineMode` en la configuración:

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`: oculta el texto del lema pero mantiene la línea del título/versión del banner.
    - `default`: usa `All your chats, one OpenClaw.` cada vez.
    - `random`: lemas divertidos/de temporada rotativos (comportamiento predeterminado).
    - Si no quieres ningún banner en absoluto, establece la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="¿Cómo habilito la búsqueda web (y la obtención web)?">
    `web_fetch` funciona sin una clave de API. `web_search` depende de su proveedor
    seleccionado:

    - Los proveedores con API como Brave, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Perplexity y Tavily requieren su configuración normal de clave de API.
    - Ollama Web Search es gratuito (sin clave), pero utiliza su host de Ollama configurado y requiere `ollama signin`.
    - DuckDuckGo es gratuito (sin clave), pero es una integración HTML no oficial.
    - SearXNG es gratuito/autoalojado; configure `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl`.

    **Recomendado:** ejecute `openclaw configure --section web` y elija un proveedor.
    Alternativas de entorno:

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, o `MINIMAX_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`
    - SearXNG: `SEARXNG_BASE_URL`
    - Tavily: `TAVILY_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
        },
        tools: {
          web: {
            search: {
              enabled: true,
              provider: "brave",
              maxResults: 5,
            },
            fetch: {
              enabled: true,
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    La configuración de búsqueda web específica del proveedor ahora se encuentra en `plugins.entries.<plugin>.config.webSearch.*`.
    Las rutas de proveedor `tools.web.search.*` heredadas todavía se cargan temporalmente por compatibilidad, pero no deben usarse para configuraciones nuevas.
    La configuración de respaldo de obtención web de Firecrawl se encuentra en `plugins.entries.firecrawl.config.webFetch.*`.

    Notas:

    - Si usa listas de permitidos, agregue `web_search`/`web_fetch`/`x_search` o `group:web`.
    - `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
    - Si se omite `tools.web.fetch.provider`, OpenClaw detecta automáticamente el primer proveedor de respaldo de obtención listo a partir de las credenciales disponibles. Hoy el proveedor incluido es Firecrawl.
    - Los demonios leen las variables de entorno de `~/.openclaw/.env` (o el entorno del servicio).

    Documentación: [Herramientas web](/en/tools/web).

  </Accordion>

  <Accordion title="config.apply borró mi configuración. ¿Cómo me recupero y evito esto?">
    `config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo lo demás se elimina.

    Recuperación:

    - Restaura desde una copia de seguridad (git o una `~/.openclaw/openclaw.json` copiada).
    - Si no tienes copia de seguridad, vuelve a ejecutar `openclaw doctor` y reconfigura canales/modelos.
    - Si esto fue inesperado, reporta un error e incluye tu última configuración conocida o cualquier copia de seguridad.
    - Un agente de codificación local a menudo puede reconstruir una configuración funcional a partir de registros o historial.

    Evítalo:

    - Usa `openclaw config set` para cambios pequeños.
    - Usa `openclaw configure` para ediciones interactivas.
    - Usa `config.schema.lookup` primero cuando no estés seguro de una ruta exacta o la forma del campo; devuelve un nodo de esquema superficial más resúmenes secundarios inmediatos para profundizar.
    - Usa `config.patch` para ediciones RPC parciales; mantén `config.apply` solo para el reemplazo de configuración completa.
    - Si estás usando la herramienta exclusiva para propietarios `gateway` desde una ejecución de agente, seguirá rechazando escrituras en `tools.exec.ask` / `tools.exec.security` (incluidos los alias `tools.bash.*` heredados que se normalizan a las mismas rutas de ejecución protegidas).

    Documentación: [Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="¿Cómo ejecuto un Gateway central con trabajadores especializados en varios dispositivos?">
    El patrón común es **un Gateway** (por ejemplo, Raspberry Pi) más **nodos** y **agentes**:

    - **Gateway (central):** posee los canales (Signal/WhatsApp), el enrutamiento y las sesiones.
    - **Nodos (dispositivos):** Mac/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
    - **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (por ejemplo, "operaciones de Hetzner", "datos personales").
    - **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando deseas paralelismo.
    - **TUI:** conéctate al Gateway y cambia de agentes/sesiones.

    Documentos: [Nodos](/en/nodes), [Acceso remoto](/en/gateway/remote), [Enrutamiento Multi-Agente](/en/concepts/multi-agent), [Sub-agentes](/en/tools/subagents), [TUI](/en/web/tui).

  </Accordion>

  <Accordion title="¿Puede ejecutarse el navegador OpenClaw en modo headless?">
    Sí. Es una opción de configuración:

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    El valor predeterminado es `false` (con interfaz). El modo headless es más probable que active comprobaciones anti-bot en algunos sitios. Consulta [Navegador](/en/tools/browser).

    El modo headless utiliza el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias son:

    - Sin ventana de navegador visible (usa capturas de pantalla si necesitas elementos visuales).
    - Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
      Por ejemplo, X/Twitter a menudo bloquea las sesiones headless.

  </Accordion>

  <Accordion title="¿Cómo uso Brave para el control del navegador?">
    Establece `browser.executablePath` en tu binario de Brave (o cualquier navegador basado en Chromium) y reinicia el Gateway.
    Consulta los ejemplos completos de configuración en [Navegador](/en/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways y nodos remotos

<AccordionGroup>
  <Accordion title="¿Cómo se propagan los comandos entre Telegram, la puerta de enlace y los nodos?">
    Los mensajes de Telegram son gestionados por la **puerta de enlace** (gateway). La puerta de enlace ejecuta el agente y
    solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

    Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

    Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

  </Accordion>

  <Accordion title="¿Cómo puede mi agente acceder a mi ordenador si la puerta de enlace (Gateway) está alojada de forma remota?">
    Respuesta corta: **empareja tu ordenador como un nodo**. La puerta de enlace se ejecuta en otro lugar, pero puede
    llamar a las herramientas `node.*` (pantalla, cámara, sistema) en tu máquina local a través del Gateway WebSocket.

    Configuración típica:

    1. Ejecuta la puerta de enlace en el host siempre activo (VPS/servidor doméstico).
    2. Pon el host de la puerta de enlace + tu ordenador en la misma tailnet.
    3. Asegúrate de que el WS de la puerta de enlace sea accesible (enlace de tailnet o túnel SSH).
    4. Abre la aplicación de macOS localmente y conéctate en modo **Remoto a través de SSH** (o tailnet directa)
       para que pueda registrarse como un nodo.
    5. Aprobar el nodo en la puerta de enlace:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    No se requiere un puente TCP separado; los nodos se conectan a través del Gateway WebSocket.

    Recordatorio de seguridad: emparejar un nodo macOS permite `system.run` en esa máquina. Solo
    empareja dispositivos en los que confíes y revisa [Seguridad](/en/gateway/security).

    Documentación: [Nodos](/en/nodes), [Protocolo de puerta de enlace](/en/gateway/protocol), [Modo remoto de macOS](/en/platforms/mac/remote), [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="Tailscale está conectado pero no recibo respuestas. ¿Qué hago?">
    Verifique lo básico:

    - La puerta de enlace está en ejecución: `openclaw gateway status`
    - Estado de la puerta de enlace: `openclaw status`
    - Estado del canal: `openclaw channels status`

    Luego verifique la autenticación y el enrutamiento:

    - Si usa Tailscale Serve, asegúrese de que `gateway.auth.allowTailscale` esté configurado correctamente.
    - Si se conecta a través de túnel SSH, confirme que el túnel local esté activo y apunte al puerto correcto.
    - Confirme que sus listas de permitidos (DM o grupo) incluyen su cuenta.

    Documentación: [Tailscale](/en/gateway/tailscale), [Acceso remoto](/en/gateway/remote), [Canales](/en/channels).

  </Accordion>

  <Accordion title="¿Pueden dos instancias de OpenClaw comunicarse entre sí (local + VPS)?">
    Sí. No hay un puente "bot-a-bot" integrado, pero puede configurarlo de algunas
    formas confiables:

    **Lo más sencillo:** use un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
    Haga que el Bot A envíe un mensaje al Bot B y luego deje que el Bot B responda como de costumbre.

    **Puente CLI (genérico):** ejecute un script que llame a la otra puerta de enlace con
    `openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
    escuche. Si un bot está en un VPS remoto, apunte su CLI a esa puerta de enlace remota
    a través de SSH/Tailscale (ver [Acceso remoto](/en/gateway/remote)).

    Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar la puerta de enlace de destino):

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Consejo: añada una protección para que los dos bots no entren en un bucle infinito (solo menciones, listas
    de permitidos del canal o una regla de "no responder a mensajes de bots").

    Documentación: [Acceso remoto](/en/gateway/remote), [CLI del Agente](/en/cli/agent), [Envío del Agente](/en/tools/agent-send).

  </Accordion>

  <Accordion title="¿Necesito VPS separados para múltiples agentes?">
    No. Un único Gateway puede alojar múltiples agentes, cada uno con su propio espacio de trabajo (workspace), valores predeterminados de modelo y enrutamiento. Esa es la configuración normal y es mucho más económica y sencilla que ejecutar un VPS por agente.

    Use VPS separados solo cuando necesite un aislamiento estricto (límites de seguridad) o configuraciones muy diferentes que no desee compartir. De lo contrario, mantenga un solo Gateway y utilice múltiples agentes o subagentes.

  </Accordion>

  <Accordion title="¿Hay algún beneficio en usar un nodo en mi laptop personal en lugar de SSH desde un VPS?">
    Sí: los nodos son la forma principal de alcanzar su laptop desde un Gateway remoto y desbloquean más que el acceso al shell. El Gateway se ejecuta en macOS/Linux (Windows a través de WSL2) y es ligero (un VPS pequeño o una caja tipo Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración común es un host siempre activo más su laptop como nodo.

    - **No se requiere SSH entrante.** Los nodos se conectan al WebSocket del Gateway y usan el emparejamiento de dispositivos.
    - **Controles de ejecución más seguros.** `system.run` está restringido por listas de permiso (allowlists) y aprobaciones de nodos en esa laptop.
    - **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
    - **Automatización del navegador local.** Mantenga el Gateway en un VPS, pero ejecute Chrome localmente a través de un host de nodo en la laptop, o conéctese al Chrome local en el host mediante Chrome MCP.

    SSH está bien para el acceso ad-hoc al shell, pero los nodos son más simples para los flujos de trabajo continuos de los agentes y la automatización de dispositivos.

    Documentación: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes), [Navegador](/en/tools/browser).

  </Accordion>

  <Accordion title="¿Los nodos ejecutan un servicio de puerta de enlace?">
    No. Solo se debe ejecutar **una puerta de enlace** por host, a menos que ejecute intencionalmente perfiles aislados (consulte [Múltiples puertas de enlace](/en/gateway/multiple-gateways)). Los nodos son periféricos que se conectan
    a la puerta de enlace (nodos iOS/Android o "modo nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin cabeza
    y control CLI, consulte [CLI de host de nodo](/en/cli/node).

    Se requiere un reinicio completo para los cambios de `gateway`, `discovery` y `canvasHost`.

  </Accordion>

  <Accordion title="¿Hay una forma de API / RPC para aplicar la configuración?">
    Sí.

    - `config.schema.lookup`: inspeccionar un subárbol de configuración con su nodo de esquema superficial, sugerencia de interfaz de usuario coincidente y resúmenes de hijos inmediatos antes de escribir
    - `config.get`: obtener la instantánea + hash actual
    - `config.patch`: actualización parcial segura (preferida para la mayoría de las ediciones RPC)
    - `config.apply`: validar + reemplazar la configuración completa, luego reiniciar
    - La herramienta de tiempo de ejecución `gateway` solo para el propietario aún se niega a reescribir `tools.exec.ask` / `tools.exec.security`; los alias `tools.bash.*` heredados se normalizan a las mismas rutas de ejecución protegidas

  </Accordion>

  <Accordion title="Configuración mínima sensata para una primera instalación">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Esto establece su espacio de trabajo y restringe quién puede activar el bot.

  </Accordion>

  <Accordion title="¿Cómo configuro Tailscale en un VPS y me conecto desde mi Mac?">
    Pasos mínimos:

    1. **Instalar + iniciar sesión en el VPS**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **Instalar + iniciar sesión en tu Mac**
       - Usa la aplicación de Tailscale e inicia sesión en la misma tailnet.
    3. **Habilitar MagicDNS (recomendado)**
       - En la consola de administración de Tailscale, habilita MagicDNS para que el VPS tenga un nombre estable.
    4. **Usar el nombre de host de la tailnet**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    Si quieres la interfaz de usuario de Control sin SSH, usa Tailscale Serve en el VPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Esto mantiene el enlace (gateway) vinculado al loopback y expone HTTPS a través de Tailscale. Consulta [Tailscale](/en/gateway/tailscale).

  </Accordion>

  <Accordion title="¿Cómo conecto un nodo Mac a un Gateway remoto (Tailscale Serve)?">
    Serve expone la **Interfaz de usuario de Control del Gateway + WS**. Los nodos se conectan a través del mismo punto final WS del Gateway.

    Configuración recomendada:

    1. **Asegúrate de que el VPS y el Mac estén en la misma tailnet**.
    2. **Usa la aplicación de macOS en modo Remoto** (el destino SSH puede ser el nombre de host de la tailnet).
       La aplicación tunelizará el puerto del Gateway y se conectará como un nodo.
    3. **Aprobar el nodo** en el gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentación: [Gateway protocol](/en/gateway/protocol), [Discovery](/en/gateway/discovery), [macOS remote mode](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Debo instalar en un segundo portátil o simplemente añadir un nodo?">
    Si solo necesitas **herramientas locales** (pantalla/cámara/exec) en el segundo portátil, añádelo como un
    **nodo**. Esto mantiene un único Gateway y evita configuraciones duplicadas. Las herramientas de nodo local están
    actualmente limitadas a macOS, pero planeamos extenderlas a otros sistemas operativos.

    Instala un segundo Gateway solo cuando necesites **aislamiento estricto** o dos bots completamente separados.

    Documentación: [Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes), [Multiple gateways](/en/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables de entorno y carga de .env

<AccordionGroup>
  <Accordion title="¿Cómo carga OpenClaw las variables de entorno?">
    OpenClaw lee las variables de entorno del proceso principal (shell, launchd/systemd, CI, etc.) y adicionalmente carga:

    - `.env` desde el directorio de trabajo actual
    - un respaldo global `.env` desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

    Ninguno de los archivos `.env` sobrescribe las variables de entorno existentes.

    También puedes definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consulta [/environment](/en/help/environment) para ver la precedencia completa y las fuentes.

  </Accordion>

  <Accordion title="Inicié el Gateway a través del servicio y mis variables de entorno desaparecieron. ¿Qué hago ahora?">
    Dos soluciones comunes:

    1. Pon las claves que faltan en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de tu shell.
    2. Habilita la importación de shell (comodidad opcional):

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    Esto ejecuta tu shell de inicio de sesión e importa solo las claves esperadas que faltan (nunca sobrescribe). Equivalentes de variables de entorno:
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='Establecí COPILOT_GITHUB_TOKEN, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?'>
    `openclaw models status` informa si la **importación de entorno de shell** está habilitada. "Shell env: off"
    **no** significa que falten tus variables de entorno - solo significa que OpenClaw no cargará
    tu shell de inicio de sesión automáticamente.

    Si el Gateway se ejecuta como un servicio (launchd/systemd), no heredará tu entorno
    de shell. Soluciónalo haciendo una de estas cosas:

    1. Pon el token en `~/.openclaw/.env`:

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. O habilita la importación de shell (`env.shellEnv.enabled: true`).
    3. O agrégalo a tu bloque de configuración `env` (se aplica solo si falta).

    Luego reinicia el gateway y verifica de nuevo:

    ```bash
    openclaw models status
    ```

    Los tokens de Copilot se leen desde `COPILOT_GITHUB_TOKEN` (también `GH_TOKEN` / `GITHUB_TOKEN`).
    Consulta [/concepts/model-providers](/en/concepts/model-providers) y [/environment](/en/help/environment).

  </Accordion>
</AccordionGroup>

## Sesiones y múltiples chats

<AccordionGroup>
  <Accordion title="¿Cómo inicio una conversación nueva?">
    Envía `/new` o `/reset` como un mensaje independiente. Consulta [Gestión de sesiones](/en/concepts/session).
  </Accordion>

  <Accordion title="¿Las sesiones se reinician automáticamente si nunca envío /new?">
    Las sesiones pueden expirar después de `session.idleMinutes`, pero esto está **deshabilitado por defecto** (por defecto **0**).
    Establécelo en un valor positivo para habilitar la expiración por inactividad. Cuando está habilitado, el **siguiente**
    mensaje después del período de inactividad inicia un nuevo id de sesión para esa clave de chat.
    Esto no elimina las transcripciones - solo inicia una nueva sesión.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="¿Hay alguna forma de crear un equipo de instancias de OpenClaw (un CEO y muchos agentes)?">
    Sí, a través del **enrutamiento multiagente** y los **subagentes**. Puedes crear un agente
    coordinador y varios agentes trabajadores con sus propios espacios de trabajo y modelos.

    Dicho esto, esto se considera mejor como un **experimento divertido**. Consume muchos tokens y a menudo
    es menos eficiente que usar un solo bot con sesiones separadas. El modelo típico que
    imaginamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
    bot también puede generar subagentes cuando sea necesario.

    Documentación: [Enrutamiento multiagente](/en/concepts/multi-agent), [Subagentes](/en/tools/subagents), [CLI de Agents](/en/cli/agents).

  </Accordion>

  <Accordion title="¿Por qué se truncó el contexto a mitad de tarea? ¿Cómo puedo evitarlo?">
    El contexto de la sesión está limitado por la ventana del modelo. Chats largos, salidas de herramientas grandes o muchos
    archivos pueden activar la compactación o el truncamiento.

    Lo que ayuda:

    - Pide al bot que resuma el estado actual y lo escriba en un archivo.
    - Usa `/compact` antes de tareas largas, y `/new` al cambiar de tema.
    - Mantén el contexto importante en el espacio de trabajo y pide al bot que lo lea de nuevo.
    - Usa subagentes para trabajos largos o paralelos para que el chat principal se mantenga más pequeño.
    - Elige un modelo con una ventana de contexto más grande si esto sucede a menudo.

  </Accordion>

  <Accordion title="¿Cómo restablezco completamente OpenClaw pero mantengo la instalación?">
    Usa el comando de restablecimiento:

    ```bash
    openclaw reset
    ```

    Restablecimiento completo no interactivo:

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    Luego vuelve a ejecutar la configuración:

    ```bash
    openclaw onboard --install-daemon
    ```

    Notas:

    - La incorporación también ofrece **Restablecer** si detecta una configuración existente. Consulta [Incorporación (CLI)](/en/start/wizard).
    - Si usaste perfiles (`--profile` / `OPENCLAW_PROFILE`), restablece cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
    - Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo desarrollo; borra la configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

  </Accordion>

  <Accordion title='Recibo errores de "contexto demasiado grande" - ¿cómo puedo restablecer o compactar?'>
    Use uno de estos:

    - **Compactar** (mantiene la conversación pero resume los turnos anteriores):

      ```
      /compact
      ```

      o `/compact <instructions>` para guiar el resumen.

    - **Restablecer** (ID de sesión nueva para la misma clave de chat):

      ```
      /new
      /reset
      ```

    Si sigue ocurriendo:

    - Active o ajuste el **recorte de sesión** (`agents.defaults.contextPruning`) para eliminar el resultado de herramientas antiguas.
    - Use un modelo con una ventana de contexto más grande.

    Documentación: [Compactación](/en/concepts/compaction), [Recorte de sesión](/en/concepts/session-pruning), [Gestión de sesiones](/en/concepts/session).

  </Accordion>

  <Accordion title='¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?'>
    Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el
    `input` requerido. Por lo general, significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos
    o un cambio de herramienta/esquema).

    Solución: inicie una sesión nueva con `/new` (mensaje independiente).

  </Accordion>

  <Accordion title="¿Por qué recibo mensajes de latido cada 30 minutos?">
    Los latidos se ejecutan cada **30m** de forma predeterminada (**1h** al usar autenticación OAuth). Ajuste o desactívelos:

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados
    markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API.
    Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

    Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Latido](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title='¿Necesito añadir una "cuenta de bot" a un grupo de WhatsApp?'>
    No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
    De forma predeterminada, las respuestas grupales están bloqueadas hasta que permitas los remitentes (`groupPolicy: "allowlist"`).

    Si quieres que solo **tú** puedas activar las respuestas grupales:

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="¿Cómo obtengo el JID de un grupo de WhatsApp?">
    Opción 1 (la más rápida): haz un seguimiento de los registros y envía un mensaje de prueba en el grupo:

    ```bash
    openclaw logs --follow --json
    ```

    Busca `chatId` (o `from`) que termine en `@g.us`, como:
    `1234567890-1234567890@g.us`.

    Opción 2 (si ya está configurado/en lista blanca): enumera los grupos desde la configuración:

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Documentación: [WhatsApp](/en/channels/whatsapp), [Directorio](/en/cli/directory), [Registros](/en/cli/logs).

  </Accordion>

  <Accordion title="¿Por qué OpenClaw no responde en un grupo?">
    Dos causas comunes:

    - El filtrado de menciones está activado (predeterminado). Debes @mencionar al bot (o que coincida con `mentionPatterns`).
    - Configuraste `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista blanca.

    Consulta [Grupos](/en/channels/groups) y [Mensajes grupales](/en/channels/group-messages).

  </Accordion>

<Accordion title="¿Los grupos/hilos comparten el contexto con los MD?">Los chats directos se agrupan en la sesión principal de forma predeterminada. Los grupos/canales tienen sus propias claves de sesión, y los temas de Telegram / los hilos de Discord son sesiones separadas. Consulta [Grupos](/en/channels/groups) y [Mensajes grupales](/en/channels/group-messages).</Accordion>

  <Accordion title="¿Cuántos espacios de trabajo y agentes puedo crear?">
    No hay límites estrictos. Docenas (incluso cientos) están bien, pero tenga en cuenta:

    - **Crecimiento del disco:** las sesiones + transcripciones viven en `~/.openclaw/agents/<agentId>/sessions/`.
    - **Costo de tokens:** más agentes significa más uso concurrente del modelo.
    - **Sobrecarga de operaciones:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

    Consejos:

    - Mantenga un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
    - Pode sesiones antiguas (elimine entradas JSONL o del almacén) si el disco crece.
    - Use `openclaw doctor` para detectar espacios de trabajo extraviados y discordancias de perfil.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debo configurarlo?">
    Sí. Use **Enrutamiento Multiagente** para ejecutar múltiples agentes aislados y enrutar mensajes entrantes por
    canal/cuenta/par. Slack es compatible como un canal y puede vincularse a agentes específicos.

    El acceso al navegador es potente pero no "hacer cualquier cosa que un humano pueda"; el antibots, los CAPTCHAs y la MFA pueden
    bloquear la automatización. Para el control del navegador más confiable, use Chrome MCP local en el host,
    o use CDP en la máquina que realmente ejecuta el navegador.

    Configuración recomendada:

    - Host de puerta de enlace siempre activo (VPS/Mac mini).
    - Un agente por rol (enlaces).
    - Canal(es) de Slack vinculados a esos agentes.
    - Navegador local vía Chrome MCP o un nodo cuando sea necesario.

    Documentación: [Enrutamiento Multiagente](/en/concepts/multi-agent), [Slack](/en/channels/slack),
    [Navegador](/en/tools/browser), [Nodos](/en/nodes).

  </Accordion>
</AccordionGroup>

## Modelos: predeterminados, selección, alias, cambio

<AccordionGroup>
  <Accordion title='¿Cuál es el "modelo predeterminado"?'>
    El modelo predeterminado de OpenClaw es lo que configures como:

    ```
    agents.defaults.model.primary
    ```

    Los modelos se referencian como `provider/model` (ejemplo: `openai/gpt-5.4`). Si omites el proveedor, OpenClaw primero intenta un alias, luego una coincidencia única con el proveedor configurado para ese ID de modelo exacto, y solo luego recurre al proveedor predeterminado configurado como una ruta de compatibilidad desaprobada. Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un valor predeterminado obsoleto de un proveedor eliminado. Aún debes establecer `provider/model` de forma **explícita**.

  </Accordion>

  <Accordion title="¿Qué modelo recomiendas?">
    **Predeterminado recomendado:** usa el modelo más fuerte de la última generación disponible en tu pila de proveedores.
    **Para agentes con herramientas activadas o entradas que no son de confianza:** da prioridad a la fuerza del modelo sobre el costo.
    **Para chat de rutina o bajo riesgo:** usa modelos de respaldo más económicos y enruta según el rol del agente.

    MiniMax tiene su propia documentación: [MiniMax](/en/providers/minimax) y
    [Modelos locales](/en/gateway/local-models).

    Regla general: usa el **mejor modelo que puedas permitir** para trabajo de alto riesgo, y un modelo
    más económico para chat de rutina o resúmenes. Puedes enrutar modelos por agente y usar subagentes para
    paralelizar tareas largas (cada subagente consume tokens). Consulta [Modelos](/en/concepts/models) y
    [Subagentes](/en/tools/subagents).

    Advertencia fuerte: los modelos más débiles o sobrecuantizados son más vulnerables a la inyección
    de prompts y a comportamientos inseguros. Consulta [Seguridad](/en/gateway/security).

    Más contexto: [Modelos](/en/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelos sin borrar mi configuración?">
    Use **comandos de modelo** o edite solo los campos de **modelo**. Evite reemplazar la configuración completa.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - editar `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evite `config.apply` con un objeto parcial a menos que tenga la intención de reemplazar toda la configuración.
    Para ediciones RPC, inspeccione con `config.schema.lookup` primero y prefiera `config.patch`. La carga útil de búsqueda le proporciona la ruta normalizada, la documentación/restricciones del esquema superficial y los resúmenes de hijos inmediatos.
    para actualizaciones parciales.
    Si sobrescribió la configuración, restáurela desde una copia de seguridad o vuelva a ejecutar `openclaw doctor` para reparar.

    Docs: [Modelos](/en/concepts/models), [Configurar](/en/cli/configure), [Config](/en/cli/config), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la opción más fácil para modelos locales.

    Configuración más rápida:

    1. Instala Ollama desde `https://ollama.com/download`
    2. Descarga un modelo local como `ollama pull glm-4.7-flash`
    3. Si también quieres modelos en la nube, ejecuta `ollama signin`
    4. Ejecuta `openclaw onboard` y elige `Ollama`
    5. Selecciona `Local` o `Cloud + Local`

    Notas:

    - `Cloud + Local` te proporciona modelos en la nube además de tus modelos locales de Ollama
    - los modelos en la nube como `kimi-k2.5:cloud` no necesitan una descarga local
    - para cambiar manualmente, usa `openclaw models list` y `openclaw models set ollama/<model>`

    Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la
    inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas.
    Si aún quieres modelos pequeños, activa el sandboxing y listas de permisos estrictas para herramientas.

    Documentación: [Ollama](/en/providers/ollama), [Local models](/en/gateway/local-models),
    [Model providers](/en/concepts/model-providers), [Security](/en/gateway/security),
    [Sandboxing](/en/gateway/sandboxing).

  </Accordion>

<Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
  - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor. - Comprueba la configuración de tiempo de ejecución actual en cada puerta de enlace con `openclaw models status`. - Para agentes sensibles a la seguridad o con herramientas habilitadas, utiliza el modelo más potente de última generación disponible.
</Accordion>

  <Accordion title="¿Cómo cambio de modelos al vuelo (sin reiniciar)?">
    Use el comando `/model` como un mensaje independiente:

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    Estos son los alias integrados. Se pueden agregar alias personalizados a través de `agents.defaults.models`.

    Puede listar los modelos disponibles con `/model`, `/model list` o `/model status`.

    `/model` (y `/model list`) muestra un selector numérico compacto. Seleccione por número:

    ```
    /model 3
    ```

    También puede forzar un perfil de autenticación específico para el proveedor (por sesión):

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Consejo: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está utilizando y qué perfil de autenticación se probará a continuación.
    También muestra el punto de conexión del proveedor configurado (`baseUrl`) y el modo API (`api`) cuando está disponible.

    **¿Cómo desanclar un perfil que configuré con @profile?**

    Vuelva a ejecutar `/model` **sin** el sufijo `@profile`:

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
    Use `/model status` para confirmar qué perfil de autenticación está activo.

  </Accordion>

  <Accordion title="¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programación?">
    Sí. Establezca uno como predeterminado y cambie según sea necesario:

    - **Cambio rápido (por sesión):** `/model gpt-5.4` para tareas diarias, `/model openai-codex/gpt-5.4` para programación con Codex OAuth.
    - **Predeterminado + cambio:** establezca `agents.defaults.model.primary` en `openai/gpt-5.4`, luego cambie a `openai-codex/gpt-5.4` cuando programe (o viceversa).
    - **Sub-agentes:** enrute tareas de programación a sub-agentes con un modelo predeterminado diferente.

    Consulte [Modelos](/en/concepts/models) y [Comandos de barra](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo configuro el modo rápido para GPT 5.4?">
    Utilice un interruptor de sesión o una configuración por defecto:

    - **Por sesión:** envíe `/fast on` mientras la sesión está usando `openai/gpt-5.4` o `openai-codex/gpt-5.4`.
    - **Por defecto del modelo:** establezca `agents.defaults.models["openai/gpt-5.4"].params.fastMode` en `true`.
    - **También para Codex OAuth:** si también usa `openai-codex/gpt-5.4`, establezca la misma marca allí.

    Ejemplo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
            "openai-codex/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    Para OpenAI, el modo rápido se asigna a `service_tier = "priority"` en las solicitudes Responses nativas compatibles. La `/fast` de la sesión anula los valores predeterminados de configuración de beat.

    Consulte [Thinking and fast mode](/en/tools/thinking) y [OpenAI fast mode](/en/providers/openai#openai-fast-mode).

  </Accordion>

  <Accordion title='¿Por qué veo "Model ... is not allowed" (El modelo ... no está permitido) y luego no hay respuesta?'>
    Si `agents.defaults.models` está establecido, se convierte en la **lista de permitidos** para `/model` y cualquier
    anulación de sesión. Elegir un modelo que no esté en esa lista devuelve:

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Ese error se devuelve **en lugar de** una respuesta normal. Solución: añada el modelo a
    `agents.defaults.models`, elimine la lista de permitidos o elija un modelo de `/model list`.

  </Accordion>

  <Accordion title='¿Por qué veo "Unknown model: minimax/MiniMax-M2.7"?'>
    Esto significa que el **proveedor no está configurado** (no se encontró ninguna configuración del proveedor MiniMax o perfil de autenticación), por lo que el modelo no se puede resolver.

    Lista de verificación de solución:

    1. Actualice a una versión actual de OpenClaw (o ejecute desde el código fuente `main`) y luego reinicie la puerta de enlace.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista autenticación de MiniMax en perfiles env/auth para que se pueda inyectar el proveedor coincidente (`MINIMAX_API_KEY` para `minimax`, `MINIMAX_OAUTH_TOKEN` u OAuth de MiniMax almacenado para `minimax-portal`).
    3. Use el ID exacto del modelo (distingue mayúsculas y minúsculas) para su ruta de autenticación:
       `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed` para la configuración
       con clave de API, o `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` para la configuración de OAuth.
    4. Ejecute:

       ```bash
       openclaw models list
       ```

       y elija de la lista (o `/model list` en el chat).

    Consulte [MiniMax](/en/providers/minimax) y [Modelos](/en/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar MiniMax como mi predeterminado y OpenAI para tareas complejas?">
    Sí. Use **MiniMax como el predeterminado** y cambie de modelos **por sesión** cuando sea necesario.
    Los respaldos son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

    **Opción A: cambiar por sesión**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.4": { alias: "gpt" },
          },
        },
      },
    }
    ```

    Luego:

    ```
    /model gpt
    ```

    **Opción B: agentes separados**

    - Agente A predeterminado: MiniMax
    - Agente B predeterminado: OpenAI
    - Enrutamiento por agente o use `/agent` para cambiar

    Documentación: [Modelos](/en/concepts/models), [Enrutamiento Multiagente](/en/concepts/multi-agent), [MiniMax](/en/providers/minimax), [OpenAI](/en/providers/openai).

  </Accordion>

  <Accordion title="¿Son opus / sonnet / gpt atajos integrados?">
    Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    Si configuras tu propio alias con el mismo nombre, tu valor prevalecerá.

  </Accordion>

  <Accordion title="¿Cómo defino/sobrescribo los atajos de modelo (alias)?">
    Los alias provienen de `agents.defaults.models.<modelId>.alias`. Ejemplo:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    Entonces `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve en ese ID de modelo.

  </Accordion>

  <Accordion title="¿Cómo añado modelos de otros proveedores como OpenRouter o Z.AI?">
    OpenRouter (pago por token; muchos modelos):

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI (modelos GLM):

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    Si referencias un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave API para el proveedor después de añadir un nuevo agente**

    Esto generalmente significa que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y
    se almacena en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Opciones de solución:

    - Ejecuta `openclaw agents add <id>` y configura la autenticación durante el asistente.
    - O copia `auth-profiles.json` del `agentDir` del agente principal al `agentDir` del nuevo agente.

    **No** reutilices `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

  </Accordion>
</AccordionGroup>

## Conmutación por error de modelo y "Fallaron todos los modelos"

<AccordionGroup>
  <Accordion title="¿Cómo funciona el failover?">
    El failover ocurre en dos etapas:

    1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
    2. **Respaldo del modelo (fallback)** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican períodos de enfriamiento (cooldowns) a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene límites de tasa o fallas temporales.

    El grupo de límites de tasa incluye más que simples respuestas `429`. OpenClaw
    también trata mensajes como `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted`, y límites
    periódicos de ventana de uso (`weekly/monthly limit reached`) como límites de tasa
    elegibles para failover.

    Algunas respuestas que parecen de facturación no son `402`, y algunas respuestas HTTP `402`
    también permanecen en ese grupo transitorio. Si un proveedor devuelve
    texto de facturación explícito en `401` o `403`, OpenClaw aún puede mantenerlo en
    el carril de facturación, pero los comparadores de texto específicos del proveedor permanecen limitados al
    proveedor que los posee (por ejemplo, OpenRouter `Key limit exceeded`). Si un mensaje `402`
    parece más bien un límite de ventana de uso reintentable o
    un límite de gasto de organización/espacio de trabajo (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw lo trata como
    `rate_limit`, no como una desactivación larga por facturación.

    Los errores de desbordamiento de contexto son diferentes: firmas como
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model`, o `ollama error: context length
    exceeded` permanecen en la ruta de compactación/reintento en lugar de avanzar en el respaldo
    del modelo.

    El texto de error genérico del servidor es intencionalmente más estrecho que "cualquier cosa con
    unknown/error en él". OpenClaw sí trata formas transitorias con ámbito de proveedor
    como `An unknown error occurred` simple de Anthropic, `Provider returned error` simple de
    OpenRouter, errores de razón de detención como `Unhandled stop reason:
    error`, JSON `api_error` con texto de servidor transitorio
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` como
    señales de tiempo de espera/sobrecarga elegibles para failover cuando el contexto del proveedor
    coincide.
    El texto interno genérico de respaldo como `LLM request failed with an unknown
    error.` se mantiene conservador y no activa el respaldo del modelo por sí mismo.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó usar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

    **Lista de verificación de corrección:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno está cargada por el Gateway**
      - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta el Gateway a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones de multiagente implican que puede haber múltiples archivos `auth-profiles.json`.
    - **Verificación de cordura del estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de corrección para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway
    no puede encontrarlo en su almacén de autenticación.

    - **Usar Claude CLI**
      - Ejecute `openclaw models auth login --provider anthropic --method cli --set-default` en el host de la puerta de enlace.
    - **Si desea usar una clave API en su lugar**
      - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de la puerta de enlace**.
      - Borre cualquier orden fijada que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando comandos en el host de la puerta de enlace**
      - En modo remoto, los perfiles de autenticación residen en la máquina de la puerta de enlace, no en su portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó Google Gemini y falló?">
    Si la configuración de su modelo incluye Google Gemini como alternativa (o si cambió a un atajo de Gemini), OpenClaw lo intentará durante la conmutación por error del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

    Solución: proporcione la autenticación de Google, o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que la conmutación por error no enrute hacia allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Google Antigravity)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo provenientes de
    un flujo abortado/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Google Antigravity Claude. Si aún aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

  </Accordion>
</AccordionGroup>

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/en/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones de varias cuentas)

<AccordionGroup>
  <Accordion title="¿Qué es un perfil de autenticación?">
    Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles residen en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="¿Cuáles son los ID de perfil típicos?">
    OpenClaw utiliza ID con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe una identidad de correo electrónico)
    - `anthropic:<email>` para identidades de OAuth
    - ID personalizados que elija (por ejemplo, `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se prueba primero?">
    Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; asigna ID a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un **período de enfriamiento** (cooldown) corto (límites de tasa/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** (disabled) más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

    Los períodos de enfriamiento por límites de tasa pueden estar limitados al modelo. Un perfil que se está enfriando
    para un modelo todavía puede ser utilizable para un modelo hermano en el mismo proveedor,
    mientras que las ventanas de facturación/deshabilitado todavía bloquean el perfil completo.

    También puede establecer una anulación de orden **por agente** (almacenada en `auth-profiles.json` de ese agente) a través de la CLI:

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    Para apuntar a un agente específico:

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    Para verificar qué se probará realmente, use:

    ```bash
    openclaw models status --probe
    ```

    Si un perfil almacenado se omite del orden explícito, el informe de sonda indica
    `excluded_by_auth_order` para ese perfil en lugar de probarlo silenciosamente.

  </Accordion>

  <Accordion title="OAuth vs clave de API - ¿cuál es la diferencia?">
    OpenClaw admite ambos:

    - **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponda).
    - **Las claves de API** usan facturación por token.

    El asistente admite explícitamente Anthropic Claude CLI, OpenAI Codex OAuth y claves de API.

  </Accordion>
</AccordionGroup>

## Gateway: puertos, "ya se está ejecutando" y modo remoto

<AccordionGroup>
  <Accordion title="¿Qué puerto usa el Gateway?">
    `gateway.port` controla el único puerto multiplexado para WebSocket + HTTP (Interfaz de usuario de control, enlaces, etc.).

    Precedencia:

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='¿Por qué el estado de la puerta de enlace de openclaw indica "Runtime: running" pero "RPC probe: failed"?'>
    Porque "running" es la vista del **supervisor** (launchd/systemd/schtasks). La sonda RPC es la CLI conectándose realmente al WebSocket de la puerta de enlace y llamando a `status`.

    Use `openclaw gateway status` y confíe en estas líneas:

    - `Probe target:` (la URL que la sonda usó realmente)
    - `Listening:` (lo que realmente está vinculado en el puerto)
    - `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

  </Accordion>

  <Accordion title='¿Por qué el estado de la puerta de enlace de openclaw muestra "Config (cli)" y "Config (service)" diferentes?'>
    Está editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

    Solución:

    ```bash
    openclaw gateway install --force
    ```

    Ejecute eso desde el mismo `--profile` / entorno que desea que use el servicio.

  </Accordion>

  <Accordion title='¿Qué significa "another gateway instance is already listening"?'>
    OpenClaw aplica un bloqueo en tiempo de ejecución vinculando el escucha WebSocket inmediatamente al inicio (por defecto `ws://127.0.0.1:18789`). Si la vinculación falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

    Solución: detenga la otra instancia, libere el puerto o ejecute con `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a una puerta de enlace en otro lugar)?">
    Configure `gateway.mode: "remote"` y apunte a una URL de WebSocket remota, opcionalmente con credenciales remotas de secreto compartido:

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    Notas:

    - `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasa la bandera de anulación).
    - La aplicación de macOS observa el archivo de configuración y cambia los modos en vivo cuando estos valores cambian.
    - `gateway.remote.token` / `.password` son solo credenciales remotas del lado del cliente; no habilitan la autenticación de la puerta de enlace local por sí mismos.

  </Accordion>

  <Accordion title='La interfaz de usuario de Control dice "unauthorized" (o sigue reconectándose). ¿Qué hacer?'>
    La ruta de autenticación de su puerta de enlace y el método de autenticación de la interfaz de usuario no coinciden.

    Datos (del código):

    - La interfaz de usuario de Control mantiene el token en `sessionStorage` para la sesión actual de la pestaña del navegador y la URL de la puerta de enlace seleccionada, por lo que las actualizaciones en la misma pestaña siguen funcionando sin restaurar la persistencia del token de localStorage a largo plazo.
    - En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo en caché cuando la puerta de enlace devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Ese reintento con token en caché ahora reutiliza los ámbitos aprobados en caché almacenados con el token de dispositivo. Los llamadores con `deviceToken` explícita / `scopes` explícita aún mantienen su conjunto de ámbitos solicitado en lugar de heredar los ámbitos en caché.
    - Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero token/contraseña compartida explícita, luego `deviceToken` explícita, luego token de dispositivo almacenado y luego token de inicialización.
    - Las comprobaciones de ámbito de token de inicialización tienen prefijo de rol. La lista de permitidos del operador de inicialización integrado solo satisface las solicitudes del operador; los nodos u otros roles que no sean operadores aún necesitan ámbitos bajo su propio prefijo de rol.

    Solución:

    - Lo más rápido: `openclaw dashboard` (imprime + copia la URL del tablero, intenta abrirla; muestra un consejo SSH si no hay interfaz gráfica).
    - Si aún no tiene un token: `openclaw doctor --generate-gateway-token`.
    - Si es remoto, abra un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`.
    - Modo de secreto compartido: configure `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` o `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, luego pegue el secreto correspondiente en la configuración de la interfaz de usuario de Control.
    - Modo Tailscale Serve: asegúrese de que `gateway.auth.allowTailscale` esté habilitado y de que está abriendo la URL de Serve, no una URL de bucle de retorno (loopback) o de red de Tailscale (tailnet) sin procesar que omita los encabezados de identidad de Tailscale.
    - Modo de proxy de confianza: asegúrese de estar accediendo a través del proxy con reconocimiento de identidad que no sea de bucle de retorno configurado, no a través de un proxy de bucle de retorno del mismo host o una URL de puerta de enlace sin procesar.
    - Si la discrepancia persiste después del único reintento, rote/vuelva a aprobar el token del dispositivo emparejado:
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si esa llamada de rotación indica que se denegó, verifique dos cosas:
      - las sesiones de dispositivo emparejado solo pueden rotar su **propio** dispositivo a menos que también tengan `operator.admin`
      - los valores `--scope` explícitos no pueden exceder los ámbitos de operador actuales de la persona que llama
    - ¿Sigues atascado? Ejecute `openclaw status --all` y siga [Solución de problemas](/en/gateway/troubleshooting). Consulte [Tablero](/en/web/dashboard) para obtener detalles de autenticación.

  </Accordion>

  <Accordion title="Establecí gateway.bind tailnet pero no puede vincularse y nada escucha">
    `tailnet` bind elige una IP de Tailscale de sus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que vincularse.

    Solución:

    - Inicie Tailscale en ese host (para que tenga una dirección 100.x), o
    - Cambie a `gateway.bind: "loopback"` / `"lan"`.

    Nota: `tailnet` es explícito. `auto` prefiere el loopback; use `gateway.bind: "tailnet"` cuando desee un enlace exclusivo de tailnet.

  </Accordion>

  <Accordion title="¿Puedo ejecutar múltiples Gateways en el mismo host?">
    Generalmente no; un Gateway puede ejecutar múltiples canales de mensajería y agentes. Use múltiples Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

    Sí, pero debe aislar:

    - `OPENCLAW_CONFIG_PATH` (configuración por instancia)
    - `OPENCLAW_STATE_DIR` (estado por instancia)
    - `agents.defaults.workspace` (aislamiento del espacio de trabajo)
    - `gateway.port` (puertos únicos)

    Configuración rápida (recomendada):

    - Use `openclaw --profile <name> ...` por instancia (crea automáticamente `~/.openclaw-<name>`).
    - Establezca un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
    - Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

    Los perfiles también sufijan los nombres de servicio (`ai.openclaw.<profile>`; legado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guía completa: [Múltiples gateways](/en/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='¿Qué significa "invalid handshake" / código 1008?'>
    El Gateway es un **servidor WebSocket**, y espera que el primer mensaje sea
    un trama `connect`. Si recibe cualquier otra cosa, cierra la conexión
    con el **código 1008** (violación de política).

    Causas comunes:

    - Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
    - Usó el puerto o la ruta incorrectos.
    - Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud que no es del Gateway.

    Soluciones rápidas:

    1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
    2. No abra el puerto WS en una pestaña normal del navegador.
    3. Si la autenticación está activada, incluya el token/contraseña en la trama `connect`.

    Si está usando la CLI o TUI, la URL debería verse así:

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Detalles del protocolo: [Gateway protocol](/en/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Registro y depuración

<AccordionGroup>
  <Accordion title="¿Dónde están los registros?">
    Registros de archivos (estructurados):

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Puede establecer una ruta estable a través de `logging.file`. El nivel de registro de archivo se controla mediante `logging.level`. La verbosidad de la consola se controla mediante `--verbose` y `logging.consoleLevel`.

    Visualización de registros más rápida:

    ```bash
    openclaw logs --follow
    ```

    Registros de servicio/supervisor (cuando el gateway se ejecuta a través de launchd/systemd):

    - macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` y `gateway.err.log` (predeterminado: `~/.openclaw/logs/...`; los perfiles usan `~/.openclaw-<profile>/logs/...`)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Consulte [Troubleshooting](/en/gateway/troubleshooting) para más información.

  </Accordion>

  <Accordion title="¿Cómo inicio/paro/reinicio el servicio Gateway?">
    Use los ayudantes del gateway:

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si ejecuta el gateway manualmente, `openclaw gateway --force` puede recuperar el puerto. Vea [Gateway](/en/gateway).

  </Accordion>

  <Accordion title="Cerré mi terminal en Windows: ¿cómo reinicio OpenClaw?">
    Hay **dos modos de instalación en Windows**:

    **1) WSL2 (recomendado):** la Gateway se ejecuta dentro de Linux.

    Abra PowerShell, entre en WSL y luego reinicie:

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    Si nunca instaló el servicio, inícielo en primer plano:

    ```bash
    openclaw gateway run
    ```

    **2) Windows nativo (no recomendado):** la Gateway se ejecuta directamente en Windows.

    Abra PowerShell y ejecute:

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si lo ejecuta manualmente (sin servicio), use:

    ```powershell
    openclaw gateway run
    ```

    Documentación: [Windows (WSL2)](/en/platforms/windows), [Manual de ejecución del servicio Gateway](/en/gateway).

  </Accordion>

  <Accordion title="La Gateway está activa pero las respuestas nunca llegan. ¿Qué debo verificar?">
    Comience con un rápido chequeo de estado:

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causas comunes:

    - Autenticación del modelo no cargada en el **host de la gateway** (verifique `models status`).
    - Emparejamiento de canales/lista de permitidos bloqueando las respuestas (verifique la configuración del canal + los registros).
    - WebChat/Dashboard está abierto sin el token correcto.

    Si está remoto, confirme que la conexión del túnel/Tailscale está activa y que el
    WebSocket de la Gateway es accesible.

    Documentación: [Canales](/en/channels), [Solución de problemas](/en/gateway/troubleshooting), [Acceso remoto](/en/gateway/remote).

  </Accordion>

  <Accordion title='"Desconectado de la gateway: sin motivo" - ¿y ahora qué?'>
    Esto generalmente significa que la interfaz de usuario perdió la conexión WebSocket. Verifique:

    1. ¿Se está ejecutando la Gateway? `openclaw gateway status`
    2. ¿Está sana la Gateway? `openclaw status`
    3. ¿Tiene la interfaz el token correcto? `openclaw dashboard`
    4. Si es remoto, ¿está activo el enlace del túnel/Tailscale?

    Luego consulte los registros:

    ```bash
    openclaw logs --follow
    ```

    Documentación: [Dashboard](/en/web/dashboard), [Acceso remoto](/en/gateway/remote), [Solución de problemas](/en/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Telegram setMyCommands falla. ¿Qué debería comprobar?">
    Empiece con los registros y el estado del canal:

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Luego compare el error:

    - `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero algunas entradas del menú aún deben eliminarse. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, o errores de red similares: si está en un VPS o detrás de un proxy, confirme que el HTTPS saliente está permitido y que el DNS funciona para `api.telegram.org`.

    Si el Gateway es remoto, asegúrese de estar mirando los registros en el host del Gateway.

    Documentos: [Telegram](/en/channels/telegram), [Solución de problemas del canal](/en/channels/troubleshooting).

  </Accordion>

  <Accordion title="La TUI no muestra salida. ¿Qué debería comprobar?">
    Primero confirme que el Gateway es accesible y que el agente puede ejecutarse:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal
    de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

    Documentos: [TUI](/en/web/tui), [Comandos de barra](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo detengo por completo y luego inicio el Gateway?">
    Si instaló el servicio:

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
    Use esto cuando el Gateway se ejecuta en segundo plano como un demonio.

    Si lo está ejecutando en primer plano, deténgalo con Ctrl-C, luego:

    ```bash
    openclaw gateway run
    ```

    Documentos: [Manual de servicio del Gateway](/en/gateway).

  </Accordion>

  <Accordion title="Explicación sencilla: reinicio de openclaw gateway vs openclaw gateway">
    - `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
    - `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

    Si instaló el servicio, use los comandos de gateway. Use `openclaw gateway` cuando
    desee una ejecución única en primer plano.

  </Accordion>

  <Accordion title="La forma más rápida de obtener más detalles cuando algo falla">
    Inicie el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro para ver errores de autenticación de canal, enrutamiento de modelo y RPC.
  </Accordion>
</AccordionGroup>

## Medios y archivos adjuntos

<AccordionGroup>
  <Accordion title="Mi habilidad generó una imagen/PDF, pero no se envió nada">
    Los archivos adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulte [Configuración del asistente OpenClaw](/en/start/openclaw) y [Envío de agente](/en/tools/agent-send).

    Envío por CLI:

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    También verifique:

    - El canal de destino admite medios salientes y no está bloqueado por listas de permitidos.
    - El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048px).
    - `tools.fs.workspaceOnly=true` limita los envíos de rutas locales al espacio de trabajo, temp/media-store y archivos validados por el sandbox.
    - `tools.fs.workspaceOnly=false` permite que `MEDIA:` envíe archivos locales del host que el agente ya puede leer, pero solo para medios más tipos de documentos seguros (imágenes, audio, video, PDF y documentos de Office). Los archivos de texto plano y similares a secretos siguen bloqueados.

    Consulte [Imágenes](/en/nodes/images).

  </Accordion>
</AccordionGroup>

## Seguridad y control de acceso

<AccordionGroup>
  <Accordion title="¿Es seguro exponer OpenClaw a MDs entrantes?">
    Trate los MDs entrantes como entrada no confiables. Los valores predeterminados están diseñados para reducir el riesgo:

    - El comportamiento predeterminado en los canales con capacidad de MD es **vinculación** (pairing):
      - Los remitentes desconocidos reciben un código de vinculación; el bot no procesa su mensaje.
      - Apruebe con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Las solicitudes pendientes están limitadas a **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
    - Abrir MDs públicamente requiere una aceptación explícita (`dmPolicy: "open"` y lista de permitidos `"*"`).

    Ejecute `openclaw doctor` para revelar políticas de MD riesgosas.

  </Accordion>

  <Accordion title="¿La inyección de comandos (prompt injection) es solo una preocupación para los bots públicos?">
    No. La inyección de comandos se trata sobre **contenido no confiable**, no solo sobre quién puede enviar MD al bot.
    Si su asistente lee contenido externo (búsqueda/recuperación web, páginas del navegador, correos electrónicos,
    documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intentan
    secuestrar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

    El mayor riesgo es cuando las herramientas están habilitadas: el modelo puede ser engañado para
    exfiltrar contexto o llamar herramientas en su nombre. Reduzca el radio de explosión por:

    - usar un agente "lector" de solo lectura o con herramientas deshabilitadas para resumir contenido no confiable
    - mantener `web_search` / `web_fetch` / `browser` desactivado para agentes con herramientas habilitadas
    - tratar también el texto de archivos/documentos decodificados como no confiable: OpenResponses
      `input_file` y la extracción de archivos adjuntos multimedia envuelven el texto extraído en
      marcadores de límite de contenido externo explícitos en lugar de pasar el texto del archivo sin procesar
    - sandboxing y listas de permitidos de herramientas estrictas

    Detalles: [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="¿Debe mi bot tener su propio correo electrónico, cuenta de GitHub o número de teléfono?">
    Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados
    reduce el radio de impacto si algo sale mal. Esto también facilita la rotación
    de credenciales o la revocación del acceso sin afectar tus cuentas personales.

    Empieza pequeño. Concede acceso solo a las herramientas y cuentas que realmente necesites y amplía
    más tarde si es necesario.

    Documentación: [Seguridad](/en/gateway/security), [Emparejamiento](/en/channels/pairing).

  </Accordion>

  <Accordion title="¿Puedo darle autonomía sobre mis mensajes de texto y es seguro?">
    **No** recomendamos la autonomía total sobre tus mensajes personales. El patrón más seguro es:

    - Mantener los MD en **modo de emparejamiento** o en una lista de permitidos estricta.
    - Usar un **número o cuenta separado** si quieres que envíe mensajes en tu nombre.
    - Dejar que redacte y luego **aprobar antes de enviar**.

    Si quieres experimentar, hazlo en una cuenta dedicada y manténla aislada. Consulta
    [Seguridad](/en/gateway/security).

  </Accordion>

<Accordion title="¿Puedo usar modelos más económicos para tareas de asistente personal?">
  Sí, **siempre que** el agente sea solo de chat y la entrada sea confiable. Los niveles inferiores son más susceptibles al secuestro de instrucciones, por lo que debes evitarlos para agentes con herramientas o al leer contenido no confiable. Si debes usar un modelo más pequeño, restringe las herramientas y ejecútalo dentro de un entorno aislado. Consulta [Seguridad](/en/gateway/security).
</Accordion>

  <Accordion title="Ejecuté /start en Telegram pero no recibí un código de emparejamiento">
    Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
    `dmPolicy: "pairing"` está activado. `/start` por sí solo no genera un código.

    Comprueba las solicitudes pendientes:

    ```bash
    openclaw pairing list telegram
    ```

    Si quieres acceso inmediato, añade tu id de remitente a la lista de permitidos o establece `dmPolicy: "open"`
    para esa cuenta.

  </Accordion>

  <Accordion title="WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?">
    No. La política predeterminada de MD de WhatsApp es **pairing** (emparejamiento). Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a envíos explícitos que usted active.

    Aprobar el emparejamiento con:

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Listar solicitudes pendientes:

    ```bash
    openclaw pairing list whatsapp
    ```

    El asistente de solicitud de número de teléfono: se usa para configurar su **allowlist/owner** (lista blanca/propietario) para que se permitan sus propios MD. No se usa para el envío automático. Si ejecuta en su número personal de WhatsApp, use ese número y habilite `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Comandos de chat, cancelación de tareas y "no se detendrá"

<AccordionGroup>
  <Accordion title="¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?">
    La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose** (detallado) o **reasoning** (razonamiento) están activados
    para esa sesión.

    Solución en el chat donde lo vea:

    ```
    /verbose off
    /reasoning off
    ```

    Si sigue siendo ruidoso, verifique la configuración de la sesión en la Interfaz de Control (Control UI) y establezca verbose
    en **inherit** (heredar). También confirme que no está usando un perfil de bot con `verboseDefault` establecido
    en `on` en la configuración.

    Documentación: [Thinking and verbose](/en/tools/thinking), [Security](/en/gateway/security#reasoning-verbose-output-in-groups).

  </Accordion>

  <Accordion title="¿Cómo detengo/cancelo una tarea en ejecución?">
    Envíe cualquiera de estos **como un mensaje independiente** (sin barra):

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    Estos son disparadores de aborto (no comandos de barra).

    Para procesos en segundo plano (desde la herramienta exec), puede pedirle al agente que ejecute:

    ```
    process action:kill sessionId:XXX
    ```

    Resumen de comandos de barra: consulte [Slash commands](/en/tools/slash-commands).

    La mayoría de los comandos deben enviarse como un mensaje **standalone** (independiente) que comienza con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista blanca.

  </Accordion>

  <Accordion title='¿Cómo envío un mensaje de Discord desde Telegram? ("Cross-context messaging denied")'>
    OpenClaw bloquea el mensajería **entre proveedores** de forma predeterminada. Si una llamada a una herramienta está vinculada
    a Telegram, no se enviará a Discord a menos que lo permita explícitamente.

    Habilite el mensajería entre proveedores para el agente:

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    Reinicie la puerta de enlace después de editar la configuración.

  </Accordion>

  <Accordion title='¿Por qué parece que el bot "ignora" los mensajes en rápida sucesión?'>
    El modo de cola controla cómo interactúan los nuevos mensajes con una ejecución en curso. Use `/queue` para cambiar los modos:

    - `steer` - los mensajes nuevos redirigen la tarea actual
    - `followup` - ejecutar los mensajes uno a la vez
    - `collect` - agrupar mensajes y responder una vez (predeterminado)
    - `steer-backlog` - dirigir ahora, luego procesar el registro de retraso
    - `interrupt` - abortar la ejecución actual y comenzar de nuevo

    Puede agregar opciones como `debounce:2s cap:25 drop:summarize` para los modos de seguimiento.

  </Accordion>
</AccordionGroup>

## Varios

<AccordionGroup>
  <Accordion title="¿Cuál es el modelo predeterminado para Anthropic con una clave API?">
    En OpenClaw, las credenciales y la selección del modelo son cosas separadas. Establecer `ANTHROPIC_API_KEY` (o almacenar una clave API de Anthropic en los perfiles de autenticación) habilita la autenticación, pero el modelo predeterminado real es el que configure en `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-6` o `anthropic/claude-opus-4-6`). Si ve `No credentials
    found for profile "anthropic:default"`, significa que la puerta de enlace no pudo encontrar las credenciales de Anthropic en el `auth-profiles.json` esperado para el agente que se está ejecutando.
  </Accordion>
</AccordionGroup>

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre un [GitHub discussion](https://github.com/openclaw/openclaw/discussions).
