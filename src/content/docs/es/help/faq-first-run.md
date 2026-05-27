---
summary: "Preguntas frecuentes: inicio rápido y configuración de primera ejecución — instalación, incorporación, autenticación, suscripciones, fallos iniciales"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "Preguntas frecuentes: configuración de primera ejecución"
sidebarTitle: "Preguntas frecuentes de primera ejecución"
---

Preguntas y respuestas de inicio rápido y primera ejecución. Para operaciones cotidianas, modelos, autenticación, sesiones y solución de problemas, consulte las [preguntas frecuentes (FAQ)](/es/help/faq) principales.

## Inicio rápido y configuración de primera ejecución

<AccordionGroup>
  <Accordion title="Estoy bloqueado, la forma más rápida de desbloquearse">
    Use un agente de IA local que pueda **ver su máquina**. Eso es mucho más efectivo que preguntar
    en Discord, porque la mayoría de los casos de "estoy bloqueado" son **problemas de configuración local o del entorno** que
    los ayudantes remotos no pueden inspeccionar.

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a solucionar la configuración
    a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Déles el **código fuente completo** a través de
    la instalación "hackable" (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto instala OpenClaw **desde un checkout de git**, por lo que el agente puede leer el código + los documentos y
    razonar sobre la versión exacta que está ejecutando. Siempre puede volver a la versión estable más tarde
    volviendo a ejecutar el instalador sin `--install-method git`.

    Consejo: pída al agente que **planifique y supervise** la solución (paso a paso) y luego ejecute solo los
    comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

    Si descubre un error o solución real, por favor envíe un problema en GitHub o envíe un PR:
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

    Bucle de depuración rápida: [Primeros 60 segundos si algo está roto](/es/help/faq#first-60-seconds-if-something-is-broken).
    Documentos de instalación: [Instalación](/es/install), [Opciones del instalador](/es/install/installer), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="Heartbeat keeps skipping. What do the skip reasons mean?">
    Common heartbeat skip reasons:

    - `quiet-hours`: outside the configured active-hours window
    - `empty-heartbeat-file`: `HEARTBEAT.md` exists but only contains blank/header-only scaffolding
    - `no-tasks-due`: `HEARTBEAT.md` task mode is active but none of the task intervals are due yet
    - `alerts-disabled`: all heartbeat visibility is disabled (`showOk`, `showAlerts`, and `useIndicator` are all off)

    In task mode, due timestamps are only advanced after a real heartbeat run
    completes. Skipped runs do not mark tasks as completed.

    Docs: [Heartbeat](/es/gateway/heartbeat), [Automation](/es/automation).

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

  <Accordion title="¿Cómo autentico el panel de control en localhost frente a remoto?">
    **Localhost (misma máquina):**

    - Abra `http://127.0.0.1:18789/`.
    - Si solicita autenticación de secreto compartido, pegue el token o contraseña configurada en la configuración de la Interfaz de Control.
    - Fuente del token: `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
    - Fuente de la contraseña: `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
    - Si aún no se ha configurado ningún secreto compartido, genere un token con `openclaw doctor --generate-gateway-token`.

    **No en localhost:**

    - **Tailscale Serve** (recomendado): mantenga el enlace loopback, ejecute `openclaw gateway --tailscale serve`, abra `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de la Interfaz de Control/WebSocket (sin secreto compartido pegado, asume host de puerta de enlace confiable); las API HTTP aún requieren autenticación de secreto compartido a menos que use deliberadamente private-ingress `none` o autenticación HTTP de proxy confiable.
      Los intentos de autenticación simultáneos fallidos de Serve desde el mismo cliente se serializan antes de que el limitador de autenticaciones fallidas los registre, por lo que el segundo reintento fallido ya puede mostrar `retry later`.
    - **Tailnet bind**: ejecute `openclaw gateway --bind tailnet --token "<token>"` (o configure la autenticación por contraseña), abra `http://<tailscale-ip>:18789/` y luego pegue el secreto compartido coincidente en la configuración del panel de control.
    - **Proxy inverso con reconocimiento de identidad**: mantenga la puerta de enlace detrás de un proxy de confianza, configure `gateway.auth.mode: "trusted-proxy"` y luego abra la URL del proxy. Los proxies de loopback del mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito.
    - **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`. La autenticación de secreto compartido todavía se aplica a través del túnel; pegue el token o contraseña configurada si se le solicita.

    Consulte [Dashboard](/es/web/dashboard) y [Web surfaces](/es/web) para obtener detalles sobre los modos de enlace y autenticación.

  </Accordion>

  <Accordion title="¿Por qué hay dos configuraciones de aprobación de ejec para las aprobaciones de chat?">
    Controlan diferentes capas:

    - `approvals.exec`: reenvía las solicitudes de aprobación a los destinos de chat
    - `channels.<channel>.execApprovals`: hace que ese canal actúe como un cliente de aprobación nativo para las aprobaciones de ejec

    La política de ejec del host sigue siendo la puerta de aprobación real. La configuración del chat solo controla dónde aparecen las solicitudes de aprobación y cómo la gente puede responderlas.

    En la mayoría de configuraciones **no** necesitas ambas:

    - Si el chat ya admite comandos y respuestas, el `/approve` del mismo chat funciona a través de la ruta compartida.
    - Si un canal nativo admitido puede inferir los aprobadores de forma segura, OpenClaw ahora habilita automáticamente las aprobaciones nativas priorizando DM cuando `channels.<channel>.execApprovals.enabled` no está configurado o es `"auto"`.
    - Cuando están disponibles las tarjetas/botones de aprobación nativos, esa interfaz de usuario nativa es la ruta principal; el agente solo debe incluir un comando manual `/approve` si el resultado de la herramienta indica que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.
    - Usa `approvals.exec` solo cuando las solicitudes también deban reenviarse a otros chats o salas de operaciones explícitas.
    - Usa `channels.<channel>.execApprovals.target: "channel"` o `"both"` solo cuando quieras explícitamente que las solicitudes de aprobación se publiquen de nuevo en la sala/tema de origen.
    - Las aprobaciones de complementos (plugin) son nuevamente separadas: usan `/approve` en el mismo chat de forma predeterminada, reenvío `approvals.plugin` opcional, y solo algunos canales nativos mantienen el manejo nativo de aprobaciones de complementos activado.

    Versión corta: el reenvío es para el enrutamiento, la configuración del cliente nativo es para una experiencia de usuario específica del canal más rica.
    Consulte [Aprobaciones de ejec](/es/tools/exec-approvals).

  </Accordion>

  <Accordion title="¿Qué tiempo de ejecución necesito?">
    Se requiere Node **>= 22**. Se recomienda `pnpm`. No se recomienda Bun para el Gateway.
  </Accordion>

  <Accordion title="¿Funciona en Raspberry Pi?">
    Sí. La Gateway es ligera; la documentación lista **512MB-1GB de RAM**, **1 núcleo** y unos **500MB**
    de disco como suficiente para uso personal, y ten en cuenta que **una Raspberry Pi 4 puede ejecutarla**.

    Si quieres espacio adicional (registros, medios, otros servicios), **se recomiendan 2GB**, pero no es un
    mínimo estricto.

    Consejo: una Pi/VPS pequeña puede alojar la Gateway, y puedes emparejar **nodos** en tu portátil/teléfono para
    pantalla/cámara/lienzo locales o ejecución de comandos. Consulta [Nodos](/es/nodes).

  </Accordion>

  <Accordion title="¿Algún consejo para instalaciones en Raspberry Pi?">
    Versión corta: funciona, pero espera imperfecciones.

    - Usa un sistema operativo de **64 bits** y mantén Node >= 22.
    - Prefiere la **instalación hackeable (git)** para que puedas ver los registros y actualizar rápidamente.
    - Comienza sin canales/habilidades, luego agrégalos uno por uno.
    - Si encuentras problemas extraños con binarios, generalmente es un problema de **compatibilidad ARM**.

    Documentación: [Linux](/es/platforms/linux), [Instalación](/es/install).

  </Accordion>

  <Accordion title="Está atascado en wake up my friend / onboarding no inicia. ¿Qué hacer?">
    Esa pantalla depende de que la Gateway sea accesible y esté autenticada. La TUI también envía
    "¡Despierta, amigo!" automáticamente en el primer inicio. Si ves esa línea con **sin respuesta**
    y los tokens se mantienen en 0, el agente nunca se ejecutó.

    1. Reinicia la Gateway:

    ```bash
    openclaw gateway restart
    ```

    2. Verifica el estado y la autenticación:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. Si todavía se cuelga, ejecuta:

    ```bash
    openclaw doctor
    ```

    Si la Gateway es remota, asegúrate de que la conexión del túnel/Tailscale esté activa y de que la IU
    apunte a la Gateway correcta. Consulta [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir el onboarding?">
    Sí. Copie el **directorio de estado** y el **espacio de trabajo**, y luego ejecute Doctor una vez. Esto
    mantiene su bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado del
    canal) siempre que copie **ambas** ubicaciones:

    1. Instale OpenClaw en la nueva máquina.
    2. Copie `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) desde la máquina antigua.
    3. Copie su espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
    4. Ejecute `openclaw doctor` y reinicie el servicio Gateway.

    Esto preserva la configuración, los perfiles de autenticación, las credenciales de WhatsApp, las sesiones y la memoria. Si está en
    modo remoto, recuerde que el host de la puerta de enlace es el propietario del almacén de sesiones y del espacio de trabajo.

    **Importante:** si solo confirma/envía su espacio de trabajo a GitHub, está haciendo una copia de seguridad
    de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Estos residen
    en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

    Relacionado: [Migrating](/es/install/migrating), [Where things live on disk](/es/help/faq#where-things-live-on-disk),
    [Agent workspace](/es/concepts/agent-workspace), [Doctor](/es/gateway/doctor),
    [Remote mode](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde puedo ver las novedades de la última versión?">
    Consulte el registro de cambios de GitHub:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Las entradas más recientes están arriba. Si la sección superior está marcada como **Unreleased** (sin publicar), la siguiente sección
    con fecha es la última versión publicada. Las entradas se agrupan por **Highlights** (destacados), **Changes** (cambios) y
    **Fixes** (correcciones) (más secciones de documentos/otras cuando sea necesario).

  </Accordion>

  <Accordion title="No puedo acceder a docs.openclaw.ai (error SSL)">
    Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` mediante Xfinity
    Advanced Security (seguridad avanzada). Desactívelo o añada `docs.openclaw.ai` a la lista de permitidos y vuelva a intentarlo.
    Por favor, ayúdenos a desbloquearlo reportándolo aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si aun así no puede acceder al sitio, la documentación está reflejada en GitHub:
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Diferencia entre estable y beta">
    **Stable** y **beta** son **dist-tags de npm**, no líneas de código separadas:

    - `latest` = estable
    - `beta` = compilación temprana para pruebas

    Por lo general, una versión estable llega primero a **beta** y luego un paso de
    promoción explícito mueve esa misma versión a `latest`. Los mantenedores también pueden
    publicar directamente en `latest` cuando sea necesario. Por eso beta y stable pueden
    apuntar a la **misma versión** después de la promoción.

    Consulte lo que cambió:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Para líneas de instalación de una sola línea y la diferencia entre beta y dev, consulte el acordeón a continuación.

  </Accordion>

  <Accordion title="¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?">
    **Beta** es el dist-tag de npm `beta` (puede coincidir con `latest` después de la promoción).
    **Dev** es la cabeza móvil de `main` (git); cuando se publica, usa el dist-tag de npm `dev`.

    Líneas de una sola línea (macOS/Linux):

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Instalador de Windows (PowerShell):
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Más detalles: [Development channels](/es/install/development-channels) y [Installer flags](/es/install/installer).

  </Accordion>

  <Accordion title="¿Cómo pruebo las últimas novedades?">
    Dos opciones:

    1. **Canal de desarrollo (git checkout):**

    ```bash
    openclaw update --channel dev
    ```

    Esto cambia a la rama `main` y actualiza desde el código fuente.

    2. **Instalación personalizable (desde el sitio del instalador):**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Eso le da un repositorio local que puede editar y luego actualizar vía git.

    Si prefiere hacer una clonación limpia manualmente, use:

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    Documentación: [Update](/es/cli/update), [Development channels](/es/install/development-channels),
    [Install](/es/install).

  </Accordion>

  <Accordion title="¿Cuánto tiempo suele tardar la instalación y la incorporación?">
    Guía aproximada:

    - **Instalación:** 2-5 minutos
    - **Incorporación:** 5-15 minutos dependiendo de cuántos canales/modelos configures

    Si se cuelga, usa [Instalador atascado](#quick-start-and-first-run-setup)
    y el bucle de depuración rápida en [Estoy atascado](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="¿Instalador atascado? ¿Cómo obtener más información?">
    Vuelve a ejecutar el instalador con **salida detallada**:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Instalación beta con detalle:

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

    - Añade ese directorio a tu PATH de usuario (no se necesita sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
    - Cierra y vuelve a abrir PowerShell después de actualizar el PATH.

    Si quieres la configuración de Windows más fluida, usa **WSL2** en lugar de Windows nativo.
    Documentación: [Windows](/es/platforms/windows).

  </Accordion>

  <Accordion title="La salida ejecutable de Windows muestra texto chino ilegible, ¿qué debo hacer?">
    Esto suele deberse a una falta de coincidencia de la página de códigos de la consola en los shells nativos de Windows.

    Síntomas:

    - La salida de `system.run`/`exec` muestra caracteres chinos como mojibake
    - El mismo comando se ve bien en otro perfil de terminal

    Solución rápida en PowerShell:

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    Luego reinicie el Gateway y vuelva a intentar su comando:

    ```powershell
    openclaw gateway restart
    ```

    Si aún reproduce esto en la última versión de OpenClaw, rastree/infórmelo en:

    - [Incidencia #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentación no respondió mi pregunta, ¿cómo obtengo una mejor respuesta?">
    Use la **instalación (git) modificable** para tener el código fuente y la documentación completa de forma local, luego pregunte
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
    Funciona con cualquier VPS de Linux. Instale en el servidor y luego use SSH/Tailscale para acceder al Gateway.

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
    desde tu portátil/teléfono mediante la interfaz de Control (o Tailscale/SSH). Tu estado + espacio de trabajo
    residen en el servidor, así que trata el host como la fuente de verdad y haz copias de seguridad.

    Puedes emparejar **nodos** (Mac/iOS/Android/headless) con ese Gateway en la nube para acceder
    a la pantalla local/cámara/lienzo o ejecutar comandos en tu portátil manteniendo
    el Gateway en la nube.

    Centro: [Plataformas](/es/platforms). Acceso remoto: [Gateway remoto](/es/gateway/remote).
    Nodos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo pedirle a OpenClaw que se actualice a sí mismo?">
    Respuesta corta: **posible, no recomendado**. El flujo de actualización puede reiniciar el
    Gateway (lo que interrumpe la sesión activa), puede necesitar una comprobación limpia de git y
    puede solicitar confirmación. Más seguro: ejecuta las actualizaciones desde un shell como operador.

    Usa la CLI:

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    Si debes automatizar desde un agente:

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    Documentación: [Actualizar](/es/cli/update), [Actualizando](/es/install/updating).

  </Accordion>

  <Accordion title="¿Qué hace realmente la incorporación?">
    `openclaw onboard` es la ruta de configuración recomendada. En **modo local** te guía a través de:

    - **Configuración de modelo/autenticación** (OAuth del proveedor, claves API, token de configuración de Anthropic, además de opciones de modelos locales como LM Studio)
    - Ubicación del **espacio de trabajo** + archivos de inicio
    - **Configuración del Gateway** (bind/puerto/auth/tailscale)
    - **Canales** (WhatsApp, Telegram, Discord, Mattermost, Signal, iMessage, además de complementos de canal incluidos como QQ Bot)
    - **Instalación del Demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
    - **Verificaciones de estado** y selección de **habilidades**

    También advierte si tu modelo configurado es desconocido o le falta autenticación.

  </Accordion>

  <Accordion title="¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?">
    No. Puedes ejecutar OpenClaw con **claves de API** (Anthropic/OpenAI/otras) o con
    **modelos exclusivamente locales** para que tus datos se mantengan en tu dispositivo. Las suscripciones (Claude
    Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

    Para Anthropic en OpenClaw, la división práctica es:

    - **Clave de API de Anthropic**: facturación normal de la API de Anthropic
    - **Autenticación de suscripción Claude CLI / Claude en OpenClaw**: el personal de
      Anthropic nos dijo que este uso está permitido de nuevo, y OpenClaw está tratando el uso de `claude -p`
      como sancionado para esta integración a menos que Anthropic publique una nueva
      política

    Para hosts de puerta de enlace de larga duración, las claves de API de Anthropic siguen siendo la configuración
    más predecible. OAuth de OpenAI Codex es explícitamente compatible con herramientas
    externas como OpenClaw.

    OpenClaw también admite otras opciones alojadas de tipo suscripción, incluyendo
    **Plan de Codificación Qwen Cloud**, **Plan de Codificación MiniMax** y
    **Plan de Codificación Z.AI / GLM**.

    Documentos: [Anthropic](/es/providers/anthropic), [OpenAI](/es/providers/openai),
    [Qwen Cloud](/es/providers/qwen),
    [MiniMax](/es/providers/minimax), [Z.AI (GLM)](/es/providers/zai),
    [Modelos locales](/es/gateway/local-models), [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar la suscripción Claude Max sin una clave de API?">
    Sí.

    El personal de Anthropic nos indicó que el uso de la CLI de Claude al estilo OpenClaw está permitido nuevamente, por lo que
    OpenClaw trata la autenticación por suscripción de Claude y el uso de `claude -p` como autorizados
    para esta integración a menos que Anthropic publique una nueva política. Si desea
    la configuración del lado del servidor más predecible, utilice una clave de API de Anthropic en su lugar.

  </Accordion>

  <Accordion title="¿Admiten la autenticación por suscripción a Claude (Claude Pro o Max)?">
    Sí.

    El personal de Anthropic nos dijo que este uso está permitido de nuevo, por lo que OpenClaw trata
    el reuso de Claude CLI y el uso de `claude -p` como sancionado para esta integración
    a menos que Anthropic publique una nueva política.

    El token de configuración (setup-token) de Anthropic sigue estando disponible como una ruta de token compatible con OpenClaw, pero ahora OpenClaw prefiere el reuso de Claude CLI y `claude -p` cuando esté disponible.
    Para cargas de trabajo de producción o multiusuario, la autenticación con clave de API de Anthropic sigue siendo la
    opción más segura y predecible. Si deseas otras opciones alojadas de tipo suscripción
    en OpenClaw, consulta [OpenAI](/es/providers/openai), [Qwen / Model
    Cloud](/es/providers/qwen), [MiniMax](/es/providers/minimax) y [Modelos
    GLM](/es/providers/zai).

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="¿Por qué veo el error HTTP 429 rate_limit_error de Anthropic?">
    Eso significa que su **cuota/límite de tasa de Anthropic** se ha agotado para la ventana actual. Si usa **Claude CLI**, espere a que la ventana se restablezca o actualice su plan. Si usa una **clave de API de Anthropic**, verifique la Consola de Anthropic para ver el uso/facturación y aumente los límites según sea necesario.

    Si el mensaje es específicamente:
    `Extra usage is required for long context requests`, la solicitud está intentando usar
    la ventana de contexto de 1M de Anthropic (un modelo Claude 4.x con capacidad de 1M para GA o una configuración heredada
    `context1m: true`). Eso solo funciona cuando su credencial es elegible
    para la facturación de contexto largo (facturación de clave de API o la ruta de inicio de sesión de Claude de OpenClaw
    con Uso Extra habilitado).

    Consejo: configure un **modelo alternativo** para que OpenClaw pueda seguir respondiendo mientras un proveedor está limitado por tasa.
    Consulte [Modelos](/es/cli/models), [OAuth](/es/concepts/oauth) y
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="¿AWS Bedrock es compatible?">
  Sí. OpenClaw tiene un proveedor **Amazon Bedrock (Converse)** incluido. Con los marcadores de entorno de AWS presentes, OpenClaw puede detectar automáticamente el catálogo de Bedrock de streaming/texto y fusionarlo como un proveedor `amazon-bedrock` implícito; de lo contrario, puede habilitar explícitamente `plugins.entries.amazon-bedrock.config.discovery.enabled` o agregar una entrada de
  proveedor manual. Vea [Amazon Bedrock](/es/providers/bedrock) y [Proveedores de modelos](/es/providers/models). Si prefiere un flujo de claves administrado, un proxy compatible con OpenAI frente a Bedrock sigue siendo una opción válida.
</Accordion>

<Accordion title="¿Cómo funciona la autenticación de Codex?">
  OpenClaw admite **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). Use `openai/gpt-5.5` para la configuración común: autenticación de suscripción ChatGPT/Codex más ejecución nativa del servidor de aplicaciones Codex. Las referencias de modelos `openai-codex/gpt-*` son una configuración heredada reparada por `openclaw doctor --fix`. El acceso directo con clave de API de
  OpenAI sigue disponible para superficies de API de OpenAI que no son de agentes y para modelos de agentes a través de un perfil de clave de API `openai-codex` ordenado. Consulte [Proveedores de modelos](/es/concepts/model-providers) e [Incorporación (CLI)](/es/start/wizard).
</Accordion>

  <Accordion title="¿Por qué OpenClaw todavía menciona openai-codex?">
    `openai-codex` es el id del proveedor y del perfil de autenticación para ChatGPT/Codex OAuth.
    Las configuraciones antiguas también lo usaban como prefijo de modelo:

    - `openai/gpt-5.5` = autenticación de suscripción ChatGPT/Codex con tiempo de ejecución Codex nativo para turnos de agente
    - `openai-codex/gpt-5.5` = ruta de modelo heredada reparada por `openclaw doctor --fix`
    - `openai/gpt-5.5` más un perfil de clave de API `openai-codex` ordenado = autenticación con clave de API para un modelo de agente OpenAI
    - `openai-codex:...` = id del perfil de autenticación, no una referencia de modelo

    Si desea la ruta directa de facturación/límites de la plataforma OpenAI, configure
    `OPENAI_API_KEY`. Si desea la autenticación de suscripción ChatGPT/Codex, inicie sesión con
    `openclaw models auth login --provider openai-codex`. Mantenga la referencia del modelo como
    `openai/gpt-5.5`; las referencias de modelos `openai-codex/*` son una configuración heredada que
    `openclaw doctor --fix` reescribe.

  </Accordion>

  <Accordion title="¿Por qué pueden diferir los límites de OAuth de Codex de los de ChatGPT web?">
    Codex OAuth utiliza ventanas de cuota gestionadas por OpenAI y dependientes del plan. En la práctica,
    esos límites pueden diferir de la experiencia del sitio web/aplicación de ChatGPT, incluso cuando
    ambos están vinculados a la misma cuenta.

    OpenClaw puede mostrar las ventanas de uso/cuota del proveedor visibles actualmente en
    `openclaw models status`, pero no inventa ni normaliza los derechos de ChatGPT-web
    en acceso directo a la API. Si desea la ruta directa de facturación/límites de la plataforma de OpenAI,
    use `openai/*` con una clave de API.

  </Accordion>

  <Accordion title="¿Admite la autenticación de suscripción de OpenAI (Codex OAuth)?">
    Sí. OpenClaw es totalmente compatible con **OAuth de suscripción a OpenAI Code (Codex)**.
    OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujo de trabajo externos
    como OpenClaw. La incorporación puede ejecutar el flujo de OAuth por usted.

    Consulte [OAuth](/es/concepts/oauth), [Proveedores de modelos](/es/concepts/model-providers) y [Incorporación (CLI)](/es/start/wizard).

  </Accordion>

  <Accordion title="¿Cómo configuro OAuth de Gemini CLI?">
    Gemini CLI utiliza un **flujo de autenticación de complemento**, no un id de cliente o secreto en `openclaw.json`.

    Pasos:

    1. Instale Gemini CLI localmente para que `gemini` esté en `PATH`
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. Habilite el complemento: `openclaw plugins enable google`
    3. Inicie sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
    4. Modelo predeterminado después del inicio de sesión: `google-gemini-cli/gemini-3-flash-preview`
    5. Si las solicitudes fallan, configure `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de puerta de enlace

    Esto almacena tokens de OAuth en perfiles de autenticación en el host de la puerta de enlace. Detalles: [Proveedores de modelos](/es/concepts/model-providers).

  </Accordion>

<Accordion title="¿Es adecuado un modelo local para charlas casuales?">
  Por lo general no. OpenClaw necesita un contexto grande y una seguridad sólida; las tarjetas pequeñas se truncan y tienen fugas. Si es necesario, ejecute la compilación del modelo **más grande** que pueda localmente (LM Studio) y consulte [/gateway/local-models](/es/gateway/local-models). Los modelos más pequeños/cuantizados aumentan el riesgo de inyección de instrucciones; consulte
  [Seguridad](/es/gateway/security).
</Accordion>

<Accordion title="¿Cómo mantengo el tráfico del modelo alojado en una región específica?">
  Elija puntos finales anclados a la región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax, Kimi y GLM; elija la variante alojada en EE. UU. para mantener los datos en la región. Todavía puede listar Anthropic/OpenAI junto a estos usando `models.mode: "merge"` para que las alternativas sigan disponibles respetando el proveedor regional que seleccione.
</Accordion>

  <Accordion title="¿Tengo que comprar un Mac Mini para instalar esto?">
    No. OpenClaw se ejecuta en macOS o Linux (Windows mediante WSL2). Un Mac mini es opcional; algunas personas compran uno como un host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja clase Raspberry Pi también funciona.

    Solo necesita una Mac **para herramientas exclusivas de macOS**. Para iMessage, use [iMessage](/es/channels/imessage) con `imsg` en cualquier Mac conectado a Mensajes. Si Gateway se ejecuta en Linux o en otro lugar, configure `channels.imessage.cliPath` en un contenedor SSH que ejecute `imsg` en ese Mac. Si desea otras herramientas exclusivas de macOS, ejecute Gateway en una Mac o empareje un nodo macOS.

    Documentos: [iMessage](/es/channels/imessage), [Nodos](/es/nodes), [Modo remoto de Mac](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Necesito un Mac mini para compatibilidad con iMessage?">
    Necesita **algún dispositivo macOS** iniciado en Messages. **No** tiene que ser un Mac mini -
    cualquier Mac funciona. **Use [iMessage](/es/channels/imessage)** con `imsg`; el Gateway puede ejecutarse en ese Mac, o puede ejecutarse en otro lugar con un contenedor SSH `cliPath`.

    Configuraciones comunes:

    - Ejecute el Gateway en Linux/VPS y configure `channels.imessage.cliPath` en un contenedor SSH que ejecute `imsg` en un Mac iniciado en Messages.
    - Ejecute todo en el Mac si desea la configuración más sencilla de una sola máquina.

    Documentación: [iMessage](/es/channels/imessage), [Nodes](/es/nodes),
    [Mac remote mode](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro?">
    Sí. El **Mac mini puede ejecutar el Gateway**, y su MacBook Pro puede conectarse como un
    **nodo** (dispositivo complementario). Los nodos no ejecutan el Gateway; proporcionan
    capacidades adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

    Patrón común:

    - Gateway en el Mac mini (siempre encendido).
    - El MacBook Pro ejecuta la aplicación macOS o un host de nodo y se empareja con el Gateway.
    - Use `openclaw nodes status` / `openclaw nodes list` para verlo.

    Documentación: [Nodes](/es/nodes), [Nodes CLI](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo usar Bun?">
    Bun **no está recomendado**. Vemos errores de tiempo de ejecución, especialmente con WhatsApp y Telegram.
    Usa **Node** para gateways estables.

    Si aún quieres experimentar con Bun, hazlo en un gateway que no sea de producción
    sin WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram: ¿qué va en allowFrom?">
    `channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

    La configuración solicita solo IDs de usuario numéricos. Si ya tiene entradas `@username` heredadas en la configuración, `openclaw doctor --fix` puede intentar resolverlas.

    Más seguro (sin bot de terceros):

    - Envíe un MD a su bot, luego ejecute `openclaw logs --follow` y lea `from.id`.

    API de Bot oficial:

    - Envíe un MD a su bot, luego llame a `https://api.telegram.org/bot<bot_token>/getUpdates` y lea `message.from.id`.

    Terceros (menos privado):

    - Envíe un MD a `@userinfobot` o `@getidsbot`.

    Consulte [/channels/telegram](/es/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?">
  Sí, a través del **enrutamiento multiagente**. Vincule el **MD** de WhatsApp de cada remitente (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, de modo que cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún provienen de la **misma cuenta de WhatsApp**, y el control de acceso de MD (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp. Consulte [Enrutamiento multiagente](/es/concepts/multi-agent) y [WhatsApp](/es/channels/whatsapp).
</Accordion>

<Accordion title='¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para codificar"?'>
  Sí. Utilice el enrutamiento multiagente: asigne a cada agente su propio modelo predeterminado, luego vincule las rutas entrantes (cuenta de proveedor o pares específicos) a cada agente. Un ejemplo de configuración se encuentra en [Enrutamiento multiagente](/es/concepts/multi-agent). Consulte también [Modelos](/es/concepts/models) y [Configuración](/es/gateway/configuration).
</Accordion>

  <Accordion title="¿Funciona Homebrew en Linux?">
    Sí. Homebrew soporta Linux (Linuxbrew). Configuración rápida:

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si ejecutas OpenClaw mediante systemd, asegúrate de que el PATH del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells que no son de inicio de sesión.
    Las compilaciones recientes también anteponen directorios bin de usuario comunes en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

  </Accordion>

  <Accordion title="Diferencia entre la instalación modificable (git) y la instalación npm">
    - **Instalación modificable (git):** descarga completa del código fuente, editable, lo mejor para los contribuidores.
      Ejecutas las compilaciones localmente y puedes parchear el código o la documentación.
    - **npm install:** instalación global de la CLI, sin repositorio, lo mejor para "simplemente ejecútalo".
      Las actualizaciones provienen de las dist-tags de npm.

    Documentación: [Para comenzar](/es/start/getting-started), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="¿Puedo cambiar entre las instalaciones npm y git más tarde?">
    Sí. Usa `openclaw update --channel ...` cuando OpenClaw ya esté instalado.
    Esto **no borra tus datos**: solo cambia la instalación del código de OpenClaw.
    Tu estado (`~/.openclaw`) y tu espacio de trabajo (`~/.openclaw/workspace`) permanecen intactos.

    De npm a git:

    ```bash
    openclaw update --channel dev
    ```

    De git a npm:

    ```bash
    openclaw update --channel stable
    ```

    Añade `--dry-run` para previsualizar primero el cambio de modo planificado. El actualizador ejecuta
    seguimientos del Doctor, actualiza las fuentes de los complementos para el canal objetivo y
    reinicia la puerta de enlace a menos que pases `--no-restart`.

    El instalador también puede forzar cualquier modo:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    Consejos de copia de seguridad: consulta [Estrategia de copia de seguridad](/es/help/faq#where-things-live-on-disk).

  </Accordion>

  <Accordion title="¿Debo ejecutar la puerta de enlace en mi portátil o en un VPS?">
    Respuesta corta: **si quieres confiabilidad 24/7, usa un VPS**. Si quieres la
    menor fricción y te parece bien el modo de suspensión/reinicios, ejecútalo localmente.

    **Portátil (puerta de enlace local)**

    - **Ventajas:** sin coste de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
    - **Desventajas:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del sistema operativo interrumpen, debe permanecer encendido.

    **VPS / nube**

    - **Ventajas:** siempre activo, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
    - **Desventajas:** a menudo se ejecuta sin interfaz gráfica (usa capturas de pantalla), acceso remoto a archivos solamente, debes usar SSH para las actualizaciones.

    **Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost/Discord funcionan bien desde un VPS. La única compensación real es entre el **navegador sin interfaz gráfica** y una ventana visible. Consulta [Navegador](/es/tools/browser).

    **Recomendación predeterminada:** VPS si has tenido desconexiones de la puerta de enlace anteriormente. Lo local es excelente cuando estás utilizando activamente el Mac y quieres acceso a archivos locales o automatización de la interfaz de usuario con un navegador visible.

  </Accordion>

  <Accordion title="¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?">
    No es obligatorio, pero **recomendado para mayor confiabilidad y aislamiento**.

    - **Host dedicado (VPS/Mac mini/Pi):** siempre encendido, menos interrupciones por suspensión/reinicio, permisos más limpios, más fácil de mantener en ejecución.
    - **Portátil/escritorio compartido:** totalmente bien para pruebas y uso activo, pero espera pausas cuando la máquina se suspenda o se actualice.

    Si quieres lo mejor de ambos mundos, mantén el Gateway en un host dedicado y empareja tu portátil como un **nodo** para herramientas locales de pantalla/cámara/exec. Consulta [Nodos](/es/nodes).
    Para orientación de seguridad, lee [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?">
    OpenClaw es ligero. Para un Gateway básico + un canal de chat:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
    - **Recomendado:** 1-2 vCPU, 2GB de RAM o más para margen (registros, medios, múltiples canales). Las herramientas de nodo y la automatización del navegador pueden consumir muchos recursos.

    SO: usa **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación de Linux se prueba mejor allí.

    Documentos: [Linux](/es/platforms/linux), [Alojamiento VPS](/es/vps).

  </Accordion>

  <Accordion title="¿Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos?">
    Sí. Trata una VM igual que una VPS: debe estar siempre encendida, ser accesible y tener suficiente
    RAM para el Gateway y cualquier canal que habilites.

    Orientación básica:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
    - **Recomendado:** 2GB de RAM o más si ejecutas múltiples canales, automatización del navegador o herramientas de medios.
    - **SO:** Ubuntu LTS u otro Debian/Ubuntu moderno.

    Si estás en Windows, **WSL2 es la configuración de estilo VM más fácil** y tiene la mejor compatibilidad de herramientas. Consulta [Windows](/es/platforms/windows), [Alojamiento VPS](/es/vps).
    Si estás ejecutando macOS en una VM, consulta [macOS VM](/es/install/macos-vm).

  </Accordion>
</AccordionGroup>

## Relacionado

- [Preguntas frecuentes](/es/help/faq) — las preguntas frecuentes principales (modelos, sesiones, puerta de enlace, seguridad y más)
- [Resumen de instalación](/es/install)
- [Para comenzar](/es/start/getting-started)
- [Solución de problemas](/es/help/troubleshooting)
