---
summary: "Preguntas frecuentes sobre la configuración, instalación y uso de OpenClaw"
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
  <Accordion title="Estoy atascado, la forma más rápida de solucionarlo">
    Usa un agente de IA local que pueda **ver tu máquina**. Eso es mucho más efectivo que preguntar
    en Discord, porque la mayoría de los casos de "estoy atascado" son **problemas de configuración local o del entorno** que
    los asistentes remotos no pueden inspeccionar.

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a solucionar tu configuración
    a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Dale al agente el **código fuente completo** mediante
    la instalación "hackable" (git):

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Esto instala OpenClaw **desde una copia de git**, por lo que el agente puede leer el código + los documentos y
    razonar sobre la versión exacta que estás ejecutando. Siempre puedes volver a la versión estable más tarde
    volviendo a ejecutar el instalador sin `--install-method git`.

    Consejo: pide al agente que **planifique y supervise** la solución (paso a paso) y luego ejecute solo los
    comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

    Si descubres un error o una solución real, por favor abre un issue en GitHub o envía un PR:
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    Comienza con estos comandos (comparte los resultados al pedir ayuda):

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    Lo que hacen:

    - `openclaw status`: instantánea rápida del estado del gateway/agente + configuración básica.
    - `openclaw models status`: verifica la autenticación del proveedor + disponibilidad del modelo.
    - `openclaw doctor`: valida y repara problemas comunes de configuración/estado.

    Otras comprobaciones útiles de la CLI: `openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    Bucle de depuración rápida: [Primeros 60 segundos si algo está roto](#first-60-seconds-if-something-is-broken).
    Documentación de instalación: [Instalación](/es/install), [Opciones del instalador](/es/install/installer), [Actualización](/es/install/updating).

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

    Si aún no tienes una instalación global, ejecútalo a través de `pnpm openclaw onboard`.

  </Accordion>

<Accordion title="¿Cómo abro el panel de control después de la incorporación?">
  El asistente abre tu navegador con una URL del panel de control limpia (sin token) justo después
  de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no
  se inició, copia y pega la URL impresa en la misma máquina.
</Accordion>

  <Accordion title="¿Cómo autentico el panel de control (token) en localhost vs. remoto?">
    **Localhost (misma máquina):**

    - Abre `http://127.0.0.1:18789/`.
    - Si solicita autenticación, pega el token de `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de Control UI.
    - Recupéralo del host del gateway: `openclaw config get gateway.auth.token` (o genera uno: `openclaw doctor --generate-gateway-token`).

    **No en localhost:**

    - **Tailscale Serve** (recomendado): mantén el enlace loopback, ejecuta `openclaw gateway --tailscale serve`, abre `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de Control UI/WebSocket (sin token, asume un host gateway confiable); las API HTTP aún requieren token/contraseña.
    - **Tailnet bind**: ejecuta `openclaw gateway --bind tailnet --token "<token>"`, abre `http://<tailscale-ip>:18789/`, pega el token en la configuración del panel.
    - **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abre `http://127.0.0.1:18789/` y pega el token en la configuración de Control UI.

    Consulta [Dashboard](/es/web/dashboard) y [Superficies web](/es/web) para obtener detalles sobre modos de enlace y autenticación.

  </Accordion>

  <Accordion title="¿Qué entorno de ejecución necesito?">
    Se requiere Node **>= 22**. Se recomienda `pnpm`. Bun **no está recomendado** para el Gateway.
  </Accordion>

  <Accordion title="¿Funciona en Raspberry Pi?">
    Sí. El Gateway es ligero: la documentación indica que **512MB-1GB de RAM**, **1 núcleo** y unos **500MB**
    de disco son suficientes para uso personal, y señala que **una Raspberry Pi 4 puede ejecutarlo**.

    Si quieres margen adicional (registros, medios, otros servicios), se recomiendan **2GB**, pero no es
    un mínimo estricto.

    Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puedes emparejar **nodos** en tu portátil/móvil para
    pantalla local/cámara/lienzo o ejecución de comandos. Consulta [Nodos](/es/nodes).

  </Accordion>

  <Accordion title="¿Algún consejo para instalaciones en Raspberry Pi?">
    Versión corta: funciona, pero espera imperfecciones.

    - Usa un sistema operativo de **64 bits** y mantén Node >= 22.
    - Prefiere la **instalación «hackable» (git)** para que puedas ver los registros y actualizar rápido.
    - Comienza sin canales/habilidades, luego agrégalos uno por uno.
    - Si encuentras problemas raros con binarios, generalmente es un problema de **compatibilidad ARM**.

    Documentación: [Linux](/es/platforms/linux), [Instalación](/es/install).

  </Accordion>

  <Accordion title="Está atascado en wake up my friend / la incorporación no se inicia. ¿Qué hago?">
    Esa pantalla depende de que el Gateway sea accesible y esté autenticado. La TUI también envía
    "¡Despierta, amigo!" automáticamente en el primer inicio. Si ves esa línea **sin respuesta**
    y los tokens se mantienen en 0, el agente nunca se ejecutó.

    1. Reinicia el Gateway:

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

    Si el Gateway es remoto, asegúrate de que la conexión del túnel/Tailscale esté activa y de que la interfaz
    apunte al Gateway correcto. Consulta [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir el incorporado?">
    Sí. Copie el **directorio de estado** y el **espacio de trabajo**, luego ejecute Doctor una vez. Esto
    mantiene su bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado
    del canal) siempre que copie **ambas** ubicaciones:

    1. Instale OpenClaw en la nueva máquina.
    2. Copie `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) desde la máquina antigua.
    3. Copie su espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
    4. Ejecute `openclaw doctor` y reinicie el servicio Gateway.

    Esto preserva la configuración, perfiles de autenticación, credenciales de WhatsApp, sesiones y memoria. Si está en
    modo remoto, recuerde que el host de la puerta de enlace es el dueño del almacén de sesiones y del espacio de trabajo.

    **Importante:** si solo confirma/push su espacio de trabajo a GitHub, está haciendo una copia de seguridad
    de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Esos residen
    en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

    Relacionado: [Migrating](/es/install/migrating), [Where things live on disk](#where-things-live-on-disk),
    [Agent workspace](/es/concepts/agent-workspace), [Doctor](/es/gateway/doctor),
    [Remote mode](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde puedo ver las novedades de la última versión?">
    Consulte el registro de cambios de GitHub:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    Las entradas más recientes están en la parte superior. Si la sección superior está marcada como **Unreleased** (No publicada), la siguiente sección con fecha
    es la última versión publicada. Las entradas se agrupan por **Highlights** (Destacados), **Changes** (Cambios) y
    **Fixes** (Correcciones) (más secciones de documentos/otras cuando sea necesario).

  </Accordion>

  <Accordion title="No se puede acceder a docs.openclaw.ai (error de SSL)">
    Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de Xfinity
    Advanced Security. Desactívelo o agregue `docs.openclaw.ai` a la lista blanca, luego inténtelo de nuevo. Más
    detalles: [Solución de problemas](/es/help/faq#docsopenclawai-shows-an-ssl-error-comcast-xfinity).
    Ayúdenos a desbloquearlo informando aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    Si todavía no puede acceder al sitio, la documentación está reflejada en GitHub:
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Diferencia entre stable y beta">
    **Stable** y **beta** son **dist-tags de npm**, no líneas de código separadas:

    - `latest` = estable
    - `beta` = versión temprana para pruebas

    Enviamos compilaciones a **beta**, las probamos y, una vez que una compilación es sólida, **promovemos
    esa misma versión a `latest`**. Es por eso que beta y stable pueden apuntar a la
    **misma versión**.

    Vea lo que cambió:
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?">
    **Beta** es el dist-tag de npm `beta` (puede coincidir con `latest`).
    **Dev** es la cabeza móvil de `main` (git); cuando se publica, usa el dist-tag de npm `dev`.

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

    2. **Instalación personalizable (desde el sitio del instalador):**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Eso te da un repositorio local que puedes editar, y luego actualizar vía git.

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

  <Accordion title="¿El instalador se atascó? ¿Cómo obtengo más información?">
    Vuelve a ejecutar el instalador con **salida detallada (verbose output)**:

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

    Más opciones: [Installer flags](/es/install/installer).

  </Accordion>

  <Accordion title="La instalación en Windows dice que no se encontró git o que no se reconoce openclaw">
    Dos problemas comunes en Windows:

    **1) error de npm spawn git / git not found**

    - Instale **Git para Windows** y asegúrese de que `git` esté en su PATH.
    - Cierre y vuelva a abrir PowerShell, luego vuelva a ejecutar el instalador.

    **2) no se reconoce openclaw después de la instalación**

    - Su carpeta bin global de npm no está en PATH.
    - Compruebe la ruta:

      ```powershell
      npm config get prefix
      ```

    - Agregue ese directorio a su PATH de usuario (no se necesita sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
    - Cierre y vuelva a abrir PowerShell después de actualizar PATH.

    Si desea la configuración de Windows más fluida, use **WSL2** en lugar de Windows nativo.
    Documentación: [Windows](/es/platforms/windows).

  </Accordion>

  <Accordion title="La salida de exec en Windows muestra caracteres chinos ilegibles: ¿qué debo hacer?">
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

    Luego reinicie el Gateway y vuelva a intentar su comando:

    ```powershell
    openclaw gateway restart
    ```

    Si aún reproduce esto en la última versión de OpenClaw, realice un seguimiento o informe en:

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="La documentación no respondió a mi pregunta: ¿cómo obtengo una mejor respuesta?">
    Use la **instalación (git) hackeable** para tener el código fuente y la documentación completa localmente, luego pregúntele
    a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Más detalles: [Install](/es/install) y [Installer flags](/es/install/installer).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en Linux?">
    Respuesta corta: sigue la guía de Linux y luego ejecuta el onboarding.

    - Ruta rápida de Linux + instalación del servicio: [Linux](/es/platforms/linux).
    - Tutorial completo: [Primeros pasos](/es/start/getting-started).
    - Instalador + actualizaciones: [Instalación y actualizaciones](/es/install/updating).

  </Accordion>

  <Accordion title="¿Cómo instalo OpenClaw en un VPS?">
    Cualquier VPS de Linux funciona. Instala en el servidor y luego usa SSH/Tailscale para acceder a la Gateway.

    Guías: [exe.dev](/es/install/exe-dev), [Hetzner](/es/install/hetzner), [Fly.io](/es/install/fly).
    Acceso remoto: [Gateway remota](/es/gateway/remote).

  </Accordion>

  <Accordion title="¿Dónde están las guías de instalación en la nube/VPS?">
    Mantenemos un **centro de hosting** con los proveedores comunes. Elige uno y sigue la guía:

    - [Hosting VPS](/es/vps) (todos los proveedores en un solo lugar)
    - [Fly.io](/es/install/fly)
    - [Hetzner](/es/install/hetzner)
    - [exe.dev](/es/install/exe-dev)

    Cómo funciona en la nube: la **Gateway se ejecuta en el servidor**, y tú accedes a ella
    desde tu portátil/teléfono mediante la interfaz de Control (o Tailscale/SSH). Tu estado + espacio de trabajo
    residen en el servidor, así que trata el host como la fuente de la verdad y haz copias de seguridad.

    Puedes emparejar **nodos** (Mac/iOS/Android/headless) con esa Gateway en la nube para acceder
    a la pantalla/cámara/lienzo local o ejecutar comandos en tu portátil manteniendo la
    Gateway en la nube.

    Centro: [Plataformas](/es/platforms). Acceso remoto: [Gateway remota](/es/gateway/remote).
    Nodos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo pedirle a OpenClaw que se actualice a sí mismo?">
    Respuesta corta: **posible, no recomendado**. El flujo de actualización puede reiniciar el
    Gateway (lo que finaliza la sesión activa), puede necesitar una extracción limpia de git (checkout), y
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

    Docs: [Actualización](/es/cli/update), [Actualizando](/es/install/updating).

  </Accordion>

  <Accordion title="¿Qué hace realmente la incorporación?">
    `openclaw onboard` es la ruta de configuración recomendada. En **modo local** le guía a través de:

    - **Configuración de modelo/autorización** (flujos de OAuth/token de configuración del proveedor y claves API compatibles, más opciones de modelo local como LM Studio)
    - Ubicación del **Espacio de trabajo** + archivos de arranque
    - **Configuración del Gateway** (bind/puerto/auth/tailscale)
    - **Proveedores** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
    - **Instalación del Demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
    - **Verificaciones de salud** y selección de **habilidades (skills)**

    También advierte si su modelo configurado es desconocido o falta la autorización.

  </Accordion>

  <Accordion title="¿Necesito una suscripción de Claude o OpenAI para ejecutar esto?">
    No. Puede ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/otros) o con
    **modelos solo locales** para que sus datos se mantengan en su dispositivo. Las suscripciones (Claude
    Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

    Si elige la autenticación por suscripción de Anthropic, decida usted mismo si usarla:
    Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
    El OAuth de OpenAI Codex es compatible explícitamente para herramientas externas como OpenClaw.

    Docs: [Anthropic](/es/providers/anthropic), [OpenAI](/es/providers/openai),
    [Modelos locales](/es/gateway/local-models), [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Puedo usar la suscripción Claude Max sin una clave de API?">
    Sí. Puedes autenticarte con un **setup-token**
    en lugar de una clave de API. Esta es la ruta de suscripción.

    Las suscripciones Claude Pro/Max **no incluyen una clave de API**, por lo que esta es la
    ruta técnica para las cuentas de suscripción. Pero esta es tu decisión: Anthropic
    ha bloqueado algunos usos de suscripciones fuera de Claude Code en el pasado.
    Si quieres la ruta compatible más clara y segura para producción, usa una clave de API de Anthropic.

  </Accordion>

<Accordion title="¿Cómo funciona la autenticación setup-token de Anthropic?">
  `claude setup-token` genera una **cadena de token** a través de la CLI de Claude Code (no está
  disponible en la consola web). Puedes ejecutarla en **cualquier máquina**. Elige **Anthropic token
  (pegar setup-token)** en la incorporación o pégalo con `openclaw models auth paste-token
  --provider anthropic`. El token se almacena como un perfil de autenticación para el proveedor
  **anthropic** y se usa como una clave de API (sin actualización automática). Más detalles:
  [OAuth](/es/concepts/oauth).
</Accordion>

  <Accordion title="¿Dónde encuentro un setup-token de Anthropic?">
    **No** está en la Consola de Anthropic. El setup-token es generado por la **CLI de Claude Code** en **cualquier máquina**:

    ```bash
    claude setup-token
    ```

    Copia el token que imprime y luego elige **Anthropic token (pegar setup-token)** en la incorporación. Si quieres ejecutarlo en el host de la puerta de enlace, usa `openclaw models auth setup-token --provider anthropic`. Si ejecutaste `claude setup-token` en otro lugar, pégalo en el host de la puerta de enlace con `openclaw models auth paste-token --provider anthropic`. Consulta [Anthropic](/es/providers/anthropic).

  </Accordion>

  <Accordion title="¿Admites la autenticación por suscripción de Claude (Claude Pro o Max)?">
    Sí: a través de un **setup-token**. OpenClaw ya no reutiliza los tokens OAuth de la CLI de Claude Code; usa un setup-token o una clave de API de Anthropic. Genera el token en cualquier lugar y pégalo en el host de la pasarela. Consulta [Anthropic](/es/providers/anthropic) y [OAuth](/es/concepts/oauth).

    Importante: esto es compatibilidad técnica, no una garantía de política. Anthropic ha bloqueado en el pasado algunos usos de suscripción fuera de Claude Code. Debes decidir si usarlo y verificar los términos vigentes de Anthropic. Para cargas de trabajo de producción o multiusuario, la autenticación con clave de API de Anthropic es la opción más segura y recomendada.

  </Accordion>

  <Accordion title="¿Por qué veo HTTP 429 rate_limit_error de Anthropic?">
    Eso significa que tu **cuota/límite de velocidad de Anthropic** está agotada en la ventana actual. Si usas una **suscripción de Claude** (setup-token), espera a que se reinicie la ventana o actualiza tu plan. Si usas una **clave de API de Anthropic**, revisa la consola de Anthropic para ver el uso/facturación y aumenta los límites según sea necesario.

    Si el mensaje es específicamente:
    `Extra usage is required for long context requests`, la solicitud está intentando usar la versión beta de contexto de 1M de Anthropic (`context1m: true`). Esto solo funciona cuando tu credencial es apta para la facturación de contexto largo (facturación con clave de API o suscripción con Uso Extra activado).

    Consejo: configura un **modelo alternativo** (fallback) para que OpenClaw pueda seguir respondiendo mientras un proveedor esté limitado por velocidad. Consulta [Modelos](/es/cli/models), [OAuth](/es/concepts/oauth) y [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

  </Accordion>

<Accordion title="¿Se admite AWS Bedrock?">
  Sí: a través del proveedor **Amazon Bedrock (Converse)** de pi-ai con **configuración manual**.
  Debe proporcionar las credenciales/región de AWS en el host de la puerta de enlace y añadir una
  entrada de proveedor Bedrock en su configuración de modelos. Vea [Amazon
  Bedrock](/es/providers/bedrock) y [Proveedores de modelos](/es/providers/models). Si prefiere un
  flujo de claves gestionado, un proxy compatible con OpenAI delante de Bedrock sigue siendo una
  opción válida.
</Accordion>

<Accordion title="¿Cómo funciona la autenticación de Codex?">
  OpenClaw admite **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). La
  incorporación puede ejecutar el flujo de OAuth y establecerá el modelo predeterminado en
  `openai-codex/gpt-5.4` cuando sea apropiado. Vea [Proveedores de
  modelos](/es/concepts/model-providers) y [Incorporación (CLI)](/es/start/wizard).
</Accordion>

  <Accordion title="¿Admiten la autenticación por suscripción de OpenAI (Codex OAuth)?">
    Sí. OpenClaw admite totalmente **OpenAI Code (Codex) subscription OAuth**.
    OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujos de trabajo externos
n    como OpenClaw. La incorporación puede ejecutar el flujo de OAuth por usted.

    Vea [OAuth](/es/concepts/oauth), [Proveedores de modelos](/es/concepts/model-providers) y [Incorporación (CLI)](/es/start/wizard).

  </Accordion>

  <Accordion title="¿Cómo configuro OAuth de Gemini CLI?">
    Gemini CLI utiliza un **flujo de autenticación de complemento**, no un id. de cliente o secreto en `openclaw.json`.

    Pasos:

    1. Habilite el complemento: `openclaw plugins enable google`
    2. Inicie sesión: `openclaw models auth login --provider google-gemini-cli --set-default`

    Esto almacena los tokens de OAuth en perfiles de autenticación en el host de la puerta de enlace. Detalles: [Proveedores de modelos](/es/concepts/model-providers).

  </Accordion>

<Accordion title="¿Está bien un modelo local para chats casuales?">
  Generalmente no. OpenClaw necesita un contexto grande + gran seguridad; las tarjetas pequeñas
  truncan y filtrarán. Si es obligatorio, ejecuta la compilación **más grande** de MiniMax M2.5 que
  puedas localmente (LM Studio) y consulta [/gateway/local-models](/es/gateway/local-models). Los
  modelos más pequeños/cuantizados aumentan el riesgo de inyección de avisos - consulta
  [Seguridad](/es/gateway/security).
</Accordion>

<Accordion title="¿Cómo mantengo el tráfico del modelo alojado en una región específica?">
  Elige puntos finales fijos a una región. OpenRouter expone opciones alojadas en EE. UU. para
  MiniMax, Kimi y GLM; elige la variante alojada en EE. UU. para mantener los datos en la región.
  Aún puedes listar Anthropic/OpenAI junto a estos usando `models.mode: "merge"` para que las
  alternativas sigan disponibles respetando el proveedor regional que selecciones.
</Accordion>

  <Accordion title="¿Tengo que comprar un Mac Mini para instalar esto?">
    No. OpenClaw se ejecuta en macOS o Linux (Windows a través de WSL2). Un Mac mini es opcional: algunas personas
    compran uno como host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja de clase Raspberry Pi también funciona.

    Solo necesitas un Mac **para herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/es/channels/bluebubbles) (recomendado): el servidor BlueBubbles se ejecuta en cualquier Mac, y la Pasarela puede ejecutarse en Linux o en otro lugar. Si deseas otras herramientas exclusivas de macOS, ejecuta la Pasarela en un Mac o empareja un nodo macOS.

    Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes), [Modo remoto de Mac](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Necesito un Mac mini para la compatibilidad con iMessage?">
    Necesitas **algún dispositivo macOS** con sesión iniciada en Messages. **No** tiene que ser un Mac mini -
    cualquier Mac funciona. **Usa [BlueBubbles](/es/channels/bluebubbles)** (recomendado) para iMessage: el servidor de BlueBubbles se ejecuta en macOS, mientras que el Gateway puede ejecutarse en Linux o en otro lugar.

    Configuraciones comunes:

    - Ejecuta el Gateway en Linux/VPS y ejecuta el servidor de BlueBubbles en cualquier Mac con sesión iniciada en Messages.
    - Ejecuta todo en el Mac si deseas la configuración de una sola máquina más sencilla.

    Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes),
    [Modo remoto de Mac](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro?">
    Sí. El **Mac mini puede ejecutar el Gateway** y tu MacBook Pro puede conectarse como un
    **nodo** (dispositivo acompañante). Los nodos no ejecutan el Gateway; proporcionan capacidades adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

    Patrón común:

    - Gateway en el Mac mini (siempre encendido).
    - El MacBook Pro ejecuta la aplicación de macOS o un host de nodo y se empareja con el Gateway.
    - Usa `openclaw nodes status` / `openclaw nodes list` para verlo.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

  </Accordion>

  <Accordion title="¿Puedo usar Bun?">
    Bun **no es recomendado**. Vemos errores de tiempo de ejecución, especialmente con WhatsApp y Telegram.
    Usa **Node** para gateways estables.

    Si aún deseas experimentar con Bun, hazlo en un gateway que no sea de producción
    sin WhatsApp/Telegram.

  </Accordion>

  <Accordion title="Telegram: ¿qué va en allowFrom?">
    `channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

    La incorporación acepta entrada `@username` y la resuelve a un ID numérico, pero la autorización de OpenClaw solo usa IDs numéricos.

    Más seguro (sin bot de terceros):

    - Envía un MD a tu bot, luego ejecuta `openclaw logs --follow` y lee `from.id`.

    API oficial del Bot:

    - Envía un MD a tu bot, luego llama `https://api.telegram.org/bot<bot_token>/getUpdates` y lee `message.from.id`.

    De terceros (menos privado):

    - Envía un MD a `@userinfobot` o `@getidsbot`.

    Consulta [/channels/telegram](/es/channels/telegram#access-control-and-activation).

  </Accordion>

<Accordion title="¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?">
  Sí, a través del **enrutamiento multiagente**. Vincule el **MD** de WhatsApp de cada remitente
  (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, para que
  cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún
  provienen de la **misma cuenta de WhatsApp**, y el control de acceso de MD
  (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp.
  Consulte [Enrutamiento multiagente](/es/concepts/multi-agent) y [WhatsApp](/es/channels/whatsapp).
</Accordion>

<Accordion title='¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para programación"?'>
  Sí. Utilice el enrutamiento multi-agente: asigne a cada agente su propio modelo predeterminado y
  luego vincule las rutas de entrada (cuenta de proveedor o pares específicos) a cada agente. Un
  ejemplo de configuración se encuentra en [Enrutamiento Multi-Agente ](/es/concepts/multi-agent).
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

    Si ejecutas OpenClaw a través de systemd, asegúrate de que el PATH del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells que no son de inicio de sesión.
    Las compilaciones recientes también anteponen directorios bin comunes de usuario en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

  </Accordion>

  <Accordion title="Diferencia entre la instalación "hackable" de git y la instalación npm">
    - **Instalación hackable (git):** descarga completa del código fuente, editable, lo mejor para colaboradores.
      Ejecutas compilaciones localmente y puedes parchear código/documentación.
    - **npm install:** instalación global de CLI, sin repositorio, lo mejor para "solo ejecutarlo".
      Las actualizaciones provienen de las dist-tags de npm.

    Documentación: [Primeros pasos](/es/start/getting-started), [Actualización](/es/install/updating).

  </Accordion>

  <Accordion title="¿Puedo cambiar entre las instalaciones npm y git más tarde?">
    Sí. Instala la otra variante y luego ejecuta Doctor para que el servicio de gateway apunte al nuevo punto de entrada.
    Esto **no elimina tus datos**: solo cambia la instalación del código de OpenClaw. Tu estado
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

    Doctor detecta una discrepancia en el punto de entrada del servicio de gateway y ofrece reescribir la configuración del servicio para que coincida con la instalación actual (usa `--repair` en automatización).

    Consejos de copia de seguridad: consulta [Estrategia de copia de seguridad](#where-things-live-on-disk).

  </Accordion>

  <Accordion title="¿Debo ejecutar el Gateway en mi portátil o en un VPS?">
    Respuesta corta: **si deseas fiabilidad 24/7, utiliza un VPS**. Si quieres la
    menor fricción y te parece bien el reposo/reinicios, ejecútalo localmente.

    **Portátil (Gateway local)**

    - **Ventajas:** sin coste de servidor, acceso directo a archivos locales, ventana de navegador en vivo.
    - **Desventajas:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del sistema operativo interrumpen, debe permanecer encendido.

    **VPS / nube**

    - **Ventajas:** siempre activo, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
    - **Desventajas:** a menudo se ejecuta sin cabeza (headless) (usa capturas de pantalla), acceso remoto a archivos solamente, debes usar SSH para las actualizaciones.

    **Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord funcionan bien desde un VPS. El único compromiso real es el **navegador sin cabeza (headless)** frente a una ventana visible. Consulta [Browser](/es/tools/browser).

    **Recomendación por defecto:** VPS si has tenido desconexiones del gateway anteriormente. Lo local es excelente cuando usas activamente el Mac y deseas acceso a archivos locales o automatización de interfaz de usuario con un navegador visible.

  </Accordion>

  <Accordion title="¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?">
    No es obligatorio, pero **recomendado para la fiabilidad y el aislamiento**.

    - **Host dedicado (VPS/Mac mini/Pi):** siempre activo, menos interrupciones por suspensión/reinicio, permisos más limpios, más fácil de mantener en ejecución.
    - **Portátil/escritorio compartido:** totalmente bien para pruebas y uso activo, pero espera pausas cuando la máquina se suspenda o se actualice.

    Si quieres lo mejor de ambos mundos, mantiene el Gateway en un host dedicado y empareja tu portátil como un **nodo** para herramientas locales de pantalla/cámara/exec. Consulta [Nodes](/es/nodes).
    Para orientación sobre seguridad, lee [Security](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?">
    OpenClaw es ligero. Para una puerta de enlace básica + un canal de chat:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
    - **Recomendado:** 1-2 vCPU, 2GB de RAM o más para tener margen (registros, medios, múltiples canales). Las herramientas de nodo y la automatización del navegador pueden consumir muchos recursos.

    SO: utilice **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación de Linux se prueba mejor allí.

    Documentación: [Linux](/es/platforms/linux), [Alojamiento VPS](/es/vps).

  </Accordion>

  <Accordion title="¿Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos?">
    Sí. Trate una VM igual que un VPS: debe estar siempre encendida, accesible y tener suficiente
    RAM para la Gateway y cualquier canal que habilite.

    Directrices básicas:

    - **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
    - **Recomendado:** 2GB de RAM o más si ejecuta varios canales, automatización del navegador o herramientas de medios.
    - **SO:** Ubuntu LTS u otro Debian/Ubuntu moderno.

    Si está en Windows, **WSL2 es la configuración de estilo VM más fácil** y tiene la mejor compatibilidad
    de herramientas. Consulte [Windows](/es/platforms/windows), [Alojamiento VPS](/es/vps).
    Si está ejecutando macOS en una VM, consulte [VM macOS](/es/install/macos-vm).

  </Accordion>
</AccordionGroup>

## ¿Qué es OpenClaw?

<AccordionGroup>
  <Accordion title="¿Qué es OpenClaw, en un solo párrafo?">
    OpenClaw es un asistente de IA personal que ejecutas en tus propios dispositivos. Responde en las plataformas de mensajería que ya usas (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) y también puede hacer voz + un Canvas en vivo en las plataformas compatibles. El **Gateway** es el plano de control siempre activo; el asistente es el producto.
  </Accordion>

  <Accordion title="Propuesta de valor">
    OpenClaw no es "simplemente un envoltorio de Claude". Es un **plano de control con prioridad local** que te permite ejecutar un
    asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
    sesiones con estado, memoria y herramientas, sin ceder el control de tus flujos de trabajo a un
    SaaS alojado.

    Aspectos destacados:

    - **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
      espacio de trabajo + historial de sesiones localmente.
    - **Canales reales, no un sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      además de voz móvil y Canvas en plataformas compatibles.
    - **Agnóstico a modelos:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
      y conmutación por error por agente.
    - **Opción solo local:** ejecuta modelos locales para que **todos los datos pueden permanecer en tu dispositivo** si lo deseas.
    - **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
      espacio de trabajo y valores predeterminados.
    - **Código abierto y modificable:** inspecciona, extiende y autoaloja sin bloqueo de proveedor.

    Documentación: [Gateway](/es/gateway), [Canales](/es/channels), [Multiagente](/es/concepts/multi-agent),
    [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Acabo de configurarlo, ¿qué debo hacer primero?">
    Buenos primeros proyectos:

    - Crear un sitio web (WordPress, Shopify o un sitio estático sencillo).
    - Prototipar una aplicación móvil (esquema, pantallas, plan de API).
    - Organizar archivos y carpetas (limpieza, nomenclatura, etiquetado).
    - Conectar Gmail y automatizar resúmenes o seguimientos.

    Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
    usas subagentes para el trabajo en paralelo.

  </Accordion>

  <Accordion title="¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw?">
    Los logros cotidianos generalmente se ven así:

    - **Briefings personales:** resúmenes de bandeja de entrada, calendario y noticias que te interesan.
    - **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores para correos electrónicos o documentos.
    - **Recordatorios y seguimientos:** avisos y listas de verificación impulsados por cron o latidos.
    - **Automatización del navegador:** completar formularios, recopilar datos y repetir tareas web.
    - **Coordinación entre dispositivos:** envía una tarea desde tu teléfono, deja que el Gateway la ejecute en un servidor y recibe el resultado de vuelta en el chat.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ayudar con la generación de clientes potenciales, el contacto, los anuncios y los blogs para un SaaS?">
    Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
    resumir prospectos y escribir borradores de textos de contacto o anuncios.

    Para **campañas de contacto o anuncios**, mantenga a un humano en el ciclo. Evite el spam, cumpla con las leyes locales y
    las políticas de la plataforma, y revise todo antes de enviarlo. El patrón más seguro es dejar
    que OpenClaw redacte y usted apruebe.

    Documentación: [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?">
    OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo de IDE. Utilice
    Claude Code o Codex para el ciclo de codificación directa más rápido dentro de un repositorio. Use OpenClaw cuando desee
    memoria duradera, acceso entre dispositivos y orquestación de herramientas.

    Ventajas:

    - **Memoria persistente + espacio de trabajo** a través de sesiones
    - **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
    - **Orquestación de herramientas** (navegador, archivos, programación, hooks)
    - **Pasarela siempre activa** (ejecutar en un VPS, interactuar desde cualquier lugar)
    - **Nodos** para navegador/pantalla/cámara/exec local

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Habilidades y automatización

<AccordionGroup>
  <Accordion title="¿Cómo personalizo las habilidades sin ensuciar el repositorio?">
    Use anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o añada una carpeta a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` > `~/.openclaw/skills` > agrupado, por lo que las anulaciones administradas ganan sin tocar git. Solo las ediciones dignas de upstream deben vivir en el repositorio y enviarse como PRs.
  </Accordion>

  <Accordion title="¿Puedo cargar habilidades desde una carpeta personalizada?">
    Sí. Añada directorios adicionales mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (menor precedencia). La precedencia predeterminada se mantiene: `<workspace>/skills` → `~/.openclaw/skills` → empaquetadas → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de forma predeterminada, lo cual OpenClaw trata como `<workspace>/skills` en la siguiente sesión.
  </Accordion>

  <Accordion title="¿Cómo puedo usar diferentes modelos para diferentes tareas?">
    Hoy, los patrones compatibles son:

    - **Cron jobs**: los trabajos aislados pueden establecer una anulación `model` por trabajo.
    - **Sub-agentes**: enrutar tareas a agentes separados con diferentes modelos predeterminados.
    - **Cambio a pedido**: use `/model` para cambiar el modelo de la sesión actual en cualquier momento.

    Consulte [Cron jobs](/es/automation/cron-jobs), [Enrutamiento multiagente](/es/concepts/multi-agent) y [Comandos de barra diagonal](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="El bot se congela mientras realiza trabajos pesados. ¿Cómo puedo descargar eso?">
    Usa **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
    devuelven un resumen y mantienen tu chat principal receptivo.

    Pide a tu bot que "genere un sub-agente para esta tarea" o usa `/subagents`.
    Usa `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

    Consejo sobre tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, configura un
    modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

    Documentación: [Sub-agentes](/es/tools/subagents).

  </Accordion>

  <Accordion title="¿Cómo funcionan las sesiones de subagentes vinculadas a hilos en Discord?">
    Use enlaces de hilos. Puede vincular un hilo de Discord a un subagente o destino de sesión para que los mensajes de seguimiento en ese hilo permanezcan en esa sesión vinculada.

    Flujo básico:

    - Generar con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para un seguimiento persistente).
    - O vincular manualmente con `/focus <target>`.
    - Use `/agents` para inspeccionar el estado del vínculo.
    - Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el desenfoque automático.
    - Use `/unfocus` para desvincular el hilo.

    Configuración requerida:

    - Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Sobrescrituras de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Vinculación automática al generar: configure `channels.discord.threadBindings.spawnSubagentSessions: true`.

    Documentación: [Sub-agentes](/es/tools/subagents), [Discord](/es/channels/discord), [Referencia de configuración](/es/gateway/configuration-reference), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿El cron o los recordatorios no se ejecutan? ¿Qué debería comprobar?">
    El cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
    las tareas programadas no se ejecutarán.

    Lista de comprobación:

    - Confirme que el cron está habilitado (`cron.enabled`) y que `OPENCLAW_SKIP_CRON` no está establecido.
    - Compruebe que el Gateway se está ejecutando 24/7 (sin suspensiones/reinicios).
    - Verifique la configuración de zona horaria para la tarea (`--tz` vs zona horaria del host).

    Depuración:

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    Documentación: [Tareas Cron](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat).

  </Accordion>

  <Accordion title="¿Cómo instalo habilidades en Linux?">
    Use **ClawHub** (CLI) o coloque habilidades en su espacio de trabajo. La interfaz de usuario de Skills de macOS no está disponible en Linux.
    Explore habilidades en [https://clawhub.com](https://clawhub.com).

    Instale la CLI de ClawHub (elija un gestor de paquetes):

    ```bash
    npm i -g clawhub
    ```

    ```bash
    pnpm add -g clawhub
    ```

  </Accordion>

  <Accordion title="¿Puede OpenClaw ejecutar tareas según una programación o continuamente en segundo plano?">
    Sí. Utilice el programador de Gateway:

    - **Cron jobs** (Trabajos cron) para tareas programadas o recurrentes (persisten tras los reinicios).
    - **Heartbeat** (Latido) para comprobaciones periódicas de la "sesión principal".
    - **Isolated jobs** (Trabajos aislados) para agentes autónomos que publican resúmenes o los envían a chats.

    Documentación: [Cron jobs](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat),
    [Heartbeat](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title="¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?">
    No directamente. Las habilidades de macOS están controladas por `metadata.openclaw.os` además de los binarios requeridos, y las habilidades solo aparecen en el prompt del sistema cuando son elegibles en el **host Gateway**. En Linux, las habilidades exclusivas de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que anules el control de acceso.

    Tienes tres patrones admitidos:

    **Opción A: ejecutar el Gateway en una Mac (lo más sencillo).**
    Ejecuta el Gateway donde existen los binarios de macOS, luego conéctate desde Linux en [modo remoto](#gateway-ports-already-running-and-remote-mode) o a través de Tailscale. Las habilidades se cargan normalmente porque el host Gateway es macOS.

    **Opción B: usar un nodo macOS (sin SSH).**
    Ejecuta el Gateway en Linux, empareja un nodo macOS (aplicación de menubar) y configura **Node Run Commands** en "Always Ask" (Preguntar siempre) o "Always Allow" (Permitir siempre) en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si eliges "Always Ask", aprobar "Always Allow" en el prompt añade ese comando a la lista de permitidos.

    **Opción C: hacer proxy de binarios macOS a través de SSH (avanzado).**
    Mantén el Gateway en Linux, pero haz que los binarios CLI requeridos se resuelvan a envoltorios SSH que se ejecutan en una Mac. Luego anula la habilidad para permitir Linux de modo que permanezca elegible.

    1. Crea un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Coloca el envoltorio en `PATH` en el host Linux (por ejemplo `~/bin/memo`).
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
    No está integrada de forma nativa hoy en día.

    Opciones:

    - **Habilidad / complemento personalizado:** es lo mejor para un acceso fiable a la API (tanto Notion como HeyGen tienen APIs).
    - **Automatización del navegador:** funciona sin código, pero es más lento y más frágil.

    Si quieres mantener el contexto por cliente (flujos de trabajo de agencias), un patrón sencillo es:

    - Una página de Notion por cliente (contexto + preferencias + trabajo activo).
    - Pide al agente que obtenga esa página al inicio de una sesión.

    Si quieres una integración nativa, abre una solicitud de función o construye una habilidad
    orientada a esas APIs.

    Instalar habilidades:

    ```bash
    clawhub install <skill-slug>
    clawhub update --all
    ```

    ClawHub se instala en `./skills` bajo tu directorio actual (o recurre a tu espacio de trabajo configurado de OpenClaw); OpenClaw lo trata como `<workspace>/skills` en la siguiente sesión. Para habilidades compartidas entre agentes, colócalas en `~/.openclaw/skills/<name>/SKILL.md`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulta la entrada de FAQ de Homebrew Linux anterior). Consulta [Habilidades](/es/tools/skills) y [ClawHub](/es/tools/clawhub).

  </Accordion>

  <Accordion title="¿Cómo uso mi Chrome con sesión iniciada existente con OpenClaw?">
    Use el perfil `user` del navegador integrado, que se conecta a través de Chrome DevTools MCP:

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si desea un nombre personalizado, cree un perfil MCP explícito:

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    Esta ruta es local al host. Si Gateway se ejecuta en otro lugar, ejecute un host de nodo en la máquina del navegador o use CDP remoto en su lugar.

  </Accordion>
</AccordionGroup>

## Sandboxing y memoria

<AccordionGroup>
  <Accordion title="¿Existe un documento dedicado al sandboxing?">
    Sí. Consulte [Sandboxing](/es/gateway/sandboxing). Para la configuración específica de Docker (gateway completo en Docker o imágenes de sandbox), consulte [Docker](/es/install/docker).
  </Accordion>

  <Accordion title="Docker se siente limitado: ¿cómo habilito todas las funciones?">
    La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye
    paquetes del sistema, Homebrew ni navegadores integrados. Para una configuración más completa:

    - Persiste `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
    - Incluye dependencias del sistema en la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Instala los navegadores de Playwright mediante la CLI incluida:
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Establece `PLAYWRIGHT_BROWSERS_PATH` y asegúrate de que la ruta se mantenga.

    Documentación: [Docker](/es/install/docker), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Puedo mantener los MD personales pero hacer que los grupos sean públicos/sandboxed con un solo agente?">
    Sí, si su tráfico privado son **MDs** y su tráfico público son **grupos**.

    Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en Docker, mientras que la sesión principal de MD se mantiene en el host. Luego, restrinja las herramientas disponibles en las sesiones sandboxed mediante `tools.sandbox.tools`.

    Tutorial de configuración + ejemplo de configuración: [Grupos: MDs personales + grupos públicos](/es/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Referencia clave de configuración: [Configuración de puerta de enlace](/es/gateway/configuration-reference#agents-defaults-sandbox)

  </Accordion>

<Accordion title="¿Cómo enlazo una carpeta del host en el entorno limitado?">
  Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (por ejemplo,
  `"/home/user/src:/src:ro"`). Los enlaces globales + por agente se combinan; los enlaces por agente
  se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que los
  enlaces omiten las barreras del sistema de archivos del entorno limitado. Consulte
  [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs
  Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para
  ver ejemplos y notas de seguridad.
</Accordion>

  <Accordion title="¿Cómo funciona la memoria?">
    La memoria de OpenClaw son simplemente archivos Markdown en el espacio de trabajo del agente:

    - Notas diarias en `memory/YYYY-MM-DD.md`
    - Notas a largo plazo curadas en `MEMORY.md` (solo sesiones principales/privadas)

    OpenClaw también ejecuta un **flush de memoria de pre-compacción silencioso** para recordarle al modelo
    que escriba notas duraderas antes de la auto-compacción. Esto solo se ejecuta cuando el espacio de trabajo
    tiene permisos de escritura (los entornos sandbox de solo lectura lo omiten). Consulte [Memory](/es/concepts/memory).

  </Accordion>

  <Accordion title="La memoria sigue olvidando cosas. ¿Cómo hago que persista?">
    Pídele al bot que **escriba el dato en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
    el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

    Esta es todavía un área que estamos mejorando. Ayuda recordarle al modelo que almacene memorias;
    sabrá qué hacer. Si sigue olvidando, verifica que la Gateway esté utilizando el mismo
    espacio de trabajo en cada ejecución.

    Documentación: [Memoria](/es/concepts/memory), [Espacio de trabajo del agente](/es/concepts/agent-workspace).

  </Accordion>

  <Accordion title="¿La memoria persiste para siempre? ¿Cuáles son los límites?">
    Los archivos de memoria residen en el disco y persisten hasta que los eliminas. El límite es tu
    almacenamiento, no el modelo. El **contexto de la sesión** todavía está limitado por la ventana de
    contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Por eso existe
    la búsqueda de memoria: recupera solo las partes relevantes al contexto.

    Documentos: [Memory](/es/concepts/memory), [Context](/es/concepts/context).

  </Accordion>

  <Accordion title="¿La búsqueda de memoria semántica requiere una clave de API de OpenAI?">
    Solo si usas **incrustaciones de OpenAI**. El OAuth de Codex cubre chat/completos y
    **no** otorga acceso a las incrustaciones, por lo que **iniciar sesión con Codex (OAuth o el
    inicio de sesión de la CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Las incrustaciones de OpenAI
    aún necesitan una clave de API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

    Si no configuras un proveedor explícitamente, OpenClaw selecciona automáticamente un proveedor cuando puede
    resolver una clave de API (perfiles de autenticación, `models.providers.*.apiKey`, o variables de entorno).
    Prefiere OpenAI si se resuelve una clave de OpenAI, de lo contrario Gemini si se resuelve una clave de Gemini,
    luego Voyage, luego Mistral. Si no hay ninguna clave remota disponible, la
    búsqueda de memoria permanece deshabilitada hasta que la configures. Si tienes una ruta de modelo local
    configurada y presente, OpenClaw
    prefiere `local`. Ollama es compatible cuando configuras explícitamente
    `memorySearch.provider = "ollama"`.

    Si prefieres permanecer local, establece `memorySearch.provider = "local"` (y opcionalmente
    `memorySearch.fallback = "none"`). Si quieres incrustaciones de Gemini, establece
    `memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
    `memorySearch.remote.apiKey`). Admitimos modelos de incrustación **OpenAI, Gemini, Voyage, Mistral, Ollama o locales**
    - consulta [Memoria](/es/concepts/memory) para obtener detalles de la configuración.

  </Accordion>
</AccordionGroup>

## Dónde residen las cosas en el disco

<AccordionGroup>
  <Accordion title="¿Todos los datos utilizados con OpenClaw se guardan localmente?">
    No: **el estado de OpenClaw es local**, pero **los servicios externos siguen viendo lo que les envías**.

    - **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de la Gateway
      (`~/.openclaw` + tu directorio de espacio de trabajo).
    - **Remoto por necesidad:** los mensajes que envías a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
      sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
      servidores.
    - **Controlas la huella:** el uso de modelos locales mantiene los avisos en tu máquina, pero el tráfico
      del canal todavía pasa a través de los servidores del canal.

    Relacionado: [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="¿Dónde almacena OpenClaw sus datos?">
    Todo se encuentra bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

    | Ruta                                                            | Propósito                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación de OAuth heredada (copiada en los perfiles de autenticación en el primer uso)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y `keyRef`/`tokenRef` opcionales)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga secreta respaldada por archivo opcional para proveedores `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas `api_key` estáticas depuradas)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (ej. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial de conversación y estado (por agente)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de la sesión (por agente)                                       |

    Ruta heredada de un solo agente: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

    Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) es independiente y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="¿Dónde deben residir AGENTS.md / SOUL.md / USER.md / MEMORY.md?">
    Estos archivos residen en el **espacio de trabajo del agente**, no en `~/.openclaw`.

    - **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md` (o alternativa heredada `memory.md` cuando `MEMORY.md` está ausente),
      `memory/YYYY-MM-DD.md`, opcional `HEARTBEAT.md`.
    - **Directorio de estado (`~/.openclaw`)**: configuración, credenciales, perfiles de autenticación, sesiones, registros,
      y habilidades compartidas (`~/.openclaw/skills`).

    El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable mediante:

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si el bot "olvida" después de un reinicio, confirme que la Gateway está utilizando el mismo
    espacio de trabajo en cada inicio (y recuerde: el modo remoto utiliza el espacio de trabajo
    del **host de la gateway**, no su computadora portátil local).

    Consejo: si desea un comportamiento o preferencia duradero, pídale al bot que **lo escriba en
    AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

    Vea [Espacio de trabajo del agente](/es/concepts/agent-workspace) y [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Estrategia de copia de seguridad recomendada">
    Pon tu **espacio de trabajo del agente** en un repositorio git **privado** y haz una copia de seguridad en algún lugar
    privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
    y te permite restaurar la "mente" del asistente más tarde.

    **No** confirmes (commit) nada bajo `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
    Si necesitas una restauración completa, haz una copia de seguridad del espacio de trabajo y del directorio de estado
    por separado (consulta la pregunta sobre migración anterior).

    Documentación: [Espacio de trabajo del agente](/es/concepts/agent-workspace).

  </Accordion>

<Accordion title="¿Cómo desinstalo OpenClaw por completo?">
  Consulta la guía dedicada: [Desinstalación](/es/install/uninstall).
</Accordion>

  <Accordion title="¿Pueden los agentes trabajar fuera del espacio de trabajo?">
    Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un entorno de prueba estricto (sandbox).
    Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
    ubicaciones del host a menos que se habilite el sandbox. Si necesita aislamiento, use
    [`agents.defaults.sandbox`](/es/gateway/sandboxing) o configuraciones de sandbox por agente. Si
    quiere que un repositorio sea el directorio de trabajo predeterminado, apunte el
    `workspace` de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantenga el
    espacio de trabajo separado a menos que intencionalmente quiera que el agente trabaje dentro de él.

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

  <Accordion title="Estoy en modo remoto: ¿dónde está el almacenamiento de la sesión?">
    El estado de la sesión es propiedad del **host de la puerta de enlace**. Si estás en modo remoto, el almacenamiento de la sesión que te interesa está en la máquina remota, no en tu portátil local. Consulta [Gestión de sesiones](/es/concepts/session).
  </Accordion>
</AccordionGroup>

## Conceptos básicos de configuración

<AccordionGroup>
  <Accordion title="¿Qué formato tiene la configuración? ¿Dónde está?">
    OpenClaw lee una configuración opcional **JSON5** desde `$OPENCLAW_CONFIG_PATH` (por defecto: `~/.openclaw/openclaw.json`):

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si falta el archivo, utiliza valores predeterminados más o menos seguros (incluyendo un espacio de trabajo predeterminado de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='He establecido gateway.bind: "lan" (o "tailnet") y ahora nada escucha / la interfaz de usuario dice no autorizado'>
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

    - `gateway.remote.token` / `.password` **no** habilitan la autenticación de la puerta de enlace local por sí mismos.
    - Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
    - Si `gateway.auth.token` / `gateway.auth.password` están configurados explícitamente a través de SecretRef y sin resolver, la resolución falla de forma cerrada (sin enmascaramiento de alternativa remota).
    - La interfaz de usuario de Control se autentica a través de `connect.params.auth.token` (almacenado en la configuración de la aplicación/interfaz). Evite poner tokens en las URL.

  </Accordion>

  <Accordion title="¿Por qué necesito un token en localhost ahora?">
    OpenClaw exige la autenticación por token de forma predeterminada, incluido el bucle local. Si no se configura ningún token, el inicio de la puerta de enlace genera uno automáticamente y lo guarda en `gateway.auth.token`, por lo que **los clientes WS locales deben autenticarse**. Esto impide que otros procesos locales llamen a la puerta de enlace.

    Si **realmente** desea un bucle local abierto, establezca `gateway.auth.mode: "none"` explícitamente en su configuración. Doctor puede generar un token para usted en cualquier momento: `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="¿Tengo que reiniciar después de cambiar la configuración?">
    El Gateway supervisa la configuración y admite la recarga en caliente (hot-reload):

    - `gateway.reload.mode: "hybrid"` (predeterminado): aplica en caliente los cambios seguros, reinicia para los críticos
    - `hot`, `restart`, `off` también son compatibles

  </Accordion>

  <Accordion title="¿Cómo desactivo los eslóganes divertidos de la CLI?">
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

    - `off`: oculta el texto del eslogan pero mantiene la línea de título/versión del banner.
    - `default`: usa `All your chats, one OpenClaw.` cada vez.
    - `random`: eslóganes divertidos/estacionales rotativos (comportamiento predeterminado).
    - Si no desea ningún banner, establezca la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

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

    La configuración de búsqueda web específica del proveedor ahora reside en `plugins.entries.<plugin>.config.webSearch.*`.
    Las rutas de proveedor `tools.web.search.*` heredadas todavía se cargan temporalmente por compatibilidad, pero no se deben usar para configuraciones nuevas.

    Notas:

    - Si usa listas de permitidos, agregue `web_search`/`web_fetch` o `group:web`.
    - `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
    - Los demonios leen las variables de entorno de `~/.openclaw/.env` (o del entorno del servicio).

    Documentación: [Web tools](/es/tools/web).

  </Accordion>

  <Accordion title="config.apply borró mi configuración. ¿Cómo me recupero y evito esto?">
    `config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo lo demás se elimina.

    Recuperación:

    - Restaura desde una copia de seguridad (git o una copia de `~/.openclaw/openclaw.json`).
    - Si no tienes copia de seguridad, vuelve a ejecutar `openclaw doctor` y reconfigura los canales/modelos.
    - Si esto fue inesperado, informa de un error e incluye tu última configuración conocida o cualquier copia de seguridad.
    - Un agente de codificación local a menudo puede reconstruir una configuración funcional a partir de registros o historial.

    Evítalo:

    - Usa `openclaw config set` para cambios pequeños.
    - Usa `openclaw configure` para ediciones interactivas.

    Documentación: [Config](/es/cli/config), [Configure](/es/cli/configure), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Cómo ejecuto un Gateway central con trabajadores especializados en diferentes dispositivos?">
    El patrón común es **un Gateway** (ej. Raspberry Pi) más **nodos** y **agentes**:

    - **Gateway (central):** posee los canales (Signal/WhatsApp), el enrutamiento y las sesiones.
    - **Nodos (dispositivos):** Macs/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
    - **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (ej. "ops de Hetzner", "Datos personales").
    - **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando deseas paralelismo.
    - **TUI:** conéctate al Gateway y cambia de agentes/sesiones.

    Documentación: [Nodos](/es/nodes), [Acceso remoto](/es/gateway/remote), [Enrutamiento multi-agente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [TUI](/es/web/tui).

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

    El valor predeterminado es `false` (con interfaz). El modo headless es más probable que active comprobaciones anti-bot en algunos sitios. Consulte [Browser](/es/tools/browser).

    El modo headless utiliza el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias son:

    - No hay ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
    - Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
      Por ejemplo, X/Twitter a menudo bloquea sesiones headless.

  </Accordion>

  <Accordion title="¿Cómo uso Brave para el control del navegador?">
    Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie el Gateway.
    Vea los ejemplos de configuración completos en [Browser](/es/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways y nodos remotos

<AccordionGroup>
  <Accordion title="¿Cómo se propagan los comandos entre Telegram, el gateway y los nodos?">
    Los mensajes de Telegram son manejados por el **gateway**. El gateway ejecuta el agente y
    solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

    Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

    Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

  </Accordion>

  <Accordion title="¿Cómo puede mi agente acceder a mi ordenador si el Gateway se aloja de forma remota?">
    Respuesta corta: **empareja tu ordenador como un nodo**. El Gateway se ejecuta en otro lugar, pero puede
    invocar herramientas `node.*` (pantalla, cámara, sistema) en tu máquina local a través del WebSocket del Gateway.

    Configuración típica:

    1. Ejecuta el Gateway en el host siempre activo (VPS/servidor doméstico).
    2. Coloca el host del Gateway y tu ordenador en la misma tailnet.
    3. Asegúrate de que el WS del Gateway sea accesible (enlace de tailnet o túnel SSH).
    4. Abre la aplicación de macOS localmente y conéctate en el modo **Remoto a través de SSH** (o tailnet directa)
       para que pueda registrarse como un nodo.
    5. Aprueba el nodo en el Gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    No se requiere ningún puente TCP separado; los nodos se conectan a través del WebSocket del Gateway.

    Recordatorio de seguridad: emparejar un nodo de macOS permite `system.run` en esa máquina. Solo
    empareja dispositivos en los que confíes y revisa [Seguridad](/es/gateway/security).

    Documentación: [Nodos](/es/nodes), [Protocolo de Gateway](/es/gateway/protocol), [Modo remoto de macOS](/es/platforms/mac/remote), [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="Tailscale está conectado pero no recibo respuestas. ¿Qué hago?">
    Comprueba lo básico:

    - El Gateway se está ejecutando: `openclaw gateway status`
    - Estado del Gateway: `openclaw status`
    - Estado del canal: `openclaw channels status`

    Luego verifica la autenticación y el enrutamiento:

    - Si usas Tailscale Serve, asegúrate de que `gateway.auth.allowTailscale` esté configurado correctamente.
    - Si te conectas a través de un túnel SSH, confirma que el túnel local está activo y apunta al puerto correcto.
    - Confirma que tus listas de permitidos (DM o grupo) incluyen tu cuenta.

    Documentación: [Tailscale](/es/gateway/tailscale), [Acceso remoto](/es/gateway/remote), [Canales](/es/channels).

  </Accordion>

  <Accordion title="¿Pueden dos instancias de OpenClaw comunicarse entre sí (local + VPS)?">
    Sí. No hay un puente incorporado de "bot a bot", pero puedes configurarlo de algunas
    formas confiables:

    **Lo más sencillo:** usa un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
    Haz que el Bot A envíe un mensaje al Bot B y luego deja que el Bot B responda como de costumbre.

    **Puente CLI (genérico):** ejecuta un script que llame al otro Gateway con
    `openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
    escuche. Si un bot está en un VPS remoto, apunta tu CLI a ese Gateway remoto
    a través de SSH/Tailscale (ver [Acceso remoto](/es/gateway/remote)).

    Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar el Gateway de destino):

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Consejo: añade una barrera de protección para que los dos bots no hagan un bucle infinito (solo menciones, listas de permitidos
    de canales, o una regla de "no responder a mensajes de bots").

    Documentación: [Acceso remoto](/es/gateway/remote), [CLI de agente](/es/cli/agent), [Envío de agente](/es/tools/agent-send).

  </Accordion>

  <Accordion title="¿Necesito VPS separados para múltiples agentes?">
    No. Una única pasarela (Gateway) puede alojar múltiples agentes, cada uno con su propio espacio de trabajo, valores predeterminados de modelo
    y enrutamiento. Esa es la configuración normal y es mucho más económica y sencilla que ejecutar
    una VPS por agente.

    Utilice VPS separados solo cuando necesite un aislamiento estricto (límites de seguridad) o configuraciones
    muy diferentes que no desee compartir. De lo contrario, mantenga una sola pasarela (Gateway)
    y use múltiples agentes o subagentes.

  </Accordion>

  <Accordion title="¿Hay algún beneficio en usar un nodo en mi laptop personal en lugar de SSH desde un VPS?">
    Sí: los nodos son la forma principal de alcanzar su laptop desde una puerta de enlace (Gateway) remota, y desbloquean más que el acceso de shell. La puerta de enlace se ejecuta en macOS/Linux (Windows a través de WSL2) y es ligera (un pequeño VPS o una caja de clase Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración común es un host siempre activo más su laptop como un nodo.

    - **No se requiere SSH entrante.** Los nodos se conectan al WebSocket de la puerta de enlace y usan el emparejamiento de dispositivos.
    - **Controles de ejecución más seguros.** `system.run` está limitado por listas de aprobación/aprobaciones de nodo en esa laptop.
    - **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
    - **Automatización del navegador local.** Mantenga la puerta de enlace en un VPS, pero ejecute Chrome localmente a través de un host de nodo en la laptop, o adjunte al Chrome local en el host a través de Chrome MCP.

    SSH está bien para el acceso de shell ad hoc, pero los nodos son más simples para los flujos de trabajo continuos de agentes y la automatización de dispositivos.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Los nodos ejecutan un servicio de puerta de enlace?">
    No. Solo se debe ejecutar **una puerta de enlace** por host a menos que intencionalmente ejecute perfiles aislados (consulte [Múltiples puertas de enlace](/es/gateway/multiple-gateways)). Los nodos son periféricos que se conectan a la puerta de enlace (nodos iOS/Android, o "modo nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin cabeza y control CLI, consulte [CLI de host de nodo](/es/cli/node).

    Se requiere un reinicio completo para los cambios de `gateway`, `discovery` y `canvasHost`.

  </Accordion>

<Accordion title="¿Hay una forma de API / RPC para aplicar la configuración?">
  Sí. `config.apply` valida + escribe la configuración completa y reinicia la puerta de enlace como
  parte de la operación.
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

    Esto mantiene el gateway vinculado al loopback y expone HTTPS a través de Tailscale. Consulta [Tailscale](/es/gateway/tailscale).

  </Accordion>

  <Accordion title="¿Cómo conecto un nodo Mac a una puerta de enlace remota (Tailscale Serve)?">
    Serve expone la **interfaz de usuario de control de Gateway + WS**. Los nodos se conectan a través del mismo punto final de WS del Gateway.

    Configuración recomendada:

    1. **Asegúrese de que el VPS + Mac estén en la misma tailnet**.
    2. **Use la aplicación macOS en modo Remoto** (el destino SSH puede ser el nombre de host de la tailnet).
       La aplicación realizará un túnel del puerto del Gateway y se conectará como un nodo.
    3. **Aprobar el nodo** en la puerta de enlace:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Docs: [Protocolo de puerta de enlace](/es/gateway/protocol), [Descubrimiento](/es/gateway/discovery), [modo remoto macOS](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Debo instalar en un segundo portátil o simplemente agregar un nodo?">
    Si solo necesita **herramientas locales** (pantalla/cámara/exec) en el segundo portátil, agréguelo como un
    **nodo**. Esto mantiene una sola Pasarela (Gateway) y evita la configuración duplicada. Las herramientas de nodo local
    actualmente solo funcionan en macOS, pero planeamos extenderlas a otros sistemas operativos.

    Instale una segunda Pasarela solo cuando necesite **aislamiento estricto** o dos bots completamente separados.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Múltiples pasarelas](/es/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables de entorno y carga de .env

<AccordionGroup>
  <Accordion title="¿Cómo carga OpenClaw las variables de entorno?">
    OpenClaw lee las variables de entorno del proceso principal (shell, launchd/systemd, CI, etc.) y adicionalmente carga:

    - `.env` desde el directorio de trabajo actual
    - un respaldo global `.env` desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

    Ninguno de los archivos `.env` anula las variables de entorno existentes.

    También puede definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consulte [/environment](/es/help/environment) para obtener la precedencia y fuentes completas.

  </Accordion>

  <Accordion title="Inicié la Pasarela mediante el servicio y mis variables de entorno desaparecieron. ¿Qué hago?">
    Dos correcciones comunes:

    1. Coloque las claves faltantes en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de su shell.
    2. Habilite la importación de shell (comodidad opcional):

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

    Esto ejecuta su shell de inicio de sesión e importa solo las claves esperadas que faltan (nunca anula). Equivalentes de variables de entorno:
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='Establecí COPILOT_GITHUB_TOKEN, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?'>
    `openclaw models status` informa si la **importación de entorno de shell** está habilitada. "Shell env: off"
    **no** significa que falten tus variables de entorno, solo significa que OpenClaw no cargará
    tu shell de inicio de sesión automáticamente.

    Si el Gateway se ejecuta como un servicio (launchd/systemd), no heredará tu entorno
    de shell. Soluciónalo haciendo una de estas cosas:

    1. Pon el token en `~/.openclaw/.env`:

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. O habilita la importación de shell (`env.shellEnv.enabled: true`).
    3. O agrégalo a tu bloque de configuración `env` (aplica solo si falta).

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
    Envía `/new` o `/reset` como un mensaje independiente. Consulta [Gestión de sesiones](/es/concepts/session).
  </Accordion>

  <Accordion title="¿Las sesiones se restablecen automáticamente si nunca envío /new?">
    Sí. Las sesiones expiran después de `session.idleMinutes` (predeterminado **60**). El **siguiente**
    mensaje inicia un id de sesión nuevo para esa clave de chat. Esto no elimina
    las transcripciones, solo inicia una nueva sesión.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="¿Hay alguna forma de crear un equipo de instancias de OpenClaw (un CEO y muchos agentes)?">
    Sí, a través del **enrutamiento multi-agente** y los **sub-agentes**. Puedes crear un agente
    coordinador y varios agentes trabajadores con sus propios espacios de trabajo y modelos.

    Dicho esto, esto se considera mejor como un **experimento divertido**. Consume muchos tokens y a menudo
    es menos eficiente que usar un bot con sesiones separadas. El modelo típico que
    imaginamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
    bot también puede generar sub-agentes cuando sea necesario.

    Documentación: [Enrutamiento multi-agente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [CLI de Agentes](/es/cli/agents).

  </Accordion>

  <Accordion title="¿Por qué se truncó el contexto a mitad de la tarea? ¿Cómo puedo evitarlo?">
    El contexto de la sesión está limitado por la ventana del modelo. Chats largos, salidas grandes de herramientas o muchos
    archivos pueden provocar una compactación o truncamiento.

    Lo que ayuda:

    - Pide al bot que resuma el estado actual y lo escriba en un archivo.
    - Usa `/compact` antes de tareas largas, y `/new` al cambiar de tema.
    - Mantén el contexto importante en el espacio de trabajo y pide al bot que lo vuelva a leer.
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
    - Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo desarrollo; borra configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

  </Accordion>

  <Accordion title='Estoy recibiendo errores de "contexto demasiado grande" - ¿cómo puedo restablecer o compactar?'>
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

    Si sigue sucediendo:

    - Habilite o ajuste el **recorte de sesión** (`agents.defaults.contextPruning`) para recortar la salida antigua de las herramientas.
    - Use un modelo con una ventana de contexto más grande.

    Documentación: [Compactación](/es/concepts/compaction), [Recorte de sesión](/es/concepts/session-pruning), [Gestión de sesiones](/es/concepts/session).

  </Accordion>

  <Accordion title='¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?'>
    Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el `input` requerido. Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos o un cambio de herramienta/esquema).

    Solución: inicie una sesión nueva con `/new` (mensaje independiente).

  </Accordion>

  <Accordion title="¿Por qué recibo mensajes de latido cada 30 minutos?">
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

  <Accordion title='¿Necesito agregar una "cuenta de bot" a un grupo de WhatsApp?'>
    No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
    De forma predeterminada, las respuestas de grupo están bloqueadas hasta que permitas remitentes (`groupPolicy: "allowlist"`).

    Si deseas que solo **tú** puedas activar las respuestas de grupo:

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

    Busca `chatId` (o `from`) que termine en `@g.us`, como:
    `1234567890-1234567890@g.us`.

    Opción 2 (si ya está configurado/en la lista permitida): enumera los grupos desde la configuración:

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Documentación: [WhatsApp](/es/channels/whatsapp), [Directorio](/es/cli/directory), [Registros](/es/cli/logs).

  </Accordion>

  <Accordion title="¿Por qué OpenClaw no responde en un grupo?">
    Dos causas comunes:

    - El filtrado de menciones está activado (predeterminado). Debes @mencionar al bot (o coincidir con `mentionPatterns`).
    - Configuraste `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista permitida.

    Consulta [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).

  </Accordion>

<Accordion title="¿Los grupos/hilos comparten contexto con los MD?">
  Los chats directos se colapsan en la sesión principal de forma predeterminada. Los grupos/canales
  tienen sus propias claves de sesión, y los temas de Telegram / los hilos de Discord son sesiones
  separadas. Consulta [Grupos](/es/channels/groups) y [Mensajes de
  grupo](/es/channels/group-messages).
</Accordion>

  <Accordion title="¿Cuántos espacios de trabajo y agentes puedo crear?">
    No hay límites estrictos. Docenas (incluso cientos) están bien, pero vigila lo siguiente:

    - **Crecimiento del disco:** las sesiones + transcripciones viven bajo `~/.openclaw/agents/<agentId>/sessions/`.
    - **Costo de tokens:** más agentes significan más uso concurrente del modelo.
    - **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

    Consejos:

    - Mantén un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
    - Poda las sesiones antiguas (elimina las entradas JSONL o del almacén) si el disco crece.
    - Usa `openclaw doctor` para detectar espacios de trabajo huérfanos y discrepancias de perfil.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debo configurarlo?">
    Sí. Usa el **Enrutamiento Multi-Agente** para ejecutar varios agentes aislados y enrutar los mensajes entrantes por
    canal/cuenta/par. Slack es compatible como canal y puede vincularse a agentes específicos.

    El acceso al navegador es potente pero no "hacer todo lo que un humano puede"; los antibots, los CAPTCHAs y la MFA todavía
    pueden bloquear la automatización. Para el control del navegador más confiable, usa Chrome MCP local en el host,
    o usa CDP en la máquina que realmente ejecuta el navegador.

    Configuración recomendada:

    - Host de pasarela (Gateway) siempre activo (VPS/Mac mini).
    - Un agente por rol (vinculaciones).
    - Canal(es) de Slack vinculados a esos agentes.
    - Navegador local a través de Chrome MCP o un nodo cuando sea necesario.

    Documentación: [Enrutamiento Multi-Agente](/es/concepts/multi-agent), [Slack](/es/channels/slack),
    [Navegador](/es/tools/browser), [Nodos](/es/nodes).

  </Accordion>
</AccordionGroup>

## Modelos: valores predeterminados, selección, alias, cambio

<AccordionGroup>
  <Accordion title='¿Cuál es el "modelo predeterminado"?'>
    El modelo predeterminado de OpenClaw es lo que configures como:

    ```
    agents.defaults.model.primary
    ```

    Los modelos se referencian como `provider/model` (ejemplo: `anthropic/claude-opus-4-6`). Si omites el proveedor, OpenClaw actualmente asume `anthropic` como una reserva de desuso temporal, pero aún debes configurar `provider/model` **explícitamente**.

  </Accordion>

  <Accordion title="¿Qué modelo recomiendas?">
    **Recomendación por defecto:** usa el modelo más potente de la última generación disponible en tu pila de proveedores.
    **Para agentes con herramientas o entradas que no son de confianza:** da prioridad a la potencia del modelo sobre el costo.
    **Para chat rutinario o de bajo riesgo:** usa modelos de respaldo más económicos y enruta según el rol del agente.

    MiniMax tiene su propia documentación: [MiniMax](/es/providers/minimax) y
    [Modelos locales](/es/gateway/local-models).

    Regla general: usa el **mejor modelo que puedas permitir** para trabajos de alto riesgo y un modelo
    más económico para el chat rutinario o los resúmenes. Puedes enrutar modelos por agente y usar sub-agentes para
    paralelizar tareas largas (cada sub-agente consume tokens). Consulta [Modelos](/es/concepts/models) y
    [Sub-agentes](/es/tools/subagents).

    Advertencia importante: los modelos más débiles o sobre-cuantizados son más vulnerables a la inyección
    de instrucciones y a comportamientos inseguros. Consulta [Seguridad](/es/gateway/security).

    Más contexto: [Modelos](/es/concepts/models).

  </Accordion>

  <Accordion title="¿Cómo cambio de modelos sin borrar mi configuración?">
    Usa **comandos de modelo** o edita solo los campos de **modelo**. Evita reemplazos completos de la configuración.

    Opciones seguras:

    - `/model` en el chat (rápido, por sesión)
    - `openclaw models set ...` (actualiza solo la configuración del modelo)
    - `openclaw configure --section model` (interactivo)
    - edita `agents.defaults.model` en `~/.openclaw/openclaw.json`

    Evita `config.apply` con un objeto parcial a menos que tengas la intención de reemplazar toda la configuración.
    Si sobrescribiste la configuración, restáurala desde una copia de seguridad o vuelve a ejecutar `openclaw doctor` para repararla.

    Documentación: [Modelos](/es/concepts/models), [Configurar](/es/cli/configure), [Config](/es/cli/config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?">
    Sí. Ollama es la opción más fácil para modelos locales.

    Configuración más rápida:

    1. Instala Ollama desde `https://ollama.com/download`
    2. Descarga un modelo local como `ollama pull glm-4.7-flash`
    3. Si también quieres Ollama Cloud, ejecuta `ollama signin`
    4. Ejecuta `openclaw onboard` y elige `Ollama`
    5. Elige `Local` o `Cloud + Local`

    Notas:

    - `Cloud + Local` te da modelos de Ollama Cloud además de tus modelos locales de Ollama
    - los modelos en la nube como `kimi-k2.5:cloud` no necesitan una descarga local
    - para cambiar manualmente, usa `openclaw models list` y `openclaw models set ollama/<model>`

    Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la
    inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas.
    Si todavía quieres modelos pequeños, activa el sandboxing y listas de permisos de herramientas estrictas.

    Documentación: [Ollama](/es/providers/ollama), [Modelos locales](/es/gateway/local-models),
    [Proveedores de modelos](/es/concepts/model-providers), [Seguridad](/es/gateway/security),
    [Sandboxing](/es/gateway/sandboxing).

  </Accordion>

<Accordion title="¿Qué usan OpenClaw, Flawd y Krill para los modelos?">
  - Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija
  de proveedor. - Verifica la configuración de tiempo de ejecución actual en cada puerta de enlace
  con `openclaw models status`. - Para agentes con herramientas y sensibles a la seguridad, usa el
  modelo más potente de la última generación disponible.
</Accordion>

  <Accordion title="¿Cómo cambio de modelos sobre la marcha (sin reiniciar)?">
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

    Consejo: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está usando y qué perfil de autenticación se probará a continuación.
    También muestra el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando está disponible.

    **¿Cómo fijo un perfil que configuré con @profile?**

    Vuelva a ejecutar `/model` **sin** el sufijo `@profile`:

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
    Use `/model status` para confirmar qué perfil de autenticación está activo.

  </Accordion>

  <Accordion title="¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programar?">
    Sí. Establezca uno como predeterminado y cambie según sea necesario:

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
    `agents.defaults.models`, eliminar la lista de permitidos, o elegir un modelo de `/model list`.

  </Accordion>

  <Accordion title='¿Por qué veo "Unknown model: minimax/MiniMax-M2.7"?'>
    Esto significa que **el proveedor no está configurado** (no se encontró ninguna configuración de proveedor de MiniMax ni perfil de autenticación),
    por lo que no se puede resolver el modelo. Una solución para esta detección está en **2026.1.12** (sin lanzar en el momento de escribir esto).

    Lista de comprobación para la solución:

    1. Actualice a **2026.1.12** (o ejecute desde el código fuente `main`), luego reinicie la puerta de enlace.
    2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista una clave de API de MiniMax
       en los perfiles de entorno/autenticación para que se pueda inyectar el proveedor.
    3. Use el ID de modelo exacto (distingue mayúsculas y minúsculas): `minimax/MiniMax-M2.7`,
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
    Sí. Use **MiniMax como el predeterminado** y cambie los modelos **por sesión** cuando sea necesario.
    Los mecanismos de respaldo (fallbacks) son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

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

    Luego:

    ```
    /model gpt
    ```

    **Opción B: agentes separados**

    - Agente A predeterminado: MiniMax
    - Agente B predeterminado: OpenAI
    - Enrutamiento por agente o use `/agent` para cambiar

    Documentación: [Modelos](/es/concepts/models), [Enrutamiento Multi-Agente](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

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

    Si establece su propio alias con el mismo nombre, su valor prevalecerá.

  </Accordion>

  <Accordion title="¿Cómo defino/sobreescribo los atajos de modelo (alias)?">
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

    Entonces `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve a ese ID de modelo.

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

    Si haces referencia a un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (ej. `No API key found for provider "zai"`).

    **No se encontró ninguna clave API para el proveedor después de añadir un nuevo agente**

    Esto generalmente significa que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y se almacena en:

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
  <Accordion title="¿Cómo funciona la conmutación por error (failover)?">
    La conmutación por error ocurre en dos etapas:

    1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
    2. **Retorno del modelo (fallback)** al siguiente modelo en `agents.defaults.model.fallbacks`.

    Se aplican períodos de enfriamiento a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor está limitado por tasa o fallando temporalmente.

  </Accordion>

  <Accordion title='¿Qué significa "No credentials found for profile anthropic:default"?'>
    Significa que el sistema intentó usar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

    **Lista de verificación de solución:**

    - **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
      - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
    - **Confirmar que su variable de entorno está cargada por la Gateway**
      - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta la Gateway a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
    - **Asegurarse de que está editando el agente correcto**
      - Las configuraciones de múltiples agentes significan que puede haber múltiples archivos `auth-profiles.json`.
    - **Verificación de cordura del estado del modelo/autenticación**
      - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

    **Lista de verificación de solución para "No credentials found for profile anthropic"**

    Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero la Gateway
    no puede encontrarlo en su almacén de autenticación.

    - **Usar un token de configuración**
      - Ejecute `claude setup-token`, luego péguelo con `openclaw models auth setup-token --provider anthropic`.
      - Si el token se creó en otra máquina, use `openclaw models auth paste-token --provider anthropic`.
    - **Si desea usar una clave API en su lugar**
      - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de la puerta de enlace**.
      - Borre cualquier orden fija que fuerce un perfil faltante:

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmar que está ejecutando comandos en el host de la puerta de enlace**
      - En modo remoto, los perfiles de autenticación residen en la máquina de la puerta de enlace, no en su computadora portátil.

  </Accordion>

  <Accordion title="¿Por qué también intentó Google Gemini y falló?">
    Si la configuración de tu modelo incluye Google Gemini como respaldo (o cambiaste a un alias de Gemini), OpenClaw lo intentará durante el respaldo del modelo. Si no has configurado las credenciales de Google, verás `No API key found for provider "google"`.

    Solución: proporciona la autenticación de Google, o elimina/evita los modelos de Google en `agents.defaults.model.fallbacks` / aliases para que el respaldo no enrude hacia allí.

    **Solicitud de LLM rechazada: se requiere firma de pensamiento (Google Antigravity)**

    Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo provenientes de
    un flujo abortado/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

    Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Google Antigravity Claude. Si aun aparece, inicia una **nueva sesión** o configura `/thinking off` para ese agente.

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

  <Accordion title="¿Cuáles son los IDs de perfil típicos?">
    OpenClaw usa IDs con prefijo de proveedor como:

    - `anthropic:default` (común cuando no existe identidad de correo electrónico)
    - `anthropic:<email>` para identidades OAuth
    - IDs personalizados que elijas (ej. `anthropic:work`)

  </Accordion>

  <Accordion title="¿Puedo controlar qué perfil de autenticación se intenta primero?">
    Sí. La configuración admite metadatos opcionales para perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; asigna IDs a proveedor/modo y establece el orden de rotación.

    OpenClaw puede omitir temporalmente un perfil si está en un **periodo de enfriamiento** (cooldown) corto (límites de velocidad/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** (disabled) más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

    También puede establecer una anulación de orden **por agente** (almacenada en `auth-profiles.json` de ese agente) mediante la CLI:

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

  <Accordion title="OAuth vs clave API - ¿cuál es la diferencia?">
    OpenClaw admite ambos:

    - **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponda).
    - **Las claves API** utilizan facturación de pago por token.

    El asistente admite explícitamente el token de configuración de Anthropic y OAuth de OpenAI Codex, y puede almacenar claves API por usted.

  </Accordion>
</AccordionGroup>

## Puerta de enlace (Gateway): puertos, "ya se está ejecutando" y modo remoto

<AccordionGroup>
  <Accordion title="¿Qué puerto utiliza la Puerta de enlace (Gateway)?">
    `gateway.port` controla el puerto único multiplexado para WebSocket + HTTP (Interfaz de usuario de control, enlaces, etc.).

    Precedencia:

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='¿Por qué el estado de la puerta de enlace (gateway) de openclaw dice "Runtime: running" pero "RPC probe: failed"?'>
    Porque "running" (en ejecución) es la vista del **supervisor** (launchd/systemd/schtasks). La sonda RPC es la CLI conectándose realmente al WebSocket de la puerta de enlace y llamando a `status`.

    Use `openclaw gateway status` y confíe en estas líneas:

    - `Probe target:` (la URL que la sonda realmente usó)
    - `Listening:` (lo que realmente está vinculado en el puerto)
    - `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

  </Accordion>

  <Accordion title='¿Por qué el estado del gateway de openclaw muestra "Config (cli)" y "Config (service)" diferentes?'>
    Estás editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

    Solución:

    ```bash
    openclaw gateway install --force
    ```

    Ejecuta eso desde el mismo `--profile` / entorno que deseas que use el servicio.

  </Accordion>

  <Accordion title='¿Qué significa "another gateway instance is already listening"?'>
    OpenClaw impone un bloqueo de tiempo de ejecución vinculando el oyente de WebSocket inmediatamente al inicio (por defecto `ws://127.0.0.1:18789`). Si la vinculación falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

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

  <Accordion title='La Interfaz de Control UI dice "no autorizado" (o sigue reconectándose). ¿Qué ahora?'>
    Su puerta de enlace (gateway) se está ejecutando con la autenticación habilitada (`gateway.auth.*`), pero la interfaz no está enviando el token/contraseña correspondiente.

    Datos (del código):

    - La Interfaz de Control UI mantiene el token en `sessionStorage` para la sesión de la pestaña actual del navegador y la URL de la puerta de enlace seleccionada, por lo que las recargas en la misma pestaña siguen funcionando sin restaurar la persistencia del token a largo plazo en localStorage.
    - En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo almacenado en caché cuando la puerta de enlace devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

    Solución:

    - Lo más rápido: `openclaw dashboard` (imprime + copia la URL del panel, intenta abrirla; muestra un consejo SSH si no hay interfaz gráfica).
    - Si aún no tiene un token: `openclaw doctor --generate-gateway-token`.
    - Si es remoto, cree un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`.
    - Configure `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en el host de la puerta de enlace.
    - En la configuración de la Interfaz de Control UI, pegue el mismo token.
    - Si la discrepancia persiste después del reintento único, rote/vuelva a aprobar el token del dispositivo emparejado:
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - ¿Sigues atascado? Ejecute `openclaw status --all` y siga [Solución de problemas](/es/gateway/troubleshooting). Consulte [Panel de control](/es/web/dashboard) para detalles de autenticación.

  </Accordion>

  <Accordion title="Configuré gateway.bind tailnet pero no puede vincularse y nada escucha">
    `tailnet` bind elige una IP de Tailscale de sus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que vincularse.

    Solución:

    - Inicie Tailscale en ese host (para que tenga una dirección 100.x), o
    - Cambie a `gateway.bind: "loopback"` / `"lan"`.

    Nota: `tailnet` es explícito. `auto` prefiere loopback; use `gateway.bind: "tailnet"` cuando desee un enlace exclusivo de tailnet.

  </Accordion>

  <Accordion title="¿Puedo ejecutar múltiples Gateways en el mismo host?">
    Por lo general no: un Gateway puede ejecutar múltiples canales de mensajería y agentes. Use múltiples Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

    Sí, pero debe aislar:

    - `OPENCLAW_CONFIG_PATH` (configuración por instancia)
    - `OPENCLAW_STATE_DIR` (estado por instancia)
    - `agents.defaults.workspace` (aislamiento del espacio de trabajo)
    - `gateway.port` (puertos únicos)

    Configuración rápida (recomendada):

    - Use `openclaw --profile <name> ...` por instancia (crea automáticamente `~/.openclaw-<name>`).
    - Establezca un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
    - Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

    Los perfiles también añaden sufijos a los nombres de los servicios (`ai.openclaw.<profile>`; heredado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guía completa: [Múltiples gateways](/es/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='¿Qué significa "handshake inválido" / código 1008?'>
    El Gateway es un **servidor WebSocket**, y espera que el primer mensaje sea
    un marco `connect`. Si recibe cualquier otra cosa, cierra la conexión
    con el **código 1008** (violación de política).

    Causas comunes:

    - Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
    - Usó el puerto o la ruta incorrectos.
    - Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud no perteneciente al Gateway.

    Soluciones rápidas:

    1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
    2. No abra el puerto WS en una pestaña normal del navegador.
    3. Si la autenticación está activa, incluya el token/contraseña en el marco `connect`.

    Si está usando la CLI o la TUI, la URL debería verse así:

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Detalles del protocolo: [Protocolo Gateway](/es/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Registro y depuración

<AccordionGroup>
  <Accordion title="¿Dónde están los registros?">
    Archivos de registro (estructurados):

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Puede establecer una ruta estable mediante `logging.file`. El nivel de registro de archivo se controla mediante `logging.level`. La verbosidad de la consola se controla mediante `--verbose` y `logging.consoleLevel`.

    Seguimiento de registro más rápido:

    ```bash
    openclaw logs --follow
    ```

    Registros de servicio/supervisor (cuando la puerta de enlace se ejecuta mediante launchd/systemd):

    - macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` y `gateway.err.log` (predeterminado: `~/.openclaw/logs/...`; los perfiles usan `~/.openclaw-<profile>/logs/...`)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Consulte [Solución de problemas](/es/gateway/troubleshooting) para obtener más información.

  </Accordion>

  <Accordion title="¿Cómo inicio/detengo/reinicio el servicio Gateway?">
    Utilice los asistentes de puerta de enlace:

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

    Documentación: [Windows (WSL2)](/es/platforms/windows), [Manual de servicio de la puerta de enlace](/es/gateway).

  </Accordion>

  <Accordion title="El Gateway está activo pero las respuestas nunca llegan. ¿Qué debería comprobar?">
    Comience con un rápido chequeo de estado:

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causas comunes:

    - Autenticación del modelo no cargada en el **host del gateway** (compruebe `models status`).
    - Emparejamiento de canal/lista blanca bloqueando las respuestas (compruebe la configuración del canal + registros).
    - WebChat/Dashboard está abierto sin el token correcto.

    Si está remoto, confirme que la conexión túnel/Tailscale está activa y que el
    WebSocket del Gateway es accesible.

    Documentación: [Canales](/es/channels), [Solución de problemas](/es/gateway/troubleshooting), [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title='"Desconectado del gateway: sin motivo" - ¿y ahora qué?'>
    Esto generalmente significa que la interfaz de usuario perdió la conexión WebSocket. Compruebe:

    1. ¿Está funcionando el Gateway? `openclaw gateway status`
    2. ¿Está el Gateway en buen estado? `openclaw status`
    3. ¿Tiene la interfaz el token correcto? `openclaw dashboard`
    4. Si es remoto, ¿está activo el enlace túnel/Tailscale?

    Luego, revise los registros:

    ```bash
    openclaw logs --follow
    ```

    Documentación: [Panel de control](/es/web/dashboard), [Acceso remoto](/es/gateway/remote), [Solución de problemas](/es/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Error en setMyCommands de Telegram. ¿Qué debo comprobar?">
    Empiece con los registros y el estado del canal:

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Luego compare el error:

    - `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero algunas entradas del menú aún deben eliminarse. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, o errores de red similares: si está en un VPS o detrás de un proxy, confirme que el HTTPS saliente está permitido y que el DNS funciona para `api.telegram.org`.

    Si el Gateway es remoto, asegúrese de estar viendo los registros en el host del Gateway.

    Documentación: [Telegram](/es/channels/telegram), [Solución de problemas del canal](/es/channels/troubleshooting).

  </Accordion>

  <Accordion title="La interfaz de texto (TUI) no muestra salida. ¿Qué debo comprobar?">
    Primero confirme que el Gateway es accesible y que el agente puede ejecutarse:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal
    de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

    Documentación: [TUI](/es/web/tui), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo detengo por completo y luego inicio el Gateway?">
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

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
    - `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

    Si instaló el servicio, use los comandos de gateway. Use `openclaw gateway` cuando
    desee una ejecución única en primer plano.

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    Inicie el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro para ver errores de autenticación de canales, enrutamiento de modelos y RPC.
  </Accordion>
</AccordionGroup>

## Medios y archivos adjuntos

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    Los archivos adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulte [Configuración del asistente OpenClaw](/es/start/openclaw) y [Envío del agente](/es/tools/agent-send).

    Envío por CLI:

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    También revise:

    - El canal de destino admite medios salientes y no está bloqueado por listas de permitidos.
    - El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048px).

    Consulte [Imágenes](/es/nodes/images).

  </Accordion>
</AccordionGroup>

## Seguridad y control de acceso

<AccordionGroup>
  <Accordion title="Is it safe to expose OpenClaw to inbound DMs?">
    Trate los MD entrantes como entrada que no es de confianza. Los valores predeterminados están diseñados para reducir el riesgo:

    - El comportamiento predeterminado en los canales con capacidad de MD es **vinculación (pairing)**:
      - Los remitentes desconocidos reciben un código de vinculación; el bot no procesa su mensaje.
      - Apruebe con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Las solicitudes pendientes están limitadas a **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
    - Abrir los MD públicamente requiere una participación explícita (`dmPolicy: "open"` y lista de permitidos `"*"`).

    Ejecute `openclaw doctor` para mostrar políticas de MD riesgosas.

  </Accordion>

  <Accordion title="¿La inyección de prompts es solo una preocupación para los bots públicos?">
    No. La inyección de prompts se trata del **contenido que no es de confianza**, no solo de quién puede enviar mensajes privados al bot.
    Si su asistente lee contenido externo (búsqueda en web/obtención, páginas del navegador, correos electrónicos,
    documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intentan
    secuestrar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

    El mayor riesgo es cuando las herramientas están habilitadas: el modelo puede ser engañado para
    exfiltrar contexto o llamar a herramientas en su nombre. Reduzca el radio de impacto:

    - usando un agente "lector" de solo lectura o sin herramientas para resumir el contenido que no es de confianza
    - manteniendo `web_search` / `web_fetch` / `browser` desactivados para agentes con herramientas habilitadas
    - usando sandboxing y listas de permitidos estrictas para herramientas

    Detalles: [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Debería mi bot tener su propio correo electrónico, cuenta de GitHub o número de teléfono?">
    Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados
    reduce el radio de impacto si algo sale mal. Esto también facilita la rotación
    de credenciales o la revocación del acceso sin afectar sus cuentas personales.

    Comience pequeño. Otorgue acceso solo a las herramientas y cuentas que realmente necesita, y amplíelo
    más adelante si es necesario.

    Documentación: [Seguridad](/es/gateway/security), [Emparejamiento](/es/channels/pairing).

  </Accordion>

  <Accordion title="¿Puedo darle autonomía sobre mis mensajes de texto y es seguro?">
    **No** recomendamos la autonomía total sobre sus mensajes personales. El patrón más seguro es:

    - Mantener los MDs en **modo de emparejamiento** o en una lista de permitidos estricta.
    - Usar un **número o cuenta separado** si desea que envíe mensajes en su nombre.
    - Dejar que redacte y luego **aprobar antes de enviar**.

    Si desea experimentar, hágalo en una cuenta dedicada y manténgala aislada. Vea
    [Seguridad](/es/gateway/security).

  </Accordion>

<Accordion title="¿Puedo usar modelos más baratos para tareas de asistente personal?">
  Sí, **si** el agente es solo de chat y la entrada es confiable. Los niveles más pequeños son más
  susceptibles al secuestro de instrucciones, por lo que se deben evitar para agentes con
  herramientas habilitadas o al leer contenido no confiable. Si debe usar un modelo más pequeño,
  bloquee las herramientas y ejecútelo dentro de un entorno protegido (sandbox). Vea
  [Seguridad](/es/gateway/security).
</Accordion>

  <Accordion title="Ejecuté /start en Telegram pero no recibí un código de emparejamiento">
    Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
    `dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

    Verifique las solicitudes pendientes:

    ```bash
    openclaw pairing list telegram
    ```

    Si desea acceso inmediato, agregue su id de remitente a la lista de permitidos o establezca `dmPolicy: "open"`
    para esa cuenta.

  </Accordion>

  <Accordion title="WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?">
    No. La política predeterminada de MD de WhatsApp es **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a envíos explícitos que usted active.

    Apruebe el emparejamiento con:

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Enumere las solicitudes pendientes:

    ```bash
    openclaw pairing list whatsapp
    ```

    El asistente de solicitud de número de teléfono: se usa para configurar su **lista de permitidos/propietario** para que se permitan sus propios MD. No se usa para el envío automático. Si se ejecuta en su número personal de WhatsApp, use ese número y habilite `channels.whatsapp.selfChatMode`.

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

    Documentación: [Thinking and verbose](/es/tools/thinking), [Security](/es/gateway/security#reasoning-verbose-output-in-groups).

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

    Estos son disparadores de aborto (no comandos de barra).

    Para procesos en segundo plano (de la herramienta exec), puedes pedirle al agente que ejecute:

    ```
    process action:kill sessionId:XXX
    ```

    Resumen de comandos de barra: ver [Slash commands](/es/tools/slash-commands).

    La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista de permitidos.

  </Accordion>

  <Accordion title='¿Cómo envío un mensaje de Discord desde Telegram? ("Cross-context messaging denied")'>
    OpenClaw bloquea el mensajería **entre proveedores** de forma predeterminada. Si una llamada a una herramienta está vinculada
    a Telegram, no se enviará a Discord a menos que lo permitas explícitamente.

    Activa el mensajería entre proveedores para el agente:

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
    agente, establécelo bajo `agents.list[].tools.message` en su lugar.

  </Accordion>

  <Accordion title='¿Por qué parece que el bot "ignora" los mensajes rápidos?'>
    El modo de cola controla cómo interactúan los mensajes nuevos con una ejecución en curso. Usa `/queue` para cambiar los modos:

    - `steer` - los mensajes nuevos redirigen la tarea actual
    - `followup` - ejecuta los mensajes de uno en uno
    - `collect` - agrupa los mensajes y responde una vez (predeterminado)
    - `steer-backlog` - dirige ahora, luego procesa el retraso
    - `interrupt` - aborta la ejecución actual y comienza de nuevo

    Puedes agregar opciones como `debounce:2s cap:25 drop:summarize` para los modos de seguimiento.

  </Accordion>
</AccordionGroup>

## Varios

<AccordionGroup>
  <Accordion title="¿Cuál es el modelo predeterminado para Anthropic con una clave API?">
    En OpenClaw, las credenciales y la selección del modelo son cosas separadas. Configurar
    `ANTHROPIC_API_KEY` (o almacenar una clave API de Anthropic en perfiles de autenticación)
    habilita la autenticación, pero el modelo predeterminado real es el que configures en
    `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-6` o
    `anthropic/claude-opus-4-6`). Si ves `No credentials found for profile "anthropic:default"`,
    significa que el Gateway no pudo encontrar las credenciales de Anthropic en la
    `auth-profiles.json` esperada para el agente que se está ejecutando.
  </Accordion>
</AccordionGroup>

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión en GitHub](https://github.com/openclaw/openclaw/discussions).

import es from "/components/footer/es.mdx";

<es />
