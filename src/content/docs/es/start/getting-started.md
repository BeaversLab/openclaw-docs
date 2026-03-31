---
summary: "Instala OpenClaw y ejecuta tu primer chat en minutos."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Para empezar"
---

# Para comenzar

Instala OpenClaw, ejecuta la integración y chatea con tu asistente de IA — todo en
unos 5 minutos. Al final tendrás un Gateway en funcionamiento, autenticación
configurada y una sesión de chat operativa.

## Lo que necesitas

- **Node.js** — Se recomienda Node 24 (también se admite Node 22.14+)
- **Una clave de API** de un proveedor de modelos (Anthropic, OpenAI, Google, etc.) — la integración te lo solicitará

<Tip>Verifique su versión de Node con `node --version`. **Usuarios de Windows:** tanto Windows nativo como WSL2 son compatibles. WSL2 es más estable y se recomienda para la experiencia completa. Consulte [Windows](/en/platforms/windows). ¿Necesita instalar Node? Consulte [Configuración de Node](/en/install/node).</Tip>

## Configuración rápida

<Steps>
  <Step title="Instalar OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="Proceso de instalación del script"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    Otros métodos de instalación (Docker, Nix, npm): [Instalar](/en/install).
    </Note>

  </Step>
  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente te guiará a través de la elección de un proveedor de modelos, la configuración de una clave API
    y la configuración de Gateway. Toma unos 2 minutos.

    Consulta [Onboarding (CLI)](/en/start/wizard) para obtener la referencia completa.

  </Step>
  <Step title="Verificar que el Gateway se está ejecutando">
    ```bash
    openclaw gateway status
    ```

    Deberías ver el Gateway escuchando en el puerto 18789.

  </Step>
  <Step title="Abrir el panel">
    ```bash
    openclaw dashboard
    ```

    Esto abre la interfaz de usuario de control en tu navegador. Si se carga, todo está funcionando.

  </Step>
  <Step title="Envía tu primer mensaje">
    Escribe un mensaje en el chat de la interfaz de usuario de Control y deberías recibir una respuesta de la IA.

    ¿Prefieres chatear desde tu teléfono? El canal más rápido de configurar es
    [Telegram](/en/channels/telegram) (solo se necesita un token de bot). Consulta [Canales](/en/channels)
    para ver todas las opciones.

  </Step>
</Steps>

## Qué hacer a continuación

<Columns>
  <Card title="Conecta un canal" href="/en/channels" icon="message-square">
    WhatsApp, Telegram, Discord, iMessage y más.
  </Card>
  <Card title="Emparejamiento y seguridad" href="/en/channels/pairing" icon="shield">
    Controla quién puede enviar mensajes a tu agente.
  </Card>
  <Card title="Configurar la puerta de enlace" href="/en/gateway/configuration" icon="settings">
    Modelos, herramientas, sandbox y configuraciones avanzadas.
  </Card>
  <Card title="Explorar herramientas" href="/en/tools" icon="wrench">
    Navegador, ejecución, búsqueda web, habilidades y complementos.
  </Card>
</Columns>

<Accordion title="Avanzado: variables de entorno">
  Si ejecutas OpenClaw como una cuenta de servicio o quieres rutas personalizadas:

- `OPENCLAW_HOME` — directorio principal para la resolución de rutas internas
- `OPENCLAW_STATE_DIR` — anular el directorio de estado
- `OPENCLAW_CONFIG_PATH` — anular la ruta del archivo de configuración

Referencia completa: [Variables de entorno](/en/help/environment).

</Accordion>
