---
summary: "Flujo de configuración de primera ejecución para OpenClaw (aplicación macOS)"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "Incorporación (aplicación macOS)"
sidebarTitle: "Incorporación: aplicación macOS"
---

Este documento describe el flujo de configuración de primera ejecución **actual**. El objetivo es una experiencia fluida del "día 0": elegir dónde se ejecuta el Gateway, conectar la autenticación, ejecutar el asistente y dejar que el agente se inicialice por sí mismo.
Para obtener una descripción general de las rutas de incorporación (onboarding), consulte [Resumen de incorporación (Onboarding Overview)](/es/start/onboarding-overview).

<Steps>
<Step title="Aprobar advertencia de macOS">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="Approve find local networks">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="Bienvenida y aviso de seguridad">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

Modelo de confianza de seguridad:

- De manera predeterminada, OpenClaw es un agente personal: un límite de un operador de confianza.
- Las configuraciones compartidas/multiusuario requieren bloqueo (límites de confianza divididos, mantener el acceso a las herramientas al mínimo y seguir [Seguridad](/es/gateway/security)).
- La incorporación local ahora establece de forma predeterminada las nuevas configuraciones en `tools.profile: "coding"` para que las configuraciones locales nuevas mantengan las herramientas de sistema de archivos/ejecución sin forzar el perfil `full` sin restricciones.
- Si se habilitan hooks/webhooks u otras fuentes de contenido que no son de confianza, utilice un nivel de modelo moderno y sólido y mantenga una política/herramientas estrictas y un aislamiento (sandboxing).

</Step>
<Step title="Local vs. Remoto">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

¿Dónde se ejecuta el **Gateway**?

- **Esta Mac (Solo local):** la incorporación puede configurar la autenticación y escribir las credenciales localmente.
- **Remoto (a través de SSH/Tailnet):** la incorporación **no** configura la autenticación local; las credenciales deben existir en el host de la puerta de enlace (gateway). El campo de token de puerta de enlace remota almacena el token que utiliza la aplicación macOS para conectarse a esa Gateway; los valores `gateway.remote.token` que no sean de texto plano existentes se conservan hasta que los reemplace.
- **Configurar más tarde:** omita la configuración y deje la aplicación sin configurar.

<Tip>
**Consejo de autenticación de Gateway:**

- El asistente ahora genera un **token** incluso para el bucle invertido (loopback), por lo que los clientes WS locales deben autenticarse.
- Si deshabilita la autenticación, cualquier proceso local puede conectarse; utilícelo solo en máquinas totalmente confiables.
- Utilice un **token** para acceso de varias máquinas o enlaces que no sean de bucle invertido.

</Tip>
</Step>
<Step title="Permisos">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

La incorporación solicita los permisos TCC necesarios para:

- Automatización (AppleScript)
- Notificaciones
- Accesibilidad
- Grabación de pantalla
- Micrófono
- Reconocimiento de voz
- Cámara
- Ubicación

</Step>
<Step title="CLI">
  <Info>Este paso es opcional</Info>
  La aplicación puede instalar la CLI global `openclaw` a través de npm, pnpm o bun.
  Prefiere npm primero, luego pnpm y luego bun si ese es el único gestor de paquetes detectado.
  Para el tiempo de ejecución de Gateway, Node sigue siendo la ruta recomendada.
</Step>
<Step title="Chat de incorporación (sesión dedicada)">
  Después de la configuración, la aplicación abre una sesión de chat de incorporación dedicada para que el agente pueda
  presentarse y guiar los siguientes pasos. Esto mantiene la guía de primera ejecución separada
  de su conversación normal. Consulte [Inicialización](/es/start/bootstrapping) para
  saber qué sucede en el host de la puerta de enlace durante la primera ejecución del agente.
</Step>
</Steps>

## Relacionado

- [Descripción general de la incorporación](/es/start/onboarding-overview)
- [Introducción](/es/start/getting-started)
