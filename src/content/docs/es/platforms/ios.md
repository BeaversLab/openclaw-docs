---
summary: "Aplicación de nodo iOS: conectar con la puerta de enlace, emparejamiento, lienzo y solución de problemas"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "Aplicación iOS"
---

Disponibilidad: las compilaciones de la aplicación de iPhone se distribuyen a través de los canales de Apple cuando se habilitan para un lanzamiento. Las compilaciones de desarrollo local también pueden ejecutarse desde el código fuente.

## Lo que hace

- Se conecta a una puerta de enlace a través de WebSocket (LAN o tailnet).
- Expone las capacidades del nodo: Canvas, captura de pantalla, captura de cámara, ubicación, modo Talk y activación por voz.
- Recibe comandos de `node.invoke` e informa eventos de estado del nodo.

## Requisitos

- Puerta de enlace ejecutándose en otro dispositivo (macOS, Linux o Windows a través de WSL2).
- Ruta de red:
  - Misma LAN a través de Bonjour, **o**
  - Tailnet a través de unicast DNS-SD (dominio de ejemplo: `openclaw.internal.`), **o**
  - Host/puerto manual (respaldo).

## Inicio rápido (emparejar + conectar)

1. Inicie la puerta de enlace:

```bash
openclaw gateway --port 18789
```

2. En la aplicación iOS, abra Configuración y elija una puerta de enlace descubierta (o habilite Host manual e ingrese host/puerto).

3. Aprobar la solicitud de emparejamiento en el host de la puerta de enlace:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si la aplicación vuelve a intentar el emparejamiento con detalles de autenticación modificados (rol/alcances/clave pública),
la solicitud pendiente anterior se reemplaza y se crea un nuevo `requestId`.
Ejecute `openclaw devices list` nuevamente antes de la aprobación.

Opcional: si el nodo iOS siempre se conecta desde una subred controlada estrictamente, puede
optar por la aprobación automática de nodo por primera vez con CIDR explícitos o IPs exactas:

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Esto está deshabilitado de forma predeterminada. Solo se aplica al emparejamiento `role: node` nuevo sin
alcances solicitados. El emparejamiento de operador/navegador y cualquier cambio de rol, alcance, metadatos o
clave pública aún requieren aprobación manual.

4. Verificar la conexión:

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push respaldado por relay para compilaciones oficiales

Las compilaciones oficiales distribuidas de iOS utilizan el relay de push externo en lugar de publicar el token APNs
sin procesar en la puerta de enlace.

De manera predeterminada, las compilaciones oficiales/TestFlight y las gateways utilizan el relay alojado en `https://ios-push-relay.openclaw.ai`.

Las implementaciones personalizadas de relay pueden anular la URL del relay de la gateway:

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

Cómo funciona el flujo:

- La aplicación de iOS se registra en el relay utilizando App Attest y una transacción de aplicación StoreKit JWS.
- El relay devuelve un identificador de relay opaco más una subvención de envío con alcance de registro.
- La aplicación de iOS obtiene la identidad de la gateway emparejada y la incluye en el registro del relay, de modo que el registro respaldado por relay se delega a esa gateway específica.
- La aplicación reenvía ese registro respaldado por relay a la gateway emparejada con `push.apns.register`.
- La gateway utiliza ese identificador de relay almacenado para `push.test`, activaciones en segundo plano y notificaciones de activación.
- Las URL personalizadas del relay de la gateway deben coincidir con la URL del relay integrada en la compilación oficial/TestFlight de iOS.
- Si la aplicación más tarde se conecta a una gateway diferente o a una compilación con una URL base de relay diferente, actualiza el registro del relay en lugar de reutilizar el enlace antiguo.

Lo que la gateway **no** necesita para esta ruta:

- Ningún token de relay para toda la implementación.
- Ninguna clave APNs directa para envíos respaldados por relay oficiales/TestFlight.

Flujo de operador esperado:

1. Instalar la compilación oficial/TestFlight de iOS.
2. Opcional: establecer `gateway.push.apns.relay.baseUrl` en la gateway solo cuando se utiliza una implementación de relay personalizada.
3. Emparejar la aplicación con la gateway y permitir que termine de conectarse.
4. La aplicación publica `push.apns.register` automáticamente después de tener un token APNs, la sesión del operador está conectada y el registro del relay tiene éxito.
5. Después de eso, `push.test`, activaciones de reconexión y notificaciones de activación pueden utilizar el registro respaldado por relay almacenado.

## Balizas de actividad en segundo plano

Cuando iOS activa la aplicación para una notificación push silenciosa, una actualización en segundo plano o un evento de ubicación significativo, la aplicación
intenta una breve reconexión de nodo y luego llama a `node.event` con `event: "node.presence.alive"`.
La gateway registra esto como `lastSeenAtMs`/`lastSeenReason` en los metadatos del nodo/dispositivo emparejado solo
después de que se conoce la identidad del dispositivo del nodo autenticado.

La aplicación trata una activación en segundo plano como registrada correctamente solo cuando la respuesta de la puerta de enlace incluye
`handled: true`. Las puertas de enlace antiguas pueden reconocer `node.event` con `{ "ok": true }`; esa respuesta es
compatible pero no cuenta como una actualización duradera de la última vez visto.

Nota de compatibilidad:

- `OPENCLAW_APNS_RELAY_BASE_URL` todavía funciona como una anulación de entorno temporal para la puerta de enlace.
- `OPENCLAW_PUSH_RELAY_BASE_URL` todavía funciona como una anulación de entorno temporal para las compilaciones oficiales/TestFlight de iOS.

## Flujo de autenticación y confianza

El relé existe para hacer cumplir dos restricciones que el APNs directo en la puerta de enlace no puede proporcionar para
las compilaciones oficiales de iOS:

- Solo las compilaciones genuinas de OpenClaw para iOS distribuidas a través de Apple pueden usar el relé alojado.
- Una puerta de enlace solo puede enviar notificaciones respaldadas por relé a dispositivos iOS que se hayan emparejado con esa
  puerta de enlace específica.

Salto a salto:

1. `iOS app -> gateway`
   - La aplicación primero se empareja con la puerta de enlace a través del flujo de autenticación normal de la puerta de enlace.
   - Esto otorga a la aplicación una sesión de nodo autenticada más una sesión de operador autenticada.
   - La sesión de operador se utiliza para llamar a `gateway.identity.get`.

2. `iOS app -> relay`
   - La aplicación llama a los puntos finales de registro del relé a través de HTTPS.
   - El registro incluye una prueba de App Attest más una transacción de aplicación StoreKit JWS.
   - El relé valida el ID del paquete, la prueba de App Attest y la prueba de distribución de Apple, y requiere la
     ruta de distribución oficial/de producción.
   - Esto es lo que impide que las compilaciones locales de Xcode/desarrollo usen el relé alojado. Una compilación local puede estar
     firmada, pero no satisface la prueba de distribución oficial de Apple que el relé espera.

3. `gateway identity delegation`
   - Antes del registro del relé, la aplicación obtiene la identidad de la puerta de enlace emparejada desde
     `gateway.identity.get`.
   - La aplicación incluye esa identidad de la puerta de enlace en la carga útil de registro del relé.
   - El relé devuelve un identificador de relé y una subvención de envío con ámbito de registro que se delegan a
     esa identidad de la puerta de enlace.

4. `gateway -> relay`
   - La puerta de enlace almacena el identificador de relé y la subvención de envío de `push.apns.register`.
   - En `push.test`, activaciones de reconexión y empujones de activación, la puerta de enlace firma la solicitud de envío con su
     propia identidad de dispositivo.
   - El rele verifica tanto el permiso de envío almacenado como la firma de la puerta de enlace contra la identidad de puerta de enlace delegada del registro.
   - Otra puerta de enlace no puede reutilizar ese registro almacenado, incluso si de alguna manera obtiene el identificador.

5. `relay -> APNs`
   - El rele posee las credenciales de APNs de producción y el token de APNs sin procesar para la compilación oficial.
   - La puerta de enlace nunca almacena el token de APNs sin procesar para las compilaciones oficiales respaldadas por el rele.
   - El rele envía el envío final a APNs en nombre de la puerta de enlace emparejada.

Por qué se creó este diseño:

- Para mantener las credenciales de APNs de producción fuera de las puertas de enlace de los usuarios.
- Para evitar almacenar tokens de APNs de compilación oficial sin procesar en la puerta de enlace.
- Para permitir el uso del rele alojado solo para compilaciones oficiales/TestFlight de OpenClaw.
- Para evitar que una puerta de enlace envíe envíos de activación a dispositivos iOS propiedad de una puerta de enlace diferente.

Las compilaciones locales/manuales permanecen en APNs directos. Si está probando esas compilaciones sin el rele, la puerta de enlace aún necesita credenciales directas de APNs:

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

Estas son variables de entorno de tiempo de ejecución del host de la puerta de enlace, no configuraciones de Fastlane. `apps/ios/fastlane/.env` solo almacena la autenticación de App Store Connect / TestFlight como `ASC_KEY_ID` y `ASC_ISSUER_ID`; no configura la entrega directa de APNs para compilaciones locales de iOS.

Almacenamiento recomendado del host de la puerta de enlace:

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

No confirme el archivo `.p8` ni lo coloque bajo el repositorio de checkout.

## Rutas de descubrimiento

### Bonjour (LAN)

La aplicación de iOS explora `_openclaw-gw._tcp` en `local.` y, cuando está configurado, el mismo dominio de descubrimiento DNS-SD de área amplia. Las puertas de enlace de la misma LAN aparecen automáticamente desde `local.`; el descubrimiento entre redes puede usar el dominio de área amplia configurado sin cambiar el tipo de baliza.

### Tailnet (entre redes)

Si mDNS está bloqueado, use una zona DNS-SD unicast (elija un dominio; ejemplo: `openclaw.internal.`) y DNS dividido de Tailscale. Consulte [Bonjour](/es/gateway/bonjour) para ver el ejemplo de CoreDNS.

### Host/puerto manual

En Configuración, habilite **Host Manual** e ingrese el host + puerto de la puerta de enlace (predeterminado `18789`).

## Canvas + A2UI

El nodo de iOS representa un canvas WKWebView. Use `node.invoke` para controlarlo:

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notas:

- El host del lienzo de Gateway sirve `/__openclaw__/canvas/` y `/__openclaw__/a2ui/`.
- Se sirve desde el servidor HTTP de Gateway (mismo puerto que `gateway.port`, por defecto `18789`).
- El nodo de iOS navega automáticamente a A2UI al conectarse cuando se anuncia una URL de host de lienzo.
- Vuelva al andamio integrado con `canvas.navigate` y `{"url":""}`.

## Relación de uso de computadora

La aplicación de iOS es una superficie de nodo móvil, no un backend de uso de computadora de Codex. Codex
Computer Use y `cua-driver mcp` controlan un escritorio macOS local a través de herramientas
MCP; la aplicación de iOS expone las capacidades del iPhone a través de comandos de nodo de OpenClaw
tales como `canvas.*`, `camera.*`, `screen.*`, `location.*`, y `talk.*`.

Los agentes aún pueden operar la aplicación de iOS a través de OpenClaw invocando comandos
de nodo, pero esas llamadas pasan por el protocolo de nodo de gateway y siguen los límites
de primer plano / segundo plano de iOS. Use [Codex Computer Use](/es/plugins/codex-computer-use)
para el control del escritorio local y esta página para las capacidades del nodo de iOS.

### Evaluación de lienzo / instantánea

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Activación por voz + modo de habla

- La activación por voz y el modo de habla están disponibles en Configuración.
- Los nodos de iOS con capacidad de habla anuncian la capacidad `talk` y pueden declarar
  `talk.ptt.start`, `talk.ptt.stop`, `talk.ptt.cancel`, y `talk.ptt.once`;
  el Gateway permite esos comandos de pulsar para hablar de manera predeterminada para nodos
  de confianza con capacidad de habla.
- iOS puede suspender el audio en segundo plano; trate las funciones de voz como mejor esfuerzo cuando la aplicación no está activa.

## Errores comunes

- `NODE_BACKGROUND_UNAVAILABLE`: traiga la aplicación de iOS al primer plano (los comandos de lienzo/cámara/pantalla lo requieren).
- `A2UI_HOST_NOT_CONFIGURED`: el Gateway no anunció la URL de la superficie del complemento Canvas; verifique `plugins.entries.canvas.config.host` en [Gateway configuration](/es/gateway/configuration).
- El mensaje de emparejamiento nunca aparece: ejecute `openclaw devices list` y apruebe manualmente.
- La reconexión falla después de reinstalar: el token de emparejamiento del llavero se borró; vuelva a emparejar el nodo.

## Documentos relacionados

- [Emparejamiento](/es/channels/pairing)
- [Descubrimiento](/es/gateway/discovery)
- [Bonjour](/es/gateway/bonjour)
