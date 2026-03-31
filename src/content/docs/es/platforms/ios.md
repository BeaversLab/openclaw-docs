---
summary: "Aplicación de nodo iOS: conexión con la puerta de enlace, emparejamiento, lienzo y solución de problemas"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "App de iOS"
---

# App de iOS (Nodo)

Disponibilidad: vista previa interna. La app de iOS aún no se distribuye públicamente.

## Lo que hace

- Se conecta a una puerta de enlace a través de WebSocket (LAN o tailnet).
- Expone capacidades del nodo: Lienzo, Captura de pantalla, Captura de cámara, Ubicación, Modo de habla, Activación por voz.
- Recibe comandos de `node.invoke` y reporta eventos de estado del nodo.

## Requisitos

- Puerta de enlace ejecutándose en otro dispositivo (macOS, Linux o Windows a través de WSL2).
- Ruta de red:
  - Misma LAN a través de Bonjour, **o**
  - Tailnet a través de DNS-SD unicast (dominio de ejemplo: `openclaw.internal.`), **o**
  - Host/puerto manual (alternativo).

## Inicio rápido (emparejar + conectar)

1. Inicie la puerta de enlace:

```bash
openclaw gateway --port 18789
```

2. En la app de iOS, abra Configuración y seleccione una puerta de enlace descubierta (o active Host manual e ingrese host/puerto).

3. Aprobe la solicitud de emparejamiento en el host de la puerta de enlace:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si la aplicación reintenta el emparejamiento con detalles de autenticación modificados (rol/ámbitos/clave pública),
la solicitud pendiente anterior se reemplaza y se crea un nuevo `requestId`.
Ejecute `openclaw devices list` de nuevo antes de la aprobación.

4. Verificar la conexión:

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Envío respaldado por relay para compilaciones oficiales

Las compilaciones de iOS distribuidas oficialmente utilizan el relay de envío externo en lugar de publicar el token APNs
sin procesar en la puerta de enlace.

Requisito del lado de la puerta de enlace:

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

- La aplicación de iOS se registra en el relay utilizando App Attest y el recibo de la aplicación.
- El relay devuelve un identificador de relay opaco más una concesión de envío con alcance de registro.
- La aplicación de iOS obtiene la identidad de la puerta de enlace emparejada y la incluye en el registro del relay, de modo que el registro respaldado por el relay se delega a esa puerta de enlace específica.
- La aplicación reenvía ese registro respaldado por relay a la puerta de enlace emparejada con `push.apns.register`.
- La puerta de enlace utiliza ese identificador de relay almacenado para `push.test`, activaciones en segundo plano e impulsos de activación.
- La URL base del relay de la puerta de enlace debe coincidir con la URL del relay integrada en la compilación de iOS oficial/TestFlight.
- Si la aplicación se conecta más tarde a una puerta de enlace diferente o a una compilación con una URL base de relay diferente, actualiza el registro del relay en lugar de reutilizar el enlace antiguo.

Lo que la puerta de enlace **no** necesita para esta ruta:

- Ningún token de relay para todo el despliegue.
- Ninguna clave APNs directa para envíos respaldados por relay oficiales/TestFlight.

Flujo esperado del operador:

1. Instale la compilación de iOS oficial/TestFlight.
2. Configure `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
3. Empareje la aplicación con la puerta de enlace y déjela terminar de conectarse.
4. La aplicación publica `push.apns.register` automáticamente después de tener un token APNs, la sesión del operador está conectada y el registro del relay es exitoso.
5. Después de eso, `push.test`, activaciones de reconexión e impulsos de activación pueden utilizar el registro respaldado por relay almacenado.

Nota de compatibilidad:

- `OPENCLAW_APNS_RELAY_BASE_URL` todavía funciona como una sustitución temporal de entorno para la puerta de enlace.

## Flujo de autenticación y confianza

El relay existe para hacer cumplir dos restricciones que el APNs directo en la puerta de enlace no puede proporcionar para
las compilaciones oficiales de iOS:

- Solo las compilaciones genuinas de OpenClaw para iOS distribuidas a través de Apple pueden utilizar el relay alojado.
- Una puerta de enlace solo puede enviar notificaciones push respaldadas por relay para dispositivos iOS que se hayan emparejado con esa puerta de enlace específica.

Salto a salto:

1. `iOS app -> gateway`
   - La aplicación primero se empareja con la puerta de enlace a través del flujo de autenticación normal de la puerta de enlace.
   - Esto otorga a la aplicación una sesión de nodo autenticada más una sesión de operador autenticada.
   - La sesión de operador se usa para llamar a `gateway.identity.get`.

2. `iOS app -> relay`
   - La aplicación llama a los endpoints de registro de relay a través de HTTPS.
   - El registro incluye la prueba de App Attest más el recibo de la aplicación.
   - El relay valida el ID del paquete, la prueba de App Attest y el recibo de Apple, y requiere la ruta de distribución oficial/producción.
   - Esto es lo que impide que las compilaciones locales de Xcode/desarrollo usen el relay alojado. Una compilación local puede estar firmada, pero no satisface la prueba de distribución oficial de Apple que el relay espera.

3. `gateway identity delegation`
   - Antes del registro del relay, la aplicación obtiene la identidad de la puerta de enlace emparejada de `gateway.identity.get`.
   - La aplicación incluye esa identidad de puerta de enlace en la carga útil de registro del relay.
   - El relay devuelve un identificador de relay y una concesión de envío con alcance de registro que se delegan a esa identidad de puerta de enlace.

4. `gateway -> relay`
   - La puerta de enlace almacena el identificador de relay y la concesión de envío de `push.apns.register`.
   - En `push.test`, al despertar la reconexión y en los empujones de activación, la puerta de enlace firma la solicitud de envío con su propia identidad de dispositivo.
   - El relay verifica tanto la concesión de envío almacenada como la firma de la puerta de enlace frente a la identidad de puerta de enlace delegada del registro.
   - Otra puerta de enlace no puede reutilizar ese registro almacenado, incluso si de alguna manera obtiene el identificador.

5. `relay -> APNs`
   - El relay posee las credenciales de producción de APNs y el token APNs sin procesar para la compilación oficial.
   - La puerta de enlace nunca almacena el token APNs sin procesar para las compilaciones oficiales respaldadas por relay.
   - El relay envía el push final a APNs en nombre de la puerta de enlace emparejada.

Por qué se creó este diseño:

- Para mantener las credenciales de producción de APNs fuera de las puertas de enlace de los usuarios.
- Para evitar almacenar tokens APNs de compilaciones oficiales sin procesar en la puerta de enlace.
- Para permitir el uso del relay alojado solo para compilaciones oficiales/TestFlight de OpenClaw.
- Para evitar que una puerta de enlace envíe notificaciones push de activación a dispositivos iOS propiedad de una puerta de enlace diferente.

Las compilaciones locales/manuales siguen en APNs directos. Si estás probando esas compilaciones sin el relay, el
gateway todavía necesita credenciales directas de APNs:

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## Rutas de descubrimiento

### Bonjour (LAN)

El Gateway anuncia `_openclaw-gw._tcp` en `local.`. La app de iOS los lista automáticamente.

### Tailnet (entre redes)

Si mDNS está bloqueado, usa una zona DNS-SD unicast (elige un dominio; ejemplo: `openclaw.internal.`) y DNS dividido de Tailscale.
Ver [Bonjour](/en/gateway/bonjour) para el ejemplo de CoreDNS.

### Host/puerto manual

En Configuración, activa **Host Manual** e introduce el host + puerto del gateway (por defecto `18789`).

## Canvas + A2UI

El nodo de iOS renderiza un lienzo WKWebView. Usa `node.invoke` para controlarlo:

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notas:

- El host del canvas del Gateway sirve `/__openclaw__/canvas/` y `/__openclaw__/a2ui/`.
- Se sirve desde el servidor HTTP del Gateway (mismo puerto que `gateway.port`, por defecto `18789`).
- El nodo de iOS navega automáticamente a A2UI al conectarse cuando se anuncia una URL de host de canvas.
- Vuelve al scaffold integrado con `canvas.navigate` y `{"url":""}`.

### Evaluación de canvas / instantánea

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Activación por voz + modo de habla

- La activación por voz y el modo de habla están disponibles en Configuración.
- iOS puede suspender el audio en segundo plano; trata las funciones de voz como mejor esfuerzo cuando la app no está activa.

## Errores comunes

- `NODE_BACKGROUND_UNAVAILABLE`: trae la app de iOS al primer plano (los comandos canvas/camera/pantalla lo requieren).
- `A2UI_HOST_NOT_CONFIGURED`: el Gateway no anunció una URL de host de canvas; verifica `canvasHost` en [configuración del Gateway](/en/gateway/configuration).
- El aviso de emparejamiento nunca aparece: ejecuta `openclaw devices list` y aprueba manualmente.
- La reconexión falla después de reinstalar: el token de emparejamiento del Keychain se borró; vuelve a emparejar el nodo.

## Documentos relacionados

- [Emparejamiento](/en/channels/pairing)
- [Descubrimiento](/en/gateway/discovery)
- [Bonjour](/en/gateway/bonjour)
