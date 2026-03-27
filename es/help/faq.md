---
summary: "Preguntas frecuentes sobre la configuración, uso e instalación de OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "Preguntas frecuentes"
---

# Preguntas frecuentes

Respuestas rápidas y solución de problemas más profunda para configuraciones del mundo real (desarrollo local, VPS, multiagente, claves OAuth/API, conmutación por error de modelos). Para el diagnóstico en tiempo de ejecución, consulte [Solución de problemas](/es/gateway/troubleshooting). Para la referencia completa de configuración, consulte [Configuración](/es/gateway/configuration).

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

   Ejecuta comprobaciones de estado de la puerta de enlace + sondas del proveedor (requiere una puerta de enlace accesible). Consulte [Estado de salud](/es/gateway/health).

5. **Ver el último registro**

   ```bash
   openclaw logs --follow
   ```

   Si el RPC está caído, recurra a:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Los registros de archivo son independientes de los registros del servicio; consulte [Registros](/es/logging) y [Solución de problemas](/es/gateway/troubleshooting).

6. **Ejecutar el doctor (reparaciones)**

   ```bash
   openclaw doctor
   ```

   Repara/migra la configuración/estado + ejecuta comprobaciones de estado. Consulte [Doctor](/es/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Solicita a la puerta de enlace en ejecución una instantánea completa (solo WS). Consulte [Estado de salud](/es/gateway/health).

## Inicio rápido y configuración de la primera ejecución

<AccordionGroup>
  <Accordion title="Estoy atascado, la forma más rápida de desbloquearse">
    Utilice un agente de IA local que pueda **ver su máquina**. Eso es mucho más efectivo que preguntar
    en Discord, porque la mayoría de los casos de "estoy atascado" son **problemas de configuración local o del entorno** que
    los ayudantes remotos no pueden inspeccionar.

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a corregir su configuración
    a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Déles el **checkout completo del código fuente** a través
    de la instalación hackeable (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto instala OpenClaw **desde un checkout de git**, por lo que el agente puede leer el código + los documentos y
    razonar sobre la versión exacta que está ejecutando. Siempre puede volver a la versión estable más tarde
    volviendo a ejecutar el instalador sin `--install-method git`.

    Consejo: pida al agente que **planifique y supervise** la solución (paso a paso) y luego ejecute solo los
    comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

    Si descubre un error real o una solución, envíe un problema de GitHub o envíe un PR:
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
    Documentación de instalación: [Instalar](/es/install), [Opciones del instalador](/es/install/installer), [Actualizando](/es/install/updating).

  </Accordion>

  <Accordion title="Forma recomendada de instalar y configurar OpenClaw">
    El repositorio recomienda ejecutar desde el código fuente y utilizar la incorporación (onboarding):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    El asistente también puede compilar los activos de la interfaz de usuario automáticamente. Después de la incorporación, normalmente ejecutas el Gateway en el puerto **18789**.

    Desde el código fuente (colaboradores/desarrolladores):

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    Si aún no tienes una instalación global, ejecútalo mediante `pnpm openclaw onboard`.

  </Accordion>

<Accordion title="¿Cómo abro el panel de control después de la incorporación?">
  El asistente abre tu navegador con una URL del panel de control limpia (sin token) justo después
  de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no
  se inició, copia y pega la URL impresa en la misma máquina.
</Accordion>

  <Accordion title="¿Cómo autentico el panel de control (token) en localhost frente a remoto?">
    **Localhost (misma máquina):**

    - Abre `http://127.0.0.1:18789/`.
    - Si solicita autenticación, pega el token de `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de Control UI.
    - Recupéralo del host del gateway: `openclaw config get gateway.auth.token` (o genera uno: `openclaw doctor --generate-gateway-token`).

    **No en localhost:**

    - **Tailscale Serve** (recomendado): mantén el enlace de bucle local (loopback), ejecuta `openclaw gateway --tailscale serve`, abre `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de Control UI/WebSocket (sin token, se asume un host de gateway confiable); las API de HTTP aún requieren token/contraseña.
    - **Tailnet bind**: ejecuta `openclaw gateway --bind tailnet --token "<token>"`, abre `http://<tailscale-ip>:18789/`, pega el token en la configuración del panel de control.
    - **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` luego abre `http://127.0.0.1:18789/` y pega el token en la configuración de Control UI.

    Consulta [Dashboard](/es/web/dashboard) y [Web surfaces](/es/web) para obtener detalles sobre los modos de enlace y autenticación.

  </Accordion>

  <Accordion title="¿Qué tiempo de ejecución necesito?">
    Node **>= 22** es necesario. Se recomienda `pnpm`. Bun **no está recomendado** para el Gateway.
  </Accordion>

  <Accordion title="¿Funciona en Raspberry Pi?">
    Sí. El Gateway es ligero; los documentos listan **512MB-1GB de RAM**, **1 núcleo** y aproximadamente **500MB**
    de disco como suficiente para uso personal, y señalan que un **Raspberry Pi 4 puede ejecutarlo**.

    Si quieres margen adicional (registros, medios, otros servicios), se recomiendan **2GB**, pero no es
    un mínimo estricto.

    Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puedes emparejar **nodos** en tu portátil/teléfono para
    pantalla/cámara/lienzos locales o ejecución de comandos. Consulta [Nodes](/es/nodes).

  </Accordion>

  <Accordion title="¿Algunos consejos para las instalaciones en Raspberry Pi?">
    Versión corta: funciona, pero espera dificultades.

    - Usa un sistema operativo de **64 bits** y mantén Node >= 22.
    - Prefiere la **instalación hackable (git)** para que puedas ver los registros y actualizar rápidamente.
    - Comienza sin canales/habilidades, luego agrégalos uno por uno.
    - Si encuentras problemas binarios extraños, generalmente es un problema de **compatibilidad ARM**.

    Documentación: [Linux](/es/platforms/linux), [Instalación](/es/install).

  </Accordion>

  <Accordion title="Se atasca en despertar, amigo / el onboarding no se completará. ¿Qué ahora?">
    Esa pantalla depende de que la Gateway sea accesible y esté autenticada. La TUI también envía
    "¡Despierta, amigo!" automáticamente en el primer inicio. Si ves esa línea con **sin respuesta**
    y los tokens se mantienen en 0, el agente nunca se ejecutó.

    1. Reinicia la Gateway:

    ```bash
    openclaw gateway restart
    ```

    2. Verifica el estado + autenticación:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. Si aún se cuelga, ejecuta:

    ```bash
    openclaw doctor
    ```

    Si la Gateway es remota, asegúrate de que la conexión del túnel/Tailscale esté activa y de que la UI
    apunte a la Gateway correcta. Consulta [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir el proceso de incorporación?">
    Sí. Copie el **directorio de estado** y el **espacio de trabajo**, luego ejecute Doctor una vez. Esto
    mantiene su bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado
    del canal) siempre que copie **ambas** ubicaciones:

    1. Instale OpenClaw en la nueva máquina.
    2. Copie `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) desde la máquina antigua.
    3. Copie su espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
    4. Ejecute `openclaw doctor` y reinicie el servicio Gateway.

    Esto preserva la configuración, los perfiles de autenticación, las credenciales de WhatsApp, las sesiones y la memoria. Si está en
    modo remoto, recuerde que el host de la puerta de enlace es el propietario del almacén de sesiones y el espacio de trabajo.

    **Importante:** si solo confirma/envía su espacio de trabajo a GitHub, está realizando una copia de seguridad
    de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Estos residen
    en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

    Relacionado: [Migrating](/es/install/migrating), [Where things live on disk](#where-things-live-on-disk),
    [Agent workspace](/es/concepts/agent-workspace), [Doctor](/es/gateway/doctor),
    [Remote mode](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde puedo ver las novedades de la última versión?">
    Consulte el registro de cambios de GitHub:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Las entradas más recientes están en la parte superior. Si la sección superior está marcada como **Unreleased** (No lanzada), la siguiente sección
    con fecha es la última versión lanzada. Las entradas se agrupan por **Destacados** (Highlights), **Cambios** (Changes) y
    **Correcciones** (Fixes) (más secciones de documentos/otras cuando sea necesario).

  </Accordion>

  <Accordion title="No se puede acceder a docs.openclaw.ai (error SSL)">
    Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de Xfinity
    Advanced Security. Desactívelo o agregue `docs.openclaw.ai` a la lista blanca, luego reintente. Más
    detalles: [Solución de problemas](/es/help/faq#cannot-access-docsopenclaw-ai-ssl-error).
    Ayúdenos a desbloquearlo informando aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si aún no puede acceder al sitio, la documentación está reflejada en GitHub:
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Diferencia entre stable y beta">
    **Stable** y **beta** son **etiquetas de distribución de npm (dist-tags)**, no líneas de código separadas:

    - `latest` = estable
    - `beta` = versión preliminar para pruebas

    Enviamos compilaciones a **beta**, las probamos y, una vez que una compilación es sólida, **promovemos
    esa misma versión a `latest`**. Por eso beta y stable pueden apuntar a la
    **misma versión**.

    Consulte qué cambió:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?">
    **Beta** es la etiqueta de distribución de npm (dist-tag) `beta` (puede coincidir con `latest`).
    **Dev** es la cabeza móvil de `main` (git); cuando se publica, utiliza la etiqueta de distribución de npm `dev`.

    Líneas de comando (macOS/Linux):

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Instalador de Windows (PowerShell):
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Más detalles: [Canales de desarrollo](/es/install/development-channels) y [Marcas del instalador](/es/install/installer).

  </Accordion>

  <Accordion title="¿Cómo pruebo las últimas novedades?">
    Dos opciones:

    1. **Canal de desarrollo (git checkout):**

    ```bash
    openclaw update --channel dev
    ```

    Esto cambia a la rama `main` y actualiza desde el código fuente.

    2. **Instalación modificable (desde el sitio del instalador):**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Eso te da un repositorio local que puedes editar y luego actualizar vía git.

    Si prefieres hacer una clonación limpia manualmente, usa:

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

    Si se cuelga, usa [Installer stuck](#quick-start-and-first-run-setup)
    y el bucle de depuración rápida en [I am stuck](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="¿El instalador está atascado? ¿Cómo obtengo más información?">
    Vuelve a ejecutar el instalador con **salida detallada (verbose output)**:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Instalación beta con salida detallada:

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

    Más opciones: [Installer flags](/es/install/installer).

  </Accordion>

  <Accordion title="La instalación en Windows dice que no se encuentra git o que openclaw no se reconoce">
    Dos problemas comunes en Windows:

    **1) error de npm spawn git / git not found**

    - Instale **Git para Windows** y asegúrese de que `git` esté en su PATH.
    - Cierre y vuelva a abrir PowerShell, luego ejecute nuevamente el instalador.

    **2) openclaw no se reconoce después de la instalación**

    - Su carpeta bin global de npm no está en PATH.
    - Verifique la ruta:

      ```powershell
      npm config get prefix
      ```

    - Agregue ese directorio a su PATH de usuario (no se necesita el sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
    - Cierre y vuelva a abrir PowerShell después de actualizar PATH.

    Si desea la configuración de Windows más fluida, use **WSL2** en lugar de Windows nativo.
    Documentación: [Windows](/es/platforms/windows).

  </Accordion>

  <Accordion title="La salida de exec de Windows muestra texto chino ilegible: ¿qué debo hacer?">
    Esto suele ser una discordancia en la página de códigos de la consola en shells nativos de Windows.

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

    Si aún reproduce esto en la última versión de OpenClaw, haga seguimiento o infórmelo en:

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentación no respondió mi pregunta: ¿cómo obtengo una mejor respuesta?">
    Use la **instalación hackable (git)** para tener el código fuente y la documentación completos localmente, luego pregunte
    a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Más detalles: [Instalación](/es/install) y [Opciones del instalador](/es/install/installer).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en Linux?">
    Respuesta corta: sigue la guía de Linux y luego ejecuta el onboarding.

    - Ruta rápida de Linux + instalación del servicio: [Linux](/es/platforms/linux).
    - Tutorial completo: [Primeros pasos](/es/start/getting-started).
    - Instalador + actualizaciones: [Instalación y actualizaciones](/es/install/updating).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en un VPS?">
    Cualquier VPS de Linux funciona. Instala en el servidor y luego usa SSH/Tailscale para conectarte al Gateway.

    Guías: [exe.dev](/es/install/exe-dev), [Hetzner](/es/install/hetzner), [Fly.io](/es/install/fly).
    Acceso remoto: [Gateway remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde están las guías de instalación en la nube/VPS?">
    Disponemos de un **centro de alojamiento** (hosting hub) con los proveedores más comunes. Elige uno y sigue la guía:

    - [Alojamiento VPS](/es/vps) (todos los proveedores en un solo lugar)
    - [Fly.io](/es/install/fly)
    - [Hetzner](/es/install/hetzner)
    - [exe.dev](/es/install/exe-dev)

    Cómo funciona en la nube: el **Gateway se ejecuta en el servidor** y tú accedes a él
    desde tu portátil/teléfono mediante la interfaz de Control (o Tailscale/SSH). Tu estado + espacio de trabajo
    residen en el servidor, así que trata el host como la fuente de verdad y haz copias de seguridad.

    Puedes vincular **nodos** (Mac/iOS/Android/headless) a ese Gateway en la nube para acceder
    a la pantalla/cámara/lienzo local o ejecutar comandos en tu portátil mientras mantienes
    el Gateway en la nube.

    Centro: [Plataformas](/es/platforms). Acceso remoto: [Gateway remoto](/es/gateway/remote).
    Nodos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo pedirle a OpenClaw que se actualice a sí mismo?">
    Respuesta corta: **posible, no recomendado**. El flujo de actualización puede reiniciar el
    Gateway (lo que termina la sesión activa), puede necesitar un git checkout limpio y
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

    Documentación: [Update](/es/cli/update), [Updating](/es/install/updating).

  </Accordion>

  <Accordion title="¿Qué hace realmente la incorporación (onboarding)?">
    `openclaw onboard` es la ruta de configuración recomendada. En el **modo local** te guía a través de:

    - **Configuración de modelo/autenticación** (soportados flujos de OAuth/token de configuración del proveedor y claves API, además de opciones de modelos locales como LM Studio)
    - Ubicación del **espacio de trabajo** + archivos de arranque
    - **Configuración del Gateway** (bind/puerto/auth/tailscale)
    - **Proveedores** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
    - **Instalación del demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
    - **Verificaciones de estado** y selección de **habilidades**

    También advierte si tu modelo configurado es desconocido o falta la autenticación.

  </Accordion>

  <Accordion title="¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?">
    No. Puedes ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/u otros) o con
    **modelos solo locales** para que tus datos se mantengan en tu dispositivo. Las suscripciones (Claude
    Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

    Si eliges la autenticación por suscripción de Anthropic, decide por ti mismo si usarla:
    Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
    El OAuth de OpenAI Codex es explícitamente compatible con herramientas externas como OpenClaw.

    Documentación: [Anthropic](/es/providers/anthropic), [OpenAI](/es/providers/openai),
    [Local models](/es/gateway/local-models), [Models](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar el suscriptor Claude Max sin una clave de API?">
    Sí. Puedes autenticarte con un **setup-token**
    en lugar de una clave de API. Esta es la ruta de suscripción.

    Las suscripciones Claude Pro/Max **no incluyen una clave de API**, por lo que esta es la
    ruta técnica para las cuentas de suscripción. Pero esta es tu decisión: Anthropic
    ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
    Si quieres la ruta compatible más clara y segura para producción, usa una clave de API de Anthropic.

  </Accordion>

<Accordion title="¿Cómo funciona la autenticación por setup-token de Anthropic?">
  `claude setup-token` genera una **cadena de token** a través de la CLI de Claude Code (no está
  disponible en la consola web). Puedes ejecutarlo en **cualquier máquina**. Elige **Anthropic token
  (pegar setup-token)** en el proceso de incorporación o pégalo con `openclaw models auth
  paste-token --provider anthropic`. El token se almacena como un perfil de autenticación para el
  proveedor **anthropic** y se usa como una clave de API (sin actualización automática). Más
  detalles: [OAuth](/es/concepts/oauth).
</Accordion>

  <Accordion title="¿Dónde encuentro un setup-token de Anthropic?">
    **No** está en la Consola de Anthropic. El setup-token es generado por la **CLI de Claude Code** en **cualquier máquina**:

    ```bash
    claude setup-token
    ```

    Copia el token que imprime, luego elige **Anthropic token (pegar setup-token)** en el proceso de incorporación. Si quieres ejecutarlo en el host de la puerta de enlace, usa `openclaw models auth setup-token --provider anthropic`. Si ejecutaste `claude setup-token` en otro lugar, pégalo en el host de la puerta de enlace con `openclaw models auth paste-token --provider anthropic`. Consulta [Anthropic](/es/providers/anthropic).

  </Accordion>

  <Accordion title="¿Admites la autenticación por suscripción de Claude (Claude Pro o Max)?">
    Sí - mediante **setup-token**. OpenClaw ya no reutiliza los tokens OAuth de la CLI de Claude Code; usa un setup-token o una clave de API de Anthropic. Genera el token en cualquier lugar y pégalo en el host de la puerta de enlace. Consulta [Anthropic](/es/providers/anthropic) y [OAuth](/es/concepts/oauth).

    Importante: esto es compatibilidad técnica, no una garantía política. Anthropic
    ha bloqueado algún uso de suscripciones fuera de Claude Code en el pasado.
    Debes decidir si usarlo y verificar los términos actuales de Anthropic.
    Para cargas de trabajo de producción o multiusuario, la autenticación con clave de API de Anthropic es la opción más segura y recomendada.

  </Accordion>

  <Accordion title="¿Por qué veo HTTP 429 rate_limit_error de Anthropic?">
    Eso significa que tu **cuota/límite de tasa de Anthropic** está agotada para la ventana actual. Si usas una **suscripción de Claude** (setup-token), espera a que la ventana se restablezca o actualiza tu plan. Si usas una **clave de API de Anthropic**, verifica la consola de Anthropic para el uso/facturación y aumenta los límites según sea necesario.

    Si el mensaje es específicamente:
    `Extra usage is required for long context requests`, la solicitud está intentando usar
    la beta de contexto de 1M de Anthropic (`context1m: true`). Eso solo funciona cuando tu credencial es elegible para la facturación de contexto largo (facturación de clave de API o suscripción con Uso Extra activado).

    Consejo: configura un **modelo alternativo** para que OpenClaw pueda seguir respondiendo mientras un proveedor tiene el límite de tasa alcanzado.
    Consulta [Modelos](/es/cli/models), [OAuth](/es/concepts/oauth) y
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="¿Se admite AWS Bedrock?">
  Sí: a través del proveedor **Amazon Bedrock (Converse)** de pi-ai con **configuración manual**.
  Debe proporcionar las credenciales/región de AWS en el host de la puerta de enlace y agregar una
  entrada de proveedor Bedrock en su configuración de modelos. Consulte [Amazon
  Bedrock](/es/providers/bedrock) y [Proveedores de modelos](/es/providers/models). Si prefiere un
  flujo de claves administradas, un proxy compatible con OpenAI frente a Bedrock sigue siendo una
  opción válida.
</Accordion>

<Accordion title="¿Cómo funciona la autenticación de Codex?">
  OpenClaw admite **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). La
  integración puede ejecutar el flujo OAuth y establecerá el modelo predeterminado en
  `openai-codex/gpt-5.4` cuando sea apropiado. Consulte [Proveedores de modelos
  ](/es/concepts/model-providers) y [Integración (CLI)](/es/start/wizard).
</Accordion>

  <Accordion title="¿Admiten la autenticación por suscripción de OpenAI (Codex OAuth)?">
    Sí. OpenClaw admite completamente **OAuth de suscripción de OpenAI Code (Codex)**.
    OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujos de trabajo externos
    como OpenClaw. La integración puede ejecutar el flujo OAuth por usted.

    Consulte [OAuth](/es/concepts/oauth), [Proveedores de modelos](/es/concepts/model-providers) y [Integración (CLI)](/es/start/wizard).

  </Accordion>

  <Accordion title="¿Cómo configuro OAuth de CLI de Gemini?">
    Gemini CLI utiliza un **flujo de autenticación de complemento**, no un ID de cliente ni un secreto en `openclaw.json`.

    Pasos:

    1. Habilite el complemento: `openclaw plugins enable google`
    2. Inicie sesión: `openclaw models auth login --provider google-gemini-cli --set-default`

    Esto almacena los tokens OAuth en perfiles de autenticación en el host de la puerta de enlace. Detalles: [Proveedores de modelos](/es/concepts/model-providers).

  </Accordion>

<Accordion title="¿Está bien un modelo local para charlas casuales?">
  Por lo general no. OpenClaw necesita un contexto grande + gran seguridad; las tarjetas pequeñas
  truncan y pierden datos. Si es obligatorio, ejecuta la compilación **más grande** de MiniMax M2.5
  que puedas localmente (LM Studio) y consulta [/gateway/local-models](/es/gateway/local-models).
  Los modelos más pequeños/cuantizados aumentan el riesgo de inyección de avisos - consulta
  [Security](/es/gateway/security).
</Accordion>

<Accordion title="¿Cómo mantengo el tráfico del modelo alojado en una región específica?">
  Elige endpoints anclados a la región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax,
  Kimi y GLM; elige la variante alojada en EE. UU. para mantener los datos en la región. Todavía
  puedes listar Anthropic/OpenAI junto con estos usando `models.mode: "merge"` para que las
  alternativas permanezcan disponibles respetando el proveedor regional que elijas.
</Accordion>

  <Accordion title="¿Tengo que comprar una Mac Mini para instalar esto?">
    No. OpenClaw se ejecuta en macOS o Linux (Windows mediante WSL2). Una Mac mini es opcional: algunas personas
    compran una como host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja tipo Raspberry Pi también funciona.

    Solo necesitas una Mac **para herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/es/channels/bluebubbles) (recomendado): el servidor BlueBubbles se ejecuta en cualquier Mac, y el Gateway puede ejecutarse en Linux o en otro lugar. Si quieres otras herramientas exclusivas de macOS, ejecuta el Gateway en una Mac o empareja un nodo macOS.

    Documentos: [BlueBubbles](/es/channels/bluebubbles), [Nodes](/es/nodes), [Mac remote mode](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Necesito un Mac mini para la compatibilidad con iMessage?">
    Necesita **algún dispositivo macOS** conectado a Messages. **No** tiene por qué ser un Mac mini -
    cualquier Mac funciona. **Use [BlueBubbles](/es/channels/bluebubbles)** (recomendado) para iMessage: el servidor BlueBubbles se ejecuta en macOS, mientras que la Gateway puede ejecutarse en Linux o en otro lugar.

    Configuraciones comunes:

    - Ejecute la Gateway en Linux/VPS y ejecute el servidor BlueBubbles en cualquier Mac conectado a Messages.
    - Ejecute todo en la Mac si desea la configuración de máquina única más sencilla.

    Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodes](/es/nodes),
    [Mac remote mode](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro?">
    Sí. El **Mac mini puede ejecutar la Gateway**, y su MacBook Pro puede conectarse como un
    **nodo** (dispositivo complementario). Los nodos no ejecutan la Gateway: proporcionan capacidades
    adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

    Patrón común:

    - Gateway en el Mac mini (siempre activo).
    - MacBook Pro ejecuta la aplicación macOS o un host de nodo y se empareja con la Gateway.
    - Use `openclaw nodes status` / `openclaw nodes list` para verlo.

    Documentación: [Nodes](/es/nodes), [Nodes CLI](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo usar Bun?">
    Bun **no está recomendado**. Vemos errores de tiempo de ejecución, especialmente con WhatsApp y Telegram.
    Use **Node** para gateways estables.

    Si todavía desea experimentar con Bun, hágalo en una gateway que no sea de producción
    sin WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram: ¿qué va en allowFrom?">
    `channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

    La integración (onboarding) acepta entrada `@username` y la resuelve a un ID numérico, pero la autorización de OpenClaw usa solo IDs numéricos.

    Más seguro (sin bot de terceros):

    - Envíe un DM a su bot, luego ejecute `openclaw logs --follow` y lea `from.id`.

    API de Bot oficial:

    - Envíe un DM a su bot, luego llame a `https://api.telegram.org/bot<bot_token>/getUpdates` y lea `message.from.id`.

    De terceros (menos privado):

    - Envíe un DM a `@userinfobot` o `@getidsbot`.

    Consulte [/channels/telegram](/es/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?">
  Sí, a través del **enrutamiento multi-agente**. Vincule el **DM** de WhatsApp de cada remitente
  (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, para que
  cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún
  provienen de la **misma cuenta de WhatsApp**, y el control de acceso de DM
  (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp.
  Consulte [Enrutamiento multi-agente](/es/concepts/multi-agent) y
  [WhatsApp](/es/channels/whatsapp).
</Accordion>

<Accordion title='¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para codificación"?'>
  Sí. Utilice el enrutamiento multi-agente: asigne a cada agente su propio modelo predeterminado,
  luego vincule las rutas entrantes (cuenta de proveedor o pares específicos) a cada agente. Un
  ejemplo de configuración se encuentra en [Enrutamiento multi-agente](/es/concepts/multi-agent).
  Consulte también [Modelos](/es/concepts/models) y [Configuración](/es/gateway/configuration).
</Accordion>

  <Accordion title="¿Homebrew funciona en Linux?">
    Sí. Homebrew es compatible con Linux (Linuxbrew). Configuración rápida:

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si ejecutas OpenClaw mediante systemd, asegúrate de que la RUTA (PATH) del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells no interactivos.
    Las compilaciones recientes también anteponen directorios comunes de binarios de usuario en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

  </Accordion>

  <Accordion title="Diferencia entre la instalación hackable de git y la instalación de npm">
    - **Instalación hackable (git):** descarga completa del código fuente, editable, lo mejor para los colaboradores.
      Ejecutas las compilaciones localmente y puedes parchear el código/documentación.
    - **Instalación npm:** instalación global de la CLI, sin repositorio, lo mejor para "simplemente ejecutarlo".
      Las actualizaciones provienen de las etiquetas de distribución (dist-tags) de npm.

    Documentación: [Primeros pasos](/es/start/getting-started), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="¿Puedo cambiar entre las instalaciones npm y git más tarde?">
    Sí. Instala la otra variante y luego ejecuta Doctor para que el servicio de puerta de enlace (gateway) apunte al nuevo punto de entrada.
    Esto **no borra tus datos** - solo cambia la instalación del código de OpenClaw. Tu estado
    (`~/.openclaw`) y espacio de trabajo (`~/.openclaw/workspace`) permanecen intactos.

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

    Doctor detecta una discordancia en el punto de entrada del servicio de puerta de enlace y ofrece reescribir la configuración del servicio para que coincida con la instalación actual (usa `--repair` en automatización).

    Consejos de respaldo: consulta [Estrategia de respaldo](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="¿Debo ejecutar el Gateway en mi portátil o en un VPS?">
    Respuesta corta: **si deseas confiabilidad 24/7, usa un VPS**. Si deseas la
    menor fricción y no te importa el reposicioinamiento/reinicios, ejecútalo localmente.

    **Portátil (Gateway local)**

    - **Pros:** sin costo de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
    - **Contras:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del sistema operativo interrumpen, debe mantenerse encendido.

    **VPS / nube**

    - **Pros:** siempre activo, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
    - **Contras:** a menudo se ejecuta sin cabeza (usa capturas de pantalla), acceso remoto a archivos solamente, debes usar SSH para las actualizaciones.

    **Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord funcionan bien desde un VPS. La única compensación real es el **navegador sin cabeza** frente a una ventana visible. Consulta [Navegador](/es/tools/browser).

    **Predeterminado recomendado:** VPS si has tenido desconexiones del gateway anteriormente. Lo local es excelente cuando estás usando activamente el Mac y deseas acceso a archivos locales o automatización de la interfaz de usuario con un navegador visible.

  </Accordion>

  <Accordion title="¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?">
    No es obligatorio, pero **recomendado para la confiabilidad y el aislamiento**.

    - **Host dedicado (VPS/Mac mini/Pi):** siempre activo, menos interrupciones por suspensión/reinicio, permisos más limpios, más fácil de mantener en ejecución.
    - **Portátil/escritorio compartido:** totalmente aceptable para pruebas y uso activo, pero espera pausas cuando la máquina se suspenda o se actualice.

    Si deseas lo mejor de ambos mundos, mantén el Gateway en un host dedicado y empareja tu portátil como un **nodo** para herramientas de pantalla/cámara/exec locales. Consulta [Nodos](/es/nodes).
    Para orientación sobre seguridad, lee [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?">
    OpenClaw es ligero. Para una puerta de enlace (Gateway) básica + un canal de chat:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
    - **Recomendado:** 1-2 vCPU, 2GB de RAM o más para tener margen (registros, medios, múltiples canales). Las herramientas de Node y la automatización del navegador pueden consumir muchos recursos.

    Sistema operativo: use **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación en Linux es la mejor probada ahí.

    Documentación: [Linux](/es/platforms/linux), [Alojamiento VPS](/es/vps).

  </Accordion>

  <Accordion title="¿Puedo ejecutar OpenClaw en una máquina virtual y cuáles son los requisitos?">
    Sí. Trate una máquina virtual igual que una VPS: debe estar siempre encendida, ser accesible y tener suficiente
    RAM para la puerta de enlace (Gateway) y cualquier canal que habilite.

    Guía básica:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
    - **Recomendado:** 2GB de RAM o más si ejecuta múltiples canales, automatización del navegador o herramientas de medios.
    - **Sistema operativo:** Ubuntu LTS u otro Debian/Ubuntu moderno.

    Si está en Windows, **WSL2 es la configuración estilo VM más fácil** y tiene la mejor compatibilidad
    de herramientas. Consulte [Windows](/es/platforms/windows), [Alojamiento VPS](/es/vps).
    Si está ejecutando macOS en una máquina virtual, consulte [VM macOS](/es/install/macos-vm).

  </Accordion>
</AccordionGroup>

## ¿Qué es OpenClaw?

<AccordionGroup>
  <Accordion title="¿Qué es OpenClaw, en un párrafo?">
    OpenClaw es un asistente de IA personal que ejecuta en sus propios dispositivos. Responde en las superficies de mensajería que ya usa (WhatsApp, Telegram, Slack, Mattermost (complemento), Discord, Google Chat, Signal, iMessage, WebChat) y también puede hacer voz + un Canvas en vivo en plataformas compatibles. La **puerta de enlace (Gateway)** es el plano de control siempre activo; el asistente es el producto.
  </Accordion>

  <Accordion title="Value proposition">
    OpenClaw no es "simplemente un envoltorio de Claude". Es un **plano de control local primero** que te permite ejecutar un
    asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
    sesiones con estado, memoria y herramientas, sin entregar el control de tus flujos de trabajo a un
    SaaS alojado.

    Aspectos destacados:

    - **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
      espacio de trabajo + el historial de sesiones localmente.
    - **Canales reales, no un sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      además de voz móvil y Canvas en las plataformas compatibles.
    - **Agnóstico a modelos:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
      y conmutación por error por agente.
    - **Opción solo local:** ejecuta modelos locales para que **todos los datos pueden permanecer en tu dispositivo** si lo deseas.
    - **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
      espacio de trabajo y configuraciones predeterminadas.
    - **Código abierto y modificable:** inspecciona, extiende y autoaloja sin bloqueo de proveedor.

    Documentación: [Gateway](/es/gateway), [Canales](/es/channels), [Multiagente](/es/concepts/multi-agent),
    [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Acabo de configurarlo, ¿qué debería hacer primero?">
    Buenos primeros proyectos:

    - Construir un sitio web (WordPress, Shopify o un sitio estático simple).
    - Crear un prototipo de aplicación móvil (esquema, pantallas, plan de API).
    - Organizar archivos y carpetas (limpieza, nomenclatura, etiquetado).
    - Conectar Gmail y automatizar resúmenes o seguimientos.

    Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
    usas subagentes para el trabajo en paralelo.

  </Accordion>

  <Accordion title="¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw?">
    Los triunfos cotidianos suelen tener este aspecto:

    - **Informes personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que le interesan.
    - **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores para correos electrónicos o documentos.
    - **Recordatorios y seguimientos:** avisos y listas de verificación impulsados por cron o latidos.
    - **Automatización del navegador:** rellenar formularios, recopilar datos y repetir tareas web.
    - **Coordinación entre dispositivos:** envíe una tarea desde su teléfono, deje que el Gateway la ejecute en un servidor y obtenga el resultado de vuelta en el chat.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ayudar con la generación de clientes, el alcance, los anuncios y los blogs para un SaaS?">
    Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
    resumir prospectos y escribir borradores de textos de alcance o anuncios.

    Para **campañas de alcance o anuncios**, mantenga a un humano en el ciclo. Evite el spam, siga las leyes locales y
    las políticas de la plataforma, y revise todo antes de enviarlo. El patrón más seguro es dejar que
    OpenClaw redacte y usted apruebe.

    Documentación: [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?">
    OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo de IDE. Utilice
    Claude Code o Codex para el ciclo de codificación directa más rápido dentro de un repositorio. Use OpenClaw cuando desee
    memoria duradera, acceso entre dispositivos y orquestación de herramientas.

    Ventajas:

    - **Memoria persistente + espacio de trabajo** a través de sesiones
    - **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
    - **Orquestación de herramientas** (navegador, archivos, programación, enlaces)
    - **Gateway siempre activo** (ejecutar en un VPS, interactuar desde cualquier lugar)
    - **Nodos** para navegador/pantalla/cámara/exec local

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Habilidades y automatización

<AccordionGroup>
  <Accordion title="¿Cómo personalizo las habilidades sin ensuciar el repositorio?">
    Use anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o añada una carpeta a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` > `~/.openclaw/skills` > bundled, por lo que las anulaciones administradas ganan sin tocar git. Solo las ediciones dignas de upstream deben vivir en el repositorio y salir como PRs.
  </Accordion>

  <Accordion title="¿Puedo cargar habilidades desde una carpeta personalizada?">
    Sí. Añada directorios adicionales a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (menor precedencia). La precedencia predeterminada permanece: `<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` instala en `./skills` por defecto, lo cual OpenClaw trata como `<workspace>/skills` en la siguiente sesión.
  </Accordion>

  <Accordion title="¿Cómo puedo usar diferentes modelos para diferentes tareas?">
    Hoy los patrones compatibles son:

    - **Cron jobs**: los trabajos aislados pueden establecer una anulación `model` por trabajo.
    - **Sub-agentes**: enrutar tareas a agentes separados con diferentes modelos predeterminados.
    - **Cambio bajo demanda**: usar `/model` para cambiar el modelo de la sesión actual en cualquier momento.

    Consulte [Cron jobs](/es/automation/cron-jobs), [Multi-Agent Routing](/es/concepts/multi-agent) y [Slash commands](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="El bot se congela mientras realiza trabajo pesado. ¿Cómo puedo descargar eso?">
    Utilice **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
    devuelven un resumen y mantienen su chat principal responsivo.

    Pída a su bot que "genere un sub-agente para esta tarea" o use `/subagents`.
    Use `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

    Consejo de tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, configure un
    modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

    Documentación: [Sub-agentes](/es/tools/subagents).

  </Accordion>

  <Accordion title="¿Cómo funcionan las sesiones de sub-agente vinculadas a hilos en Discord?">
    Utilice enlaces de hilos (thread bindings). Puede vincular un hilo de Discord a un sub-agente o un objetivo de sesión para que los mensajes de seguimiento en ese hilo se mantengan en esa sesión vinculada.

    Flujo básico:

    - Genere con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para seguimiento persistente).
    - O vincule manualmente con `/focus <target>`.
    - Use `/agents` para inspeccionar el estado del vínculo.
    - Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el auto-enfoque.
    - Use `/unfocus` para desvincular el hilo.

    Configuración requerida:

    - Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Sobrescrituras de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Auto-vincular al generar: establezca `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Documentación: [Sub-agentes](/es/tools/subagents), [Discord](/es/channels/discord), [Referencia de configuración](/es/gateway/configuration-reference), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="Cron o recordatorios no se ejecutan. ¿Qué debería comprobar?">
    Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
    las tareas programadas no se ejecutarán.

    Lista de comprobación:

    - Confirme que cron está habilitado (`cron.enabled`) y que `OPENCLAW_SKIP_CRON` no está establecido.
    - Compruebe que el Gateway está funcionando 24/7 (sin suspensión/reinicios).
    - Verifique la configuración de zona horaria de la tarea (`--tz` frente a la zona horaria del host).

    Depuración:

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    Documentación: [Cron jobs](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat).

  </Accordion>

  <Accordion title="¿Cómo instalo skills en Linux?">
    Use comandos nativos de `openclaw skills` o coloque skills en su espacio de trabajo. La interfaz de usuario de Skills de macOS no está disponible en Linux.
    Explore skills en [https://clawhub.com](https://clawhub.com).

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Instale la CLI independiente `clawhub` solo si desea publicar o sincronizar sus propias skills.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ejecutar tareas según un horario o continuamente en segundo plano?">
    Sí. Utilice el programador de Gateway:

    - **Cron jobs** para tareas programadas o recurrentes (persisten tras los reinicios).
    - **Heartbeat** para comprobaciones periódicas de la "sesión principal".
    - **Isolated jobs** para agentes autónomos que publican resúmenes o envían a chats.

    Documentación: [Cron jobs](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat),
    [Heartbeat](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title="¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?">
    No directamente. Las habilidades de macOS están restringidas por `metadata.openclaw.os` más los binarios necesarios, y las habilidades solo aparecen en el prompt del sistema cuando son elegibles en el **Gateway host**. En Linux, las habilidades exclusivas de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que invalides la restricción.

    Tienes tres patrones compatibles:

    **Opción A: ejecutar el Gateway en una Mac (lo más simple).**
    Ejecuta el Gateway donde existen los binarios de macOS, luego conéctate desde Linux en [modo remoto](#gateway-ports-already-running-and-remote-mode) o a través de Tailscale. Las habilidades se cargan normalmente porque el host del Gateway es macOS.

    **Opción B: usar un nodo macOS (sin SSH).**
    Ejecuta el Gateway en Linux, empareja un nodo macOS (aplicación de la barra de menús) y establece **Node Run Commands** en "Always Ask" o "Always Allow" en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios necesarios existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si eliges "Always Ask", aprobar "Always Allow" en el prompt añade ese comando a la lista de permitidos.

    **Opción C: proxies de binarios macOS sobre SSH (avanzado).**
    Mantén el Gateway en Linux, pero haz que los binarios de CLI necesarios resuelvan a envoltorios SSH que se ejecutan en una Mac. Luego invalida la habilidad para permitir Linux para que siga siendo elegible.

    1. Crea un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Coloca el envoltorio en `PATH` en el host de Linux (por ejemplo `~/bin/memo`).
    3. Invalida los metadatos de la habilidad (espacio de trabajo o `~/.openclaw/skills`) para permitir Linux:

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
    No está integrado hoy en día.

    Opciones:

    - **Habilidad / complemento personalizado:** lo mejor para un acceso API confiable (tanto Notion como HeyGen tienen API).
    - **Automatización del navegador:** funciona sin código pero es más lento y más frágil.

    Si desea mantener el contexto por cliente (flujos de trabajo de agencia), un patrón simple es:

    - Una página de Notion por cliente (contexto + preferencias + trabajo activo).
    - Pídale al agente que obtenga esa página al principio de una sesión.

    Si desea una integración nativa, abra una solicitud de función o construya una habilidad
    orientada a esas API.

    Instalar habilidades:

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Las instalaciones nativas aterrizan en el directorio del espacio de trabajo activo `skills/`. Para habilidades compartidas entre agentes, colóquelas en `~/.openclaw/skills/<name>/SKILL.md`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (vea la entrada de Homebrew Linux en las preguntas frecuentes anteriores). Consulte [Skills](/es/tools/skills) y [ClawHub](/es/tools/clawhub).

  </Accordion>

  <Accordion title="¿Cómo uso mi Chrome con sesión iniciada existente con OpenClaw?">
    Use el perfil de navegador incorporado `user`, que se adjunta a través de Chrome DevTools MCP:

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si desea un nombre personalizado, cree un perfil MCP explícito:

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    Esta ruta es local del host. Si la Gateway se ejecuta en otro lugar, ejecute un host de nodo en la máquina del navegador o use CDP remoto en su lugar.

  </Accordion>
</AccordionGroup>

## Sandboxing y memoria

<AccordionGroup>
  <Accordion title="¿Hay un documento dedicado al sandboxing?">
    Sí. Consulte [Sandboxing](/es/gateway/sandboxing). Para la configuración específica de Docker (gateway completa en Docker o imágenes de sandbox), consulte [Docker](/es/install/docker).
  </Accordion>

  <Accordion title="Docker parece limitado: ¿cómo habilito todas las funciones?">
    La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye
    paquetes del sistema, Homebrew ni navegadores integrados. Para una configuración más completa:

    - Persista `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
    - Integre dependencias del sistema en la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Instale los navegadores de Playwright a través de la CLI incluida:
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Establezca `PLAYWRIGHT_BROWSERS_PATH` y asegúrese de que la ruta se persista.

    Documentación: [Docker](/es/install/docker), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Puedo mantener los MDs personales pero hacer que los grupos sean públicos/sandboxed con un agente?">
    Sí, si su tráfico privado son los **MDs** y su tráfico público son los **grupos**.

    Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en Docker, mientras que la sesión principal de MD se mantenga en el host. Luego, restringa qué herramientas están disponibles en las sesiones aisladas mediante `tools.sandbox.tools`.

    Tutorial de configuración + ejemplo de configuración: [Grupos: MDs personales + grupos públicos](/es/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Referencia clave de configuración: [Configuración de la puerta de enlace](/es/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="¿Cómo vinculo una carpeta del host en el sandbox?">
  Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (p. ej.,
  `"/home/user/src:/src:ro"`). Los vinculos globales + por agente se fusionan; los vinculos por
  agente se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que
  los vinculos omiten las barreras del sistema de archivos del sandbox. Consulte
  [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs
  Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para
  ver ejemplos y notas de seguridad.
</Accordion>

  <Accordion title="¿Cómo funciona la memoria?">
    La memoria de OpenClaw son simplemente archivos Markdown en el espacio de trabajo del agente:

    - Notas diarias en `memory/YYYY-MM-DD.md`
    - Notas a largo plazo curadas en `MEMORY.md` (solo sesiones principales/privadas)

    OpenClaw también ejecuta un **vacío de memoria silencioso de precompactación** para recordar al modelo
    que escriba notas duraderas antes de la autocompactación. Esto solo se ejecuta cuando el espacio de trabajo
    es escribible (los entornos limitados de solo lectura lo omiten). Consulte [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="La memoria sigue olvidando cosas. ¿Cómo hago que se quede?">
    Pida al bot que **escriba el dato en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
    el contexto a corto plazo va a `memory/YYYY-MM-DD.md`.

    Esto sigue siendo un área que estamos mejorando. Ayuda recordar al modelo que almacene memorias;
    él sabrá qué hacer. Si sigue olvidando, verifique que la Gateway esté usando el mismo
    espacio de trabajo en cada ejecución.

    Documentación: [Memoria](/es/concepts/memory), [Espacio de trabajo del agente](/es/concepts/agent-workspace).

  </Accordion>

  <Accordion title="¿La memoria persiste para siempre? ¿Cuáles son los límites?">
    Los archivos de memoria residen en el disco y persisten hasta que los elimine. El límite es su
    almacenamiento, no el modelo. El **contexto de sesión** todavía está limitado por la ventana
    de contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Es por eso que
    existe la búsqueda de memoria: extrae solo las partes relevantes de vuelta al contexto.

    Documentación: [Memoria](/es/concepts/memory), [Contexto](/es/concepts/context).

  </Accordion>

  <Accordion title="¿La búsqueda de memoria semántica requiere una clave API de OpenAI?">
    Solo si usas **embeddings de OpenAI**. El OAuth de Codex cubre chat/completions y
    **no** otorga acceso a embeddings, por lo que **iniciar sesión con Codex (OAuth o el
    inicio de sesión de la CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Los embeddings de
    OpenAI aún necesitan una clave API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

    Si no configuras un proveedor explícitamente, OpenClaw selecciona automáticamente uno cuando puede
    resolver una clave API (perfiles de autenticación, `models.providers.*.apiKey` o variables de entorno).
    Prefiere OpenAI si se resuelve una clave de OpenAI; de lo contrario, Gemini si se resuelve una clave de
    Gemini, luego Voyage y luego Mistral. Si no hay ninguna clave remota disponible, la búsqueda de
    memoria permanece deshabilitada hasta que la configures. Si tienes una ruta de modelo local
    configurada y presente, OpenClaw
    prefiere `local`. Ollama es compatible cuando configuras
    explícitamente `memorySearch.provider = "ollama"`.

    Si prefieres mantenerte local, configura `memorySearch.provider = "local"` (y opcionalmente
    `memorySearch.fallback = "none"`). Si quieres embeddings de Gemini, configura
    `memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
    `memorySearch.remote.apiKey`). Admitimos modelos de embedding de **OpenAI, Gemini, Voyage, Mistral, Ollama o locales**;
    consulta [Memoria](/es/concepts/memory) para obtener detalles de configuración.

  </Accordion>
</AccordionGroup>

## Dónde residen las cosas en el disco

<AccordionGroup>
  <Accordion title="¿Se guardan localmente todos los datos utilizados con OpenClaw?">
    No: **el estado de OpenClaw es local**, pero **los servicios externos aún ven lo que les envías**.

    - **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de la puerta de enlace
      (`~/.openclaw` + tu directorio de espacio de trabajo).
    - **Remoto por necesidad:** los mensajes que envías a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
      sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
      servidores.
    - **Tú controlas la huella:** el uso de modelos locales mantiene los indicadores en tu máquina, pero el tráfico
      del canal aún pasa a través de los servidores del canal.

    Relacionado: [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="¿Dónde almacena OpenClaw sus datos?">
    Todo reside bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

    | Ruta                                                            | Propósito                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación de OAuth heredada (copiada en los perfiles de autenticación al primer uso)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y opcionales `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga secreta opcional respaldada en archivo para proveedores `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas estáticas `api_key` depuradas)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (por ejemplo, `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de la conversación (por agente)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de la sesión (por agente)                                       |

    Ruta heredada de agente único: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

    Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) es independiente y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="¿Dónde deben vivir AGENTS.md / SOUL.md / USER.md / MEMORY.md?">
    Estos archivos viven en el **espacio de trabajo del agente**, no en `~/.openclaw`.

    - **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (o reserva por legado `memory.md` cuando `MEMORY.md` está ausente),
      `memory/YYYY-MM-DD.md`, opcional `HEARTBEAT.md`.
    - **Directorio de estado (`~/.openclaw`)**: configuración, credenciales, perfiles de autenticación, sesiones, registros,
      y habilidades compartidas (`~/.openclaw/skills`).

    El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable mediante:

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si el bot "olvida" después de un reinicio, confirme que el Gateway está usando el mismo
    espacio de trabajo en cada lanzamiento (y recuerde: el modo remoto usa el espacio de trabajo del **host de la puerta de enlace**,
    no su computadora portátil local).

    Consejo: si desea un comportamiento o preferencia duradero, pídale al bot que **lo escriba en
    AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

    Consulte [Espacio de trabajo del agente](/es/concepts/agent-workspace) y [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Estrategia de respaldo recomendada">
    Coloque su **espacio de trabajo del agente** en un repositorio git **privado** y respáldelo en algún lugar
    privado (por ejemplo GitHub privado). Esto captura la memoria + archivos AGENTS/SOUL/USER
    y le permite restaurar la "mente" del asistente más tarde.

    **No** confirme nada bajo `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
    Si necesita una restauración completa, respalde tanto el espacio de trabajo como el directorio de estado
    por separado (consulte la pregunta de migración anterior).

    Documentos: [Espacio de trabajo del agente](/es/concepts/agent-workspace).

  </Accordion>

<Accordion title="¿Cómo desinstalo completamente OpenClaw?">
  Consulte la guía dedicada: [Desinstalación](/es/install/uninstall).
</Accordion>

  <Accordion title="¿Pueden los agentes trabajar fuera del espacio de trabajo?">
    Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un sandbox estricto.
    Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
    ubicaciones del host a menos que se habilite el sandbox. Si necesita aislamiento, use
    [`agents.defaults.sandbox`](/es/gateway/sandboxing) o configuraciones de sandbox por agente. Si
    quiere que un repositorio sea el directorio de trabajo predeterminado, apunte el
    `workspace` de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantenga el
    espacio de trabajo separado a menos que desee intencionalmente que el agente trabaje dentro de él.

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

  <Accordion title="Estoy en modo remoto: ¿dónde está el almacén de sesiones?">
    El estado de la sesión pertenece al **host de la puerta de enlace**. Si está en modo remoto, el almacén de sesiones que le importa está en la máquina remota, no en su computadora portátil local. Consulte [Gestión de sesiones](/es/concepts/session).
  </Accordion>
</AccordionGroup>

## Conceptos básicos de configuración

<AccordionGroup>
  <Accordion title="¿Qué formato tiene la configuración? ¿Dónde está?">
    OpenClaw lee una configuración opcional de **JSON5** desde `$OPENCLAW_CONFIG_PATH` (predeterminado: `~/.openclaw/openclaw.json`):

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si falta el archivo, utiliza valores predeterminados relativamente seguros (incluido un espacio de trabajo predeterminado de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='Configuré gateway.bind: "lan" (o "tailnet") y ahora nada escucha / la interfaz dice no autorizado'>
    Los enlaces no de bucle (non-loopback) **requieren autenticación**. Configure `gateway.auth.mode` + `gateway.auth.token` (o use `OPENCLAW_GATEWAY_TOKEN`).

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

    - `gateway.remote.token` / `.password` **no** habilitan la autenticación de la puerta de enlace local por sí mismos.
    - Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está establecido.
    - Si `gateway.auth.token` / `gateway.auth.password` están configurados explícitamente mediante SecretRef y no se resuelven, la resolución falla de forma cerrada (sin enmascaramiento de alternativa remota).
    - La interfaz de usuario de Control se autentica a través de `connect.params.auth.token` (almacenado en la configuración de la aplicación/interfaz). Evite poner tokens en las URL.

  </Accordion>

  <Accordion title="¿Por qué necesito un token en localhost ahora?">
    OpenClaw aplica la autenticación por token de forma predeterminada, incluido el bucle local (loopback). Si no se configura ningún token, el inicio de la puerta de enlace genera uno automáticamente y lo guarda en `gateway.auth.token`, por lo que **los clientes WS locales deben autenticarse**. Esto bloquea que otros procesos locales llamen a la puerta de enlace.

    Si **realmente** desea un bucle local abierto, establezca `gateway.auth.mode: "none"` explícitamente en su configuración. Doctor puede generar un token para usted en cualquier momento: `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="¿Tengo que reiniciar después de cambiar la configuración?">
    La puerta de enlace supervisa la configuración y admite la recarga en caliente (hot-reload):

    - `gateway.reload.mode: "hybrid"` (predeterminado): aplica cambios seguros en caliente, reinicia para los críticos
    - `hot`, `restart`, `off` también son compatibles

  </Accordion>

  <Accordion title="¿Cómo desactivo las frases ingeniosas de la CLI?">
    Configure `cli.banner.taglineMode` en la configuración:

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`: oculta el texto de la frase pero mantiene la línea del título/versión del banner.
    - `default`: usa `All your chats, one OpenClaw.` cada vez.
    - `random`: frases ingeniosas/temporales rotativas (comportamiento predeterminado).
    - Si no desea ningún banner, establezca la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="¿Cómo habilito la búsqueda web (y la obtención web)?">
    `web_fetch` funciona sin una clave API. `web_search` requiere una clave para su
    proveedor seleccionado (Brave, Gemini, Grok, Kimi o Perplexity).
    **Recomendado:** ejecute `openclaw configure --section web` y elija un proveedor.
    Alternativas de entorno:

    - Brave: `BRAVE_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`

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
          },
        },
      },
    }
    ```

    La configuración de búsqueda web específica del proveedor ahora se encuentra en `plugins.entries.<plugin>.config.webSearch.*`.
    Las rutas de proveedor heredadas `tools.web.search.*` todavía se cargan temporalmente por compatibilidad, pero no se deben usar para configuraciones nuevas.

    Notas:

    - Si usa listas de permitidos, agregue `web_search`/`web_fetch` o `group:web`.
    - `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
    - Los demonios leen las variables de entorno de `~/.openclaw/.env` (o del entorno del servicio).

    Documentación: [Herramientas web](/es/tools/web).

  </Accordion>

  <Accordion title="config.apply borró mi configuración. ¿Cómo me recupero y evito esto?">
    `config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo
    lo demás se elimina.

    Recuperar:

    - Restaura desde una copia de seguridad (git o una `~/.openclaw/openclaw.json` copiada).
    - Si no tienes copia de seguridad, vuelve a ejecutar `openclaw doctor` y reconfigura canales/modelos.
    - Si esto fue inesperado, reporta un error e incluye tu última configuración conocida o cualquier copia de seguridad.
    - Un agente de codificación local a menudo puede reconstruir una configuración funcional desde los registros o el historial.

    Evitarlo:

    - Usa `openclaw config set` para cambios pequeños.
    - Usa `openclaw configure` para ediciones interactivas.

    Documentación: [Config](/es/cli/config), [Configure](/es/cli/configure), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Cómo ejecuto un Gateway central con trabajadores especializados en varios dispositivos?">
    El patrón común es **un Gateway** (por ejemplo, Raspberry Pi) más **nodos** y **agentes**:

    - **Gateway (central):** posee canales (Signal/WhatsApp), enrutamiento y sesiones.
    - **Nodos (dispositivos):** Mac/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
    - **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (por ejemplo, "operaciones Hetzner", "datos personales").
    - **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando deseas paralelismo.
    - **TUI:** conéctate al Gateway y cambia entre agentes/sesiones.

    Documentación: [Nodes](/es/nodes), [Remote access](/es/gateway/remote), [Multi-Agent Routing](/es/concepts/multi-agent), [Sub-agents](/es/tools/subagents), [TUI](/es/web/tui).

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

    El valor predeterminado es `false` (con interfaz gráfica). El modo headless es más probable que active comprobaciones anti-bot en algunos sitios. Consulte [Navegador](/es/tools/browser).

    El modo headless utiliza el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias son:

    - No hay ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
    - Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
      Por ejemplo, X/Twitter a menudo bloquea sesiones headless.

  </Accordion>

  <Accordion title="¿Cómo uso Brave para el control del navegador?">
    Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie el Gateway.
    Vea los ejemplos completos de configuración en [Navegador](/es/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways y nodos remotos

<AccordionGroup>
  <Accordion title="¿Cómo se propagan los comandos entre Telegram, el gateway y los nodos?">
    Los mensajes de Telegram son manejados por el **gateway**. El gateway ejecuta el agente y
    solo luego llama a los nodos a través del **WebSocket del Gateway** cuando se necesita una herramienta de nodo:

    Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

    Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

  </Accordion>

  <Accordion title="¿Cómo puede mi agente acceder a mi ordenador si el Gateway se aloja de forma remota?">
    Respuesta corta: **empareja tu ordenador como un nodo**. El Gateway se ejecuta en otro lugar, pero puede
    invocar herramientas `node.*` (pantalla, cámara, sistema) en tu máquina local a través del WebSocket del Gateway.

    Configuración típica:

    1. Ejecuta el Gateway en el host activo (VPS/servidor doméstico).
    2. Pon el host del Gateway y tu ordenador en la misma tailnet.
    3. Asegúrate de que el WS del Gateway sea accesible (tailnet bind o túnel SSH).
    4. Abre la aplicación de macOS localmente y conéctate en modo **Remoto a través de SSH** (o tailnet directa)
       para que pueda registrarse como un nodo.
    5. Aprueba el nodo en el Gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    No se requiere ningún puente TCP separado; los nodos se conectan a través del WebSocket del Gateway.

    Recordatorio de seguridad: emparejar un nodo macOS permite `system.run` en esa máquina. Solo
    empareja dispositivos en los que confíes y revisa [Seguridad](/es/gateway/security).

    Documentación: [Nodos](/es/nodes), [Protocolo Gateway](/es/gateway/protocol), [Modo remoto macOS](/es/platforms/mac/remote), [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="Tailscale está conectado pero no recibo respuestas. ¿Qué hago?">
    Comprueba lo básico:

    - El Gateway se está ejecutando: `openclaw gateway status`
    - Estado del Gateway: `openclaw status`
    - Estado del canal: `openclaw channels status`

    Luego verifica la autenticación y el enrutamiento:

    - Si usas Tailscale Serve, asegúrate de que `gateway.auth.allowTailscale` esté configurado correctamente.
    - Si te conectas a través de un túnel SSH, confirma que el túnel local esté activo y apunte al puerto correcto.
    - Confirma que tus listas de permitidos (DM o grupo) incluyen tu cuenta.

    Documentación: [Tailscale](/es/gateway/tailscale), [Acceso remoto](/es/gateway/remote), [Canales](/es/channels).

  </Accordion>

  <Accordion title="¿Pueden comunicarse entre sí dos instancias de OpenClaw (local + VPS)?">
    Sí. No hay un puente "bot-to-bot" integrado, pero puedes configurarlo de algunas
    formas fiables:

    **Lo más sencillo:** usa un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
    Haz que el Bot A envíe un mensaje al Bot B y luego deja que el Bot B responda como de costumbre.

    **Puente CLI (genérico):** ejecuta un script que llame al otro Gateway con
    `openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
    escuche. Si un bot está en un VPS remoto, apunta tu CLI a ese Gateway remoto
    a través de SSH/Tailscale (consulta [Acceso remoto](/es/gateway/remote)).

    Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar el Gateway de destino):

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Consejo: añade una medida de seguridad para que los dos bots no entren en un bucle infinito (solo menciones, listas de permitidos
    de canales o una regla de "no responder a mensajes de bots").

    Documentación: [Acceso remoto](/es/gateway/remote), [Agent CLI](/es/cli/agent), [Agent send](/es/tools/agent-send).

  </Accordion>

  <Accordion title="¿Necesito VPS separados para múltiples agentes?">
    No. Un Gateway puede alojar múltiples agentes, cada uno con su propio espacio de trabajo, valores predeterminados de modelo
    y enrutamiento. Esa es la configuración normal y es mucho más barata y sencilla que ejecutar
    un VPS por agente.

    Usa VPS separados solo cuando necesites un aislamiento estricto (límites de seguridad) o configuraciones
    muy diferentes que no quieras compartir. De lo contrario, mantén un Gateway y
    usa múltiples agentes o sub-agentes.

  </Accordion>

  <Accordion title="¿Hay algún beneficio en usar un nodo en mi laptop personal en lugar de SSH desde un VPS?">
    Sí: los nodos son la forma principal de alcanzar tu laptop desde un Gateway remoto y desbloquean más que el acceso a la shell. El Gateway se ejecuta en macOS/Linux (Windows a través de WSL2) y es liviano (un VPS pequeño o una caja clase Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración común es un host siempre encendido más tu laptop como nodo.

    - **No se requiere SSH entrante.** Los nodos se conectan al WebSocket del Gateway y usan el emparejamiento de dispositivos.
    - **Controles de ejecución más seguros.** `system.run` está restringido por listas de aprobación/aprobaciones de nodos en esa laptop.
    - **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
    - **Automatización del navegador local.** Mantén el Gateway en un VPS, pero ejecuta Chrome localmente a través de un host de nodo en la laptop, o conéctate al Chrome local en el host vía Chrome MCP.

    SSH está bien para el acceso ad-hoc a la shell, pero los nodos son más simples para flujos de trabajo continuos de agentes y automatización de dispositivos.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Los nodos ejecutan un servicio de gateway?">
    No. Solo se debe ejecutar **un gateway** por host, a menos que intencionalmente ejecute perfiles aislados (ver [Múltiples gateways](/es/gateway/multiple-gateways)). Los nodos son periféricos que se conectan al gateway (nodos iOS/Android, o modo "nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin cabeza y control por CLI, consulte [CLI de host de nodo](/es/cli/node).

    Se requiere un reinicio completo para los cambios de `gateway`, `discovery` y `canvasHost`.

  </Accordion>

<Accordion title="¿Hay una forma de API / RPC para aplicar la configuración?">
  Sí. `config.apply` valida + escribe la configuración completa y reinicia el Gateway como parte de
  la operación.
</Accordion>

  <Accordion title="Configuración mínima sensata para una primera instalación">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Esto configura tu espacio de trabajo y restringe quién puede activar el bot.

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

    Si quieres la interfaz de usuario de control (Control UI) sin SSH, usa Tailscale Serve en el VPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Esto mantiene el enlazado del gateway a loopback y expone HTTPS a través de Tailscale. Consulta [Tailscale](/es/gateway/tailscale).

  </Accordion>

  <Accordion title="¿Cómo conecto un nodo Mac a un Gateway remoto (Tailscale Serve)?">
    Serve expone la **Interfaz de usuario de control del Gateway + WS**. Los nodos se conectan a través del mismo punto final del Gateway WS.

    Configuración recomendada:

    1. **Asegúrate de que el VPS y el Mac estén en la misma tailnet**.
    2. **Usa la aplicación de macOS en modo Remoto** (el destino SSH puede ser el nombre de host de la tailnet).
       La aplicación hará un túnel del puerto del Gateway y se conectará como un nodo.
    3. **Aprobar el nodo** en el gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentación: [Protocolo del Gateway](/es/gateway/protocol), [Descubrimiento](/es/gateway/discovery), [modo remoto de macOS](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Debo instalar en un segundo portátil o simplemente agregar un nodo?">
    Si solo necesitas **herramientas locales** (pantalla/cámara/exec) en el segundo portátil, agrégalo como un
    **nodo**. Eso mantiene una sola Gateway y evita configuración duplicada. Las herramientas de nodo local son
    actualmente solo para macOS, pero planeamos extenderlas a otros sistemas operativos.

    Instala una segunda Gateway solo cuando necesites **aislamiento estricto** o dos bots completamente separados.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Múltiples gateways](/es/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables de entorno y carga de .env

<AccordionGroup>
  <Accordion title="¿Cómo carga OpenClaw las variables de entorno?">
    OpenClaw lee las variables de entorno del proceso principal (shell, launchd/systemd, CI, etc.) y adicionalmente carga:

    - `.env` desde el directorio de trabajo actual
    - un `.env` de respaldo global desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

    Ningún archivo `.env` anula las variables de entorno existentes.

    También puedes definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consulta [/environment](/es/help/environment) para ver la precedencia completa y las fuentes.

  </Accordion>

  <Accordion title="Inicié la Gateway a través del servicio y mis variables de entorno desaparecieron. ¿Qué hago ahora?">
    Dos soluciones comunes:

    1. Pon las claves faltantes en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de tu shell.
    2. Habilita la importación del shell (comodidad opcional):

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

    Esto ejecuta tu shell de inicio de sesión e importa solo las claves esperadas faltantes (nunca anula). Equivalentes de variables de entorno:
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='Establecí COPILOT_GITHUB_TOKEN, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?'>
    `openclaw models status` indica si la **importación del entorno de shell** está habilitada. "Shell env: off"
    **no** significa que falten tus variables de entorno; solo significa que OpenClaw no cargará
    tu shell de inicio de sesión automáticamente.

    Si el Gateway se ejecuta como servicio (launchd/systemd), no heredará tu entorno
    de shell. Soluciónalo haciendo una de estas cosas:

    1. Pon el token en `~/.openclaw/.env`:

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. O habilita la importación del shell (`env.shellEnv.enabled: true`).
    3. O agrégalo a tu bloque de configuración `env` (solo aplica si falta).

    Luego reinicia el gateway y verifica de nuevo:

    ```bash
    openclaw models status
    ```

    Los tokens de Copilot se leen desde `COPILOT_GITHUB_TOKEN` (también `GH_TOKEN` / `GITHUB_TOKEN`).
    Consulta [/concepts/model-providers](/es/concepts/model-providers) y [/environment](/es/help/environment).

  </Accordion>
</AccordionGroup>

## Sesiones y múltiples chats

<AccordionGroup>
  <Accordion title="¿Cómo inicio una conversación nueva?">
    Envía `/new` o `/reset` como mensaje independiente. Consulta [Gestión de sesiones](/es/concepts/session).
  </Accordion>

  <Accordion title="¿Las sesiones se restablecen automáticamente si nunca envío /new?">
    Sí. Las sesiones expiran después de `session.idleMinutes` (por defecto **60**). El **siguiente**
    mensaje inicia un id de sesión nuevo para esa clave de chat. Esto no borra
    las transcripciones; solo inicia una sesión nueva.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="¿Existe alguna forma de crear un equipo de instancias de OpenClaw (un CEO y muchos agentes)?">
    Sí, a través del **enrutamiento multi-agente** y **sub-agentes**. Puedes crear un agente
    coordinador y varios agentes trabajadores con sus propios espacios de trabajo y modelos.

    Dicho esto, esto se ve mejor como un **experimento divertido**. Consume muchos tokens y a menudo
    es menos eficiente que usar un bot con sesiones separadas. El modelo típico que
    imaginamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
    bot también puede generar sub-agentes cuando sea necesario.

    Documentación: [Enrutamiento multi-agente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [CLI de Agents](/es/cli/agents).

  </Accordion>

  <Accordion title="¿Por qué se truncó el contexto a mitad de la tarea? ¿Cómo puedo evitarlo?">
    El contexto de la sesión está limitado por la ventana del modelo. Chats largos, resultados de herramientas grandes o muchos
    archivos pueden activar la compactación o el truncamiento.

    Lo que ayuda:

    - Pide al bot que resuma el estado actual y lo escriba en un archivo.
    - Usa `/compact` antes de tareas largas, y `/new` al cambiar de tema.
    - Mantén el contexto importante en el espacio de trabajo y pide al bot que lo lea de nuevo.
    - Usa sub-agentes para trabajos largos o paralelos para que el chat principal se mantenga más pequeño.
    - Elige un modelo con una ventana de contexto más grande si esto sucede a menudo.

  </Accordion>

  <Accordion title="¿Cómo restablezco completamente OpenClaw pero lo mantengo instalado?">
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

    - La incorporación también ofrece **Restablecer** si ve una configuración existente. Consulta [Incorporación (CLI)](/es/start/wizard).
    - Si usaste perfiles (`--profile` / `OPENCLAW_PROFILE`), restablece cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
    - Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo desarrollo; borra la configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

  </Accordion>

  <Accordion title='Estoy obteniendo errores de "contexto demasiado grande" - ¿cómo restablezco o compacto?'>
    Use uno de estos:

    - **Compactar** (mantiene la conversación pero resume los turnos anteriores):

      ```
      /compact
      ```

      o `/compact <instructions>` para guiar el resumen.

    - **Restablecer** (ID de sesión nuevo para la misma clave de chat):

      ```
      /new
      /reset
      ```

    Si sigue sucediendo:

    - Active o ajuste el **session pruning** (`agents.defaults.contextPruning`) para recortar el resultado antiguo de las herramientas.
    - Use un modelo con una ventana de contexto más grande.

    Documentación: [Compactación](/es/concepts/compaction), [Session pruning](/es/concepts/session-pruning), [Gestión de sesiones](/es/concepts/session).

  </Accordion>

  <Accordion title='¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?'>
    Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el `input` requerido. Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos o un cambio de herramienta/esquema).

    Solución: inicie una sesión nueva con `/new` (mensaje independiente).

  </Accordion>

  <Accordion title="¿Por qué recibo mensajes de latido (heartbeat) cada 30 minutos?">
    Los latidos se ejecutan cada **30m** por defecto. Ajuste o desactívelos:

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

    Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para guardar llamadas a la API.
    Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

    Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Latido](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title='¿Necesito añadir una "cuenta de bot" a un grupo de WhatsApp?'>
    No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
    Por defecto, las respuestas grupales están bloqueadas hasta que permitas los remitentes (`groupPolicy: "allowlist"`).

    Si deseas que solo **tú** puedas activar las respuestas grupales:

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
    Opción 1 (la más rápida): sigue los registros (tail logs) y envía un mensaje de prueba en el grupo:

    ```bash
    openclaw logs --follow --json
    ```

    Busca `chatId` (o `from`) que termine en `@g.us`, por ejemplo:
    `1234567890-1234567890@g.us`.

    Opción 2 (si ya está configurado/en la lista permitida): lista los grupos desde la configuración:

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Documentación: [WhatsApp](/es/channels/whatsapp), [Directorio](/es/cli/directory), [Registros](/es/cli/logs).

  </Accordion>

  <Accordion title="¿Por qué OpenClaw no responde en un grupo?">
    Dos causas comunes:

    - El filtrado de menciones está activado (por defecto). Debes @mencionar al bot (o que coincida con `mentionPatterns`).
    - Configuraste `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista permitida.

    Consulta [Grupos](/es/channels/groups) y [Mensajes grupales](/es/channels/group-messages).

  </Accordion>

<Accordion title="¿Los grupos/hilos comparten el contexto con los MD?">
  Por defecto, los chats directos se agrupan en la sesión principal. Los grupos/canales tienen sus
  propias claves de sesión, y los temas de Telegram / los hilos de Discord son sesiones separadas.
  Consulta [Grupos](/es/channels/groups) y [Mensajes grupales](/es/channels/group-messages).
</Accordion>

  <Accordion title="¿Cuántos espacios de trabajo y agentes puedo crear?">
    No hay límites estrictos. Docenas (incluso cientos) están bien, pero vigile:

    - **Crecimiento del disco:** las sesiones + transcripciones viven en `~/.openclaw/agents/<agentId>/sessions/`.
    - **Costo de tokens:** más agentes significa más uso concurrente del modelo.
    - **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

    Consejos:

    - Mantenga un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
    - Pode sesiones antiguas (elimine entradas JSONL o de almacenamiento) si el disco crece.
    - Use `openclaw doctor` para detectar espacios de trabajo extraviados y discordancias de perfil.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debo configurarlo?">
    Sí. Use **Enrutamiento Multiagente** para ejecutar múltiples agentes aislados y enrutar mensajes entrantes por
    canal/cuenta/par. Slack es compatible como canal y puede vincularse a agentes específicos.

    El acceso al navegador es potente pero no "hacer cualquier cosa que un humano pueda"; anti-bot, CAPTCHAs y MFA aún pueden
    bloquear la automatización. Para el control del navegador más confiable, use Chrome MCP local en el host,
    o use CDP en la máquina que realmente ejecuta el navegador.

    Configuración recomendada:

    - Host de puerta de enlace siempre activo (VPS/Mac mini).
    - Un agente por rol (vinculaciones).
    - Canal(es) de Slack vinculados a esos agentes.
    - Navegador local vía Chrome MCP o un nodo cuando sea necesario.

    Documentación: [Enrutamiento Multiagente](/es/concepts/multi-agent), [Slack](/es/channels/slack),
    [Navegador](/es/tools/browser), [Nodos](/es/nodes).

  </Accordion>
</AccordionGroup>

## Modelos: valores predeterminados, selección, alias, cambio

<AccordionGroup>
  <Accordion title='¿Cuál es el "modelo predeterminado"?'>
    El modelo predeterminado de OpenClaw es lo que establezca como:

    ```
    agents.defaults.model.primary
    ```

    Los modelos se referencian como `provider/model` (ejemplo: `anthropic/claude-opus-4-6`). Si omite el proveedor, OpenClaw actualmente asume `anthropic` como respaldo de desuso temporal, pero aún debe establecer `provider/model` **explícitamente**.

  </Accordion>

  <Accordion title="¿Qué modelo recomiendas?">
    **Predeterminado recomendado:** usa el modelo más potente de la última generación disponible en tu pila de proveedores.
    **Para agentes con herramientas o entradas no confiables:** da prioridad a la potencia del modelo sobre el costo.
    **Para chat rutinario de bajo riesgo:** usa modelos de respaldo más económicos y enruta según el rol del agente.

    MiniMax tiene su propia documentación: [MiniMax](/es/providers/minimax) y
    [Modelos locales](/es/gateway/local-models).

    Regla general: usa el **mejor modelo que te puedas permitir** para trabajos de alto riesgo, y un modelo
    más económico para chat rutinario o resúmenes. Puedes enrutar modelos por agente y usar sub-agentes para
    paralelizar tareas largas (cada sub-agente consume tokens). Consulta [Modelos](/es/concepts/models) y
    [Sub-agentes](/es/tools/subagents).

    Advertencia fuerte: los modelos más débiles o sobre-cuantizados son más vulnerables a la inyección
    de prompts y comportamientos inseguros. Consulta [Seguridad](/es/gateway/security).

    Más contexto: [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelos sin borrar mi configuración?">
    Usa **comandos de modelo** o edita solo los campos del **modelo**. Evita reemplazos completos de la configuración.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - edita `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evita `config.apply` con un objeto parcial a menos que pretendas reemplazar toda la configuración.
    Si sobrescribiste la configuración, restáurala desde una copia de seguridad o vuelve a ejecutar `openclaw doctor` para repararla.

    Documentación: [Modelos](/es/concepts/models), [Configurar](/es/cli/configure), [Configuración](/es/cli/config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la opción más fácil para modelos locales.

    Configuración más rápida:

    1. Instala Ollama desde `https://ollama.com/download`
    2. Descarga un modelo local como `ollama pull glm-4.7-flash`
    3. Si también quieres Ollama Cloud, ejecuta `ollama signin`
    4. Ejecuta `openclaw onboard` y elige `Ollama`
    5. Selecciona `Local` o `Cloud + Local`

    Notas:

    - `Cloud + Local` te proporciona modelos de Ollama Cloud más tus modelos locales de Ollama
    - los modelos en la nube como `kimi-k2.5:cloud` no necesitan una descarga local
    - para cambiar manualmente, usa `openclaw models list` y `openclaw models set ollama/<model>`

    Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la
    inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas.
    Si aún quieres modelos pequeños, activa el sandboxing y listas de permisos estrictas para las herramientas.

    Documentación: [Ollama](/es/providers/ollama), [Modelos locales](/es/gateway/local-models),
    [Proveedores de modelos](/es/concepts/model-providers), [Seguridad](/es/gateway/security),
    [Sandboxing](/es/gateway/sandboxing).

  </Accordion>

<Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
  - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija
  de proveedor. - Consulta la configuración de tiempo de ejecución actual en cada puerta de enlace
  con `openclaw models status`. - Para agentes sensibles a la seguridad o con herramientas
  habilitadas, utiliza el modelo más fuerte de la última generación disponible.
</Accordion>

  <Accordion title="¿Cómo cambio de modelos al vuelo (sin reiniciar)?">
    Use el comando `/model` como un mensaje independiente:

    ```
    /model sonnet
    /model haiku
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    ```

    Puede listar los modelos disponibles con `/model`, `/model list`, o `/model status`.

    `/model` (y `/model list`) muestra un selector numerado compacto. Seleccione por número:

    ```
    /model 3
    ```

    También puede forzar un perfil de autenticación específico para el proveedor (por sesión):

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Consejo: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está usando y qué perfil de autenticación se intentará a continuación.
    También muestra el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

    **¿Cómo desanclar un perfil que configuré con @profile?**

    Ejecute `/model` de nuevo **sin** el sufijo `@profile`:

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
    Use `/model status` para confirmar qué perfil de autenticación está activo.

  </Accordion>

  <Accordion title="¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programar?">
    Sí. Configure uno como predeterminado y cambie según sea necesario:

    - **Cambio rápido (por sesión):** `/model gpt-5.2` para tareas diarias, `/model openai-codex/gpt-5.4` para programar con Codex OAuth.
    - **Predeterminado + cambio:** establezca `agents.defaults.model.primary` en `openai/gpt-5.2`, luego cambie a `openai-codex/gpt-5.4` cuando programe (o viceversa).
    - **Sub-agentes:** enrute las tareas de programación a sub-agentes con un modelo predeterminado diferente.

    Consulte [Modelos](/es/concepts/models) y [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title='¿Por qué veo "Model ... is not allowed" y luego no hay respuesta?'>
    Si `agents.defaults.models` está configurado, se convierte en la **lista de permitidos** para `/model` y cualquier
    anulación de sesión. Elegir un modelo que no esté en esa lista devuelve:

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Ese error se devuelve **en lugar de** una respuesta normal. Solución: añadir el modelo a
    `agents.defaults.models`, eliminar la lista de permitidos o elegir un modelo de `/model list`.

  </Accordion>

  <Accordion title='¿Por qué veo "Unknown model: minimax/MiniMax-M2.7"?'>
    Esto significa que **el proveedor no está configurado** (no se encontró ninguna configuración del proveedor MiniMax ni perfil de autenticación),
    por lo que no se puede resolver el modelo.

    Lista de verificación de solución:

    1. Actualice a una versión actual de OpenClaw (o ejecute desde el código fuente `main`) y luego reinicie el gateway.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista una clave de API de MiniMax
       en los perfiles env/auth para que el proveedor pueda ser inyectado.
    3. Use el id exacto del modelo (distingue mayúsculas y minúsculas): `minimax/MiniMax-M2.7`,
       `minimax/MiniMax-M2.7-highspeed`, `minimax/MiniMax-M2.5`, o
       `minimax/MiniMax-M2.5-highspeed`.
    4. Ejecute:

       ```bash
       openclaw models list
       ```

       y elija de la lista (o `/model list` en el chat).

    Consulte [MiniMax](/es/providers/minimax) y [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?">
    Sí. Usa **MiniMax como predeterminado** y cambia los modelos **por sesión** cuando sea necesario.
    Los respaldos son para **errores**, no para "tareas difíciles", así que usa `/model` o un agente separado.

    **Opción A: cambiar por sesión**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.2": { alias: "gpt" },
          },
        },
      },
    }
    ```

    Entonces:

    ```
    /model gpt
    ```

    **Opción B: agentes separados**

    - Agente A predeterminado: MiniMax
    - Agente B predeterminado: OpenAI
    - Enruta por agente o usa `/agent` para cambiar

    Documentación: [Modelos](/es/concepts/models), [Enrutamiento multiagente](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

  </Accordion>

  <Accordion title="¿Son opus / sonnet / gpt atajos integrados?">
    Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    Si estableces tu propio alias con el mismo nombre, tu valor prevalecerá.

  </Accordion>

  <Accordion title="¿Cómo defino/anulo los atajos de modelo (alias)?">
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

    Si haces referencia a un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (p. ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave de API para el proveedor después de añadir un nuevo agente**

    Esto generalmente significa que el **nuevo agente** tiene un almacenamiento de autenticación vacío. La autenticación es por agente y se almacena en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Opciones de solución:

    - Ejecuta `openclaw agents add <id>` y configura la autenticación durante el asistente.
    - O copia `auth-profiles.json` del `agentDir` del agente principal al `agentDir` del nuevo agente.

    **No** reutilices `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

  </Accordion>
</AccordionGroup>

## Conmutación por error de modelos (failover) y "Todos los modelos fallaron"

<AccordionGroup>
  <Accordion title="¿Cómo funciona el conmutación por error?">
    El conmutación por error ocurre en dos etapas:

    1. **Rotación de perfil de autenticación** dentro del mismo proveedor.
    2. **Respaldo de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican tiempos de espera a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene limitaciones de tasa o fallas temporales.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó utilizar el ID del perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

    **Lista de verificación de solución:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno está cargada por el Gateway**
      - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta el Gateway a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones multiagente implican que puede haber varios archivos `auth-profiles.json`.
    - **Verificación del estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de solución para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway
    no puede encontrarlo en su almacén de autenticación.

    - **Usar un token de configuración**
      - Ejecute `claude setup-token`, luego péguelo con `openclaw models auth setup-token --provider anthropic`.
      - Si el token se creó en otra máquina, use `openclaw models auth paste-token --provider anthropic`.
    - **Si desea utilizar una clave API en su lugar**
      - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de la puerta de enlace**.
      - Borre cualquier orden fija que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando los comandos en el host de la puerta de enlace**
      - En modo remoto, los perfiles de autenticación residen en la máquina de la puerta de enlace, no en su portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó usar Google Gemini y falló?">
    Si la configuración de su modelo incluye Google Gemini como alternativa (o si cambió a un alias de Gemini), OpenClaw lo intentará durante la conmutación por error del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

    Solución: proporcione la autenticación de Google, o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que la conmutación por error no se enrute allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Google Antigravity)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo provenientes de
    un flujo abortado/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Claude en Google Antigravity. Si aún aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

  </Accordion>
</AccordionGroup>

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/es/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones multicuenta)

<AccordionGroup>
  <Accordion title="¿Qué es un perfil de autenticación?">
    Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles residen en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="¿Cuáles son los ID de perfil típicos?">
    OpenClaw utiliza ID con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe identidad de correo electrónico)
    - `anthropic:<email>` para identidades OAuth
    - ID personalizados que elija (por ejemplo, `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se prueba primero?">
    Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; mapea IDs a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un breve período de **enfriamiento** (cooldown) (límites de tasa/timeouts/fallos de autenticación) o en un estado **deshabilitado** más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

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

  </Accordion>

  <Accordion title="OAuth vs. clave de API: ¿cuál es la diferencia?">
    OpenClaw admite ambos:

    - **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponda).
    - **Las claves de API** utilizan la facturación por token.

    El asistente admite explícitamente el token de configuración de Anthropic y OAuth de OpenAI Codex, y puede almacenar claves de API para usted.

  </Accordion>
</AccordionGroup>

## Puerta de enlace (Gateway): puertos, "ya se está ejecutando" y modo remoto

<AccordionGroup>
  <Accordion title="¿Qué puerto utiliza la puerta de enlace (Gateway)?">
    `gateway.port` controla el único puerto multiplexado para WebSocket + HTTP (Interfaz de usuario de control, enlaces, etc.).

    Precedencia:

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='¿Por qué el estado de la puerta de enlace de openclaw dice "Runtime: running" (Tiempo de ejecución: en ejecución) pero "RPC probe: failed" (Sonda RPC: fallida)?'>
    Porque "running" es la vista del **supervisor** (launchd/systemd/schtasks). La sonda RPC es la CLI conectándose realmente al WebSocket de la puerta de enlace y llamando a `status`.

    Use `openclaw gateway status` y confíe en estas líneas:

    - `Probe target:` (la URL que la sonda usó realmente)
    - `Listening:` (lo que realmente está vinculado al puerto)
    - `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

  </Accordion>

  <Accordion title='¿Por qué el estado del gateway de openclaw muestra "Config (cli)" y "Config (service)" diferentes?'>
    Estás editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

    Solución:

    ```bash
    openclaw gateway install --force
    ```

    Ejecuta eso desde el mismo `--profile` / entorno que quieras que use el servicio.

  </Accordion>

  <Accordion title='¿Qué significa "another gateway instance is already listening"?'>
    OpenClaw impone un bloqueo de tiempo de ejecución vinculando el escucha de WebSocket inmediatamente al inicio (por defecto `ws://127.0.0.1:18789`). Si la vinculación falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

    Solución: detén la otra instancia, libera el puerto o ejecuta con `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?">
    Establece `gateway.mode: "remote"` y apunta a una URL remota de WebSocket, opcionalmente con un token/contraseña:

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

    - `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasas la marca de anulación).
    - La aplicación de macOS vigila el archivo de configuración y cambia los modos en vivo cuando estos valores cambian.

  </Accordion>

  <Accordion title='La interfaz de control dice "unauthorized" (o sigue reconectando). ¿Qué hacer?'>
    Su puerta de enlace (gateway) se está ejecutando con la autenticación habilitada (`gateway.auth.*`), pero la interfaz no está enviando el token/contraseña correspondiente.

    Datos (desde el código):

    - La interfaz de control mantiene el token en `sessionStorage` para la sesión actual de la pestaña del navegador y la URL de la puerta de enlace seleccionada, por lo que las actualizaciones en la misma pestaña siguen funcionando sin restaurar la persistencia del token de localStorage a largo plazo.
    - En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo en caché cuando la puerta de enlace devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

    Solución:

    - Lo más rápido: `openclaw dashboard` (imprime + copia la URL del panel, intenta abrirla; muestra una sugerencia SSH si es sin interfaz gráfica).
    - Si aún no tiene un token: `openclaw doctor --generate-gateway-token`.
    - Si es remoto, abra un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`.
    - Configure `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en el host de la puerta de enlace.
    - En la configuración de la interfaz de control, pegue el mismo token.
    - Si la discordancia persiste después del reintento, rote/vuelva a aprobar el token del dispositivo emparejado:
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - ¿Sigues atascado? Ejecute `openclaw status --all` y siga [Solución de problemas](/es/gateway/troubleshooting). Consulte [Panel de control](/es/web/dashboard) para obtener detalles de autenticación.

  </Accordion>

  <Accordion title="Configuré gateway.bind tailnet pero no puede vincular y nada escucha">
    `tailnet` bind elige una IP de Tailscale de sus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que vincularse.

    Solución:

    - Inicie Tailscale en ese host (para que tenga una dirección 100.x), o
    - Cambie a `gateway.bind: "loopback"` / `"lan"`.

    Nota: `tailnet` es explícito. `auto` prefiere el bucle local; use `gateway.bind: "tailnet"` cuando desee un vínculo solo para tailnet.

  </Accordion>

  <Accordion title="¿Puedo ejecutar múltiples Gateways en el mismo host?">
    Por lo general no: un solo Gateway puede ejecutar múltiples canales de mensajería y agentes. Use múltiples Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

    Sí, pero debe aislar:

    - `OPENCLAW_CONFIG_PATH` (configuración por instancia)
    - `OPENCLAW_STATE_DIR` (estado por instancia)
    - `agents.defaults.workspace` (aislamiento del espacio de trabajo)
    - `gateway.port` (puertos únicos)

    Configuración rápida (recomendada):

    - Use `openclaw --profile <name> ...` por instancia (crea automáticamente `~/.openclaw-<name>`).
    - Configure un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
    - Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

    Los perfiles también sufijan los nombres de servicio (`ai.openclaw.<profile>`; legado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guía completa: [Multiple gateways](/es/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='¿Qué significa "invalid handshake" / código 1008?'>
    El Gateway es un **servidor WebSocket**, y espera que el primer mensaje sea
    un marco `connect`. Si recibe cualquier otra cosa, cierra la conexión
    con el **código 1008** (violación de política).

    Causas comunes:

    - Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
    - Usó el puerto o la ruta incorrecta.
    - Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud que no es del Gateway.

    Soluciones rápidas:

    1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
    2. No abra el puerto WS en una pestaña normal del navegador.
    3. Si la autenticación está activada, incluya el token/contraseña en el marco `connect`.

    Si está usando la CLI o la TUI, la URL debería verse así:

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Detalles del protocolo: [Gateway protocol](/es/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Registro y depuración

<AccordionGroup>
  <Accordion title="¿Dónde están los registros?">
    Registros de archivo (estructurados):

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Puede establecer una ruta estable mediante `logging.file`. El nivel de registro de archivo se controla mediante `logging.level`. La verbosidad de la consola se controla mediante `--verbose` y `logging.consoleLevel`.

    Seguimiento de registros más rápido:

    ```bash
    openclaw logs --follow
    ```

    Registros de servicio/supervisor (cuando la puerta de enlace se ejecuta a través de launchd/systemd):

    - macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` y `gateway.err.log` (predeterminado: `~/.openclaw/logs/...`; los perfiles usan `~/.openclaw-<profile>/logs/...`)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Consulte [Solución de problemas](/es/gateway/troubleshooting) para obtener más información.

  </Accordion>

  <Accordion title="¿Cómo inicio/detengo/reinicio el servicio Gateway?">
    Utilice los auxiliares de puerta de enlace:

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si ejecuta la puerta de enlace manualmente, `openclaw gateway --force` puede recuperar el puerto. Consulte [Gateway](/es/gateway).

  </Accordion>

  <Accordion title="Cerré mi terminal en Windows: ¿cómo reinicio OpenClaw?">
    Hay **dos modos de instalación en Windows**:

    **1) WSL2 (recomendado):** la puerta de enlace se ejecuta dentro de Linux.

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

    **2) Windows nativo (no recomendado):** la puerta de enlace se ejecuta directamente en Windows.

    Abra PowerShell y ejecute:

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si lo ejecuta manualmente (sin servicio), use:

    ```powershell
    openclaw gateway run
    ```

    Documentación: [Windows (WSL2)](/es/platforms/windows), [Manual de servicio de puerta de enlace](/es/gateway).

  </Accordion>

  <Accordion title="El Gateway está activo pero las respuestas nunca llegan. ¿Qué debería comprobar?">
    Comience con un rápido barrido de salud:

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causas comunes:

    - Autenticación del modelo no cargada en el **host de la puerta de enlace** (compruebe `models status`).
    - Emparejamiento de canal/lista de permitidos bloqueando las respuestas (compruebe la configuración del canal + registros).
    - WebChat/Dashboard está abierto sin el token correcto.

    Si está remoto, confirme que la conexión túnel/Tailscale está activa y que el
    WebSocket del Gateway es accesible.

    Documentación: [Canales](/es/channels), [Solución de problemas](/es/gateway/troubleshooting), [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title='"Desconectado de la puerta de enlace: sin razón" - ¿qué ahora?'>
    Esto generalmente significa que la interfaz de usuario perdió la conexión WebSocket. Compruebe:

    1. ¿Está ejecutándose el Gateway? `openclaw gateway status`
    2. ¿Está saludable el Gateway? `openclaw status`
    3. ¿Tiene la interfaz de usuario el token correcto? `openclaw dashboard`
    4. Si es remoto, ¿está activo el enlace túnel/Tailscale?

    Luego revise los registros:

    ```bash
    openclaw logs --follow
    ```

    Documentación: [Panel de control](/es/web/dashboard), [Acceso remoto](/es/gateway/remote), [Solución de problemas](/es/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Error en setMyCommands de Telegram. ¿Qué debería comprobar?">
    Empiece por los registros y el estado del canal:

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Luego compare el error:

    - `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero aún así es necesario eliminar algunas entradas del menú. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!` o errores de red similares: si está en un VPS o detrás de un proxy, confirme que se permite HTTPS saliente y que el DNS funciona para `api.telegram.org`.

    Si el Gateway es remoto, asegúrese de estar mirando los registros en el host del Gateway.

    Documentación: [Telegram](/es/channels/telegram), [Solución de problemas del canal](/es/channels/troubleshooting).

  </Accordion>

  <Accordion title="La interfaz TUI no muestra ninguna salida. ¿Qué debería comprobar?">
    Primero confirme que el Gateway es accesible y que el agente puede ejecutarse:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal
    de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

    Documentación: [TUI](/es/web/tui), [Comandos de barra diagonal](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo detengo completamente y luego inicio el Gateway?">
    Si instaló el servicio:

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
    Use esto cuando el Gateway se ejecuta en segundo plano como un demonio.

    Si se está ejecutando en primer plano, deténgalo con Ctrl-C y luego:

    ```bash
    openclaw gateway run
    ```

    Documentación: [Manual de servicio del Gateway](/es/gateway).

  </Accordion>

  <Accordion title="Explicación sencilla: reinicio de openclaw gateway vs openclaw gateway">
    - `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
    - `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

    Si instalaste el servicio, usa los comandos de gateway. Usa `openclaw gateway` cuando
    quieras una ejecución única en primer plano.

  </Accordion>

  <Accordion title="Manera más rápida de obtener más detalles cuando algo falla">
    Inicia el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspecciona el archivo de registro para ver los errores de autenticación del canal, enrutamiento del modelo y RPC.
  </Accordion>
</AccordionGroup>

## Medios y archivos adjuntos

<AccordionGroup>
  <Accordion title="Mi skill generó una imagen/PDF, pero no se envió nada">
    Los archivos adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulta [Configuración del asistente OpenClaw](/es/start/openclaw) y [Envío de agente](/es/tools/agent-send).

    Envío por CLI:

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    También verifica:

    - El canal de destino soporta medios salientes y no está bloqueado por listas de permitidos.
    - El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048px).

    Consulta [Imágenes](/es/nodes/images).

  </Accordion>
</AccordionGroup>

## Seguridad y control de acceso

<AccordionGroup>
  <Accordion title="¿Es seguro exponer OpenClaw a MDs entrantes?">
    Trata los MDs entrantes como entrada no confiable. Los valores predeterminados están diseñados para reducir el riesgo:

    - El comportamiento predeterminado en los canales con capacidad de MD es **emparejamiento**:
      - Los remitentes desconocidos reciben un código de emparejamiento; el bot no procesa su mensaje.
      - Aprueba con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Las solicitudes pendientes están limitadas a **3 por canal**; verifica `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
    - Abrir los MDs públicamente requiere opt-in explícito (`dmPolicy: "open"` y lista de permitidos `"*"`).

    Ejecuta `openclaw doctor` para mostrar políticas de MD riesgosas.

  </Accordion>

  <Accordion title="¿La inyección de prompts es solo una preocupación para los bots públicos?">
    No. La inyección de prompts se trata del **contenido no confiable**, no solo de quién puede enviarle un mensaje privado al bot.
    Si su asistente lee contenido externo (búsqueda web/extracción, páginas del navegador, correos electrónicos,
    documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intenten
    secuestrar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

    El mayor riesgo es cuando las herramientas están habilitadas: el modelo puede ser engañado para
    exfiltrar contexto o llamar herramientas en su nombre. Reduzca el radio de explosión mediante:

    - el uso de un agente "lector" de solo lectura o con herramientas deshabilitadas para resumir el contenido no confiable
    - mantener `web_search` / `web_fetch` / `browser` desactivadas para agentes con herramientas habilitadas
    - sandboxing y listas de permitidos (allowlists) estrictas para herramientas

    Detalles: [Security](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Mi bot debe tener su propio correo electrónico, cuenta de GitHub o número de teléfono?">
    Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados
    reduce el radio de explosión si algo sale mal. Esto también facilita la rotación
    de credenciales o la revocación del acceso sin afectar sus cuentas personales.

    Empiece pequeño. Otorgue acceso solo a las herramientas y cuentas que realmente necesita, y amplíelo
    más adelante si es necesario.

    Documentación: [Security](/es/gateway/security), [Pairing](/es/channels/pairing).

  </Accordion>

  <Accordion title="¿Puedo darle autonomía sobre mis mensajes de texto y es eso seguro?">
    **No** recomendamos la autonomía total sobre sus mensajes personales. El patrón más seguro es:

    - Mantener los mensajes privados en **modo de emparejamiento (pairing mode)** o en una lista de permitidos (allowlist) estricta.
    - Usar un **número o cuenta separado** si desea que envíe mensajes en su nombre.
    - Dejar que redacte y luego **aprobar antes de enviar**.

    Si desea experimentar, hágalo en una cuenta dedicada y manténgala aislada. Vea
    [Security](/es/gateway/security).

  </Accordion>

<Accordion title="¿Puedo usar modelos más baratos para tareas de asistente personal?">
  Sí, **si** el agente es solo de chat y la entrada es confiable. Los niveles más pequeños son más
  susceptibles al secuestro de instrucciones, por lo que se deben evitar para agentes con
  herramientas habilitadas o al leer contenido no confiable. Si debe usar un modelo más pequeño,
  bloquee las herramientas y ejecútelas dentro de un entorno sandbox. Consulte
  [Seguridad](/es/gateway/security).
</Accordion>

  <Accordion title="Ejecuté /start en Telegram pero no recibí un código de emparejamiento">
    Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
    `dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

    Revise las solicitudes pendientes:

    ```bash
    openclaw pairing list telegram
    ```

    Si desea acceso inmediato, agregue su id de remitente a la lista blanca o establezca `dmPolicy: "open"`
    para esa cuenta.

  </Accordion>

  <Accordion title="WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?">
    No. La política predeterminada de MD de WhatsApp es **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a envíos explícitos que usted active.

    Apruebe el emparejamiento con:

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Liste las solicitudes pendientes:

    ```bash
    openclaw pairing list whatsapp
    ```

    El asistente de número de teléfono del asistente: se usa para configurar su **lista blanca/propietario** para que se permitan sus propios MD. No se usa para el envío automático. Si ejecuta en su número personal de WhatsApp, use ese número y habilite `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Comandos de chat, cancelación de tareas y "no se detendrá"

<AccordionGroup>
  <Accordion title="¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?">
    La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose** o **reasoning** están activados
    para esa sesión.

    Solución en el chat donde lo veas:

    ```
    /verbose off
    /reasoning off
    ```

    Si sigue siendo ruidoso, revisa la configuración de la sesión en el Control UI y establece verbose
    en **inherit**. También confirma que no estás usando un perfil de bot con `verboseDefault` establecido
    en `on` en la configuración.

    Docs: [Thinking and verbose](/es/tools/thinking), [Security](/es/gateway/security#reasoning-verbose-output-in-groups).

  </Accordion>

  <Accordion title="¿Cómo detengo/cancelo una tarea en ejecución?">
    Envía cualquiera de estos **como un mensaje independiente** (sin barra):

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

    Estos son desencadenantes de aborto (no comandos de barra).

    Para procesos en segundo plano (de la herramienta exec), puedes pedirle al agente que ejecute:

    ```
    process action:kill sessionId:XXX
    ```

    Resumen de comandos de barra: consulta [Slash commands](/es/tools/slash-commands).

    La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista de permitidos.

  </Accordion>

  <Accordion title='¿Cómo envío un mensaje de Discord desde Telegram? ("Cross-context messaging denied")'>
    OpenClaw bloquea la mensajería **entre proveedores** de forma predeterminada. Si una llamada a una herramienta está vinculada
    a Telegram, no enviará a Discord a menos que lo permitas explícitamente.

    Activa la mensajería entre proveedores para el agente:

    ```json5
    {
      agents: {
        defaults: {
          tools: {
            message: {
              crossContext: {
                allowAcrossProviders: true,
                marker: { enabled: true, prefix: "[from {channel}] " },
              },
            },
          },
        },
      },
    }
    ```

    Reinicia la puerta de enlace después de editar la configuración. Si solo quieres esto para un único
    agente, establécelo en `agents.list[].tools.message` en su lugar.

  </Accordion>

  <Accordion title='¿Por qué parece que el bot "ignora" los mensajes rápidos?'>
    El modo de cola controla cómo interactúan los nuevos mensajes con una ejecución en curso. Usa `/queue` para cambiar de modo:

    - `steer` - los nuevos mensajes redirigen la tarea actual
    - `followup` - ejecuta los mensajes uno a uno
    - `collect` - agrupa los mensajes y responde una vez (predeterminado)
    - `steer-backlog` - guía ahora, luego procesa el registro de retraso
    - `interrupt` - aborta la ejecución actual y comienza de nuevo

    Puedes agregar opciones como `debounce:2s cap:25 drop:summarize` para modos de seguimiento.

  </Accordion>
</AccordionGroup>

## Varios

<AccordionGroup>
  <Accordion title="¿Cuál es el modelo predeterminado para Anthropic con una clave de API?">
    En OpenClaw, las credenciales y la selección del modelo son cosas separadas. Establecer
    `ANTHROPIC_API_KEY` (o almacenar una clave de API de Anthropic en perfiles de autenticación)
    habilita la autenticación, pero el modelo predeterminado real es el que configures en
    `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-6` o
    `anthropic/claude-opus-4-6`). Si ves `No credentials found for profile "anthropic:default"`,
    significa que la puerta de enlace no pudo encontrar las credenciales de Anthropic en el
    `auth-profiles.json` esperado para el agente que se está ejecutando.
  </Accordion>
</AccordionGroup>

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión en GitHub](https://github.com/openclaw/openclaw/discussions).

import es from "/components/footer/es.mdx";

<es />
