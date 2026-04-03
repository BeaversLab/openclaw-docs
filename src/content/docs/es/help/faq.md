---
summary: "Preguntas frecuentes sobre la configuración, uso e instalación de OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "Preguntas frecuentes"
---

# Preguntas frecuentes

Respuestas rápidas y solución de problemas más profunda para configuraciones del mundo real (desarrollo local, VPS, multiagente, claves OAuth/API, conmutación por error de modelos). Para el diagnóstico en tiempo de ejecución, consulte [Solución de problemas](/en/gateway/troubleshooting). Para la referencia completa de configuración, consulte [Configuración](/en/gateway/configuration).

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

   Ejecuta comprobaciones de estado de la puerta de enlace + sondas de proveedor (requiere una puerta de enlace accesible). Consulte [Salud](/en/gateway/health).

5. **Ver el último registro**

   ```bash
   openclaw logs --follow
   ```

   Si el RPC está caído, recurra a:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Los registros de archivos están separados de los registros del servicio; consulte [Registro](/en/logging) y [Solución de problemas](/en/gateway/troubleshooting).

6. **Ejecutar el doctor (reparaciones)**

   ```bash
   openclaw doctor
   ```

   Repara/migra el config/estado + ejecuta comprobaciones de estado. Consulte [Doctor](/en/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Pide a la puerta de enlace en ejecución una instantánea completa (solo WS). Consulte [Salud](/en/gateway/health).

## Inicio rápido y configuración de la primera ejecución

<AccordionGroup>
  <Accordion title="Estoy atascado, la forma más rápida de desatascarse">
    Utilice un agente de IA local que pueda **ver su máquina**. Esto es mucho más efectivo que preguntar
    en Discord, porque la mayoría de los casos de "estoy atascado" son **problemas de configuración local o del entorno** que
    los ayudantes remotos no pueden inspeccionar.

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a corregir su configuración
    a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Entrégueles el **checkout completo del código fuente** a través de
    la instalación "hackeable" (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto instala OpenClaw **desde un checkout de git**, por lo que el agente puede leer el código + los documentos y
    razonar sobre la versión exacta que está ejecutando. Siempre puede volver a la versión estable más tarde
    volviendo a ejecutar el instalador sin `--install-method git`.

    Consejo: pida al agente que **planifique y supervise** la solución (paso a paso) y que ejecute solo los
    comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

    Si descubre un error real o una solución, por favor abra un issue en GitHub o envíe un PR:
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Comience con estos comandos (comparta los resultados cuando pida ayuda):

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Lo que hacen:

    - `openclaw status`: instantánea rápida del estado de la salud del agente/puerta de enlace + configuración básica.
    - `openclaw models status`: verifica la autenticación del proveedor + disponibilidad del modelo.
    - `openclaw doctor`: valida y repara problemas comunes de configuración/estado.

    Otras comprobaciones útiles de la CLI: `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Bucle de depuración rápida: [Primeros 60 segundos si algo está roto](#first-60-seconds-if-something-is-broken).
    Documentos de instalación: [Instalación](/en/install), [Opciones del instalador](/en/install/installer), [Actualización](/en/install/updating).

  </Accordion>

  <Accordion title="Forma recomendada de instalar y configurar OpenClaw">
    El repositorio recomienda ejecutar desde el código fuente y utilizar la incorporación (onboarding):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    El asistente también puede compilar los activos de la interfaz de usuario automáticamente. Después de la incorporación, normalmente ejecutas el Gateway en el puerto **18789**.

    Desde el código fuente (colaboradores/desarrollo):

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

<Accordion title="¿Cómo abro el panel de control después de la incorporación?">El asistente abre tu navegador con una URL del panel de control limpia (sin token) justo después de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no se abrió, copia y pega la URL impresa en la misma máquina.</Accordion>

  <Accordion title="¿Cómo autentico el panel de control (token) en localhost frente a remoto?">
    **Localhost (misma máquina):**

    - Abre `http://127.0.0.1:18789/`.
    - Si solicita autenticación, pega el token de `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de Control UI.
    - Recupéralo del host de la puerta de enlace: `openclaw config get gateway.auth.token` (o genera uno: `openclaw doctor --generate-gateway-token`).

    **No en localhost:**

    - **Tailscale Serve** (recomendado): mantiene el enlace de retorno (loopback), ejecuta `openclaw gateway --tailscale serve`, abre `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de Control UI/WebSocket (sin token, asume host de puerta de enlace confiable); las API HTTP aún requieren token/contraseña.
    - **Tailnet bind**: ejecuta `openclaw gateway --bind tailnet --token "<token>"`, abre `http://<tailscale-ip>:18789/`, pega el token en la configuración del panel de control.
    - **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abre `http://127.0.0.1:18789/` y pega el token en la configuración de Control UI.

    Consulta [Dashboard](/en/web/dashboard) y [Web surfaces](/en/web) para conocer los modos de enlace y detalles de autenticación.

  </Accordion>

  <Accordion title="¿Qué tiempo de ejecución necesito?">
    Se requiere Node **>= 22**. Se recomienda `pnpm`. No se recomienda Bun para el Gateway.
  </Accordion>

  <Accordion title="¿Funciona en Raspberry Pi?">
    Sí. El Gateway es ligero: la documentación indica que **512MB-1GB de RAM**, **1 núcleo** y unos **500MB**
    de disco son suficientes para uso personal, y señala que **una Raspberry Pi 4 puede ejecutarlo**.

    Si desea margen adicional (registros, medios, otros servicios), se recomiendan **2GB**, pero no es
    un mínimo estricto.

    Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puede emparejar **nodos** en su portátil/teléfono para
    pantalla/cámara/lienzo locales o ejecución de comandos. Consulte [Nodes](/en/nodes).

  </Accordion>

  <Accordion title="¿Algún consejo para instalaciones en Raspberry Pi?">
    Versión corta: funciona, pero espere imperfecciones.

    - Use un sistema operativo **de 64 bits** y mantenga Node >= 22.
    - Prefiera la **instalación personalizable (git)** para poder ver los registros y actualizar rápidamente.
    - Comience sin canales/habilidades, luego agréguelos uno por uno.
    - Si encuentra problemas binarios extraños, generalmente es un problema de **compatibilidad ARM**.

    Documentación: [Linux](/en/platforms/linux), [Install](/en/install).

  </Accordion>

  <Accordion title="Está atascado en wake up my friend / onboarding will not hatch. ¿Ahora qué?">
    Esa pantalla depende de que el Gateway sea accesible y autenticado. La TUI también envía
    "¡Despierta, amigo!" automáticamente en la primera incubación. Si ve esa línea con **sin respuesta**
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

    3. Si sigue bloqueado, ejecute:

    ```bash
    openclaw doctor
    ```

    Si el Gateway es remoto, asegúrese de que la conexión túnel/Tailscale esté activa y que la interfaz de usuario
    apunte al Gateway correcto. Consulte [Remote access](/en/gateway/remote).

  </Accordion>

  <Accordion title="¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir el onboarding?">
    Sí. Copie el **directorio de estado** y el **espacio de trabajo**, y luego ejecute Doctor una vez. Esto
    mantiene su bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado del canal)
    siempre que copie **ambas** ubicaciones:

    1. Instale OpenClaw en la nueva máquina.
    2. Copie `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) desde la máquina antigua.
    3. Copie su espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
    4. Ejecute `openclaw doctor` y reinicie el servicio Gateway.

    Esto preserva la configuración, los perfiles de autenticación, las credenciales de WhatsApp, las sesiones y la memoria. Si está en
    modo remoto, recuerde que el host de la puerta de enlace es el propietario del almacén de sesiones y del espacio de trabajo.

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

    Las entradas más recientes están arriba. Si la sección superior está marcada como **Unreleased** (Sin lanzar), la siguiente sección
    con fecha es la última versión lanzada. Las entradas se agrupan en **Destacados**, **Cambios** y
    **Correcciones** (más secciones de documentos/u otras cuando sea necesario).

  </Accordion>

  <Accordion title="No se puede acceder a docs.openclaw.ai (error SSL)">
    Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de
    Xfinity Advanced Security. Desactívelo o añada `docs.openclaw.ai` a la lista blanca, luego vuelva a intentarlo.
    Por favor, ayúdenos a desbloquearlo informando aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si aun así no puede acceder al sitio, la documentación está reflejada en GitHub:
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Diferencia entre estable y beta">
    **Stable** (estable) y **beta** son **etiquetas de distribución de npm (dist-tags)**, no líneas de código separadas:

    - `latest` = estable
    - `beta` = versión preliminar para pruebas

    Publicamos compilaciones en **beta**, las probamos y, una vez que una compilación es sólida, **promovemos

esa misma versión a `latest`**. Es por eso que beta y stable pueden apuntar a la
**misma versión\*\*.

    Consulte los cambios:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Para comandos de instalación de una sola línea y la diferencia entre beta y dev, consulte el acordeón a continuación.

  </Accordion>

  <Accordion title="¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?">
    **Beta** es la etiqueta de distribución de npm (dist-tag) `beta` (puede coincidir con `latest`).
    **Dev** es la cabecera móvil de `main` (git); cuando se publica, utiliza la etiqueta de distribución de npm `dev`.

    Comandos de una sola línea (macOS/Linux):

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Instalador de Windows (PowerShell):
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    Más detalles: [Canales de desarrollo](/en/install/development-channels) y [Marcas del instalador](/en/install/installer).

  </Accordion>

  <Accordion title="¿Cómo pruebo las últimas novedades?">
    Dos opciones:

    1. **Canal Dev (git checkout):**

    ```bash
    openclaw update --channel dev
    ```

    Esto cambia a la rama `main` y actualiza desde el código fuente.

    2. **Instalación personalizable (hackable) (desde el sitio del instalador):**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Eso le proporciona un repositorio local que puede editar y luego actualizar a través de git.

    Si prefiere una clonación limpia manualmente, utilice:

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    Documentación: [Actualizar](/en/cli/update), [Canales de desarrollo](/en/install/development-channels),
    [Instalar](/en/install).

  </Accordion>

  <Accordion title="¿Cuánto tiempo suelen tardar la instalación y la incorporación?">
    Guía aproximada:

    - **Instalación:** 2-5 minutos
    - **Incorporación:** 5-15 minutos dependiendo de cuántos canales/modelos configures

    Si se cuelga, usa [Installer stuck](#quick-start-and-first-run-setup)
    y el bucle de depuración rápida en [I am stuck](#quick-start-and-first-run-setup).

  </Accordion>

  <Accordion title="¿El instalador está atascado? ¿Cómo obtengo más información?">
    Vuelve a ejecutar el instalador con **salida detallada**:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Instalación Beta con modo detallado:

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    Para una instalación (git) modificable:

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

    Más opciones: [Installer flags](/en/install/installer).

  </Accordion>

  <Accordion title="La instalación en Windows dice que no se encuentra git o que openclaw no se reconoce">
    Dos problemas comunes en Windows:

    **1) error de npm spawn git / git not found**

    - Instala **Git for Windows** y asegúrate de que `git` esté en tu PATH.
    - Cierra y vuelve a abrir PowerShell, luego vuelve a ejecutar el instalador.

    **2) openclaw no se reconoce después de la instalación**

    - Tu carpeta bin global de npm no está en el PATH.
    - Verifica la ruta:

      ```powershell
      npm config get prefix
      ```

    - Añade ese directorio a tu PATH de usuario (no se necesita el sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
    - Cierra y vuelve a abrir PowerShell después de actualizar el PATH.

    Si quieres la configuración de Windows más fluida, usa **WSL2** en lugar de Windows nativo.
    Documentación: [Windows](/en/platforms/windows).

  </Accordion>

  <Accordion title="La salida exec de Windows muestra texto chino ilegible - ¿qué debo hacer?">
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

    Si aún reproduce esto en la última versión de OpenClaw, haga seguimiento/reporte en:

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentación no respondió mi pregunta - ¿cómo obtengo una mejor respuesta?">
    Use la **instalación hackeable (git)** para tener el código fuente y la documentación completa localmente, luego pregunte
    a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Más detalles: [Install](/en/install) y [Installer flags](/en/install/installer).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en Linux?">
    Respuesta corta: siga la guía de Linux, luego ejecute la integración (onboarding).

    - Ruta rápida en Linux + instalación del servicio: [Linux](/en/platforms/linux).
    - Tutorial completo: [Getting Started](/en/start/getting-started).
    - Instalador + actualizaciones: [Install & updates](/en/install/updating).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en un VPS?">
    Cualquier VPS de Linux funciona. Instale en el servidor, luego use SSH/Tailscale para acceder al Gateway.

    Guías: [exe.dev](/en/install/exe-dev), [Hetzner](/en/install/hetzner), [Fly.io](/en/install/fly).
    Acceso remoto: [Gateway remote](/en/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde están las guías de instalación en la nube/VPS?">
    Mantenemos un **centro de alojamiento** con los proveedores comunes. Elige uno y sigue la guía:

    - [Alojamiento VPS](/en/vps) (todos los proveedores en un solo lugar)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    Cómo funciona en la nube: el **Gateway se ejecuta en el servidor** y accedes a él
    desde tu portátil/teléfono mediante la interfaz de control (Control UI) (o Tailscale/SSH). Tu estado + espacio de trabajo
    residen en el servidor, así que trata el host como la fuente de verdad y haz copias de seguridad.

    Puedes vincular **nodos** (Mac/iOS/Android/headless) a ese Gateway en la nube para acceder
    a la pantalla/cámara/lienzo local o ejecutar comandos en tu portátil manteniendo el
    Gateway en la nube.

    Centro: [Plataformas](/en/platforms). Acceso remoto: [Gateway remoto](/en/gateway/remote).
    Nodos: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo pedirle a OpenClaw que se actualice a sí mismo?">
    Respuesta corta: **es posible, pero no se recomienda**. El flujo de actualización puede reiniciar el
    Gateway (lo que interrumpe la sesión activa), puede necesitar una extracción limpia de git (clean git checkout), y
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

    Documentación: [Actualizar](/en/cli/update), [Actualización](/en/install/updating).

  </Accordion>

  <Accordion title="¿Qué hace realmente la incorporación?">
    `openclaw onboard` es la ruta de configuración recomendada. En **modo local** te guía a través de:

    - **Configuración de modelo/autenticación** (se admiten flujos de OAuth/token de configuración del proveedor y claves API, además de opciones de modelo local como LM Studio)
    - Ubicación del **espacio de trabajo** + archivos de arranque
    - Configuración del **gateway** (bind/puerto/auth/tailscale)
    - **Proveedores** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
    - **Instalación del demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
    - **Comprobaciones de estado** y selección de **habilidades**

    También advierte si el modelo configurado es desconocido o le falta autenticación.

  </Accordion>

  <Accordion title="¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?">
    No. Puedes ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/otros) o con
    **modelos solo locales** para que tus datos se mantengan en tu dispositivo. Las suscripciones (Claude
    Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

    Si eliges la autenticación por suscripción a Anthropic, decide por ti mismo si usarla:
    Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
    El OAuth de OpenAI Codex es compatible explícitamente con herramientas externas como OpenClaw.

    Documentación: [Anthropic](/en/providers/anthropic), [OpenAI](/en/providers/openai),
    [Modelos locales](/en/gateway/local-models), [Modelos](/en/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar la suscripción Claude Max sin una clave API?">
    Sí. Puedes usar un **token de configuración** o reutilizar un inicio de sesión local de **Claude CLI**
    en el host del gateway.

    Las suscripciones Claude Pro/Max **no incluyen una clave API**, por lo que esta es la
    ruta técnica para las cuentas de suscripción. Pero esta es tu decisión: Anthropic
    ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
    Si deseas la ruta compatible más clara y segura para producción, usa una clave API de Anthropic.

  </Accordion>

<Accordion title="¿Cómo funciona la autenticación por token de configuración de Anthropic?">
  `claude setup-token` genera una **cadena de token** a través de la CLI de Claude Code (no está disponible en la consola web). Puedes ejecutarlo en **cualquier máquina**. Elige **Anthropic token (paste setup-token)** en la incorporación o pégalo con `openclaw models auth paste-token --provider anthropic`. El token se almacena como un perfil de autenticación para el proveedor **anthropic** y se
  usa como una clave API (sin actualización automática). Más detalles: [OAuth](/en/concepts/oauth).
</Accordion>

  <Accordion title="¿Dónde encuentro un token de configuración de Anthropic?">
    **No** está en la Consola de Anthropic. El token de configuración es generado por la **CLI de Claude Code** en **cualquier máquina**:

    ```bash
    claude setup-token
    ```

    Copia el token que imprime, luego elige **Anthropic token (paste setup-token)** en la incorporación. Si quieres ejecutarlo en el host de la puerta de enlace, usa `openclaw models auth setup-token --provider anthropic`. Si ejecutaste `claude setup-token` en otro lugar, pégalo en el host de la puerta de enlace con `openclaw models auth paste-token --provider anthropic`. Consulta [Anthropic](/en/providers/anthropic).

  </Accordion>

  <Accordion title="¿Admiten la autenticación por suscripción de Claude (Claude Pro o Max)?">
    Sí. Puedes:

    - usar un **setup-token**
    - reutilizar un inicio de sesión local de la **Claude CLI** en el host de la puerta de enlace con `openclaw models auth login --provider anthropic --method cli --set-default`

    El setup-token todavía es compatible. La migración de la Claude CLI es más sencilla cuando el host de la puerta de enlace ya ejecuta Claude Code. Consulta [Anthropic](/en/providers/anthropic) y [OAuth](/en/concepts/oauth).

    Importante: esta es compatibilidad técnica, no una garantía política. Anthropic
    ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
    Debes decidir si usarlo y verificar los términos actuales de Anthropic.
    Para cargas de trabajo de producción o multiusuario, la autenticación con clave API de Anthropic es la opción más segura y recomendada.

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="¿Por qué veo HTTP 429 rate_limit_error de Anthropic?">
Eso significa que su **cuota/límite de velocidad de Anthropic** se ha agotado para la ventana actual. Si utiliza una **suscripción a Claude** (token de configuración), espere a que la ventana se restablezca o actualice su plan. Si utiliza una **clave de API de Anthropic**, verifique la Consola de Anthropic para el uso/facturación y aumente los límites según sea necesario.

    Si el mensaje es específicamente:
    `Extra usage is required for long context requests`, la solicitud está intentando usar
    la beta de contexto de 1M de Anthropic (`context1m: true`). Eso solo funciona cuando su
    credencial es elegible para la facturación de contexto largo (facturación de clave de API o suscripción
    con Uso Extra habilitado).

    Consejo: configure un **modelo alternativo** para que OpenClaw pueda seguir respondiendo mientras un proveedor tiene el límite de velocidad alcanzado.
    Consulte [Modelos](/en/cli/models), [OAuth](/en/concepts/oauth) y
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="¿Está soportado AWS Bedrock?">
  Sí: a través del proveedor **Amazon Bedrock (Converse)** de pi-ai con **configuración manual**. Debe proporcionar credenciales/región de AWS en el host de la puerta de enlace y agregar una entrada de proveedor Bedrock en su configuración de modelos. Consulte [Amazon Bedrock](/en/providers/bedrock) y [Proveedores de modelos](/en/providers/models). Si prefiere un flujo de claves administradas, un
  proxy compatible con OpenAI frente a Bedrock sigue siendo una opción válida.
</Accordion>

<Accordion title="¿Cómo funciona la autenticación de Codex?">
  OpenClaw admite **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). La incorporación puede ejecutar el flujo de OAuth y establecerá el modelo predeterminado en `openai-codex/gpt-5.4` cuando corresponda. Consulte [Proveedores de modelos](/en/concepts/model-providers) e [Incorporación (CLI)](/en/start/wizard).
</Accordion>

  <Accordion title="¿Admite la autenticación de suscripción de OpenAI (Codex OAuth)?">
    Sí. OpenClaw es totalmente compatible con **OAuth de suscripción de OpenAI Code (Codex)**.
    OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujos de trabajo externos
    como OpenClaw. El proceso de incorporación (onboarding) puede ejecutar el flujo de OAuth por usted.

    Consulte [OAuth](/en/concepts/oauth), [Proveedores de modelos](/en/concepts/model-providers) y [Incorporación (CLI)](/en/start/wizard).

  </Accordion>

  <Accordion title="¿Cómo configuro OAuth de CLI de Gemini?">
    Gemini CLI utiliza un **flujo de autenticación de complemento (plugin auth flow)**, no un ID de cliente ni un secreto en `openclaw.json`.

    Pasos:

    1. Habilite el complemento: `openclaw plugins enable google`
    2. Inicie sesión: `openclaw models auth login --provider google-gemini-cli --set-default`

    Esto almacena los tokens de OAuth en perfiles de autenticación en el host de la puerta de enlace (gateway). Detalles: [Proveedores de modelos](/en/concepts/model-providers).

  </Accordion>

<Accordion title="¿Es adecuado un modelo local para chats informales?">
  Generalmente no. OpenClaw necesita un contexto grande + una seguridad sólida; las tarjetas pequeñas truncan y filtran. Si es necesario, ejecute la compilación del modelo **más grande** que pueda localmente (LM Studio) y consulte [/gateway/local-models](/en/gateway/local-models). Los modelos más pequeños/cuantizados aumentan el riesgo de inyección de avisos (prompt-injection) - consulte
  [Seguridad](/en/gateway/security).
</Accordion>

<Accordion title="¿Cómo mantengo el tráfico del modelo alojado en una región específica?">
  Elija endpoints anclados a la región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax, Kimi y GLM; elija la variante alojada en EE. UU. para mantener los datos en la región. Aún puede listar Anthropic/OpenAI junto a estos usando `models.mode: "merge"` para que las alternativas (fallbacks) sigan disponibles respetando el proveedor regional que seleccione.
</Accordion>

  <Accordion title="¿Tengo que comprar una Mac Mini para instalar esto?">
    No. OpenClaw se ejecuta en macOS o Linux (Windows vía WSL2). Una Mac mini es opcional: algunas personas
    compran una como host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja tipo Raspberry Pi también funciona.

    Solo necesitas una Mac **para las herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/en/channels/bluebubbles) (recomendado) - el servidor de BlueBubbles se ejecuta en cualquier Mac, y la Gateway puede ejecutarse en Linux o en otro lugar. Si quieres otras herramientas exclusivas de macOS, ejecuta la Gateway en una Mac o empareja un nodo macOS.

    Documentos: [BlueBubbles](/en/channels/bluebubbles), [Nodos](/en/nodes), [Modo remoto de Mac](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Necesito una Mac mini para compatibilidad con iMessage?">
    Necesitas **algún dispositivo macOS** iniciado en Messages. **No** tiene que ser una Mac mini -
    cualquier Mac funciona. **Usa [BlueBubbles](/en/channels/bluebubbles)** (recomendado) para iMessage - el servidor de BlueBubbles se ejecuta en macOS, mientras que la Gateway puede ejecutarse en Linux o en otro lugar.

    Configuraciones comunes:

    - Ejecuta la Gateway en Linux/VPS y ejecuta el servidor de BlueBubbles en cualquier Mac iniciada en Messages.
    - Ejecuta todo en la Mac si quieres la configuración más sencilla de una sola máquina.

    Documentos: [BlueBubbles](/en/channels/bluebubbles), [Nodos](/en/nodes),
    [Modo remoto de Mac](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si compro una Mac mini para ejecutar OpenClaw, ¿puedo conectarla a mi MacBook Pro?">
    Sí. La **Mac mini puede ejecutar la Gateway**, y tu MacBook Pro puede conectarse como un
    **nodo** (dispositivo complementario). Los nodos no ejecutan la Gateway; proporcionan capacidades
    adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

    Patrón común:

    - Gateway en la Mac mini (siempre activa).
    - El MacBook Pro ejecuta la aplicación de macOS o un host de nodo y se empareja con la Gateway.
    - Usa `openclaw nodes status` / `openclaw nodes list` para verla.

    Documentos: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo usar Bun?">
    Bun **no es recomendado**. Vemos errores de ejecución, especialmente con WhatsApp y Telegram.
    Use **Node** para gateways estables.

    Si todavía desea experimentar con Bun, hágalo en un gateway que no sea de producción
    sin WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram: ¿qué va en allowFrom?">
    `channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

    El onboarding acepta la entrada `@username` y la resuelve a un ID numérico, pero la autorización de OpenClaw usa solo IDs numéricos.

    Más seguro (sin bot de terceros):

    - Envíe un DM a su bot, luego ejecute `openclaw logs --follow` y lea `from.id`.

    Bot API oficial:

    - Envíe un DM a su bot, luego llame a `https://api.telegram.org/bot<bot_token>/getUpdates` y lea `message.from.id`.

    De terceros (menos privado):

    - Envíe un DM a `@userinfobot` o `@getidsbot`.

    Consulte [/channels/telegram](/en/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?">
  Sí, a través del **enrutamiento multiagente**. Vincule el **MD** de WhatsApp de cada remitente (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, para que cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún provienen de la **misma cuenta de WhatsApp**, y el control de acceso DM (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp. Consulte [Enrutamiento multiagente](/en/concepts/multi-agent) y [WhatsApp](/en/channels/whatsapp).
</Accordion>

<Accordion title='¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para programar"?'>
  Sí. Usa el enrutamiento multi-agente: asigna a cada agente su propio modelo predeterminado y luego vincula rutas entrantes (cuenta de proveedor o pares específicos) a cada agente. Un ejemplo de configuración se encuentra en [Enrutamiento multi-agente](/en/concepts/multi-agent). Consulta también [Modelos](/en/concepts/models) y [Configuración](/en/gateway/configuration).
</Accordion>

  <Accordion title="¿Funciona Homebrew en Linux?">
    Sí. Homebrew es compatible con Linux (Linuxbrew). Configuración rápida:

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    Si ejecutas OpenClaw a través de systemd, asegúrate de que el PATH del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells que no son de inicio de sesión.
    Las compilaciones recientes también anteponen directorios bin de usuario comunes en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

  </Accordion>

  <Accordion title="Diferencia entre la instalación hackable de git y la instalación con npm">
    - **Instalación hackable (git):** checkout completo del código fuente, editable, lo mejor para los contribuidores.
      Ejecutas compilaciones localmente y puedes parchear código/documentación.
    - **npm install:** instalación global de CLI, sin repositorio, lo mejor para "simplemente ejecútalo".
      Las actualizaciones provienen de las dist-tags de npm.

    Documentación: [Primeros pasos](/en/start/getting-started), [Actualizando](/en/install/updating).

  </Accordion>

  <Accordion title="¿Puedo cambiar entre las instalaciones de npm y git más adelante?">
    Sí. Instala la otra variante y luego ejecuta Doctor para que el servicio del gateway apunte al nuevo punto de entrada.
    Esto **no borra tus datos** - solo cambia la instalación del código de OpenClaw. Tu estado
    (`~/.openclaw`) y tu espacio de trabajo (`~/.openclaw/workspace`) permanecen intactos.

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

    Doctor detecta una discordancia en el punto de entrada del servicio del gateway y ofrece reescribir la configuración del servicio para que coincida con la instalación actual (usa `--repair` en automatización).

    Consejos de copia de seguridad: consulta [Estrategia de copia de seguridad](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="¿Debo ejecutar el Gateway en mi portátil o en un VPS?">
    Respuesta corta: **si quieres fiabilidad 24/7, usa un VPS**. Si quieres la
    menor fricción y te parece bien dormir/reiniciar, ejecútalo localmente.

    **Portátil (Gateway local)**

    - **Pros:** sin coste de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
    - **Contras:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del SO interrumpen, debe mantenerse encendido.

    **VPS / nube**

    - **Pros:** siempre activo, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
    - **Contras:** a menudo se ejecuta sin interfaz gráfica (usa capturas de pantalla), acceso remoto a archivos solamente, debes usar SSH para las actualizaciones.

    **Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord funcionan bien desde un VPS. El único verdadero compromiso es entre un **navegador sin interfaz gráfica** y una ventana visible. Consulta [Navegador](/en/tools/browser).

    **Predeterminado recomendado:** VPS si has tenido desconexiones del gateway anteriormente. Lo local es excelente cuando usas activamente el Mac y quieres acceso a archivos locales o automatización de la interfaz de usuario con un navegador visible.

  </Accordion>

  <Accordion title="¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?">
    No es obligatorio, pero **se recomienda para mayor confiabilidad y aislamiento**.

    - **Host dedicado (VPS/Mac mini/Pi):** siempre encendido, menos interrupciones por suspensión/reinicio, permisos más limpios, más fácil de mantener en ejecución.
    - **Portátil/escritorio compartido:** totalmente aceptable para pruebas y uso activo, pero espera pausas cuando el equipo se suspenda o se actualice.

    Si quieres lo mejor de ambos mundos, mantén la Gateway en un host dedicado y empareja tu portátil como un **nodo** para herramientas locales de pantalla/cámara/exec. Consulta [Nodos](/en/nodes).
    Para orientación sobre seguridad, lee [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?">
    OpenClaw es ligero. Para una Gateway básica + un canal de chat:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
    - **Recomendado:** 1-2 vCPU, 2GB de RAM o más para tener margen (registros, medios, múltiples canales). Las herramientas de nodo y la automatización del navegador pueden consumir muchos recursos.

    SO: usa **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación en Linux es la más probada ahí.

    Documentos: [Linux](/en/platforms/linux), [Hospedaje VPS](/en/vps).

  </Accordion>

  <Accordion title="¿Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos?">
    Sí. Trata una VM igual que un VPS: debe estar siempre encendida, ser accesible y tener suficiente
    RAM para la Gateway y cualquier canal que habilites.

    Orientación básica:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
    - **Recomendado:** 2GB de RAM o más si ejecutas múltiples canales, automatización del navegador o herramientas de medios.
    - **SO:** Ubuntu LTS u otro Debian/Ubuntu moderno.

    Si estás en Windows, **WSL2 es la configuración de estilo VM más fácil** y tiene la mejor compatibilidad
    de herramientas. Consulta [Windows](/en/platforms/windows), [Hospedaje VPS](/en/vps).
    Si estás ejecutando macOS en una VM, consulta [macOS VM](/en/install/macos-vm).

  </Accordion>
</AccordionGroup>

## ¿Qué es OpenClaw?

<AccordionGroup>
  <Accordion title="¿Qué es OpenClaw, en un párrafo?">
    OpenClaw es un asistente de IA personal que ejecutas en tus propios dispositivos. Responde en las plataformas de mensajería que ya usas (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) y también puede usar voz + un Canvas en vivo en las plataformas compatibles. El **Gateway** es el plano de control siempre activo; el asistente es el producto.
  </Accordion>

  <Accordion title="Propuesta de valor">
    OpenClaw no es "solo un envoltorio de Claude". Es un **plano de control con prioridad local** que te permite ejecutar un
    asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
    sesiones con estado, memoria y herramientas, sin entregar el control de tus flujos de trabajo a un
    SaaS alojado.

    Aspectos destacados:

    - **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
      espacio de trabajo + el historial de sesiones localmente.
    - **Canales reales, no un entorno sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      además de voz móvil y Canvas en plataformas compatibles.
    - **Agnóstico al modelo:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
      y conmutación por error por agente.
    - **Opción solo local:** ejecuta modelos locales para que **todos los datos pueden permanecer en tu dispositivo** si lo deseas.
    - **Enrutamiento multi-agente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
      espacio de trabajo y configuraciones predeterminadas.
    - **Código abierto y modificable:** inspecciona, extiende y aloja por ti mismo sin bloqueo de proveedor.

    Documentación: [Gateway](/en/gateway), [Canales](/en/channels), [Multi-agente](/en/concepts/multi-agent),
    [Memoria](/en/concepts/memory).

  </Accordion>

  <Accordion title="Acabo de configurarlo, ¿qué debo hacer primero?">
    Buenos primeros proyectos:

    - Crear un sitio web (WordPress, Shopify o un sitio estático simple).
    - Prototipar una aplicación móvil (esquema, pantallas, plan de API).
    - Organizar archivos y carpetas (limpieza, nomenclatura, etiquetado).
    - Conectar Gmail y automatizar resúmenes o seguimientos.

    Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
    usas subagentes para el trabajo en paralelo.

  </Accordion>

  <Accordion title="¿Cuáles son los cinco casos de uso cotidianos más importantes para OpenClaw?">
    Los logros cotidianos generalmente se parecen a:

    - **Briefings personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que te interesan.
    - **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores de correos electrónicos o documentos.
    - **Recordatorios y seguimientos:** impulsos y listas de verificación impulsados por cron o latidos.
    - **Automatización del navegador:** llenar formularios, recopilar datos y repetir tareas web.
    - **Coordinación entre dispositivos:** enviar una tarea desde tu teléfono, dejar que el Gateway la ejecute en un servidor y recibir el resultado en el chat.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ayudar con la generación de clientes, alcance, anuncios y blogs para un SaaS?">
    Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
    resumir prospectos y escribir borradores de textos de alcance o anuncios.

    Para **campañas de alcance o anuncios**, mantén a un humano en el ciclo. Evita el spam, sigue las leyes locales y
    las políticas de la plataforma, y revisa todo antes de enviarlo. El patrón más seguro es dejar que
    OpenClaw redacte y tú apruebes.

    Documentos: [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son las ventajas en comparación con Claude Code para el desarrollo web?">
    OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo de IDE. Usa
    Claude Code o Codex para el ciclo de codificación directa más rápido dentro de un repositorio. Usa OpenClaw cuando quieras
    memoria duradera, acceso entre dispositivos y orquestación de herramientas.

    Ventajas:

    - **Memoria persistente + espacio de trabajo** a través de sesiones
    - **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
    - **Orquestación de herramientas** (navegador, archivos, programación, ganchos)
    - **Gateway siempre activo** (ejecutar en un VPS, interactuar desde cualquier lugar)
    - **Nodos** para navegador/pantalla/cámara/exec local

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Habilidades y automatización

<AccordionGroup>
  <Accordion title="¿Cómo personalizo las habilidades sin ensuciar el repositorio?">
    Use anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o agregue una carpeta mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` > `~/.openclaw/skills` > empaquetado, por lo que las anulaciones administradas ganan sin tocar git. Solo las ediciones dignas de upstream deben vivir en el repositorio y salir como PRs.
  </Accordion>

  <Accordion title="¿Puedo cargar habilidades desde una carpeta personalizada?">
    Sí. Agregue directorios adicionales mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (precedencia más baja). La precedencia predeterminada permanece: `<workspace>/skills` → `~/.openclaw/skills` → empaquetado → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de forma predeterminada, lo que OpenClaw trata como `<workspace>/skills` en la siguiente sesión.
  </Accordion>

  <Accordion title="¿Cómo puedo usar diferentes modelos para diferentes tareas?">
    Hoy los patrones compatibles son:

    - **Trabajos de Cron**: los trabajos aislados pueden establecer una anulación `model` por trabajo.
    - **Subagentes**: enruta tareas a agentes separados con diferentes modelos predeterminados.
    - **Cambio a pedido**: use `/model` para cambiar el modelo de sesión actual en cualquier momento.

    Consulte [Cron jobs](/en/automation/cron-jobs), [Multi-Agent Routing](/en/concepts/multi-agent) y [Slash commands](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="El bot se congela mientras realiza trabajo pesado. ¿Cómo puedo descargar eso?">
    Use **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
    devuelven un resumen y mantienen su chat principal receptivo.

    Pida a su bot que "genere un sub-agente para esta tarea" o use `/subagents`.
    Use `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

    Consejo sobre tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, establezca un
    modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

    Documentación: [Sub-agentes](/en/tools/subagents), [Tareas en segundo plano](/en/automation/tasks).

  </Accordion>

  <Accordion title="¿Cómo funcionan las sesiones de subagente vinculadas a hilos en Discord?">
    Use vinculaciones de hilos. Puede vincular un hilo de Discord a un subagente o destino de sesión para que los mensajes de seguimiento en ese hilo se mantengan en esa sesión vinculada.

    Flujo básico:

    - Genere con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para seguimiento persistente).
    - O vincule manualmente con `/focus <target>`.
    - Use `/agents` para inspeccionar el estado de vinculación.
    - Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el enfoque automático.
    - Use `/unfocus` para desvincular el hilo.

    Configuración requerida:

    - Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - anulaciones de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Vinculación automática al generar: establezca `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Documentación: [Sub-agentes](/en/tools/subagents), [Discord](/en/channels/discord), [Referencia de configuración](/en/gateway/configuration-reference), [Comandos de barra](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="Cron o recordatorios no se ejecutan. ¿Qué debo verificar?">
    Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
    las tareas programadas no se ejecutarán.

    Lista de verificación:

    - Confirmar que cron está habilitado (`cron.enabled`) y que `OPENCLAW_SKIP_CRON` no está establecido.
    - Verificar que el Gateway está funcionando 24/7 (sin suspensiones/reinicios).
    - Verificar la configuración de zona horaria para la tarea (`--tz` vs zona horaria del host).

    Depuración:

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    Documentación: [Tareas Cron](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat).

  </Accordion>

  <Accordion title="¿Cómo instalo skills en Linux?">
    Use comandos nativos de `openclaw skills` o coloque skills en su espacio de trabajo. La interfaz de usuario de Skills de macOS no está disponible en Linux.
    Explore skills en [https://clawhub.com](https://clawhub.com).

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Instale la CLI separada `clawhub` solo si desea publicar o sincronizar sus propias skills.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ejecutar tareas según un programa o continuamente en segundo plano?">
    Sí. Utilice el programador de Gateway:

    - **Tareas Cron** para tareas programadas o recurrentes (persisten tras los reinicios).
    - **Heartbeat** para verificaciones periódicas de la "sesión principal".
    - **Trabajos aislados** para agentes autónomos que publican resúmenes o envían a chats.

    Documentación: [Tareas Cron](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat),
    [Heartbeat](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title="¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?">
    No directamente. Las habilidades de macOS están controladas por `metadata.openclaw.os` además de los binarios requeridos, y las habilidades solo aparecen en el mensaje del sistema cuando son elegibles en el **host de la puerta de enlace**. En Linux, las habilidades exclusivas de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que anules el control.

    Tienes tres patrones compatibles:

    **Opción A: ejecutar la puerta de enlace en una Mac (lo más simple).**
    Ejecuta la puerta de enlace donde existen los binarios de macOS, luego conéctate desde Linux en [modo remoto](#gateway-ports-already-running-and-remote-mode) o a través de Tailscale. Las habilidades se cargan normalmente porque el host de la puerta de enlace es macOS.

    **Opción B: usar un nodo macOS (sin SSH).**
    Ejecuta la puerta de enlace en Linux, vincula un nodo macOS (aplicación de la barra de menús) y configura los **Comandos de ejecución del nodo** en "Preguntar siempre" o "Permitir siempre" en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si eliges "Preguntar siempre", aprobar "Permitir siempre" en el mensaje añade ese comando a la lista de permitidos.

    **Opción C: proxy de binarios macOS a través de SSH (avanzado).**
    Mantén la puerta de enlace en Linux, pero haz que los binarios de CLI requeridos se resuelvan a envoltorios SSH que se ejecutan en una Mac. Luego anula la habilidad para permitir Linux de modo que siga siendo elegible.

    1. Crea un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Coloca el envoltorio en `PATH` en el host de Linux (por ejemplo `~/bin/memo`).
    3. Anula los metadatos de la habilidad (espacio de trabajo o `~/.openclaw/skills`) para permitir Linux:

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
    No integrada hoy en día.

    Opciones:

    - **Habilidad / complemento personalizado:** lo mejor para un acceso confiable a la API (tanto Notion como HeyGen tienen APIs).
    - **Automatización del navegador:** funciona sin código, pero es más lenta y más frágil.

    Si deseas mantener el contexto por cliente (flujos de trabajo de agencia), un patrón simple es:

    - Una página de Notion por cliente (contexto + preferencias + trabajo activo).
    - Pídele al agente que obtenga esa página al inicio de una sesión.

    Si deseas una integración nativa, abre una solicitud de función o construye una habilidad
    dirigida a esas APIs.

    Instalar habilidades:

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Las instalaciones nativas aterrizan en el directorio del espacio de trabajo activo `skills/`. Para habilidades compartidas entre agentes, colócalas en `~/.openclaw/skills/<name>/SKILL.md`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulta la entrada de FAQ de Homebrew Linux anterior). Consulta [Habilidades](/en/tools/skills) y [ClawHub](/en/tools/clawhub).

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

    Esta ruta es local del host. Si el Gateway se ejecuta en otro lugar, ejecuta un host de nodo en la máquina del navegador o usa CDP remoto en su lugar.

  </Accordion>
</AccordionGroup>

## Sandboxing y memoria

<AccordionGroup>
  <Accordion title="¿Hay algún documento dedicado al sandboxing?">
    Sí. Consulta [Sandboxing](/en/gateway/sandboxing). Para la configuración específica de Docker (gateway completo en Docker o imágenes de sandbox), consulta [Docker](/en/install/docker).
  </Accordion>

  <Accordion title="Docker parece limitado: ¿cómo habilito todas las funciones?">
    La imagen por defecto prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye
    paquetes del sistema, Homebrew o navegadores integrados. Para una configuración más completa:

    - Persista `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
    - Incorpore dependencias del sistema en la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Instale los navegadores de Playwright a través de la CLI incluida:
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Establezca `PLAYWRIGHT_BROWSERS_PATH` y asegúrese de que la ruta se persista.

    Documentación: [Docker](/en/install/docker), [Browser](/en/tools/browser).

  </Accordion>

  <Accordion title="¿Puedo mantener los MDs personales pero hacer que los grupos sean públicos/sandboxeados con un solo agente?">
    Sí, si su tráfico privado son los **MDs** y su tráfico público son los **grupos**.

    Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en Docker, mientras que la sesión principal de MDs se mantenga en el host. Luego, restrinja qué herramientas están disponibles en las sesiones sandboxeadas mediante `tools.sandbox.tools`.

    Tutorial de configuración + ejemplo de configuración: [Grupos: MDs personales + grupos públicos](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Referencia clave de configuración: [Configuración de puerta de enlace](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="¿Cómo vinculo una carpeta del host en el sandbox?">
  Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (p. ej., `"/home/user/src:/src:ro"`). Los vínculos globales y por agente se combinan; los vínculos por agente se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que los vínculos omiten las barreras del sistema de archivos del sandbox. Consulte
  [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para ver ejemplos y notas de seguridad.
</Accordion>

  <Accordion title="¿Cómo funciona la memoria?">
    La memoria de OpenClaw son simplemente archivos Markdown en el espacio de trabajo del agente:

    - Notas diarias en `memory/YYYY-MM-DD.md`
    - Notas a largo plazo curadas en `MEMORY.md` (solo sesiones principales/privadas)

    OpenClaw también ejecuta un **flujo de memoria de precompactación silencioso** para recordar al modelo
    que escriba notas duraderas antes de la autocompactación. Esto solo se ejecuta cuando el espacio de trabajo
    es escribible (los entornos limitados de solo lectura lo omiten). Consulte [Memoria](/en/concepts/memory).

  </Accordion>

  <Accordion title="La memoria sigue olvidando cosas. ¿Cómo hago que persista?">
    Pída al bot que **escriba el dato en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
    el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

    Esta es todavía un área que estamos mejorando. Ayuda recordar al modelo que almacene memorias;
    él sabrá qué hacer. Si sigue olvidando, verifique que la Gateway esté usando el mismo
    espacio de trabajo en cada ejecución.

    Documentación: [Memoria](/en/concepts/memory), [Espacio de trabajo del agente](/en/concepts/agent-workspace).

  </Accordion>

  <Accordion title="¿La memoria persiste para siempre? ¿Cuáles son los límites?">
    Los archivos de memoria viven en el disco y persisten hasta que los elimine. El límite es su
    almacenamiento, no el modelo. El **contexto de la sesión** todavía está limitado por la ventana
    de contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Por eso
    existe la búsqueda de memoria: extrae solo las partes relevantes de vuelta al contexto.

    Documentación: [Memoria](/en/concepts/memory), [Contexto](/en/concepts/context).

  </Accordion>

  <Accordion title="¿La búsqueda de memoria semántica requiere una clave API de OpenAI?">
    Solo si usas **embeddings de OpenAI**. El OAuth de Codex cubre chat/completions y
    **no** otorga acceso a embeddings, por lo que **iniciar sesión con Codex (OAuth o el
    inicio de sesión de la CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Los embeddings de OpenAI
    aún necesitan una clave API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

    Si no configuras un proveedor explícitamente, OpenClaw selecciona automáticamente un proveedor cuando puede
    resolver una clave API (perfiles de autenticación, `models.providers.*.apiKey` o variables de entorno).
    Prefiere OpenAI si se resuelve una clave de OpenAI, de lo contrario Gemini si se resuelve una clave de Gemini,
    luego Voyage, luego Mistral. Si no hay ninguna clave remota disponible, la búsqueda de
    memoria permanece deshabilitada hasta que la configures. Si tienes una ruta de modelo local
    configurada y presente, OpenClaw
    prefiere `local`. Ollama es compatible cuando configuras explícitamente
    `memorySearch.provider = "ollama"`.

    Si prefieres quedarte local, establece `memorySearch.provider = "local"` (y opcionalmente
    `memorySearch.fallback = "none"`). Si quieres embeddings de Gemini, establece
    `memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
    `memorySearch.remote.apiKey`). Admitimos modelos de embeddings **OpenAI, Gemini, Voyage, Mistral, Ollama o locales**
    - consulta [Memoria](/en/concepts/memory) para obtener los detalles de configuración.

  </Accordion>
</AccordionGroup>

## Dónde se encuentran las cosas en el disco

<AccordionGroup>
  <Accordion title="¿Todos los datos utilizados con OpenClaw se guardan localmente?">
    No: **el estado de OpenClaw es local**, pero **los servicios externos aún ven lo que les envías**.

    - **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de Gateway
      (`~/.openclaw` + tu directorio de espacio de trabajo).
    - **Remoto por necesidad:** los mensajes que envías a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
      sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
      servidores.
    - **Controlas la huella:** el uso de modelos locales mantiene los avisos en tu máquina, pero el tráfico
      del canal aún pasa a través de los servidores del canal.

    Relacionado: [Espacio de trabajo del agente](/en/concepts/agent-workspace), [Memoria](/en/concepts/memory).

  </Accordion>

  <Accordion title="¿Dónde almacena OpenClaw sus datos?">
    Todo se encuentra bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

    | Ruta                                                            | Propósito                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación heredada de OAuth (copiada en perfiles de autenticación en el primer uso)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y `keyRef`/`tokenRef` opcionales)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga útil secreta respaldada por archivo opcional para proveedores `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas `api_key` estáticas depuradas)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (ej. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de la conversación (por agente)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de la sesión (por agente)                                       |

    Ruta heredada de un solo agente: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

    Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) es independiente y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="¿Dónde deben vivir AGENTS.md / SOUL.md / USER.md / MEMORY.md?">
    Estos archivos viven en el **espacio de trabajo del agente**, no en `~/.openclaw`.

    - **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (o respaldo heredado `memory.md` cuando `MEMORY.md` está ausente),
      `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` opcional.
    - **Directorio de estado (`~/.openclaw`)**: configuración, credenciales, perfiles de autenticación, sesiones, registros,
      y habilidades compartidas (`~/.openclaw/skills`).

    El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable mediante:

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si el bot "olvida" después de un reinicio, confirme que el Gateway está utilizando el mismo
    espacio de trabajo en cada lanzamiento (y recuerde: el modo remoto utiliza el espacio de trabajo del **host de la puerta de enlace**,
    no su computadora portátil local).

    Consejo: si desea un comportamiento o preferencia duradero, pídale al bot que **lo escriba en
    AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

    Consulte [Espacio de trabajo del agente](/en/concepts/agent-workspace) y [Memoria](/en/concepts/memory).

  </Accordion>

  <Accordion title="Estrategia de respaldo recomendada">
    Coloque su **espacio de trabajo del agente** en un repositorio git **privado** y respáldelo en algún lugar
    privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
    y le permite restaurar la "mente" del asistente más tarde.

    **No** confirme nada en `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
    Si necesita una restauración completa, haga una copia de seguridad del espacio de trabajo y del directorio de estado
    por separado (vea la pregunta de migración anterior).

    Documentos: [Espacio de trabajo del agente](/en/concepts/agent-workspace).

  </Accordion>

<Accordion title="¿Cómo desinstalo completamente OpenClaw?">Vea la guía dedicada: [Desinstalar](/en/install/uninstall).</Accordion>

  <Accordion title="¿Pueden los agentes trabajar fuera del espacio de trabajo?">
    Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un sandbox estricto.
    Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
    ubicaciones del host a menos que se habilite el sandbox. Si necesita aislamiento, use
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) o la configuración de sandbox por agente. Si
    desea que un repositorio sea el directorio de trabajo predeterminado, apunte el
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

  <Accordion title="Modo remoto: ¿dónde está el almacén de sesiones?">
    El estado de la sesión es propiedad del **host de la puerta de enlace**. Si está en modo remoto, el almacén de sesiones que le importa está en la máquina remota, no en su portátil local. Consulte [Gestión de sesiones](/en/concepts/session).
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

  <Accordion title='Configuré gateway.bind: "lan" (o "tailnet") y ahora nada escucha / la interfaz de usuario dice no autorizado'>
    Los enlaces que no son de bucle local **requieren autenticación**. Configure `gateway.auth.mode` + `gateway.auth.token` (o use `OPENCLAW_GATEWAY_TOKEN`).

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

    - `gateway.remote.token` / `.password` **no** activan la autenticación de la puerta de enlace local por sí mismos.
    - Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
    - Si `gateway.auth.token` / `gateway.auth.password` están configurados explícitamente a través de SecretRef y no se resuelven, la resolución falla cerrada (sin enmascaramiento de reserva remota).
    - La interfaz de usuario de Control se autentica a través de `connect.params.auth.token` (almacenado en la configuración de la aplicación/interfaz). Evite poner tokens en las URL.

  </Accordion>

  <Accordion title="¿Por qué necesito un token en localhost ahora?">
    OpenClaw exige la autenticación por token por defecto, incluido el bucle local. Si no se configura ningún token, el inicio de la puerta de enlace genera uno automáticamente y lo guarda en `gateway.auth.token`, por lo que **los clientes WS locales deben autenticarse**. Esto bloquea que otros procesos locales llamen a la puerta de enlace.

    Si **realmente** desea un bucle local abierto, configure `gateway.auth.mode: "none"` explícitamente en su configuración. Doctor puede generar un token para usted en cualquier momento: `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="¿Tengo que reiniciar después de cambiar la configuración?">
    La puerta de enlace supervisa la configuración y admite la recarga en caliente:

    - `gateway.reload.mode: "hybrid"` (predeterminado): aplicar cambios seguros en caliente, reiniciar para los críticos
    - `hot`, `restart`, `off` también son compatibles

  </Accordion>

  <Accordion title="¿Cómo desactivo las leyendas divertidas de la CLI?">
    Establezca `cli.banner.taglineMode` en la configuración:

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`: oculta el texto de la leyenda pero mantiene la línea del banner del título/v versión.
    - `default`: usa `All your chats, one OpenClaw.` cada vez.
    - `random`: leyendas divertidas/estacionales rotativas (comportamiento predeterminado).
    - Si no desea ningún banner en absoluto, establezca la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="¿Cómo habilito la búsqueda web (y la recuperación web)?">
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

    La configuración de búsqueda web específica del proveedor ahora se encuentra bajo `plugins.entries.<plugin>.config.webSearch.*`.
    Las rutas del proveedor `tools.web.search.*` heredadas todavía se cargan temporalmente por compatibilidad, pero no se deben usar para nuevas configuraciones.

    Notas:

    - Si usa listas de permitidos (allowlists), agregue `web_search`/`web_fetch` o `group:web`.
    - `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
    - Los demonios leen las variables de entorno de `~/.openclaw/.env` (o el entorno del servicio).

    Documentación: [Web tools](/en/tools/web).

  </Accordion>

  <Accordion title="config.apply borró mi configuración. ¿Cómo me recupero y evito esto?">
    `config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo lo demás se elimina.

    Recuperar:

    - Restaura desde una copia de seguridad (git o una `~/.openclaw/openclaw.json` copiada).
    - Si no tienes copia de seguridad, vuelve a ejecutar `openclaw doctor` y reconfigura los canales/modelos.
    - Si esto fue inesperado, reporta un error e incluye tu última configuración conocida o cualquier copia de seguridad.
    - Un agente de codificación local a menudo puede reconstruir una configuración funcional desde los registros o el historial.

    Evitarlo:

    - Usa `openclaw config set` para cambios pequeños.
    - Usa `openclaw configure` para ediciones interactivas.

    Docs: [Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="¿Cómo ejecuto un Gateway central con trabajadores especializados en varios dispositivos?">
    El patrón común es **un Gateway** (p. ej., Raspberry Pi) más **nodos** y **agentes**:

    - **Gateway (central):** posee los canales (Signal/WhatsApp), el enrutamiento y las sesiones.
    - **Nodos (dispositivos):** Macs/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
    - **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (p. ej., "operaciones de Hetzner", "datos personales").
    - **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando deseas paralelismo.
    - **TUI:** conéctate al Gateway y cambia entre agentes/sesiones.

    Docs: [Nodes](/en/nodes), [Remote access](/en/gateway/remote), [Multi-Agent Routing](/en/concepts/multi-agent), [Sub-agents](/en/tools/subagents), [TUI](/en/web/tui).

  </Accordion>

  <Accordion title="¿Puede ejecutarse el navegador OpenClaw en modo sin cabeza?">
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

    El valor predeterminado es `false` (con interfaz). El modo sin cabeza es más probable que active comprobaciones anti-bot en algunos sitios. Consulte [Browser](/en/tools/browser).

    El modo sin cabeza usa el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias son:

    - Sin ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
    - Algunos sitios son más estrictos con la automatización en modo sin cabeza (CAPTCHAs, anti-bot).
      Por ejemplo, X/Twitter a menudo bloquea sesiones sin cabeza.

  </Accordion>

  <Accordion title="¿Cómo uso Brave para el control del navegador?">
    Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie el Gateway.
    Vea los ejemplos completos de configuración en [Browser](/en/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways remotos y nodos

<AccordionGroup>
  <Accordion title="¿Cómo se propagan los comandos entre Telegram, el gateway y los nodos?">
    Los mensajes de Telegram son manejados por el **gateway**. El gateway ejecuta el agente y
    solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

    Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

    Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

  </Accordion>

  <Accordion title="¿Cómo puede mi agente acceder a mi ordenador si el Gateway está alojado de forma remota?">
    Respuesta corta: **empareja tu ordenador como un nodo**. El Gateway se ejecuta en otro lugar, pero puede
    invocar herramientas `node.*` (pantalla, cámara, sistema) en tu máquina local a través del WebSocket del Gateway.

    Configuración típica:

    1. Ejecuta el Gateway en el host siempre activo (VPS/servidor doméstico).
    2. Pon el host del Gateway + tu ordenador en la misma tailnet.
    3. Asegúrate de que el WS del Gateway sea accesible (enlace tailnet o túnel SSH).
    4. Abre la aplicación de macOS localmente y conéctate en modo **Remoto a través de SSH** (o tailnet directa)
       para que pueda registrarse como un nodo.
    5. Aprueba el nodo en el Gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    No se requiere ningún puente TCP separado; los nodos se conectan a través del WebSocket del Gateway.

    Recordatorio de seguridad: emparejar un nodo macOS permite `system.run` en esa máquina. Solo
    empareja dispositivos en los que confíes y revisa [Seguridad](/en/gateway/security).

    Documentación: [Nodos](/en/nodes), [Protocolo de Gateway](/en/gateway/protocol), [Modo remoto macOS](/en/platforms/mac/remote), [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="Tailscale está conectado pero no recibo respuestas. ¿Qué hago ahora?">
    Comprueba lo básico:

    - El Gateway se está ejecutando: `openclaw gateway status`
    - Estado del Gateway: `openclaw status`
    - Estado del canal: `openclaw channels status`

    Luego verifica la autenticación y el enrutamiento:

    - Si usas Tailscale Serve, asegúrate de que `gateway.auth.allowTailscale` esté configurado correctamente.
    - Si te conectas a través de un túnel SSH, confirma que el túnel local está activo y apunta al puerto correcto.
    - Confirma que tus listas de permitidos (DM o grupo) incluyen tu cuenta.

    Documentación: [Tailscale](/en/gateway/tailscale), [Acceso remoto](/en/gateway/remote), [Canales](/en/channels).

  </Accordion>

  <Accordion title="¿Pueden dos instancias de OpenClaw comunicarse entre sí (local + VPS)?">
    Sí. No hay un puente "bot-a-bot" integrado, pero puedes configurarlo de algunas
    formas fiables:

    **Lo más simple:** usa un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
    Haz que el Bot A envíe un mensaje al Bot B y luego deja que el Bot B responda como de costumbre.

    **Puente CLI (genérico):** ejecuta un script que llame al otro Gateway con
    `openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
    escuche. Si un bot está en un VPS remoto, apunta tu CLI a ese Gateway remoto
    a través de SSH/Tailscale (consulta [Acceso remoto](/en/gateway/remote)).

    Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar el Gateway de destino):

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Consejo: añade una protección para que los dos bots no entren en un bucle infinito (solo menciones, listas de permitidos
    de canales o una regla de "no responder a mensajes de bots").

    Documentación: [Acceso remoto](/en/gateway/remote), [CLI del Agente](/en/cli/agent), [Envío del Agente](/en/tools/agent-send).

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
    Sí: los nodos son la forma principal de acceder a tu laptop desde un Gateway remoto y
    desbloquean más que el acceso al shell. El Gateway se ejecuta en macOS/Linux (Windows a través de WSL2) y es
    ligero (un VPS pequeño o una caja clase Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración
    común es un host siempre activo más tu laptop como un nodo.

    - **No se requiere SSH entrante.** Los nodos se conectan al WebSocket del Gateway y utilizan el emparejamiento de dispositivos.
    - **Controles de ejecución más seguros.** `system.run` está limitado por listas de permisos/aprobaciones de nodos en esa laptop.
    - **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
    - **Automatización del navegador local.** Mantén el Gateway en un VPS, pero ejecuta Chrome localmente a través de un host de nodo en la laptop, o conéctate al Chrome local en el host a través de Chrome MCP.

    SSH está bien para el acceso ad-hoc al shell, pero los nodos son más simples para flujos de trabajo de agentes continuos y
    automatización de dispositivos.

    Documentación: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes), [Navegador](/en/tools/browser).

  </Accordion>

  <Accordion title="¿Los nodos ejecutan un servicio de puerta de enlace?">
    No. Solo debería ejecutarse **una puerta de enlace (gateway)** por host a menos que intencionalmente ejecute perfiles aislados (consulte [Múltiples puertas de enlace](/en/gateway/multiple-gateways)). Los nodos son periféricos que se conectan
    a la puerta de enlace (nodos iOS/Android, o "modo nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin cabeza
    y control por CLI, consulte [CLI de host de nodo](/en/cli/node).

    Se requiere un reinicio completo para los cambios en `gateway`, `discovery` y `canvasHost`.

  </Accordion>

<Accordion title="¿Hay una forma de API / RPC para aplicar la configuración?">Sí. `config.apply` valida + escribe la configuración completa y reinicia el Gateway como parte de la operación.</Accordion>

  <Accordion title="Configuración mínima sensata para una primera instalación">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Esto establece tu espacio de trabajo y restringe quién puede activar el bot.

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

    Si deseas la interfaz de usuario de Control sin SSH, usa Tailscale Serve en el VPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Esto mantiene el enlace del gateway en el bucle local (loopback) y expone HTTPS a través de Tailscale. Consulta [Tailscale](/en/gateway/tailscale).

  </Accordion>

  <Accordion title="¿Cómo conecto un nodo Mac a un Gateway remoto (Tailscale Serve)?">
    Serve expone la **Interfaz de usuario de Control del Gateway + WS**. Los nodos se conectan a través del mismo punto de conexión del Gateway WS.

    Configuración recomendada:

    1. **Asegúrate de que el VPS y el Mac estén en la misma tailnet**.
    2. **Usa la aplicación de macOS en modo Remoto** (el objetivo SSH puede ser el nombre de host de la tailnet).
       La aplicación realizará un túnel del puerto del Gateway y se conectará como un nodo.
    3. **Aprobar el nodo** en el gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentación: [Protocolo del Gateway](/en/gateway/protocol), [Descubrimiento](/en/gateway/discovery), [Modo remoto de macOS](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Debo instalar en un segundo portátil o simplemente agregar un nodo?">
    Si solo necesitas **herramientas locales** (pantalla/cámara/exec) en el segundo portátil, agrégalo como un
    **nodo**. Eso mantiene una sola puerta de enlace (Gateway) y evita configuraciones duplicadas. Las herramientas de nodo local son
    actualmente solo para macOS, pero planeamos extenderlas a otros sistemas operativos.

    Instala una segunda puerta de enlace (Gateway) solo cuando necesites **aislamiento estricto** o dos bots completamente separados.

    Docs: [Nodos](/en/nodes), [CLI de Nodos](/en/cli/nodes), [Múltiples puertas de enlace](/en/gateway/multiple-gateways).

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

    Consulta [/environment](/en/help/environment) para obtener la precedencia completa y las fuentes.

  </Accordion>

  <Accordion title="Inicié la puerta de enlace (Gateway) mediante el servicio y mis variables de entorno desaparecieron. ¿Qué hago ahora?">
    Dos soluciones comunes:

    1. Coloca las claves que faltan en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de tu shell.
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

    Esto ejecuta tu shell de inicio de sesión e importa solo las claves esperadas que faltan (nunca anula). Equivalentes de variables de entorno:
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='Configuré COPILOT_GITHUB_TOKEN, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?'>
    `openclaw models status` indica si la **importación del entorno de shell** está habilitada. "Shell env: off"
    **no** significa que falten tus variables de entorno - solo significa que OpenClaw no cargará
    tu shell de inicio de sesión automáticamente.

    Si el Gateway se ejecuta como un servicio (launchd/systemd), no heredará tu entorno
    de shell. Soluciónalo haciendo una de estas cosas:

    1. Pon el token en `~/.openclaw/.env`:

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. O habilita la importación de shell (`env.shellEnv.enabled: true`).
    3. O agrégalo a tu bloque `env` de configuración (aplica solo si falta).

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
    Las sesiones pueden caducar después de `session.idleMinutes`, pero esto está **deshabilitado por defecto** (por defecto **0**).
    Establécelo en un valor positivo para habilitar la caducidad por inactividad. Cuando está habilitado, el **siguiente**
    mensaje después del período de inactividad inicia un id de sesión nuevo para esa clave de chat.
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
    Sí, a través del **enrutamiento multiagente** y los **sub-agentes**. Puedes crear un agente
    coordinador y varios agentes trabajadores con sus propios espacios de trabajo y modelos.

    Dicho esto, esto es mejor visto como un **experimento divertido**. Consume muchos tokens y a menudo
    es menos eficiente que usar un solo bot con sesiones separadas. El modelo típico que
    imaginamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
    bot también puede generar sub-agentes cuando sea necesario.

    Documentación: [Enrutamiento multiagente](/en/concepts/multi-agent), [Sub-agentes](/en/tools/subagents), [CLI de Agents](/en/cli/agents).

  </Accordion>

  <Accordion title="¿Por qué se truncó el contexto a mitad de tarea? ¿Cómo lo evito?">
    El contexto de la sesión está limitado por la ventana del modelo. Chats largos, resultados grandes de herramientas o muchos
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

    - La incorporación también ofrece **Restablecer** si ve una configuración existente. Consulta [Incorporación (CLI)](/en/start/wizard).
    - Si usaste perfiles (`--profile` / `OPENCLAW_PROFILE`), restablece cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
    - Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo desarrollo; borra la configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

  </Accordion>

  <Accordion title='Estoy obteniendo errores de "contexto demasiado grande" - ¿cómo restablezco o compacto?'>
    Use uno de estos:

    - **Compactar** (mantiene la conversación pero resume turnos anteriores):

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

    - Active o ajuste el **recorte de sesión** (`agents.defaults.contextPruning`) para eliminar el resultado de herramientas antiguo.
    - Use un modelo con una ventana de contexto más grande.

    Documentación: [Compactación](/en/concepts/compaction), [Recorte de sesión](/en/concepts/session-pruning), [Gestión de sesiones](/en/concepts/session).

  </Accordion>

  <Accordion title='¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?'>
    Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el `input` requerido. Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos o un cambio de herramienta/esquema).

    Solución: inicie una sesión nueva con `/new` (mensaje independiente).

  </Accordion>

  <Accordion title="¿Por qué recibo mensajes de latido cada 30 minutos?">
    Los latidos se ejecutan cada **30m** por defecto (**1h** cuando se usa autenticación OAuth). Ajuste o desactívelos:

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

    Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API. Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

    Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Latido](/en/gateway/heartbeat).

  </Accordion>

  <Accordion title='¿Necesito añadir una "cuenta de bot" a un grupo de WhatsApp?'>
    No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
    De forma predeterminada, las respuestas de grupo están bloqueadas hasta que permitas remitentes (`groupPolicy: "allowlist"`).

    Si deseas que solo **tú** puedas activar respuestas de grupo:

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
    Opción 1 (la más rápida): sigue los registros y envía un mensaje de prueba en el grupo:

    ```bash
    openclaw logs --follow --json
    ```

    Busca `chatId` (o `from`) que termine en `@g.us`, como por ejemplo:
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

    Consulta [Grupos](/en/channels/groups) y [Mensajes de grupo](/en/channels/group-messages).

  </Accordion>

<Accordion title="¿Los grupos/hilos comparten el contexto con los MD?">Los chats directos se colapsan en la sesión principal de forma predeterminada. Los grupos/canales tienen sus propias claves de sesión, y los temas de Telegram / hilos de Discord son sesiones separadas. Consulta [Grupos](/en/channels/groups) y [Mensajes de grupo](/en/channels/group-messages).</Accordion>

  <Accordion title="¿Cuántos espacios de trabajo y agentes puedo crear?">
    No hay límites estrictos. Docenas (incluso cientos) están bien, pero vigila lo siguiente:

    - **Crecimiento del disco:** las sesiones y transcripciones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.
    - **Costo de tokens:** más agentes significan más uso concurrente del modelo.
    - **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

    Consejos:

    - Mantén un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
    - Poda sesiones antiguas (elimina JSONL o entradas de almacenamiento) si el disco crece.
    - Usa `openclaw doctor` para detectar espacios de trabajo huérfanos y discordancias en los perfiles.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debería configurarlo?">
    Sí. Usa **Multi-Agent Routing** (enrutamiento multiagente) para ejecutar múltiples agentes aislados y enrutar mensajes entrantes por
    canal/cuenta/par. Slack es compatible como canal y se puede vincular a agentes específicos.

    El acceso del navegador es potente pero no "hacer todo lo que un humano puede"; anti-bot, CAPTCHAs y MFA aún
    pueden bloquear la automatización. Para el control del navegador más confiable, usa Chrome MCP local en el host,
    o usa CDP en la máquina que ejecuta realmente el navegador.

    Configuración recomendada:

    - Gateway host siempre activo (VPS/Mac mini).
    - Un agente por rol (vinculaciones).
    - Canal(es) de Slack vinculados a esos agentes.
    - Navegador local a través de Chrome MCP o un nodo cuando sea necesario.

    Documentación: [Multi-Agent Routing](/en/concepts/multi-agent), [Slack](/en/channels/slack),
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

    Los modelos se referencian como `provider/model` (ejemplo: `anthropic/claude-opus-4-6`). Si omites el proveedor, OpenClaw asume actualmente `anthropic` como fallback temporal de obsolescencia, pero aún deberías configurar `provider/model` de forma **explícita**.

  </Accordion>

  <Accordion title="¿Qué modelo recomiendas?">
    **Recomendación predeterminada:** usa el modelo más potente de la última generación disponible en tu pila de proveedores.
    **Para agentes con herramientas o entradas que no son de confianza:** da prioridad a la potencia del modelo sobre el costo.
    **Para chat rutinario/bajo riesgo:** usa modelos de reserva más económicos y enruta según el rol del agente.

    MiniMax tiene su propia documentación: [MiniMax](/en/providers/minimax) y
    [Local models](/en/gateway/local-models).

    Regla general: usa el **mejor modelo que te puedas permitir** para el trabajo de alto riesgo, y un modelo
    más económico para el chat rutinario o los resúmenes. Puedes enrutar modelos por agente y usar subagentes para
    paralelizar tareas largas (cada subagente consume tokens). Consulta [Models](/en/concepts/models) y
    [Sub-agents](/en/tools/subagents).

    Advertencia importante: los modelos más débiles/sobre-cuantizados son más vulnerables a la inyección
    de avisos (prompt injection) y a comportamientos inseguros. Consulta [Security](/en/gateway/security).

    Más contexto: [Models](/en/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelos sin borrar mi configuración?">
    Usa los **comandos de modelo** o edita solo los campos de **modelo**. Evita reemplazos completos de la configuración.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - edita `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evita `config.apply` con un objeto parcial a menos que tengas la intención de reemplazar toda la configuración.
    Si sobrescribiste la configuración, restaura desde una copia de seguridad o vuelve a ejecutar `openclaw doctor` para repararla.

    Documentación: [Models](/en/concepts/models), [Configure](/en/cli/configure), [Config](/en/cli/config), [Doctor](/en/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la forma más fácil para modelos locales.

    Configuración más rápida:

    1. Instale Ollama desde `https://ollama.com/download`
    2. Extraiga un modelo local como `ollama pull glm-4.7-flash`
    3. Si también desea Ollama Cloud, ejecute `ollama signin`
    4. Ejecute `openclaw onboard` y elija `Ollama`
    5. Elija `Local` o `Cloud + Local`

    Notas:

    - `Cloud + Local` le proporciona modelos de Ollama Cloud además de sus modelos locales de Ollama
    - los modelos en la nube como `kimi-k2.5:cloud` no necesitan una extracción local
    - para cambiar manualmente, use `openclaw models list` y `openclaw models set ollama/<model>`

    Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la inyección
    de indicaciones (prompt injection). Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas.
    Si todavía quiere modelos pequeños, active el sandboxing y listas de permitidos estrictas para herramientas.

    Documentación: [Ollama](/en/providers/ollama), [Local models](/en/gateway/local-models),
    [Model providers](/en/concepts/model-providers), [Security](/en/gateway/security),
    [Sandboxing](/en/gateway/sandboxing).

  </Accordion>

<Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
  - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor. - Verifique la configuración de tiempo de ejecución actual en cada puerta de enlace con `openclaw models status`. - Para agentes sensibles a la seguridad/con herramientas habilitadas, use el modelo más fuerte de última generación disponible.
</Accordion>

  <Accordion title="¿Cómo cambio de modelos sobre la marcha (sin reiniciar)?">
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

    `/model` (y `/model list`) muestra un selector numerado compacto. Seleccione por número:

    ```
    /model 3
    ```

    También puede forzar un perfil de autenticación específico para el proveedor (por sesión):

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Consejo: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está utilizando y qué perfil de autenticación se probará a continuación.
    También muestra el endpoint del proveedor configurado (`baseUrl`) y el modo API (`api`) cuando estén disponibles.

    **¿Cómo desanclar un perfil que configuré con @profile?**

    Vuelva a ejecutar `/model` **sin** el sufijo `@profile`:

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
    Use `/model status` para confirmar qué perfil de autenticación está activo.

  </Accordion>

  <Accordion title="¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programar?">
    Sí. Establezca uno como predeterminado y cambie según sea necesario:

    - **Cambio rápido (por sesión):** `/model gpt-5.4` para tareas diarias, `/model openai-codex/gpt-5.4` para programar con OAuth de Codex.
    - **Predeterminado + cambio:** establezca `agents.defaults.model.primary` en `openai/gpt-5.4`, luego cambie a `openai-codex/gpt-5.4` al programar (o viceversa).
    - **Sub-agentes:** envíe tareas de programación a sub-agentes con un modelo predeterminado diferente.

    Consulte [Modelos](/en/concepts/models) y [Comandos de barra](/en/tools/slash-commands).

  </Accordion>

  <Accordion title='¿Por qué veo "Model ... is not allowed" y luego no hay respuesta?'>
    Si `agents.defaults.models` está configurado, se convierte en la **lista blanca** para `/model` y cualquier
    anulación de sesión. Elegir un modelo que no esté en esa lista devuelve:

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    Ese error se devuelve **en lugar de** una respuesta normal. Solución: agregue el modelo a
    `agents.defaults.models`, elimine la lista blanca o elija un modelo de `/model list`.

  </Accordion>

  <Accordion title='¿Por qué veo "Unknown model: minimax/MiniMax-M2.7"?'>
    Esto significa que el **proveedor no está configurado** (no se encontró ninguna configuración del proveedor MiniMax ni perfil de autenticación),
    por lo que no se puede resolver el modelo.

    Lista de verificación de soluciones:

    1. Actualice a una versión actual de OpenClaw (o ejecútela desde la fuente `main`), luego reinicie la puerta de enlace.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista una clave de API de MiniMax
       en los perfiles env/auth para que el proveedor pueda inyectarse.
    3. Use la identificación exacta del modelo (distingue mayúsculas y minúsculas): `minimax/MiniMax-M2.7` o
       `minimax/MiniMax-M2.7-highspeed`.
    4. Ejecute:

       ```bash
       openclaw models list
       ```

       y elija de la lista (o `/model list` en el chat).

    Consulte [MiniMax](/en/providers/minimax) y [Modelos](/en/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?">
    Sí. Use **MiniMax como predeterminado** y cambie de modelos **por sesión** cuando sea necesario.
    Las alternativas son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

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

    Entonces:

    ```
    /model gpt
    ```

    **Opción B: agentes separados**

    - Agente A predeterminado: MiniMax
    - Agente B predeterminado: OpenAI
    - Enrutamiento por agente o usar `/agent` para cambiar

    Documentación: [Modelos](/en/concepts/models), [Enrutamiento multiagente](/en/concepts/multi-agent), [MiniMax](/en/providers/minimax), [OpenAI](/en/providers/openai).

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

    Entonces, `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve en ese ID de modelo.

  </Accordion>

  <Accordion title="¿Cómo agrego modelos de otros proveedores como OpenRouter o Z.AI?">
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

    Si mencionas un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave API para el proveedor después de agregar un nuevo agente**

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

## Conmutación por error de modelo y "Todos los modelos fallaron"

<AccordionGroup>
  <Accordion title="¿Cómo funciona el conmutación por error?">
    La conmutación por error ocurre en dos etapas:

    1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
    2. **Respaldo del modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican tiempos de espera a los perfiles con fallos (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor está limitado por velocidad o falla temporalmente.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó usar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

    **Lista de verificación de solución:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno es cargada por el Gateway**
      - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta el Gateway a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones de múltiples agentes significan que puede haber varios archivos `auth-profiles.json`.
    - **Verificación del estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de solución para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway
    no puede encontrarlo en su almacén de autenticación.

    - **Usar un token de configuración**
      - Ejecute `claude setup-token`, luego péguelo con `openclaw models auth setup-token --provider anthropic`.
      - Si el token fue creado en otra máquina, use `openclaw models auth paste-token --provider anthropic`.
    - **Si desea usar una clave API en su lugar**
      - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de la puerta de enlace**.
      - Borre cualquier orden fija que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando comandos en el host de la puerta de enlace**
      - En modo remoto, los perfiles de autenticación residen en la máquina de la puerta de enlace, no en su portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó usar Google Gemini y falló?">
    Si la configuración de su modelo incluye Google Gemini como respaldo (o cambió a una abreviatura de Gemini), OpenClaw lo intentará durante el respaldo del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

    Solución: proporcione la autenticación de Google o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que el respaldo no se enrute allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Antigravedad de Google)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo provenientes de
    un flujo abortado/parcial). Antigravedad de Google requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Claude de Antigravedad de Google. Si aún aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

  </Accordion>
</AccordionGroup>

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/en/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones de cuenta múltiple)

<AccordionGroup>
  <Accordion title="¿Qué es un perfil de autenticación?">
    Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles residen en:

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="¿Cuáles son los ID de perfil típicos?">
    OpenClaw usa ID con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe una identidad de correo electrónico)
    - `anthropic:<email>` para identidades de OAuth
    - ID personalizados que elija (por ejemplo, `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se intenta primero?">
    Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; asigna IDs a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un **período de enfriamiento** (cooldown) corto (límites de tasa/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** (disabled) más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

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

    Para dirigirse a un agente específico:

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

  </Accordion>

  <Accordion title="OAuth vs. clave de API: ¿cuál es la diferencia?">
    OpenClaw admite ambos:

    - **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponda).
    - **Las claves de API** utilizan la facturación por token.

    El asistente admite explícitamente el token de configuración de Anthropic y OAuth de OpenAI Codex, y puede almacenar claves de API por usted.

  </Accordion>
</AccordionGroup>

## Puerta de enlace (Gateway): puertos, "ya se está ejecutando" y modo remoto

<AccordionGroup>
  <Accordion title="¿Qué puerto usa la Puerta de enlace (Gateway)?">
    `gateway.port` controla el único puerto multiplexado para WebSocket + HTTP (interfaz de usuario de Control, enlaces, etc.).

    Precedencia:

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='¿Por qué el estado de openclaw gateway dice "Runtime: running" pero "RPC probe: failed"?'>
    Porque "running" es la vista del **supervisor** (launchd/systemd/schtasks). La sonda RPC es la CLI conectándose realmente al WebSocket de la puerta de enlace y llamando a `status`.

    Use `openclaw gateway status` y confíe en estas líneas:

    - `Probe target:` (la URL que usó realmente la sonda)
    - `Listening:` (lo que realmente está vinculado en el puerto)
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
    Establece `gateway.mode: "remote"` y apunta a una URL de WebSocket remota, opcionalmente con un token/contraseña:

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

    - `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasas la bandera de anulación).
    - La aplicación de macOS observa el archivo de configuración y cambia los modos en vivo cuando estos valores cambian.

  </Accordion>

  <Accordion title='La interfaz de control dice "no autorizado" (o sigue reconectando). ¿Qué hacer?'>
    Su puerta de enlace se está ejecutando con la autenticación habilitada (`gateway.auth.*`), pero la interfaz no está enviando el token/contraseña coincidente.

    Datos (del código):

    - La interfaz de control guarda el token en `sessionStorage` para la sesión de la pestaña del navegador actual y la URL de la puerta de enlace seleccionada, por lo que las recargas en la misma pestaña siguen funcionando sin restaurar la persistencia del token a largo plazo en localStorage.
    - En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo en caché cuando la puerta de enlace devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

    Solución:

    - Lo más rápido: `openclaw dashboard` (imprime + copia la URL del panel, intenta abrirla; muestra una sugerencia SSH si no hay cabeza).
    - Si aún no tiene un token: `openclaw doctor --generate-gateway-token`.
    - Si es remoto, cree un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`.
    - Establezca `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en el host de la puerta de enlace.
    - En la configuración de la interfaz de control, pegue el mismo token.
    - Si la discordancia persiste después del reintento único, rote/vuelva a aprobar el token del dispositivo emparejado:
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - ¿Todavía atascado? Ejecute `openclaw status --all` y siga [Solución de problemas](/en/gateway/troubleshooting). Consulte [Panel de control](/en/web/dashboard) para obtener detalles de autenticación.

  </Accordion>

  <Accordion title="Configuré gateway.bind tailnet pero no puede enlazar y nada escucha">
    `tailnet` bind elige una IP de Tailscale de sus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que enlazar.

    Solución:

    - Inicie Tailscale en ese host (para que tenga una dirección 100.x), o
    - Cambie a `gateway.bind: "loopback"` / `"lan"`.

    Nota: `tailnet` es explícito. `auto` prefiere el loopback; use `gateway.bind: "tailnet"` cuando desee un enlace exclusivo de tailnet.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios Gateways en el mismo host?">
    Por lo general no: un Gateway puede ejecutar múltiples canales de mensajería y agentes. Use varios Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

    Sí, pero debe aislar:

    - `OPENCLAW_CONFIG_PATH` (configuración por instancia)
    - `OPENCLAW_STATE_DIR` (estado por instancia)
    - `agents.defaults.workspace` (aislamiento del espacio de trabajo)
    - `gateway.port` (puertos únicos)

    Configuración rápida (recomendada):

    - Use `openclaw --profile <name> ...` por instancia (crea automáticamente `~/.openclaw-<name>`).
    - Establezca un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
    - Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

    Los perfiles también sufijan los nombres de los servicios (`ai.openclaw.<profile>`; legado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guía completa: [Multiple gateways](/en/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='¿Qué significa "invalid handshake" / código 1008?'>
    El Gateway es un **servidor WebSocket**, y espera que el primer mensaje sea
    una trama `connect`. Si recibe cualquier otra cosa, cierra la conexión
    con el **código 1008** (violación de política).

    Causas comunes:

    - Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
    - Usó el puerto o la ruta incorrecta.
    - Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud que no es del Gateway.

    Soluciones rápidas:

    1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
    2. No abra el puerto WS en una pestaña normal del navegador.
    3. Si la autenticación está activada, incluya el token/contraseña en la trama `connect`.

    Si está usando la CLI o la TUI, la URL debería verse así:

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Detalles del protocolo: [Gateway protocol](/en/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Registro y depuración

<AccordionGroup>
  <Accordion title="¿Dónde están los registros?">
    Archivos de registro (estructurados):

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Puede establecer una ruta estable mediante `logging.file`. El nivel de registro de archivo está controlado por `logging.level`. La verbosidad de la consola está controlada por `--verbose` y `logging.consoleLevel`.

    Seguimiento de registro más rápido:

    ```bash
    openclaw logs --follow
    ```

    Registros de servicio/supervisor (cuando la puerta de enlace se ejecuta a través de launchd/systemd):

    - macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` y `gateway.err.log` (predeterminado: `~/.openclaw/logs/...`; los perfiles usan `~/.openclaw-<profile>/logs/...`)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Consulte [Solución de problemas](/en/gateway/troubleshooting) para obtener más información.

  </Accordion>

  <Accordion title="¿Cómo inicio/detengo/reinicio el servicio Gateway?">
    Utilice los asistentes de la puerta de enlace:

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si ejecuta la puerta de enlace manualmente, `openclaw gateway --force` puede reclamar el puerto. Consulte [Gateway](/en/gateway).

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

    Documentación: [Windows (WSL2)](/en/platforms/windows), [Manual de servicio de puerta de enlace](/en/gateway).

  </Accordion>

  <Accordion title="El Gateway está activo pero las respuestas nunca llegan. ¿Qué debería comprobar?">
    Empieza con un barrido rápido de salud:

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causas comunes:

    - Auth del modelo no cargado en el **gateway host** (comprueba `models status`).
    - Emparejamiento de canal/lista de permitidos bloqueando las respuestas (comprueba la configuración del canal + registros).
    - WebChat/Dashboard está abierto sin el token correcto.

    Si estás de forma remota, confirma que la conexión del túnel/Tailscale está activa y que el
    WebSocket del Gateway es accesible.

    Docs: [Canales](/en/channels), [Solución de problemas](/en/gateway/troubleshooting), [Acceso remoto](/en/gateway/remote).

  </Accordion>

  <Accordion title='"Desconectado del gateway: sin razón" - ¿qué hacer ahora?'>
    Esto generalmente significa que la interfaz de usuario perdió la conexión WebSocket. Comprueba:

    1. ¿Está ejecutándose el Gateway? `openclaw gateway status`
    2. ¿Está saludable el Gateway? `openclaw status`
    3. ¿Tiene la interfaz de usuario el token correcto? `openclaw dashboard`
    4. Si es remoto, ¿está activo el enlace del túnel/Tailscale?

    Entonces mira los registros:

    ```bash
    openclaw logs --follow
    ```

    Docs: [Dashboard](/en/web/dashboard), [Acceso remoto](/en/gateway/remote), [Solución de problemas](/en/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Telegram setMyCommands falla. ¿Qué debería comprobar?">
    Empiece con los registros y el estado del canal:

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Luego compare el error:

    - `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero aún así es necesario eliminar algunas entradas del menú. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, o errores de red similares: si está en un VPS o detrás de un proxy, confirme que se permite el HTTPS saliente y que el DNS funciona para `api.telegram.org`.

    Si el Gateway es remoto, asegúrese de estar mirando los registros en el host del Gateway.

    Documentación: [Telegram](/en/channels/telegram), [Solución de problemas del canal](/en/channels/troubleshooting).

  </Accordion>

  <Accordion title="La TUI no muestra ninguna salida. ¿Qué debería comprobar?">
    Primero confirme que el Gateway es accesible y que el agente puede ejecutarse:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal
    de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

    Documentación: [TUI](/en/web/tui), [Comandos de barra](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo detengo y luego inicio completamente el Gateway?">
    Si instaló el servicio:

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
    Úselo cuando el Gateway se ejecuta en segundo plano como un demonio.

    Si se está ejecutando en primer plano, deténgalo con Ctrl-C, y luego:

    ```bash
    openclaw gateway run
    ```

    Documentación: [Manual de servicio del Gateway](/en/gateway).

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
    - `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

    Si instaló el servicio, use los comandos de gateway. Use `openclaw gateway` cuando
    quiera una ejecución única en primer plano.

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    Inicie el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro para ver errores de autenticación de canal, enrutamiento de modelo y RPC.
  </Accordion>
</AccordionGroup>

## Multimedia y archivos adjuntos

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    Los archivos adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulte [Configuración del asistente OpenClaw](/en/start/openclaw) y [Envío del agente](/en/tools/agent-send).

    Envío por CLI:

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    También revise:

    - El canal de destino admite medios salientes y no está bloqueado por listas de permitidos.
    - El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048px).
    - `tools.fs.workspaceOnly=true` limita los envíos de ruta local al espacio de trabajo, temp/media-store y archivos validados por sandbox.
    - `tools.fs.workspaceOnly=false` permite que `MEDIA:` envíe archivos locales del host que el agente ya puede leer, pero solo para tipos de documentos seguros y multimedia (imágenes, audio, video, PDF y documentos de Office). Los archivos de texto sin formato y los similares a secretos siguen bloqueados.

    Consulte [Imágenes](/en/nodes/images).

  </Accordion>
</AccordionGroup>

## Seguridad y control de acceso

<AccordionGroup>
  <Accordion title="¿Es seguro exponer OpenClaw a MDs entrantes?">
    Trate los MDs entrantes como entrada no confiable. Los valores predeterminados están diseñados para reducir el riesgo:

    - El comportamiento predeterminado en los canales con capacidad de MD es **emparejamiento**:
      - Los remitentes desconocidos reciben un código de emparejamiento; el bot no procesa su mensaje.
      - Apruebe con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Las solicitudes pendientes están limitadas a **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
    - Abrir MDs públicamente requiere una participación explícita (`dmPolicy: "open"` y lista blanca `"*"`).

    Ejecute `openclaw doctor` para exponer políticas de MD riesgosas.

  </Accordion>

  <Accordion title="¿La inyección de comandos (prompt injection) es solo una preocupación para los bots públicos?">
    No. La inyección de comandos se trata de **contenido no confiable**, no solo de quién puede enviar MD al bot.
    Si su asistente lee contenido externo (búsqueda/recuperación web, páginas del navegador, correos electrónicos,
    documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intenten
    secuestrar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

    El mayor riesgo es cuando las herramientas están habilitadas: el modelo puede ser engañado para
    filtrar contexto o llamar herramientas en su nombre. Reduzca el radio de explosión por:

    - usar un agente "lector" de solo lectura o con herramientas deshabilitadas para resumir contenido no confiable
    - mantener `web_search` / `web_fetch` / `browser` desactivado para agentes con herramientas habilitadas
    - sandboxing y listas blancas de herramientas estrictas

    Detalles: [Seguridad](/en/gateway/security).

  </Accordion>

  <Accordion title="¿Mi bot debería tener su propio correo electrónico, cuenta de GitHub o número de teléfono?">
    Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados
    reduce el radio de explosión si algo sale mal. Esto también facilita la rotación
    de credenciales o la revocación de acceso sin afectar sus cuentas personales.

    Empiece pequeño. Otorgue acceso solo a las herramientas y cuentas que realmente necesita, y expanda
    más tarde si es necesario.

    Documentos: [Seguridad](/en/gateway/security), [Emparejamiento](/en/channels/pairing).

  </Accordion>

  <Accordion title="¿Puedo darle autonomía sobre mis mensajes de texto y es seguro?">
    **No** recomendamos la autonomía total sobre tus mensajes personales. El patrón más seguro es:

    - Mantener los MD en **modo de emparejamiento** o en una lista de permitidos estricta.
    - Usar un **número o cuenta separada** si deseas que envíe mensajes en tu nombre.
    - Dejar que redacte y luego **aprobar antes de enviar**.

    Si deseas experimentar, hazlo en una cuenta dedicada y manténla aislada. Consulta
    [Seguridad](/en/gateway/security).

  </Accordion>

<Accordion title="¿Puedo usar modelos más baratos para tareas de asistente personal?">
  Sí, **siempre que** el agente sea solo de chat y la entrada sea de confianza. Los niveles más pequeños son más susceptibles al secuestro de instrucciones, por lo que se deben evitar para agentes con herramientas habilitadas o al leer contenido no confiable. Si debes usar un modelo más pequeño, restringe las herramientas y ejecútalo dentro de un entorno limitado. Consulta
  [Seguridad](/en/gateway/security).
</Accordion>

  <Accordion title="Ejecuté /start en Telegram pero no recibí un código de emparejamiento">
    Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
    `dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

    Comprueba las solicitudes pendientes:

    ```bash
    openclaw pairing list telegram
    ```

    Si deseas acceso inmediato, añade tu id de remitente a la lista de permitidos o establece `dmPolicy: "open"`
    para esa cuenta.

  </Accordion>

  <Accordion title="WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?">
    No. La política predeterminada de MD de WhatsApp es **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a los envíos explícitos que desencadenas.

    Aprueba el emparejamiento con:

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Lista las solicitudes pendientes:

    ```bash
    openclaw pairing list whatsapp
    ```

    Solicitud del asistente para el número de teléfono: se utiliza para establecer tu **lista de permitidos/propietario** para que se permitan tus propios MD. No se utiliza para el envío automático. Si ejecutas en tu número personal de WhatsApp, usa ese número y habilita `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Comandos de chat, interrupción de tareas y "no se detendrá"

<AccordionGroup>
  <Accordion title="¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?">
    La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose** o **reasoning** están activados
    para esa sesión.

    Solución en el chat donde lo veas:

    ```
    /verbose off
    /reasoning off
    ```

    Si sigue siendo ruidoso, revisa la configuración de la sesión en la Interfaz de Control (Control UI) y establece verbose
    en **inherit** (heredar). También confirma que no estás usando un perfil de bot con `verboseDefault` establecido
    en `on` en la configuración.

    Documentación: [Thinking and verbose](/en/tools/thinking), [Security](/en/gateway/security#reasoning-verbose-output-in-groups).

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

    Estos son desencadenadores de anulación (no comandos de barra).

    Para procesos en segundo plano (de la herramienta exec), puedes pedirle al agente que ejecute:

    ```
    process action:kill sessionId:XXX
    ```

    Resumen de comandos de barra: ver [Slash commands](/en/tools/slash-commands).

    La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista de permitidos.

  </Accordion>

  <Accordion title='¿Cómo envío un mensaje de Discord desde Telegram? ("Cross-context messaging denied")'>
    OpenClaw bloquea la mensajería **entre proveedores** (cross-provider) de forma predeterminada. Si una llamada a herramienta está vinculada
    a Telegram, no enviará a Discord a menos que lo permitas explícitamente.

    Habilita la mensajería entre proveedores para el agente:

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

    Reinicia la puerta de enlace (gateway) después de editar la configuración.

  </Accordion>

  <Accordion title='¿Por qué parece que el bot "ignora" los mensajes rápidos?'>
    El modo de cola controla cómo los nuevos mensajes interactúan con una ejecución en curso. Usa `/queue` para cambiar de modo:

    - `steer` - los nuevos mensajes redirigen la tarea actual
    - `followup` - ejecuta los mensajes de uno en uno
    - `collect` - agrupa los mensajes y responde una vez (predeterminado)
    - `steer-backlog` - guía ahora, luego procesa el acumulado
    - `interrupt` - aborta la ejecución actual y comienza de nuevo

    Puedes añadir opciones como `debounce:2s cap:25 drop:summarize` para los modos de seguimiento.

  </Accordion>
</AccordionGroup>

## Varios

<AccordionGroup>
  <Accordion title="¿Cuál es el modelo predeterminado para Anthropic con una clave API?">
    En OpenClaw, las credenciales y la selección del modelo son cosas separadas. Establecer `ANTHROPIC_API_KEY` (o almacenar una clave API de Anthropic en perfiles de autenticación) habilita la autenticación, pero el modelo predeterminado real es lo que configures en `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-6` o `anthropic/claude-opus-4-6`). Si ves `No credentials
    found for profile "anthropic:default"`, significa que la Gateway no pudo encontrar las credenciales de Anthropic en el `auth-profiles.json` esperado para el agente que se está ejecutando.
  </Accordion>
</AccordionGroup>

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión en GitHub](https://github.com/openclaw/openclaw/discussions).
