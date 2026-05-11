---
summary: "Preguntas frecuentes: inicio rápido y configuración de primera ejecución — instalación, incorporación, autenticación, suscripciones, fallos iniciales"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "Preguntas frecuentes: configuración de primera ejecución"
sidebarTitle: "Preguntas frecuentes de primera ejecución"
---

Preguntas y respuestas de inicio rápido y primera ejecución. Para operaciones cotidianas, modelos, autenticación, sesiones y resolución de problemas, consulte las [preguntas frecuentes] principales (/en/help/faq).

## Inicio rápido y configuración de primera ejecución

<AccordionGroup>
  <Accordion title="Estoy atascado, la forma más rápida de desatascarse">
    Utilice un agente de IA local que pueda **ver su máquina**. Esto es mucho más efectivo que preguntar
    en Discord, porque la mayoría de los casos de "estoy atascado" son **problemas de configuración local o del entorno** que
    los ayudantes remotos no pueden inspeccionar.

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a corregir su configuración
    a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Proporciónales el **checkout completo del código fuente** a través de
    la instalación hackeable (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto instala OpenClaw **desde un checkout de git**, por lo que el agente puede leer el código + los documentos y
    razonar sobre la versión exacta que está ejecutando. Siempre puede volver a la versión estable más tarde
    volviendo a ejecutar el instalador sin `--install-method git`.

    Sugerencia: pida al agente que **planifique y supervise** la corrección (paso a paso) y luego ejecute solo los
    comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

    Si descubre un error o una corrección real, por favor abra un issue de GitHub o envíe un PR:
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Comience con estos comandos (comparta las salidas cuando pida ayuda):

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Lo que hacen:

    - `openclaw status`: instantánea rápida del estado de la puerta de enlace/agente + configuración básica.
    - `openclaw models status`: verifica la autenticación del proveedor + disponibilidad del modelo.
    - `openclaw doctor`: valida y repara problemas comunes de configuración/estado.

    Otras comprobaciones útiles de la CLI: `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Bucle de depuración rápida: [Primeros 60 segundos si algo está roto](#first-60-seconds-if-something-is-broken).
    Documentos de instalación: [Instalación](/es/install), [Opciones del instalador](/es/install/installer), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="El latido sigue saltándose. ¿Qué significan los motivos de salto?">
    Motivos comunes por los que el latido se salta:

    - `quiet-hours`: fuera de la ventana de horas activas configurada
    - `empty-heartbeat-file`: `HEARTBEAT.md` existe pero solo contiene andamiaje vacío o solo con encabezados
    - `no-tasks-due`: el modo de tarea `HEARTBEAT.md` está activo pero aún no vence ninguno de los intervalos de tarea
    - `alerts-disabled`: toda la visibilidad del latido está deshabilitada (`showOk`, `showAlerts` y `useIndicator` están todos apagados)

    En el modo de tarea, las marcas de tiempo de vencimiento solo avanzan después de que se completa una ejecución real de latido.
    Las ejecuciones omitidas no marcan las tareas como completadas.

    Documentos: [Latido](/es/gateway/heartbeat), [Automatización y Tareas](/es/automation).

  </Accordion>

  <Accordion title="Forma recomendada de instalar y configurar OpenClaw">
    El repositorio recomienda ejecutar desde el código fuente y usar la incorporación (onboarding):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    El asistente también puede crear los activos de la interfaz de usuario automáticamente. Después de la incorporación, generalmente ejecutas el Gateway en el puerto **18789**.

    Desde el código fuente (colaboradores/desarrolladores):

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    Si aún no tienes una instalación global, ejecútalo a través de `pnpm openclaw onboard`.

  </Accordion>

<Accordion title="¿Cómo abro el panel después de la incorporación?">El asistente abre tu navegador con una URL del panel limpia (sin token) justo después de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no se lanzó, copia y pega la URL impresa en la misma máquina.</Accordion>

  <Accordion title="¿Cómo autentico el panel en localhost frente a remoto?">
    **Localhost (misma máquina):**

    - Abra `http://127.0.0.1:18789/`.
    - Si solicita autenticación de secreto compartido, pegue el token o contraseña configurado en la configuración de la Interfaz de Control (Control UI).
    - Fuente del token: `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
    - Fuente de la contraseña: `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aún no se ha configurado un secreto compartido, genere un token con `openclaw doctor --generate-gateway-token`.

    **No en localhost:**

    - **Tailscale Serve** (recomendado): mantenga el enlace loopback, ejecute `openclaw gateway --tailscale serve`, abra `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de la Interfaz de Control/WebSocket (sin secreto compartido pegado, asume host de puerta de enlace confiable); las API HTTP aún requieren autenticación de secreto compartido a menos que use deliberadamente private-ingress `none` o autenticación HTTP de proxy confiable.
      Los intentos de autenticación Serve simultáneos fallidos del mismo cliente se serializan antes de que el limitador de autenticaciones fallidas los registre, por lo que el segundo reintento fallido ya puede mostrar `retry later`.
    - **Tailnet bind**: ejecute `openclaw gateway --bind tailnet --token "<token>"` (o configure la autenticación por contraseña), abra `http://<tailscale-ip>:18789/`, luego pegue el secreto compartido coincidente en la configuración del panel.
    - **Proxy inverso con conocimiento de identidad**: mantenga la Gateway detrás de un proxy confiable que no sea loopback, configure `gateway.auth.mode: "trusted-proxy"`, luego abra la URL del proxy.
    - **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` luego abra `http://127.0.0.1:18789/`. La autenticación de secreto compartido aún se aplica a través del túnel; pegue el token o contraseña configurado si se le solicita.

    Vea [Dashboard](/es/web/dashboard) y [Superficies web](/es/web) para conocer los modos de enlace y detalles de autenticación.

  </Accordion>

  <Accordion title="¿Por qué hay dos configuraciones de aprobación de ejecución para las aprobaciones de chat?">
    Controlan diferentes capas:

    - `approvals.exec`: reenvía los mensajes de aprobación a los destinos de chat
    - `channels.<channel>.execApprovals`: hace que ese canal actúe como un cliente de aprobación nativo para las aprobaciones de ejecución

    La política de ejecución del host sigue siendo la puerta de aprobación real. La configuración del chat solo controla dónde aparecen los mensajes de aprobación y cómo pueden responder las personas.

    En la mayoría de configuraciones **no** necesitas ambas:

    - Si el chat ya admite comandos y respuestas, el `/approve` en el mismo chat funciona a través de la ruta compartida.
    - Si un canal nativo admitido puede inferir los aprobadores de forma segura, OpenClaw ahora habilita automáticamente las aprobaciones nativas优先DM (prioridad de mensaje directo) cuando `channels.<channel>.execApprovals.enabled` no está establecido o es `"auto"`.
    - Cuando están disponibles las tarjetas/botones de aprobación nativos, esa interfaz de usuario nativa es la ruta principal; el agente solo debe incluir un comando manual `/approve` si el resultado de la herramienta indica que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.
    - Usa `approvals.exec` solo cuando los mensajes también deban reenviarse a otros chats o salas de operaciones explícitas.
    - Usa `channels.<channel>.execApprovals.target: "channel"` o `"both"` solo cuando quieras explícitamente que los mensajes de aprobación se publiquen de nuevo en la sala/tema de origen.
    - Las aprobaciones de complementos son separadas nuevamente: usan el `/approve` en el mismo chat por defecto, reenvío opcional `approvals.plugin`, y solo algunos canales nativos mantienen el manejo nativo de aprobación de complementos encima.

    Versión corta: el reenvío es para el enrutamiento, la configuración del cliente nativo es para una experiencia de usuario específica del canal más rica.
    Consulta [Aprobaciones de ejecución](/es/tools/exec-approvals).

  </Accordion>

  <Accordion title="¿Qué tiempo de ejecución necesito?">
    Se requiere Node **>= 22**. Se recomienda `pnpm`. Bun **no es recomendado** para el Gateway.
  </Accordion>

  <Accordion title="¿Se ejecuta en Raspberry Pi?">
    Sí. El Gateway es ligero: la documentación lista **512MB-1GB de RAM**, **1 núcleo** y unos **500MB**
    de disco como suficientes para uso personal, y tenga en cuenta que una **Raspberry Pi 4 puede ejecutarlo**.

    Si desea un margen adicional (registros, medios, otros servicios), **se recomiendan 2GB**, pero no es
    un mínimo estricto.

    Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puede emparejar **nodos** en su portátil/teléfono para
    pantalla/cámara/lienzo locales o ejecución de comandos. Vea [Nodos](/es/nodes).

  </Accordion>

  <Accordion title="¿Algún consejo para instalaciones en Raspberry Pi?">
    Versión corta: funciona, pero espere imperfecciones.

    - Use un sistema operativo de **64 bits** y mantenga Node >= 22.
    - Prefiera la **instalación (git) personalizable** para que pueda ver los registros y actualizar rápidamente.
    - Comience sin canales/habilidades, luego agréguelos uno por uno.
    - Si encuentra problemas binarios extraños, generalmente es un problema de **compatibilidad ARM**.

    Documentación: [Linux](/es/platforms/linux), [Instalación](/es/install).

  </Accordion>

  <Accordion title="Se quedó atascado en despertar a mi amigo / la integración no se completará. ¿Qué ahora?">
    Esa pantalla depende de que el Gateway sea accesible y esté autenticado. La TUI también envía
    "¡Despierta, mi amigo!" automáticamente en la primera eclosión. Si ve esa línea con **sin respuesta**
    y los tokens se mantienen en 0, el agente nunca se ejecutó.

    1. Reinicie el Gateway:

    ```bash
    openclaw gateway restart
    ```

    2. Verifique el estado + autenticación:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. Si todavía se cuelga, ejecute:

    ```bash
    openclaw doctor
    ```

    Si el Gateway es remoto, asegúrese de que la conexión del túnel/Tailscale esté activa y que la interfaz de usuario
    apunte al Gateway correcto. Vea [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir el proceso de incorporación?">
    Sí. Copie el **directorio de estado** y el **espacio de trabajo**, y luego ejecute Doctor una vez. Esto
    mantiene su bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado
    del canal) siempre que copie **ambas** ubicaciones:

    1. Instale OpenClaw en la nueva máquina.
    2. Copie `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) desde la máquina antigua.
    3. Copie su espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
    4. Ejecute `openclaw doctor` y reinicie el servicio Gateway.

    Eso preserva la configuración, perfiles de autenticación, credenciales de WhatsApp, sesiones y memoria. Si está en
    modo remoto, recuerde que el host de la Gateway es el propietario del almacén de sesiones y del espacio de trabajo.

    **Importante:** si solo confirma/empuja su espacio de trabajo a GitHub, está haciendo una copia de seguridad
    de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Estos residen
    en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

    Relacionado: [Migración](/es/install/migrating), [Dónde residen las cosas en el disco](#where-things-live-on-disk),
    [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Doctor](/es/gateway/doctor),
    [Modo remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde puedo ver las novedades de la última versión?">
    Consulte el registro de cambios de GitHub:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Las entradas más recientes están arriba. Si la sección superior está marcada como **Unreleased** (sin publicar), la siguiente sección con fecha es la última versión publicada. Las entradas se agrupan en **Destacados** (Highlights), **Cambios** (Changes) y
    **Correcciones** (Fixes) (más secciones de documentos/otras cuando sea necesario).

  </Accordion>

  <Accordion title="No se puede acceder a docs.openclaw.ai (error de SSL)">
    Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de Xfinity
    Advanced Security. Desactívelo o agregue `docs.openclaw.ai` a la lista de permitidos, luego vuelva a intentarlo.
    Por favor, ayúdenos a desbloquearlo reportándolo aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si aún no puede acceder al sitio, la documentación está reflejada en GitHub:
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Diferencia entre estable y beta">
    **Estable** (Stable) y **beta** son **dist-tags de npm**, no líneas de código separadas:

    - `latest` = estable
    - `beta` = versión preliminar para pruebas

    Por lo general, un lanzamiento estable llega primero a **beta**, luego un paso de promoción explícito mueve esa misma versión a `latest`. Los mantenedores también pueden
    publicar directamente en `latest` cuando es necesario. Por eso beta y estable pueden
    apuntar a la **misma versión** después de la promoción.

    Consulte qué cambió:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Para instalaciones de una sola línea y la diferencia entre beta y dev, consulte el acordeón a continuación.

  </Accordion>

  <Accordion title="¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?">
    **Beta** es el dist-tag de npm `beta` (puede coincidir con `latest` después de la promoción).
    **Dev** es la cabeza móvil de `main` (git); cuando se publica, usa el dist-tag de npm `dev`.

    Comandos de una sola línea (macOS/Linux):

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Instalador de Windows (PowerShell):
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Más detalles: [Canales de desarrollo](/es/install/development-channels) y [Opciones del instalador](/es/install/installer).

  </Accordion>

  <Accordion title="¿Cómo pruebo las últimas novedades?">
    Dos opciones:

    1. **Canal Dev (git checkout):**

    ```bash
    openclaw update --channel dev
    ```

    Esto cambia a la rama `main` y actualiza desde el código fuente.

    2. **Instalación modificable (hackable) (desde el sitio del instalador):**

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

    Documentación: [Actualizar](/es/cli/update), [Canales de desarrollo](/es/install/development-channels),
    [Instalación](/es/install).

  </Accordion>

  <Accordion title="¿Cuánto tiempo suelen tardar la instalación y el proceso de incorporación?">
    Guía aproximada:

    - **Instalación:** 2-5 minutos
    - **Incorporación:** 5-15 minutos, dependiendo de cuántos canales/modelos configures

    Si se bloquea, usa [Instalador atascado](#quick-start-and-first-run-setup)
    y el bucle de depuración rápida en [Estoy atascado](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="¿El instalador está atascado? ¿Cómo obtengo más información?">
    Vuelve a ejecutar el instalador con **salida detallada**:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Instalación beta con modo detallado:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Para una instalación personalizable (git):

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

    Más opciones: [Opciones del instalador](/es/install/installer).

  </Accordion>

  <Accordion title="La instalación en Windows dice que no se encuentra git o que openclaw no se reconoce">
    Dos problemas comunes en Windows:

    **1) error de npm spawn git / git not found**

    - Instala **Git for Windows** y asegúrate de que `git` esté en tu PATH.
    - Cierra y vuelve a abrir PowerShell, luego vuelve a ejecutar el instalador.

    **2) openclaw no se reconoce después de la instalación**

    - Tu carpeta bin global de npm no está en el PATH.
    - Comprueba la ruta:

      ```powershell
      npm config get prefix
      ```

    - Añade ese directorio a tu PATH de usuario (no se necesita el sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
    - Cierra y vuelve a abrir PowerShell después de actualizar el PATH.

    Si deseas la configuración de Windows más fluida, usa **WSL2** en lugar de Windows nativo.
    Documentación: [Windows](/es/platforms/windows).

  </Accordion>

  <Accordion title="La salida ejecutable de Windows muestra texto chino ilegible, ¿qué debo hacer?">
    Esto suele ser una discrepancia en la página de códigos de la consola en los shells nativos de Windows.

    Síntomas:

    - La salida de `system.run`/`exec` muestra el chino como mojibake
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

    Si aún reproduce esto en la última versión de OpenClaw, realice un seguimiento/reporte en:

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentación no respondió mi pregunta, ¿cómo obtengo una mejor respuesta?">
    Use la **instalación hackeable (git)** para tener el código fuente y los documentos completos localmente, luego pregunte
    a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Más detalles: [Instalación](/es/install) y [Opciones del instalador](/es/install/installer).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en Linux?">
    Respuesta corta: siga la guía de Linux y luego ejecute la incorporación (onboarding).

    - Ruta rápida de Linux + instalación del servicio: [Linux](/es/platforms/linux).
    - Tutorial completo: [Comenzando](/es/start/getting-started).
    - Instalador + actualizaciones: [Instalación y actualizaciones](/es/install/updating).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en un VPS?">
    Cualquier VPS de Linux funciona. Instale en el servidor y luego use SSH/Tailscale para acceder al Gateway.

    Guías: [exe.dev](/es/install/exe-dev), [Hetzner](/es/install/hetzner), [Fly.io](/es/install/fly).
    Acceso remoto: [Gateway remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde están las guías de instalación en la nube/VPS?">
    Mantenemos un **centro de alojamiento** con los proveedores comunes. Elige uno y sigue la guía:

    - [Alojamiento VPS](/es/vps) (todos los proveedores en un solo lugar)
    - [Fly.io](/es/install/fly)
    - [Hetzner](/es/install/hetzner)
    - [exe.dev](/es/install/exe-dev)

    Cómo funciona en la nube: el **Gateway se ejecuta en el servidor** y tú accedes a él
    desde tu portátil/teléfono mediante la interfaz de control (Control UI) (o Tailscale/SSH). Tu estado + espacio de trabajo
    residen en el servidor, así que trata el host como la fuente de la verdad y haz copias de seguridad.

    Puedes vincular **nodos** (Mac/iOS/Android/headless) a ese Gateway en la nube para acceder
    a la pantalla/cámara/lienzo local o ejecutar comandos en tu portátil mientras mantienes el
    Gateway en la nube.

    Centro: [Plataformas](/es/platforms). Acceso remoto: [Gateway remoto](/es/gateway/remote).
    Nodos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo pedirle a OpenClaw que se actualice a sí mismo?">
    Respuesta corta: **es posible, no recomendado**. El flujo de actualización puede reiniciar el
    Gateway (lo que termina la sesión activa), puede necesitar una comprobación git limpia y
    puede solicitar confirmación. Más seguro: ejecuta las actualizaciones desde un shell como operador.

    Usa la CLI:

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    Si debes automatizarlo desde un agente:

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    Documentación: [Actualizar](/es/cli/update), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="¿Qué hace realmente la incorporación?">
    `openclaw onboard` es la ruta de configuración recomendada. En **modo local**, te guía a través de:

    - **Configuración de modelo/autenticación** (OAuth del proveedor, claves API, token de configuración de Anthropic, además de opciones de modelos locales como LM Studio)
    - Ubicación del **espacio de trabajo** + archivos de arranque
    - **Configuración de Gateway** (bind/puerto/auth/tailscale)
    - **Canales** (WhatsApp, Telegram, Discord, Mattermost, Signal, iMessage, además de complementos de canal incluidos como QQ Bot)
    - **Instalación del Demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
    - **Verificaciones de estado** y selección de **habilidades**

    También advierte si su modelo configurado es desconocido o le falta autenticación.

  </Accordion>

  <Accordion title="¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?">
    No. Puede ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/otros) o con
    **modelos solo locales** para que sus datos se mantengan en su dispositivo. Las suscripciones (Claude
    Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

    Para Anthropic en OpenClaw, la división práctica es:

    - **Clave API de Anthropic**: facturación normal de la API de Anthropic
    - **Autenticación de suscripción Claude CLI / Claude en OpenClaw**: el personal de
      Anthropic nos dijo que este uso está permitido nuevamente, y OpenClaw está tratando el uso de `claude -p`
      como sancionado para esta integración a menos que Anthropic publique una nueva
      política

    Para hosts de puerta de enlace de larga duración, las claves API de Anthropic siguen siendo la configuración
    más predecible. El OAuth de OpenAI Codex es compatible explícitamente para herramientas
    externas como OpenClaw.

    OpenClaw también admite otras opciones de estilo de suscripción alojadas, incluyendo
    **Plan de Codificación Qwen Cloud**, **Plan de Codificación MiniMax** y
    **Plan de Codificación Z.AI / GLM**.

    Documentación: [Anthropic](/es/providers/anthropic), [OpenAI](/es/providers/openai),
    [Qwen Cloud](/es/providers/qwen),
    [MiniMax](/es/providers/minimax), [GLM Models](/es/providers/glm),
    [Local models](/es/gateway/local-models), [Models](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar la suscripción Claude Max sin una clave de API?">
    Sí.

    El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que
    OpenClaw trata la autenticación por suscripción de Claude y el uso de `claude -p` como sancionado
    para esta integración a menos que Anthropic publique una nueva política. Si desea
    la configuración del lado del servidor más predecible, utilice una clave de API de Anthropic en su lugar.

  </Accordion>

  <Accordion title="¿Admiten la autenticación por suscripción de Claude (Claude Pro o Max)?">
    Sí.

    El personal de Anthropic nos informó que este uso está permitido nuevamente, por lo que OpenClaw trata
    el reuso de la CLI de Claude y el uso de `claude -p` como sancionado para esta integración
    a menos que Anthropic publique una nueva política.

    El token de configuración de Anthropic todavía está disponible como una ruta de token compatible con OpenClaw, pero OpenClaw ahora prefiere el reuso de la CLI de Claude y `claude -p` cuando está disponible.
    Para cargas de trabajo de producción o multiusuario, la autenticación con clave de API de Anthropic sigue siendo la
    opción más segura y predecible. Si desea otras opciones alojadas de tipo suscripción
    en OpenClaw, consulte [OpenAI](/es/providers/openai), [Qwen / Model
    Cloud](/es/providers/qwen), [MiniMax](/es/providers/minimax) y [GLM
    Models](/es/providers/glm).

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="¿Por qué veo el error HTTP 429 rate_limit_error de Anthropic?">
    Eso significa que su **cuota/límite de tasa de Anthropic** se ha agotado para la ventana actual. Si usa **Claude CLI**, espere a que la ventana se restablezca o mejore su plan. Si usa una **clave de API de Anthropic**, verifique la Consola de Anthropic para ver el uso/facturación y aumente los límites según sea necesario.

    Si el mensaje es específicamente:
    `Extra usage is required for long context requests`, la solicitud está intentando usar
    la beta de contexto de 1M de Anthropic (`context1m: true`). Eso solo funciona cuando su credencial es elegible para la facturación de contexto largo (facturación de clave de API o la ruta de inicio de sesión de Claude de OpenClaw con Uso Extra habilitado).

    Consejo: configure un **modelo de respaldo** para que OpenClaw pueda seguir respondiendo mientras un proveedor tiene límites de tasa.
    Consulte [Modelos](/es/cli/models), [OAuth](/es/concepts/oauth) y
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="¿Está soportado AWS Bedrock?">
  Sí. OpenClaw tiene un proveedor **Amazon Bedrock (Converse)** incluido. Con los marcadores de entorno de AWS presentes, OpenClaw puede descubrir automáticamente el catálogo de Bedrock de streaming/texto y fusionarlo como un proveedor `amazon-bedrock` implícito; de lo contrario, puede habilitar explícitamente `plugins.entries.amazon-bedrock.config.discovery.enabled` o agregar una entrada de
  proveedor manual. Consulte [Amazon Bedrock](/es/providers/bedrock) y [Proveedores de modelos](/es/providers/models). Si prefiere un flujo de clave administrada, un proxy compatible con OpenAI frente a Bedrock sigue siendo una opción válida.
</Accordion>

<Accordion title="¿Cómo funciona la autenticación de Codex?">
  OpenClaw es compatible con **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). Use `openai-codex/gpt-5.5` para OAuth de Codex a través del ejecutor PI predeterminado. Use `openai/gpt-5.5` para el acceso directo con clave API de OpenAI. GPT-5.5 también puede usar suscripción/OAuth a través de `openai-codex/gpt-5.5` o ejecuciones nativas del servidor de aplicaciones Codex con
  `openai/gpt-5.5` y `agentRuntime.id: "codex"`. Consulte [Proveedores de modelos](/es/concepts/model-providers) y [Incorporación (CLI)](/es/start/wizard).
</Accordion>

  <Accordion title="¿Por qué OpenClaw todavía menciona openai-codex?">
    `openai-codex` es el ID del proveedor y del perfil de autenticación para OAuth de ChatGPT/Codex.
    También es el prefijo explícito del modelo PI para OAuth de Codex:

    - `openai/gpt-5.5` = ruta actual de clave API directa de OpenAI en PI
    - `openai-codex/gpt-5.5` = ruta OAuth de Codex en PI
    - `openai/gpt-5.5` + `agentRuntime.id: "codex"` = ruta nativa del servidor de aplicaciones Codex
    - `openai-codex:...` = ID del perfil de autenticación, no una referencia de modelo

    Si desea la ruta de facturación/límites directa de la plataforma OpenAI, configure
    `OPENAI_API_KEY`. Si desea la autenticación de suscripción de ChatGPT/Codex, inicie sesión con
    `openclaw models auth login --provider openai-codex` y use
    referencias de modelo `openai-codex/*` para ejecuciones de PI.

  </Accordion>

  <Accordion title="¿Por qué los límites de OAuth de Codex pueden diferir de los de ChatGPT web?">
    OAuth de Codex utiliza ventanas de cuota gestionadas por OpenAI y dependientes del plan. En la práctica,
    esos límites pueden diferir de la experiencia del sitio web/aplicación de ChatGPT, incluso cuando
    ambos están vinculados a la misma cuenta.

    OpenClaw puede mostrar las ventanas de uso/cuota del proveedor actualmente visibles en
    `openclaw models status`, pero no inventa ni normaliza los derechos de ChatGPT web
    en acceso directo a la API. Si desea la ruta de facturación/límites directa de la plataforma OpenAI,
    use `openai/*` con una clave API.

  </Accordion>

  <Accordion title="¿Soportas la autenticación por suscripción de OpenAI (Codex OAuth)?">
    Sí. OpenClaw es totalmente compatible con **OAuth de suscripción a OpenAI Code (Codex)**.
    OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujo de trabajo externos
    como OpenClaw. El proceso de incorporación puede ejecutar el flujo de OAuth por ti.

    Consulta [OAuth](/es/concepts/oauth), [Proveedores de modelos](/es/concepts/model-providers) y [Incorporación (CLI)](/es/start/wizard).

  </Accordion>

  <Accordion title="¿Cómo configuro el OAuth de la CLI de Gemini?">
    La CLI de Gemini utiliza un **flujo de autenticación de complemento**, no un ID de cliente o un secreto en `openclaw.json`.

    Pasos:

    1. Instala la CLI de Gemini localmente para que `gemini` esté en `PATH`
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. Habilita el complemento: `openclaw plugins enable google`
    3. Inicia sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
    4. Modelo predeterminado después de iniciar sesión: `google-gemini-cli/gemini-3-flash-preview`
    5. Si las solicitudes fallan, establece `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace

    Esto almacena los tokens de OAuth en perfiles de autenticación en el host de la puerta de enlace. Detalles: [Proveedores de modelos](/es/concepts/model-providers).

  </Accordion>

<Accordion title="¿Está bien un modelo local para charlas informales?">
  Por lo general no. OpenClaw necesita un contexto grande + seguridad fuerte; las tarjetas pequeñas truncan y filtran. Si es necesario, ejecuta la compilación del modelo **más grande** que puedas localmente (LM Studio) y consulta [/gateway/local-models](/es/gateway/local-models). Los modelos más pequeños/cuantificados aumentan el riesgo de inyección de avisos - consulta
  [Seguridad](/es/gateway/security).
</Accordion>

<Accordion title="¿Cómo mantengo el tráfico del modelo alojado en una región específica?">
  Elige endpoints fijados a la región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax, Kimi y GLM; elige la variante alojada en EE. UU. para mantener los datos en la región. Todavía puedes listar Anthropic/OpenAI junto a estos usando `models.mode: "merge"` para que las alternativas sigan disponibles respetando el proveedor regional que selecciones.
</Accordion>

  <Accordion title="¿Tengo que comprar un Mac Mini para instalar esto?">
    No. OpenClaw se ejecuta en macOS o Linux (Windows mediante WSL2). Un Mac mini es opcional: algunas personas
    compran uno como host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja tipo Raspberry Pi también funciona.

    Solo necesitas un Mac **para herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/es/channels/bluebubbles) (recomendado): el servidor BlueBubbles se ejecuta en cualquier Mac, y el Gateway puede ejecutarse en Linux o en otro lugar. Si deseas otras herramientas exclusivas de macOS, ejecuta el Gateway en un Mac o empareja un nodo macOS.

    Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes), [Modo remoto de Mac](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Necesito un Mac mini para la compatibilidad con iMessage?">
    Necesitas **algún dispositivo macOS** iniciado en Messages. **No** tiene que ser un Mac mini:
    cualquier Mac funciona. **Usa [BlueBubbles](/es/channels/bluebubbles)** (recomendado) para iMessage: el servidor BlueBubbles se ejecuta en macOS, mientras que el Gateway puede ejecutarse en Linux o en otro lugar.

    Configuraciones comunes:

    - Ejecuta el Gateway en Linux/VPS y ejecuta el servidor BlueBubbles en cualquier Mac iniciado en Messages.
    - Ejecuta todo en el Mac si deseas la configuración de una sola máquina más sencilla.

    Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes),
    [Modo remoto de Mac](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro?">
    Sí. El **Mac mini puede ejecutar el Gateway** y tu MacBook Pro puede conectarse como un
    **nodo** (dispositivo acompañante). Los nodos no ejecutan el Gateway; proporcionan capacidades
    adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

    Patrón común:

    - Gateway en el Mac mini (siempre activo).
    - El MacBook Pro ejecuta la aplicación de macOS o un host de nodo y se empareja con el Gateway.
    - Usa `openclaw nodes status` / `openclaw nodes list` para verlo.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo usar Bun?">
    Bun **no está recomendado**. Vemos errores de tiempo de ejecución, especialmente con WhatsApp y Telegram.
    Usa **Node** para gateways estables.

    Si aún quieres experimentar con Bun, hazlo en un gateway que no sea de producción
    sin WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram: ¿qué va en allowFrom?">
    `channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

    La configuración solicita solo IDs de usuario numéricos. Si ya tienes entradas `@username` heredadas en la configuración, `openclaw doctor --fix` puede intentar resolverlas.

    Más seguro (sin bot de terceros):

    - Envía un MD a tu bot, luego ejecuta `openclaw logs --follow` y lee `from.id`.

    API oficial de Bot:

    - Envía un MD a tu bot, luego llama a `https://api.telegram.org/bot<bot_token>/getUpdates` y lee `message.from.id`.

    Terceros (menos privado):

    - Envía un MD a `@userinfobot` o `@getidsbot`.

    Consulta [/channels/telegram](/es/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?">
  Sí, a través del **enrutamiento multi-agente**. Vincula el **MD** de WhatsApp de cada remitente (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, para que cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún provienen de la **misma cuenta de WhatsApp**, y el control de acceso de DM (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp. Consulta [Multi-Agent Routing](/es/concepts/multi-agent) y [WhatsApp](/es/channels/whatsapp).
</Accordion>

<Accordion title='¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para codificación"?'>
  Sí. Utilice el enrutamiento multiagente: asigne a cada agente su propio modelo predeterminado y luego vincule las rutas entrantes (cuenta de proveedor o pares específicos) a cada agente. Un ejemplo de configuración se encuentra en [Enrutamiento multiagente](/es/concepts/multi-agent). Vea también [Modelos](/es/concepts/models) y [Configuración](/es/gateway/configuration).
</Accordion>

  <Accordion title="¿Homebrew funciona en Linux?">
    Sí. Homebrew es compatible con Linux (Linuxbrew). Configuración rápida:

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si ejecuta OpenClaw mediante systemd, asegúrese de que el PATH del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o su prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells que no son de inicio de sesión.
    Las compilaciones recientes también anteponen directorios comunes de binarios de usuario en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

  </Accordion>

  <Accordion title="Diferencia entre la instalación hackable de git y la instalación de npm">
    - **Instalación hackable (git):** descarga completa del código fuente, editable, lo mejor para los contribuyentes.
      Ejecuta las compilaciones localmente y puede parchear el código/documentación.
    - **npm install:** instalación global de CLI, sin repositorio, lo mejor para "simplemente ejecútalo".
      Las actualizaciones provienen de las dist-tags de npm.

    Documentación: [Primeros pasos](/es/start/getting-started), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="¿Puedo cambiar entre instalaciones npm y git más tarde?">
    Sí. Use `openclaw update --channel ...` cuando OpenClaw ya esté instalado.
    Esto **no borra tus datos** - solo cambia la instalación del código de OpenClaw.
    Tu estado (`~/.openclaw`) y espacio de trabajo (`~/.openclaw/workspace`) permanecen intactos.

    De npm a git:

    ```bash
    openclaw update --channel dev
    ```

    De git a npm:

    ```bash
    openclaw update --channel stable
    ```

    Agregue `--dry-run` para previsualizar primero el cambio de modo planificado. El actualizador ejecuta
    seguimientos del Doctor, actualiza las fuentes de los complementos para el canal objetivo y
    reinicia el gateway a menos que pase `--no-restart`.

    El instalador también puede forzar cualquier modo:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    Consejos de respaldo: consulte [Estrategia de respaldo](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="¿Debo ejecutar el Gateway en mi portátil o en un VPS?">
    Respuesta corta: **si desea confiabilidad 24/7, use un VPS**. Si desea la
    menor fricción y le parece bien el sueño/reinicios, ejecútelo localmente.

    **Portátil (Gateway local)**

    - **Ventajas:** sin costo de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
    - **Desventajas:** sueño/caídas de red = desconexiones, las actualizaciones/reinicios del SO interrumpen, debe mantenerse encendido.

    **VPS / nube**

    - **Ventajas:** siempre activo, red estable, sin problemas de sueño del portátil, más fácil de mantener en ejecución.
    - **Desventajas:** a menudo se ejecuta sin cabeza (usa capturas de pantalla), acceso remoto a archivos solamente, debe usar SSH para actualizaciones.

    **Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost/Discord funcionan bien desde un VPS. La única compensación real es **navegador sin cabeza** frente a una ventana visible. Consulte [Navegador](/es/tools/browser).

    **Valor predeterminado recomendado:** VPS si tuvo desconexiones del gateway anteriormente. Local es excelente cuando está usando activamente el Mac y desea acceso a archivos locales o automatización de la interfaz de usuario con un navegador visible.

  </Accordion>

  <Accordion title="¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?">
    No es obligatorio, pero **recomendado para mayor confiabilidad y aislamiento**.

    - **Host dedicado (VPS/Mac mini/Pi):** siempre encendido, menos interrupciones por suspensión/reinicio, permisos más limpios, más fácil de mantener en ejecución.
    - **Portátil/escritorio compartido:** totalmente bien para pruebas y uso activo, pero espera pausas cuando el equipo se suspenda o se actualice.

    Si quieres lo mejor de ambos mundos, mantén el Gateway en un host dedicado y empareja tu portátil como un **nodo** para herramientas locales de pantalla/cámara/exec. Consulta [Nodos](/es/nodes).
    Para orientación de seguridad, lee [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?">
    OpenClaw es ligero. Para un Gateway básico + un canal de chat:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
    - **Recomendado:** 1-2 vCPU, 2GB de RAM o más para margen (registros, medios, múltiples canales). Las herramientas de nodo y la automatización del navegador pueden consumir muchos recursos.

    SO: usa **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación de Linux está mejor probada allí.

    Documentos: [Linux](/es/platforms/linux), [Hospedaje VPS](/es/vps).

  </Accordion>

  <Accordion title="¿Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos?">
    Sí. Trata una VM igual que un VPS: debe estar siempre encendida, ser accesible y tener suficiente
    RAM para el Gateway y cualquier canal que habilites.

    Orientación base:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
    - **Recomendado:** 2GB de RAM o más si ejecutas múltiples canales, automatización del navegador o herramientas de medios.
    - **SO:** Ubuntu LTS u otro Debian/Ubuntu moderno.

    Si estás en Windows, **WSL2 es la configuración de estilo VM más fácil** y tiene la mejor compatibilidad
    de herramientas. Consulta [Windows](/es/platforms/windows), [Hospedaje VPS](/es/vps).
    Si estás ejecutando macOS en una VM, consulta [macOS VM](/es/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Relacionado

- [Preguntas frecuentes](/es/help/faq) — las preguntas frecuentes principales (modelos, sesiones, gateway, seguridad y más)
- [Resumen de instalación](/es/install)
- [Comenzar](/es/start/getting-started)
- [Solución de problemas](/es/help/troubleshooting)
