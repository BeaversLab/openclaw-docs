---
summary: "Flujo de la aplicación macOS para controlar una puerta de enlace OpenClaw remota"
read_when:
  - Setting up or debugging remote mac control
title: "Control remoto"
---

Este flujo permite que la aplicación macOS actúe como un control remoto completo para una puerta de enlace OpenClaw que se ejecuta en otro host (escritorio/servidor). La aplicación puede conectarse directamente a URL de puerta de enlace de LAN/Tailnet de confianza o gestionar un túnel SSH cuando la puerta de enlace remota es solo de bucle local (loopback). Las comprobaciones de estado, el reenvío de Voice Wake y Web Chat reutilizan la misma configuración remota de _Configuración → General_.

## Modos

- **Local (este Mac)**: Todo se ejecuta en el portátil. No se involucra SSH.
- **Remoto a través de SSH (predeterminado)**: Los comandos de OpenClaw se ejecutan en el host remoto. La aplicación mac abre una conexión SSH con `-o BatchMode` más la identidad/clave elegida y un reenvío de puerto local.
- **Remoto directo (ws/wss)**: Sin túnel SSH. La aplicación mac se conecta directamente a la URL de la puerta de enlace (por ejemplo, a través de LAN, Tailscale, Tailscale Serve o un proxy inverso HTTPS público).

## Transportes remotos

El modo remoto admite dos transportes:

- **Túnel SSH** (predeterminado): Usa `ssh -N -L ...` para reenviar el puerto de la puerta de enlace a localhost. La puerta de enlace verá la IP del nodo como `127.0.0.1` porque el túnel es de bucle local.
- **Directo (ws/wss)**: Se conecta directamente a la URL de la puerta de enlace. La puerta de enlace ve la IP real del cliente.

En el modo de túnel SSH, los nombres de host LAN/tailnet descubiertos se guardan como
`gateway.remote.sshTarget`. La aplicación mantiene `gateway.remote.url` en el punto final
del túnel local, por ejemplo `ws://127.0.0.1:18789`, para que la CLI, Web Chat y
el servicio de host de nodos local usen todos el mismo transporte de bucle local seguro.
Si el puerto del túnel local difiere del puerto de la puerta de enlace remota, establezca
`gateway.remote.remotePort` en el puerto del host remoto.

La automatización del navegador en modo remoto es propiedad del host del nodo CLI, no del
nodo de la aplicación nativa de macOS. La aplicación inicia el servicio de host de nodos instalado cuando
es posible; si necesita el control del navegador desde ese Mac, instale/inícielo con
`openclaw node install ...` y `openclaw node start` (o ejecute
`openclaw node run ...` en primer plano) y luego apunte a ese nodo con capacidad de
navegador.

## Requisitos previos en el host remoto

1. Instale Node + pnpm y compile/instale la CLI de OpenClaw (`pnpm install && pnpm build && pnpm link --global`).
2. Asegúrese de que `openclaw` esté en PATH para shells no interactivos (cree un enlace simbólico en `/usr/local/bin` o `/opt/homebrew/bin` si es necesario).
3. Solo para transporte SSH: abre SSH con autenticación por clave. Recomendamos las IPs de **Tailscale** para una accesibilidad estable fuera de la LAN.

## Configuración de la aplicación macOS

Para preconfigurar la aplicación sin el flujo de bienvenida:

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway.local \
  --local-port 18789 \
  --remote-port 18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

Para una puerta de enlace ya accesible en una LAN de confianza o Tailnet, omite SSH por completo:

```bash
openclaw-mac configure-remote \
  --direct-url ws://192.168.0.202:18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

Esto escribe la configuración remota, marca la incorporación como completada y permite que la aplicación gestione
el transporte seleccionado cuando se inicia.

1. Abre _Ajustes → General_.
2. En **OpenClaw se ejecuta**, selecciona **Remoto** y configura:
   - **Transporte**: **Túnel SSH** o **Directo (ws/wss)**.
   - **Destino SSH**: `user@host` (opcional `:port`).
     - Si la puerta de enlace está en la misma LAN y anuncia Bonjour, selecciónala de la lista descubierta para rellenar automáticamente este campo.
   - **URL de la puerta de enlace** (solo Directo): `wss://gateway.example.ts.net` (o `ws://...` para local/LAN).
   - **Archivo de identidad** (avanzado): ruta a tu clave.
   - **Raíz del proyecto** (avanzado): ruta de checkout remoto utilizada para comandos.
   - **Ruta de CLI** (avanzado): ruta opcional a un punto de entrada/binario ejecutable `openclaw` (se rellena automáticamente cuando se anuncia).
3. Pulsa **Probar remoto**. El éxito indica que el `openclaw status --json` remoto se ejecuta correctamente. Los fallos generalmente significan problemas de PATH/CLI; la salida 127 significa que no se encontró la CLI de forma remota.
4. Las comprobaciones de estado y el Web Chat ahora se ejecutarán automáticamente a través del transporte seleccionado.

## Web Chat

- **Túnel SSH**: Web Chat se conecta a la puerta de enlace a través del puerto de control WebSocket reenviado (predeterminado 18789).
- **Directo (ws/wss)**: Web Chat se conecta directamente a la URL de la puerta de enlace configurada.
- Ya no hay un servidor HTTP WebChat separado.

## Permisos

- El host remoto necesita las mismas aprobaciones TCC que el local (Automatización, Accesibilidad, Grabación de pantalla, Micrófono, Reconocimiento de voz, Notificaciones). Ejecuta la incorporación en esa máquina para otorgarlas una vez.
- Los nodos anuncian su estado de permisos a través de `node.list` / `node.describe` para que los agentes sepan qué está disponible.

## Notas de seguridad

- Prefiere enlaces loopback en el host remoto y conéctate a través de SSH, Tailscale Serve o una URL directa de confianza Tailnet/LAN.
- El túnel SSH utiliza una verificación estricta de clave de host; confía primero en la clave del host para que exista en `~/.ssh/known_hosts`.
- Si vincula la Gateway a una interfaz que no sea de loopback, exija una autenticación válida de la Gateway: token, contraseña o un proxy inverso con reconocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`.
- Consulte [Seguridad](/es/gateway/security) y [Tailscale](/es/gateway/tailscale).

## Flujo de inicio de sesión de WhatsApp (remoto)

- Ejecute `openclaw channels login --verbose` **en el host remoto**. Escanee el código QR con WhatsApp en su teléfono.
- Vuelva a ejecutar el inicio de sesión en ese host si la autenticación caduca. La comprobación de salud mostrará los problemas del enlace.

## Solución de problemas

- **exit 127 / not found**: `openclaw` no está en PATH para shells que no son de inicio de sesión. Agréguelo a `/etc/paths`, su archivo rc del shell, o cree un enlace simbólico en `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed**: verifique la accesibilidad SSH, PATH y que Baileys haya iniciado sesión (`openclaw status --json`).
- **Web Chat stuck**: confirme que la puerta de enlace se está ejecutando en el host remoto y que el puerto reenviado coincide con el puerto WS de la puerta de enlace; la interfaz de usuario requiere una conexión WS saludable.
- **Node IP shows 127.0.0.1**: es esperado con el túnel SSH. Cambie **Transport** a **Direct (ws/wss)** si desea que la puerta de enlace vea la IP real del cliente.
- **Dashboard works but Mac capabilities are offline**: esto significa que la conexión de operador/control de la aplicación es saludable, pero la conexión del nodo complementario no está conectada o carece de su superficie de comandos. Abra la sección de dispositivos de la barra de menú y verifique si el Mac está `paired · disconnected`. Para los puntos de conexión `wss://*.ts.net` de Tailscale Serve, la aplicación detecta pins de hoja TLS heredados obsoletos después de la rotación del certificado, borra el pin obsoleto cuando macOS confía en el nuevo certificado y reintenta automáticamente. Si el certificado no es confiable para el sistema o el host no es un nombre de Tailscale Serve, configure `gateway.remote.tlsFingerprint` con la huella digital del certificado esperada, revise el certificado o cambie a **Remote over SSH**.
- **Voice Wake**: las frases de activación se reenvían automáticamente en modo remoto; no se necesita un reenviador separado.

## Sonidos de notificación

Elija sonidos por notificación desde scripts con `openclaw` y `node.invoke`, por ejemplo:

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Ya no hay un interruptor global de "sonido predeterminado" en la aplicación; los que llaman eligen un sonido (o ninguno) por solicitud.

## Relacionado

- [macOS app](/es/platforms/macos)
- [Acceso remoto](/es/gateway/remote)
