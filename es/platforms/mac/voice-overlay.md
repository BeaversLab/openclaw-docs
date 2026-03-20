---
summary: "Ciclo de vida de la superposición de voz cuando la palabra de activación y la pulsación para hablar se superponen"
read_when:
  - Ajustar el comportamiento de la superposición de voz
title: "Voice Overlay"
---

# Ciclo de vida de la superposición de voz (macOS)

Público: colaboradores de la aplicación macOS. Objetivo: mantener la superposición de voz predecible cuando la palabra de activación y la pulsación para hablar se superponen.

## Intención actual

- Si la superposición ya está visible por la palabra de activación y el usuario presiona la tecla de acceso rápido, la sesión de la tecla de acceso rápido _adopta_ el texto existente en lugar de restablecerlo. La superposición permanece activa mientras se mantiene presionada la tecla de acceso rápido. Cuando el usuario la suelta: enviar si hay texto recortado; de lo contrario, descartar.
- La palabra de activación por sí sola todavía se envía automáticamente en silencio; la pulsación para hablar se envía inmediatamente al soltar.

## Implementado (9 de diciembre de 2025)

- Las sesiones de la superposición ahora llevan un token por cada captura (palabra de activación o pulsación para hablar). Las actualizaciones de parciales/finales/envío/descarte/nivel se descartan cuando el token no coincide, evitando devoluciones de llamada obsoletas.
- La pulsación para hablar adopta cualquier texto visible de la superposición como prefijo (por lo que presionar la tecla de acceso rápido mientras la superposición de activación está activa mantiene el texto y añade el nuevo discurso). Espera hasta 1,5 segundos una transcripción final antes de volver al texto actual.
- El registro de campana/superposición se emite en `info` en las categorías `voicewake.overlay`, `voicewake.ptt` y `voicewake.chime` (inicio de sesión, parcial, final, enviar, descartar, motivo de campana).

## Próximos pasos

1. **VoiceSessionCoordinator (actor)**
   - Posee exactamente un `VoiceSession` a la vez.
   - API (basada en tokens): `beginWakeCapture`, `beginPushToTalk`, `updatePartial`, `endCapture`, `cancel`, `applyCooldown`.
   - Descarta las devoluciones de llamada que llevan tokens obsoletos (evita que los reconocedores antiguos vuelvan a abrir la superposición).
2. **VoiceSession (modelo)**
   - Campos: `token`, `source` (wakeWord|pushToTalk), texto confirmado/volátil, indicadores de campana, temporizadores (envío automático, inactivo), `overlayMode` (visualización|edición|envío), fecha límite de enfriamiento.
3. **Enlace de la superposición**
   - `VoiceSessionPublisher` (`ObservableObject`) refleja la sesión activa en SwiftUI.
   - `VoiceWakeOverlayView` solo se renderiza a través del editor; nunca muta singletons globales directamente.
   - Las acciones del usuario en la superposición (`sendNow`, `dismiss`, `edit`) devuelven la llamada al coordinador con el token de sesión.
4. **Ruta de envío unificada**
   - En `endCapture`: si el texto recortado está vacío → descartar; de lo contrario, `performSend(session:)` (reproduce la campana de envío una vez, reenvía, descarta).
   - Pulsar para hablar: sin retraso; palabra de activación: retraso opcional para envío automático.
   - Aplique un breve tiempo de espera al tiempo de ejecución de activación después de que termine la función de pulsar para hablar para que la palabra de activación no se active de nuevo inmediatamente.
5. **Registro**
   - El coordinador emite registros `.info` en el subsistema `ai.openclaw`, categorías `voicewake.overlay` y `voicewake.chime`.
   - Eventos clave: `session_started`, `adopted_by_push_to_talk`, `partial`, `finalized`, `send`, `dismiss`, `cancel`, `cooldown`.

## Lista de verificación de depuración

- Transmita registros mientras reproduce una superposición persistente:

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- Verifique que solo haya un token de sesión activo; las llamadas de retorno obsoletas deben ser descartadas por el coordinador.
- Asegúrese de que la liberación de pulsación para hablar siempre llame a `endCapture` con el token activo; si el texto está vacío, espere `dismiss` sin campana ni envío.

## Pasos de migración (sugeridos)

1. Añada `VoiceSessionCoordinator`, `VoiceSession` y `VoiceSessionPublisher`.
2. Refactorizar `VoiceWakeRuntime` para crear/actualizar/finalizar sesiones en lugar de tocar `VoiceWakeOverlayController` directamente.
3. Refactorizar `VoicePushToTalk` para adoptar las sesiones existentes y llamar a `endCapture` al liberar; aplicar tiempo de espera de ejecución.
4. Conectar `VoiceWakeOverlayController` al publicador; eliminar las llamadas directas del runtime/PTT.
5. Agregue pruebas de integración para la adopción de sesión, el tiempo de espera y el descarte de texto vacío.

import en from "/components/footer/en.mdx";

<en />
