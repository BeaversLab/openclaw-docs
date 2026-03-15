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

4. Verifique la conexión:

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Envío respaldado por relay para compilaciones oficiales

Las compilaciones oficiales distribuidas de iOS utilizan el relay de envío externo en lugar de publicar el token APNs sin procesar en la puerta de enlace.

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

- La app de iOS se registra en el relay usando App Attest y el recibo de la app.
- El relay devuelve un manejador de relay opaco más un permiso de envío con alcance de registro.
- La app de iOS obtiene la identidad de la puerta de enlace emparejada y la incluye en el registro del relay, de modo que el registro respaldado por relay se delega a esa puerta de enlace específica.
- La app reenvía ese registro respaldado por relay a la puerta de enlace emparejada con `push.apns.register`.
- La puerta de enlace usa ese manejador de relay almacenado para `push.test`, activaciones en segundo plano y empujones de activación.
- La URL base del relay de la puerta de enlace debe coincidir con la URL del relay incorporada en la compilación oficial/TestFlight de iOS.
- Si la app más tarde se conecta a una puerta de enlace diferente o a una compilación con una URL base de relay diferente, actualiza el registro del relay en lugar de reutilizar el enlace antiguo.

Lo que la puerta de enlace **no** necesita para esta ruta:

- Ningún token de relay para toda la implementación.
- Ninguna clave APNs directa para envíos respaldados por relay oficiales/TestFlight.

Flujo esperado del operador:

1. Instale la compilación oficial/TestFlight de iOS.
2. Configure `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
3. Emparejar la aplicación con la puerta de enlace y dejar que termine de conectarse.
4. La aplicación publica `push.apns.register` automáticamente después de tener un token APNs, la sesión del operador está conectada y el registro de relé tiene éxito.
5. Después de eso, `push.test`, las reconexiones despiertan y los empujones de activación (wake nudges) pueden usar el registro de respaldo de relé almacenado.

Nota de compatibilidad:

- `OPENCLAW_APNS_RELAY_BASE_URL` todavía funciona como una anulación temporal de entorno para la puerta de enlace.

## Flujo de autenticación y confianza

El relé existe para hacer cumplir dos restricciones que APNs directo en la puerta de enlace no puede proporcionar para
las compilaciones oficiales de iOS:

- Solo las compilaciones genuinas de iOS de OpenClaw distribuidas a través de Apple pueden usar el relé alojado.
- Una puerta de enlace solo puede enviar envíos respaldados por relé para dispositivos iOS que se hayan emparejado con esa
  puerta de enlace específica.

Salto a salto:

1. `iOS app -> gateway`
   - La aplicación primero se empareja con la puerta de enlace a través del flujo normal de autenticación de Gateway.
   - Eso le da a la aplicación una sesión de nodo autenticada más una sesión de operador autenticada.
   - La sesión del operador se usa para llamar a `gateway.identity.get`.

2. `iOS app -> relay`
   - La aplicación llama a los puntos finales de registro de relé a través de HTTPS.
   - El registro incluye la prueba de App Attest más el recibo de la aplicación.
   - El relé valida el ID del paquete, la prueba de App Attest y el recibo de Apple, y requiere la
     ruta de distribución oficial/producción.
   - Esto es lo que bloquea las compilaciones locales de Xcode/desarrollo para usar el relé alojado. Una compilación local puede
     estar firmada, pero no satisface la prueba de distribución oficial de Apple que el relé espera.

3. `gateway identity delegation`
   - Antes del registro de relé, la aplicación obtiene la identidad de la puerta de enlace emparejada desde
     `gateway.identity.get`.
   - La aplicación incluye esa identidad de puerta de enlace en la carga útil de registro de relé.
   - El relé devuelve un identificador de relé y una subvención de envío con alcance de registro que se delegan a
     esa identidad de puerta de enlace.

4. `gateway -> relay`
   - La puerta de enlace almacena el identificador de relé y la subvención de envío de `push.apns.register`.
   - En `push.test`, reconexiones despiertas y empujones de activación, la puerta de enlace firma la solicitud de envío con su
     propia identidad de dispositivo.
   - El relé verifica tanto la subvención de envío almacenada como la firma de la puerta de enlace contra la
     identidad de puerta de enlace delegada del registro.
   - Otra puerta de enlace no puede reutilizar ese registro almacenado, incluso si de alguna manera obtiene el identificador.

5. `relay -> APNs`
   - El relé posee las credenciales de producción de APNs y el token sin procesar de APNs para la compilación oficial.
   - La puerta de enlace nunca almacena el token sin procesar de APNs para las compilaciones oficiales respaldadas por el relé.
   - El relé envía el impulso final a APNs en nombre de la puerta de enlace emparejada.

Por qué se creó este diseño:

- Para mantener las credenciales de producción de APNs fuera de las puertas de enlace de los usuarios.
- Para evitar almacenar tokens de APNs de compilaciones oficiales sin procesar en la puerta de enlace.
- Para permitir el uso del relé alojado solo para las compilaciones oficiales/de TestFlight de OpenClaw.
- Para evitar que una puerta de enlace envíe impulsos de activación a dispositivos iOS propiedad de una puerta de enlace diferente.

Las compilaciones locales/manuales permanecen en APNs directas. Si estás probando esas compilaciones sin el relé, la puerta de enlace aún necesita credenciales directas de APNs:

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## Rutas de descubrimiento

### Bonjour (LAN)

La puerta de enlace anuncia `_openclaw-gw._tcp` en `local.`. La aplicación de iOS los enumera automáticamente.

### Tailnet (entre redes)

Si mDNS está bloqueado, usa una zona DNS-SD unidifusión (elige un dominio; ejemplo: `openclaw.internal.`) y DNS dividido de Tailscale.
Consulta [Bonjour](/es/gateway/bonjour) para ver el ejemplo de CoreDNS.

### Host/puerto manual

En Configuración, activa **Host manual** e introduce el host de la puerta de enlace + puerto (predeterminado `18789`).

## Canvas + A2UI

El nodo de iOS representa un lienzo WKWebView. Usa `node.invoke` para controlarlo:

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notas:

- El host de lienzo de la puerta de enlace sirve `/__openclaw__/canvas/` y `/__openclaw__/a2ui/`.
- Se sirve desde el servidor HTTP de la puerta de enlace (mismo puerto que `gateway.port`, predeterminado `18789`).
- El nodo de iOS navega automáticamente a A2UI al conectarse cuando se anuncia una URL de host de lienzo.
- Vuelve al scaffold integrado con `canvas.navigate` y `{"url":""}`.

### Evaluación de Canvas / instantánea

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Activación por voz + modo de conversación

- La activación por voz y el modo de conversación están disponibles en Configuración.
- iOS puede suspender el audio en segundo plano; trata las funciones de voz como de mejor esfuerzo cuando la aplicación no está activa.

## Errores comunes

- `NODE_BACKGROUND_UNAVAILABLE`: lleva la aplicación de iOS al primer plano (los comandos de lienzo/cámara/pantalla lo requieren).
- `A2UI_HOST_NOT_CONFIGURED`: el Gateway no anunció una URL de host de lienzo; verifique `canvasHost` en [Configuración del Gateway](/es/gateway/configuration).
- El mensaje de emparejamiento nunca aparece: ejecute `openclaw devices list` y apruébelo manualmente.
- La reconexión falla después de reinstalar: el token de emparejamiento del llavero se borró; vuelva a emparejar el nodo.

## Documentación relacionada

- [Emparejamiento](/es/channels/pairing)
- [Descubrimiento](/es/gateway/discovery)
- [Bonjour](/es/gateway/bonjour)

import es from "/components/footer/es.mdx";

<es />
