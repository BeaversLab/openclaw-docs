---
summary: "Configuración del canal de WeChat a través del complemento externo openclaw-weixin"
read_when:
  - You want to connect OpenClaw to WeChat or Weixin
  - You are installing or troubleshooting the openclaw-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

OpenClaw se conecta a WeChat a través del plugin de canal externo
`@tencent-weixin/openclaw-weixin` de Tencent.

Estado: plugin externo. Se admiten chats directos y multimedia. Los chats de grupo no son
anunciados por los metadatos de capacidad del plugin actual.

## Nomenclatura

- **WeChat** es el nombre orientado al usuario en estos documentos.
- **Weixin** es el nombre utilizado por el paquete de Tencent y por el ID del plugin.
- `openclaw-weixin` es el ID del canal de OpenClaw.
- `@tencent-weixin/openclaw-weixin` es el paquete npm.

Use `openclaw-weixin` en los comandos de la CLI y las rutas de configuración.

## Cómo funciona

El código de WeChat no reside en el repositorio principal de OpenClaw. OpenClaw proporciona el
contrato genérico del plugin de canal, y el plugin externo proporciona el
entorno de tiempo de ejecución específico de WeChat:

1. `openclaw plugins install` instala `@tencent-weixin/openclaw-weixin`.
2. El Gateway descubre el manifiesto del plugin y carga el punto de entrada del plugin.
3. El plugin registra el ID de canal `openclaw-weixin`.
4. `openclaw channels login --channel openclaw-weixin` inicia el inicio de sesión con código QR.
5. El plugin almacena las credenciales de la cuenta en el directorio de estado de OpenClaw.
6. Cuando se inicia el Gateway, el plugin inicia su monitor de Weixin para cada
   cuenta configurada.
7. Los mensajes entrantes de WeChat se normalizan a través del contrato del canal, se enrutan al
   agente de OpenClaw seleccionado y se envían de vuelta a través de la ruta de salida del plugin.

Esa separación es importante: el núcleo de OpenClaw debe mantenerse agnóstico al canal. El inicio de sesión en WeChat,
las llamadas a la API de Tencent iLink, la carga/descarga de medios, los tokens de contexto y el monitoreo
de cuentas son propiedad del plugin externo.

## Instalación

Instalación rápida:

```bash
npx -y @tencent-weixin/openclaw-weixin-cli install
```

Instalación manual:

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

Reinicie el Gateway después de la instalación:

```bash
openclaw gateway restart
```

## Inicio de sesión

Ejecute el inicio de sesión con código QR en la misma máquina que ejecuta el Gateway:

```bash
openclaw channels login --channel openclaw-weixin
```

Escanee el código QR con WeChat en su teléfono y confirme el inicio de sesión. El plugin guarda
el token de la cuenta localmente después de un escaneo exitoso.

Para agregar otra cuenta de WeChat, ejecute el mismo comando de inicio de sesión nuevamente. Para múltiples
cuentas, aisle las sesiones de mensajes directos por cuenta, canal y remitente:

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## Control de acceso

Los mensajes directos utilizan el modelo normal de emparejamiento y lista permitida de OpenClaw para plugins
de canal.

Aprobar nuevos remitentes:

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

Para ver el modelo completo de control de acceso, consulte [Emparejamiento](/es/channels/pairing).

## Compatibilidad

El plugin verifica la versión del host OpenClaw al inicio.

| Línea del plugin | Versión de OpenClaw     | etiqueta npm |
| ---------------- | ----------------------- | ------------ |
| `2.x`            | `>=2026.3.22`           | `latest`     |
| `1.x`            | `>=2026.1.0 <2026.3.22` | `legacy`     |

Si el complemento indica que su versión de OpenClaw es demasiado antigua, actualice
OpenClaw o instale la línea de complementos heredados:

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## Proceso Sidecar

El complemento de WeChat puede ejecutar tareas auxiliares junto al Gateway mientras monitorea la
API de Tencent iLink. En el número #68451, esa ruta auxiliar expuso un error en la limpieza
genérica de Gateways obsoletos de OpenClaw: un proceso secundario podría intentar limpiar el proceso
principal del Gateway, causando bucles de reinicio bajo gestores de procesos como systemd.

La limpieza de inicio actual de OpenClaw excluye el proceso actual y sus ancestros,
por lo que un asistente de canal no debe eliminar el Gateway que lo inició. Esta solución es
genérica; no es una ruta específica de WeChat en el núcleo.

## Solución de problemas

Verificar la instalación y el estado:

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

Si el canal aparece como instalado pero no se conecta, confirme que el complemento está
habilitado y reinicie:

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

Si el Gateway se reinicia repetidamente después de habilitar WeChat, actualice tanto OpenClaw como
el complemento:

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

Desactivación temporal:

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw gateway restart
```

## Documentos relacionados

- Visión general del canal: [Canales de chat](/es/channels)
- Emparejamiento: [Emparejamiento](/es/channels/pairing)
- Enrutamiento de canales: [Enrutamiento de canales](/es/channels/channel-routing)
- Arquitectura de complementos: [Arquitectura de complementos](/es/plugins/architecture)
- SDK de complementos de canal: [SDK de complementos de canal](/es/plugins/sdk-channel-plugins)
- Paquete externo: [@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
