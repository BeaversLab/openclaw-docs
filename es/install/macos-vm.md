---
summary: "Ejecuta OpenClaw en una máquina virtual macOS (local o alojada) cuando necesites aislamiento o iMessage"
read_when:
  - Quieres que OpenClaw esté aislado de tu entorno principal de macOS
  - Quieres la integración de iMessage (BlueBubbles) en un entorno restringido (sandbox)
  - Quieres un entorno macOS restablezble que puedas clonar
  - Quieres comparar las opciones de máquinas virtuales macOS locales vs alojadas
title: "Máquinas virtuales macOS"
---

# OpenClaw en máquinas virtuales macOS (Aislamiento)

## Predeterminado recomendado (la mayoría de usuarios)

- **Pequeño VPS Linux** para una Gateway siempre activa y bajo costo. Consulta [Alojamiento VPS](/es/vps).
- **Hardware dedicado** (Mac mini o caja Linux) si quieres control total y una **IP residencial** para la automatización del navegador. Muchos sitios bloquean las IPs de centros de datos, por lo que la navegación local a menudo funciona mejor.
- **Híbrido:** mantén la Gateway en un VPS barato y conecta tu Mac como un **nodo** cuando necesites automatización del navegador/UI. Consulta [Nodos](/es/nodes) y [Gateway remoto](/es/gateway/remote).

Usa una máquina virtual macOS cuando específicamente necesites capacidades exclusivas de macOS (iMessage/BlueBubbles) o quieras un aislamiento estricto de tu Mac diario.

## Opciones de máquina virtual macOS

### Máquina virtual local en tu Mac con Apple Silicon (Lume)

Ejecuta OpenClaw en una máquina virtual macOS aislada en tu Mac con Apple Silicon existente usando [Lume](https://cua.ai/docs/lume).

Esto te ofrece:

- Entorno macOS completo en aislamiento (tu host se mantiene limpio)
- Soporte de iMessage a través de BlueBubbles (imposible en Linux/Windows)
- Restablecimiento instantáneo clonando máquinas virtuales
- Sin costos adicionales de hardware o en la nube

### Proveedores de Mac alojados (nube)

Si quieres macOS en la nube, los proveedores de Mac alojados también funcionan:

- [MacStadium](https://www.macstadium.com/) (Macs alojados)
- Otros proveedores de Mac alojados también funcionan; sigue su documentación sobre máquina virtual + SSH

Una vez que tengas acceso SSH a una máquina virtual macOS, continúa en el paso 6 a continuación.

---

## Ruta rápida (Lume, usuarios experimentados)

1. Instalar Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Completa el Asistente de configuración, activa el Acceso remoto (SSH)
4. `lume run openclaw --no-display`
5. Accede por SSH, instala OpenClaw, configura los canales
6. Listo

---

## Qué necesitas (Lume)

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

Esto descarga macOS y crea la VM. Se abre automáticamente una ventana VNC.

Nota: La descarga puede tardar un poco dependiendo de su conexión.

---

## 3) Completar el Asistente de configuración

En la ventana VNC:

1. Seleccione el idioma y la región
2. Omita el ID de Apple (o inicie sesión si desea iMessage más tarde)
3. Cree una cuenta de usuario (recuerde el nombre de usuario y la contraseña)
4. Omita todas las funciones opcionales

Una vez completada la configuración, habilite SSH:

1. Abra Configuración del Sistema → General → Uso compartido
2. Habilite "Acceso remoto"

---

## 4) Obtener la dirección IP de la VM

```bash
lume get openclaw
```

Busque la dirección IP (normalmente `192.168.64.x`).

---

## 5) Acceder por SSH a la VM

```bash
ssh youruser@192.168.64.X
```

Reemplace `youruser` con la cuenta que creó y la IP con la de su VM.

---

## 6) Instalar OpenClaw

Dentro de la VM:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Siga las indicaciones de incorporación para configurar su proveedor de modelos (Anthropic, OpenAI, etc.).

---

## 7) Configurar canales

Edite el archivo de configuración:

```bash
nano ~/.openclaw/openclaw.json
```

Agregue sus canales:

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+15551234567"]
    },
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN"
    }
  }
}
```

Luego inicie sesión en WhatsApp (escanee el código QR):

```bash
openclaw channels login
```

---

## 8) Ejecutar la VM en modo sin cabeza

Detenga la VM y reiníciela sin pantalla:

```bash
lume stop openclaw
lume run openclaw --no-display
```

La VM se ejecuta en segundo plano. El demonio de OpenClaw mantiene el gateway en ejecución.

Para verificar el estado:

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonificación: integración con iMessage

Esta es la característica estrella de ejecutarse en macOS. Use [BlueBubbles](https://bluebubbles.app) para agregar iMessage a OpenClaw.

Dentro de la VM:

1. Descargue BlueBubbles desde bluebubbles.app
2. Inicie sesión con su ID de Apple
3. Habilite la API web y configure una contraseña
4. Apunte los webhooks de BlueBubbles a su gateway (ejemplo: `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`)

Agregue a su configuración de OpenClaw:

```json
{
  "channels": {
    "bluebubbles": {
      "serverUrl": "http://localhost:1234",
      "password": "your-api-password",
      "webhookPath": "/bluebubbles-webhook"
    }
  }
}
```

Reinicie el gateway. Ahora su agente puede enviar y recibir iMessages.

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

Mantenga la VM ejecutándose:

- Manteniendo su Mac conectado a la corriente
- Deshabilitando el modo suspensión en Configuración del Sistema → Ahorro de energía
- Usando `caffeinate` si es necesario

Para una disponibilidad real, considere un Mac mini dedicado o un VPS pequeño. Consulte [Hospedaje VPS](/es/vps).

---

## Solución de problemas

| Problema                               | Solución                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| No se puede acceder por SSH a la VM    | Verifique que "Acceso remoto" esté habilitado en la Configuración del Sistema de la VM            |
| La IP de la VM no aparece              | Espere a que la VM arranque completamente, ejecute `lume get openclaw` nuevamente                 |
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
- [Aislamiento con Docker](/es/install/docker) (enfoque de aislamiento alternativo)

import es from "/components/footer/es.mdx";

<es />
