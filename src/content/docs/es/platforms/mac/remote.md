---
summary: "Flujo de la aplicación macOS para controlar una puerta de enlace OpenClaw remota a través de SSH"
read_when:
  - Setting up or debugging remote mac control
title: "Control remoto"
---

# OpenClaw remoto (macOS ⇄ host remoto)

Este flujo permite que la aplicación macOS actúe como un control remoto completo para una puerta de enlace OpenClaw que se ejecuta en otro host (escritorio/servidor). Es la función de **control remoto por SSH** (ejecución remota) de la aplicación. Todas las funciones: comprobaciones de estado, reenvío de activación por voz y Chat Web: reutilizan la misma configuración SSH remota de _Configuración → General_.

## Modos

- **Local (este Mac)**: Todo se ejecuta en el portátil. No hay SSH involucrado.
- **Remoto por SSH (predeterminado)**: Los comandos de OpenClaw se ejecutan en el host remoto. La aplicación mac abre una conexión SSH con `-o BatchMode` más su identidad/clave elegida y un reenvío de puerto local.
- **Remoto directo (ws/wss)**: Sin túnel SSH. La aplicación mac se conecta directamente a la URL de la puerta de enlace (por ejemplo, a través de Tailscale Serve o un proxy inverso HTTPS público).

## Transportes remotos

El modo remoto admite dos transportes:

- **Túnel SSH** (predeterminado): Usa `ssh -N -L ...` para reenviar el puerto de la puerta de enlace a localhost. La puerta de enlace verá la IP del nodo como `127.0.0.1` porque el túnel es de retorno (loopback).
- **Directo (ws/wss)**: Se conecta directamente a la URL de la puerta de enlace. La puerta de enlace ve la IP real del cliente.

En modo túnel SSH, los nombres de host de LAN/tailnet descubiertos se guardan como
`gateway.remote.sshTarget`. La aplicación mantiene `gateway.remote.url` en el
punto de conexión del túnel local, por ejemplo `ws://127.0.0.1:18789`, por lo que la CLI, Web Chat y
el servicio local de alojamiento de nodos utilizan el mismo transporte de loopback seguro.

La automatización del navegador en modo remoto es gestionada por el host de nodos de la CLI, no por el
nodo de la aplicación nativa de macOS. La aplicación inicia el servicio de host de nodos instalado cuando
es posible; si necesitas control del navegador desde ese Mac, instálalo/inícialo con
`openclaw node install ...` y `openclaw node start` (o ejecuta
`openclaw node run ...` en primer plano), y luego apunta a ese nodo con capacidad de navegador.

## Requisitos previos en el host remoto

1. Instala Node + pnpm y compila/instala la CLI de OpenClaw (`pnpm install && pnpm build && pnpm link --global`).
2. Asegúrate de que `openclaw` esté en PATH para shells no interactivos (crea un enlace simbólico en `/usr/local/bin` o `/opt/homebrew/bin` si es necesario).
3. SSH abierto con autenticación por clave. Recomendamos las IP de **Tailscale** para una accesibilidad estable fuera de la LAN.

## Configuración de la aplicación macOS

1. Abre _Ajustes → General_.
2. En **OpenClaw se ejecuta**, selecciona **Remoto por SSH** y configura:
   - **Transporte**: **Túnel SSH** o **Directo (ws/wss)**.
   - **Destino SSH**: `user@host` (opcional `:port`).
     - Si la puerta de enlace está en la misma LAN y anuncia Bonjour, selecciónala de la lista descubierta para rellenar este campo automáticamente.
   - **URL de la puerta de enlace** (solo modo Directo): `wss://gateway.example.ts.net` (o `ws://...` para local/LAN).
   - **Archivo de identidad** (avanzado): ruta a tu clave.
   - **Raíz del proyecto** (avanzado): ruta de checkout remoto utilizada para comandos.
   - **Ruta de la CLI** (avanzado): ruta opcional a un punto de entrada/binario `openclaw` ejecutable (se rellena automáticamente cuando se anuncia).
3. Pulsa **Probar remoto**. El éxito indica que el `openclaw status --json` remoto se ejecuta correctamente. Los fallos generalmente significan problemas de PATH/CLI; el código de salida 127 significa que no se encontró la CLI de forma remota.
4. Las comprobaciones de estado y Web Chat ahora se ejecutarán automáticamente a través de este túnel SSH.

## Web Chat

- **Túnel SSH**: Web Chat se conecta a la puerta de enlace a través del puerto de control WebSocket reenviado (predeterminado 18789).
- **Directo (ws/wss)**: Web Chat se conecta directamente a la URL de la puerta de enlace configurada.
- Ya no existe un servidor HTTP de WebChat separado.

## Permisos

- El host remoto necesita las mismas aprobaciones TCC que la local (Automatización, Accesibilidad, Grabación de pantalla, Micrófono, Reconocimiento de voz, Notificaciones). Ejecute la incorporación en esa máquina para concederlos una vez.
- Los nodos anuncian su estado de permiso a través de `node.list` / `node.describe` para que los agentes sepan qué está disponible.

## Notas de seguridad

- Prefiera enlaces de loopback en el host remoto y conéctese a través de SSH o Tailscale.
- El túnel SSH utiliza verificación estricta de clave de host; confíe en la clave del host primero para que exista en `~/.ssh/known_hosts`.
- Si vincula la puerta de enlace a una interfaz que no sea de loopback, requiera una autenticación de puerta de enlace válida: token, contraseña o un proxy inverso con conocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`.
- Consulte [Seguridad](/es/gateway/security) y [Tailscale](/es/gateway/tailscale).

## Flujo de inicio de sesión de WhatsApp (remoto)

- Ejecute `openclaw channels login --verbose` **en el host remoto**. Escanee el código QR con WhatsApp en su teléfono.
- Vuelva a ejecutar el inicio de sesión en ese host si la autenticación expira. La verificación de salud revelará problemas de enlace.

## Solución de problemas

- **exit 127 / not found**: `openclaw` no está en PATH para shells que no son de inicio de sesión. Agréguelo a `/etc/paths`, su rc de shell o cree un enlace simbólico en `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed**: verifique la accesibilidad de SSH, PATH y que Baileys haya iniciado sesión (`openclaw status --json`).
- **Web Chat atascado**: confirme que la puerta de enlace se está ejecutando en el host remoto y que el puerto reenviado coincide con el puerto WS de la puerta de enlace; la interfaz de usuario requiere una conexión WS saludable.
- **La IP del nodo muestra 127.0.0.1**: esperado con el túnel SSH. Cambie **Transporte** a **Directo (ws/wss)** si desea que la puerta de enlace vea la IP real del cliente.
- **Voice Wake**: las frases de activación se reenvían automáticamente en modo remoto; no se necesita un reenviador separado.

## Sonidos de notificación

Elija sonidos por notificación desde secuencias de comandos con `openclaw` y `node.invoke`, por ejemplo:

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Ya no hay un interruptor global de "sonido predeterminado" en la aplicación; los que llaman eligen un sonido (o ninguno) por solicitud.

## Relacionado

- [app de macOS](/es/platforms/macos)
- [Acceso remoto](/es/gateway/remote)
