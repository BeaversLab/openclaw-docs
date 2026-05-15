---
summary: "Instale OpenClaw y ejecute su primer chat en minutos."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Introducción"
---

Instale OpenClaw, ejecute la incorporación y chatee con su asistente de IA — todo en
unos 5 minutos. Al final tendrá un Gateway en ejecución, autenticación configurada
y una sesión de chat funcional.

## Lo que necesitas

- **Node.js** — Se recomienda Node 24 (también se admite Node 22.16+)
- **Una clave de API** de un proveedor de modelos (Anthropic, OpenAI, Google, etc.) — la incorporación le pedirá que la ingrese

<Tip>Verifique su versión de Node con `node --version`. **Usuarios de Windows:** se admiten tanto Windows nativo como WSL2. WSL2 es más estable y se recomienda para la experiencia completa. Consulte [Windows](/es/platforms/windows). ¿Necesita instalar Node? Consulte [Configuración de Node](/es/install/node).</Tip>

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
    Otros métodos de instalación (Docker, Nix, npm): [Instalar](/es/install).
    </Note>

  </Step>
  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente lo guiará a través de la elección de un proveedor de modelos, el establecimiento de una clave de API

y la configuración del Gateway. Toma unos 2 minutos.

    Consulte [Incorporación (CLI)](/es/start/wizard) para obtener la referencia completa.

  </Step>
  <Step title="Verificar que el Gateway se esté ejecutando">
    ```bash
    openclaw gateway status
    ```

    Debería ver el Gateway escuchando en el puerto 18789.

  </Step>
  <Step title="Abrir el panel">
    ```bash
    openclaw dashboard
    ```

    Esto abre la interfaz de usuario de control en su navegador. Si se carga, todo está funcionando.

  </Step>
  <Step title="Envía tu primer mensaje">
    Escribe un mensaje en el chat de la Interfaz de Control (Control UI) y deberías recibir una respuesta de la IA.

    ¿Prefieres chatear desde tu teléfono? El canal más rápido de configurar es
    [Telegram](/es/channels/telegram) (solo se necesita un token de bot). Consulta [Canales](/es/channels)
    para ver todas las opciones.

  </Step>
</Steps>

<Accordion title="Avanzado: montar una compilación personalizada de la Interfaz de Control">
  Si mantienes una compilación localizada o personalizada del panel, apunta
  `gateway.controlUi.root` a un directorio que contenga tus activos estáticos
  compilados y `index.html`.

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# Copy your built static files into that directory.
```

A continuación, establece:

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "$HOME/.openclaw/control-ui-custom"
    }
  }
}
```

Reinicia la puerta de enlace (gateway) y vuelve a abrir el panel:

```bash
openclaw gateway restart
openclaw dashboard
```

</Accordion>

## Qué hacer a continuación

<Columns>
  <Card title="Conecta un canal" href="/es/channels" icon="message-square">
    Discord, Feishu, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo y más.
  </Card>
  <Card title="Emparejamiento y seguridad" href="/es/channels/pairing" icon="shield">
    Controla quién puede enviar mensajes a tu agente.
  </Card>
  <Card title="Configura la Gateway" href="/es/gateway/configuration" icon="settings">
    Modelos, herramientas, sandbox y configuración avanzada.
  </Card>
  <Card title="Explorar herramientas" href="/es/tools" icon="wrench">
    Navegador, exec, búsqueda web, habilidades y complementos.
  </Card>
</Columns>

<Accordion title="Avanzado: variables de entorno">
  Si ejecutas OpenClaw como una cuenta de servicio o deseas rutas personalizadas:

- `OPENCLAW_HOME` — directorio principal para la resolución de rutas internas
- `OPENCLAW_STATE_DIR` — anular el directorio de estado
- `OPENCLAW_CONFIG_PATH` — anular la ruta del archivo de configuración

Referencia completa: [Variables de entorno](/es/help/environment).

</Accordion>

## Relacionado

- [Descripción general de la instalación](/es/install)
- [Descripción general de canales](/es/channels)
- [Configuración](/es/start/setup)
