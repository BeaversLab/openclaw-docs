---
summary: "Ejecuta OpenClaw en una máquina virtual macOS aislada (local o alojada) cuando necesites aislamiento o iMessage"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "Máquinas virtuales macOS"
---

# OpenClaw en máquinas virtuales macOS (Sandboxing)

## Recomendado por defecto (la mayoría de usuarios)

- **Pequeño VPS Linux** para una puerta de enlace siempre activa y bajo coste. Consulta [Alojamiento VPS](/es/vps).
- **Hardware dedicado** (Mac mini o caja Linux) si quieres control total y una **IP residencial** para la automatización del navegador. Muchos sitios bloquean las IP de centros de datos, por lo que la navegación local a menudo funciona mejor.
- **Híbrido:** mantén la puerta de enlace en un VPS barato y conecta tu Mac como un **nodo** cuando necesites automatización del navegador/interfaz de usuario. Consulta [Nodos](/es/nodes) y [Puerta de enlace remota](/es/gateway/remote).

Utiliza una máquina virtual macOS cuando necesites específicamente capacidades exclusivas de macOS (iMessage/BlueBubbles) o desees un aislamiento estricto de tu Mac diario.

## Opciones de máquinas virtuales macOS

### Máquina virtual local en tu Mac con Apple Silicon (Lume)

Ejecuta OpenClaw en una máquina virtual macOS aislada en tu Mac con Apple Silicon existente utilizando [Lume](https://cua.ai/docs/lume).

Esto te proporciona:

- Entorno macOS completo en aislamiento (tu host permanece limpio)
- Soporte para iMessage a través de BlueBubbles (imposible en Linux/Windows)
- Restablecimiento instantáneo clonando máquinas virtuales
- Sin costes adicionales de hardware o en la nube

### Proveedores de Mac alojados (nube)

Si deseas macOS en la nube, los proveedores de Mac alojados también funcionan:

- [MacStadium](https://www.macstadium.com/) (Macs alojados)
- Otros proveedores de Mac alojados también funcionan; sigue su documentación sobre máquinas virtuales + SSH

Una vez que tengas acceso SSH a una máquina virtual macOS, continúa en el paso 6 a continuación.

---

## Ruta rápida (Lume, usuarios experimentados)

1. Instalar Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Completa el Asistente de configuración, habilita el acceso remoto (SSH)
4. `lume run openclaw --no-display`
5. Accede por SSH, instala OpenClaw, configura los canales
6. Listo

---

## Lo que necesitas (Lume)

- Mac con Apple Silicon (M1/M2/M3/M4)
- macOS Sequoia o posterior en el host
- ~60 GB de espacio libre en disco por máquina virtual
- ~20 minutos

---

## 1) Instalar Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

Si `~/.local/bin` no está en tu PATH:

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

Verificar:

```bash
lume --version
```

Documentación: [Instalación de Lume](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) Crear la máquina virtual macOS

```bash
lume create openclaw --os macos --ipsw latest
```

Esto descarga macOS y crea la máquina virtual. Se abre automáticamente una ventana VNC.

Nota: La descarga puede tardar un poco dependiendo de tu conexión.

---

## 3) Completar el Asistente de configuración

En la ventana VNC:

1. Seleccione el idioma y la región
2. Omita el Apple ID (o inicie sesión si desea iMessage más adelante)
3. Cree una cuenta de usuario (recuerde el nombre de usuario y la contraseña)
4. Omita todas las funciones opcionales

Una vez completada la configuración, habilite SSH:

1. Abra Configuración del Sistema → General → Uso compartido
2. Habilite "Inicio de sesión remoto"

---

## 4) Obtener la dirección IP de la VM

```bash
lume get openclaw
```

Busque la dirección IP (generalmente `192.168.64.x`).

---

## 5) Acceda por SSH a la VM

```bash
ssh youruser@192.168.64.X
```

Reemplace `youruser` con la cuenta que creó y la IP con la de su VM.

---

## 6) Instale OpenClaw

Dentro de la VM:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Siga las indicaciones de incorporación para configurar su proveedor de modelos (Anthropic, OpenAI, etc.).

---

## 7) Configure los canales

Edite el archivo de configuración:

```bash
nano ~/.openclaw/openclaw.json
```

Agregue sus canales:

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN",
    },
  },
}
```

Luego inicie sesión en WhatsApp (escanee el código QR):

```bash
openclaw channels login
```

---

## 8) Ejecute la VM en modo headless

Detenga la VM y reiníciela sin pantalla:

```bash
lume stop openclaw
lume run openclaw --no-display
```

La VM se ejecuta en segundo plano. El demonio de OpenClaw mantiene el funcionamiento de la puerta de enlace.

Para verificar el estado:

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonificación: integración con iMessage

Esta es la función estrella al ejecutarse en macOS. Utilice [BlueBubbles](https://bluebubbles.app) para agregar iMessage a OpenClaw.

Dentro de la VM:

1. Descargue BlueBubbles desde bluebubbles.app
2. Inicie sesión con su Apple ID
3. Habilite la API web y configure una contraseña
4. Apunte los webhooks de BlueBubbles a su puerta de enlace (ejemplo: `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`)

Agregue a su configuración de OpenClaw:

```json5
{
  channels: {
    bluebubbles: {
      serverUrl: "http://localhost:1234",
      password: "your-api-password",
      webhookPath: "/bluebubbles-webhook",
    },
  },
}
```

Reinicie la puerta de enlace. Ahora su agente puede enviar y recibir iMessages.

Detalles completos de configuración: [canal BlueBubbles](/es/channels/bluebubbles)

---

## Guardar una imagen dorada

Antes de personalizar más, tome una instantánea de su estado limpio:

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

Restablecer en cualquier momento:

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

---

## Ejecución 24/7

Mantenga la VM en funcionamiento mediante:

- Mantener su Mac conectado a la corriente
- Deshabilitar el modo suspensión en Configuración del Sistema → Ahorro de energía
- Usando `caffeinate` si es necesario

Para una disponibilidad real las 24 horas, considere un Mac mini dedicado o un pequeño VPS. Consulte [Alojamiento VPS](/es/vps).

---

## Solución de problemas

| Problema                               | Solución                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| No se puede acceder por SSH a la VM    | Verifique que "Inicio de sesión remoto" esté habilitado en la Configuración del Sistema de la VM  |
| No se muestra la IP de la VM           | Espere a que la VM arranque completamente, ejecute `lume get openclaw` nuevamente                 |
| Comando Lume no encontrado             | Agregue `~/.local/bin` a su PATH                                                                  |
| No se escanea el código QR de WhatsApp | Asegúrese de haber iniciado sesión en la VM (no en el host) al ejecutar `openclaw channels login` |

---

## Documentos relacionados

- [Alojamiento VPS](/es/vps)
- [Nodos](/es/nodes)
- [Gateway remoto](/es/gateway/remote)
- [Canal BlueBubbles](/es/channels/bluebubbles)
- [Inicio rápido de Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Referencia de la CLI de Lume](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuración de VM desatendida](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avanzado)
- [Sandbox con Docker](/es/install/docker) (enfoque de aislamiento alternativo)

import es from "/components/footer/es.mdx";

<es />
