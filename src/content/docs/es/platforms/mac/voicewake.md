---
summary: "Modos de activación por voz y pulsar para hablar, más detalles de enrutamiento en la aplicación de Mac"
read_when:
  - Working on voice wake or PTT pathways
title: "Voice Wake (macOS)"
---

# Activación por voz y pulsar para hablar

## Modos

- **Modo de palabra de activación** (predeterminado): el reconocedor de voz siempre activo espera tokens de activación (`swabbleTriggerWords`). Al encontrar una coincidencia, inicia la captura, muestra la superposición con texto parcial y envía automáticamente después del silencio.
- **Pulsar para hablar (mantener Opción derecha)**: mantenga presionada la tecla Opción derecha para capturar inmediatamente; no se necesita ningún activador. La superposición aparece mientras se mantiene presionada; al soltar, se finaliza y reenvía después de un breve retraso para que pueda ajustar el texto.

## Comportamiento en tiempo de ejecución (palabra de activación)

- El reconocedor de voz reside en `VoiceWakeRuntime`.
- El activador solo se dispara cuando hay una **pausa significativa** entre la palabra de activación y la siguiente palabra (brecha de ~0.55s). La superposición/la señal de sonido pueden comenzar en la pausa incluso antes de que comience el comando.
- Ventanas de silencio: 2.0s cuando el discurso fluye, 5.0s si solo se escuchó el activador.
- Parada forzada: 120s para evitar sesiones incontroladas.
- Antirrebote entre sesiones: 350ms.
- La superposición se controla mediante `VoiceWakeOverlayController` con coloración confirmada/volátil.
- Después de enviar, el reconocedor se reinicia limpiamente para escuchar el siguiente activador.

## Invariantes del ciclo de vida

- Si la activación por voz está habilitada y se conceden los permisos, el reconocedor de palabras de activación debería estar escuchando (excepto durante una captura explícita de pulsar para hablar).
- La visibilidad de la superposición (incluido el descarte manual mediante el botón X) nunca debe impedir que el reconocemer se reanude.

## Modo de fallo de superposición fija (anterior)

Anteriormente, si la superposición se quedaba visible atascada y la cerraba manualmente, la activación por voz podía parecer "muerta" porque el intento de reinicio del tiempo de ejecución podía bloquearse por la visibilidad de la superposición y no se programaba ningún reinicio posterior.

Endurecimiento:

- El reinicio del tiempo de ejecución de activación ya no está bloqueado por la visibilidad de la superposición.
- La finalización del descarte de la superposición activa un `VoiceWakeRuntime.refresh(...)` a través de `VoiceSessionCoordinator`, por lo que el descarte manual con X siempre reanuda la escucha.

## Especificaciones de pulsar para hablar

- La detección de atajos de teclado utiliza un monitor global `.flagsChanged` para la **Opción derecha** (`keyCode 61` + `.option`). Solo observamos eventos (sin interceptación).
- La canalización de captura reside en `VoicePushToTalk`: inicia el reconocimiento de voz inmediatamente, transmite parciales a la superposición y llama a `VoiceWakeForwarder` al liberar.
- Cuando se inicia la pulsación para hablar (push-to-talk), pausamos el tiempo de ejecución de la palabra de activación para evitar pulsaciones de audio en conflicto; se reinicia automáticamente después de liberar.
- Permisos: requiere Micrófono + Voz; ver eventos requiere la aprobación de Accesibilidad/Monitoreo de entrada.
- Teclados externos: algunos pueden no exponer la Opción derecha como se espera; ofrezca un método abreviado alternativo si los usuarios reportan fallos.

## Configuración orientada al usuario

- Interruptor **Voice Wake**: activa el tiempo de ejecución de la palabra de activación.
- **Mantener presionado Cmd+Fn para hablar**: activa el monitor de pulsación para hablar. Desactivado en macOS < 26.
- Selectores de idioma y micrófono, medidor de nivel en vivo, tabla de palabras de activación, probador (solo local; no reenvía).
- El selector de micrófono conserva la última selección si un dispositivo se desconecta, muestra una pista de desconexión y vuelve temporalmente al predeterminado del sistema hasta que regrese.
- **Sonidos**: campanillas al detectar activación y al enviar; por defecto al sonido del sistema macOS “Glass”. Puede elegir cualquier archivo cargable por `NSSound` (p. ej., MP3/WAV/AIFF) para cada evento o elegir **Sin sonido**.

## Comportamiento de reenvío

- Cuando Voice Wake está activado, las transcripciones se reenvían a la puerta de enlace/agente activo (el mismo modo local frente a remoto utilizado por el resto de la aplicación Mac).
- Las respuestas se entregan al **último proveedor principal utilizado** (WhatsApp/Telegram/Discord/WebChat). Si la entrega falla, el error se registra y la ejecución aún es visible a través de WebChat/registros de sesión.

## Carga útil de reenvío

- `VoiceWakeForwarder.prefixedTranscript(_:)` antepone la sugerencia de la máquina antes de enviar. Compartido entre las rutas de palabra de activación y pulsación para hablar.

## Verificación rápida

- Active la pulsación para hablar, mantenga presionado Cmd+Fn, hable, suelte: la superposición debería mostrar los parciales y luego enviar.
- Mientras se mantiene presionado, los “oídos” de la barra de menú deben permanecer agrandados (usan `triggerVoiceEars(ttl:nil)`); se reducen después de soltar.
