---
summary: "Ejecuta OpenClaw en una máquina virtual macOS aislada (local o alojada) cuando necesites aislamiento o iMessage"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "Máquinas virtuales macOS"
---

## Recomendado por defecto (la mayoría de usuarios)

- **Pequeño VPS de Linux** para una Puerta de enlace (Gateway) siempre activa y bajo costo. Consulte [Alojamiento VPS](/es/vps).
- **Hardware dedicado** (Mac mini o caja Linux) si desea control total y una **IP residencial** para la automatización del navegador. Muchos sitios bloquean las IP de centros de datos, por lo que la navegación local a menudo funciona mejor.
- **Híbrido:** mantenga la Puerta de enlace (Gateway) en un VPS barato y conecte su Mac como un **nodo** cuando necesite automatización del navegador/UI. Consulte [Nodos](/es/nodes) y [Puerta de enlace remota](/es/gateway/remote).

Utilice una máquina virtual (VM) de macOS cuando necesite específicamente capacidades exclusivas de macOS como iMessage o desee un aislamiento estricto de su Mac diario.

## Opciones de VM de macOS

### VM local en su Mac con Apple Silicon (Lume)

Ejecute OpenClaw en una VM de macOS aislada en su Mac Apple Silicon existente utilizando [Lume](https://cua.ai/docs/lume).

Esto le ofrece:

- Entorno macOS completo en aislamiento (tu host permanece limpio)
- Soporte de iMessage mediante `imsg` (la ruta local predeterminada es imposible en Linux/Windows)
- Restablecimiento instantáneo clonando máquinas virtuales
- Sin costes adicionales de hardware o en la nube

### Proveedores de Mac alojados (nube)

Si quieres macOS en la nube, los proveedores de Mac alojados también funcionan:

- [MacStadium](https://www.macstadium.com/) (Macs alojados)
- Otros proveedores de Mac alojados también funcionan; sigue su documentación sobre VM + SSH

Una vez que tengas acceso SSH a una máquina virtual macOS, continúa en el paso 6 a continuación.

---

## Ruta rápida (Lume, usuarios experimentados)

1. Instalar Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Completa el Asistente de configuración, habilita el inicio de sesión remoto (SSH)
4. `lume run openclaw --no-display`
5. Ingresa por SSH, instala OpenClaw, configura los canales
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

## 2) Crear la VM de macOS

```bash
lume create openclaw --os macos --ipsw latest
```

Esto descarga macOS y crea la VM. Se abre automáticamente una ventana VNC.

<Note>La descarga puede tardar un poco dependiendo de tu conexión.</Note>

---

## 3) Completar el Asistente de Configuración

En la ventana VNC:

1. Seleccionar idioma y región
2. Omitir Apple ID (o iniciar sesión si quieres iMessage más tarde)
3. Crear una cuenta de usuario (recuerda el nombre de usuario y la contraseña)
4. Omitir todas las funciones opcionales

Una vez completada la configuración:

1. Activar SSH: Abre Configuración del sistema -> General -> Compartir y activa "Inicio de sesión remoto".
2. Para el uso de VM sin cabeza, activa el inicio de sesión automático: Abre Configuración del sistema -> Usuarios y grupos, selecciona "Iniciar sesión automáticamente como:" y elige el usuario de la VM.

---

## 4) Obtener la dirección IP de la VM

```bash
lume get openclaw
```

Busca la dirección IP (generalmente `192.168.64.x`).

---

## 5) Acceder por SSH a la VM

```bash
ssh youruser@192.168.64.X
```

Reemplaza `youruser` con la cuenta que creaste y la IP con la de tu VM.

---

## 6) Instalar OpenClaw

Dentro de la VM:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Sigue las indicaciones de incorporación para configurar tu proveedor de modelos (Anthropic, OpenAI, etc.).

---

## 7) Configurar canales

Edita el archivo de configuración:

```bash
nano ~/.openclaw/openclaw.json
```

Añade tus canales:

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

A continuación, inicia sesión en WhatsApp (escanea el código QR):

```bash
openclaw channels login
```

---

## 8) Ejecutar la VM sin interfaz gráfica

Detén la VM y reiníciala sin pantalla:

```bash
lume stop openclaw
lume run openclaw --no-display
```

La VM se ejecuta en segundo plano. El demonio de OpenClaw mantiene la pasarela en funcionamiento.

Para verificar el estado:

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus: integración con iMessage

Esta es la característica estrella de ejecutarse en macOS. Usa [iMessage](/es/channels/imessage) con `imsg` para añadir Mensajes a OpenClaw.

Dentro de la VM:

1. Inicia sesión en Mensajes.
2. Instala `imsg`.
3. Concede permiso de Acceso total al disco y Automatización al proceso que ejecuta OpenClaw/`imsg`.
4. Verifica la compatibilidad con RPC con `imsg rpc --help`.

Añade a tu configuración de OpenClaw:

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
    },
  },
}
```

Reinicia la pasarela. Ahora tu agente puede enviar y recibir iMessages.

Detalles completos de la configuración: [canal de iMessage](/es/channels/imessage)

---

## Guardar una imagen dorada

Antes de personalizar más, toma una instantánea de tu estado limpio:

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

Mantén la VM en ejecución:

- Manteniendo tu Mac conectado a la corriente
- Deshabilitando el modo suspensión en Configuración del Sistema → Ahorro de energía
- Usando `caffeinate` si es necesario

Para tener siempre activo, considera un Mac mini dedicado o un VPS pequeño. Consulta [Alojamiento VPS](/es/vps).

---

## Solución de problemas

| Problema                               | Solución                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| No se puede hacer SSH en la VM         | Verifica que "Inicio de sesión remoto" esté habilitado en la Configuración del Sistema de la VM   |
| La IP de la VM no aparece              | Espera a que la VM arranque completamente, ejecuta `lume get openclaw` de nuevo                   |
| Comando Lume no encontrado             | Añade `~/.local/bin` a tu PATH                                                                    |
| El código QR de WhatsApp no se escanea | Asegúrate de haber iniciado sesión en la VM (no en el host) al ejecutar `openclaw channels login` |

---

## Documentos relacionados

- [Alojamiento VPS](/es/vps)
- [Nodos](/es/nodes)
- [Gateway remoto](/es/gateway/remote)
- [canal iMessage](/es/channels/imessage)
- [Inicio rápido de Lume](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Referencia de la CLI de Lume](https://cua.ai/docs/lume/reference/cli-reference)
- [Configuración de VM desatendida](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (avanzado)
- [Aislamiento con Docker](/es/install/docker) (enfoque de aislamiento alternativo)
