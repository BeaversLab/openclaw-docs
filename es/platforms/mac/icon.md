---
summary: "Estados y animaciones del icono de la barra de menú para OpenClaw en macOS"
read_when:
  - Cambiar el comportamiento del icono de la barra de menú
title: "Icono de barra de menú"
---

# Estados del icono de la barra de menú

Autor: steipete · Actualizado: 2025-12-06 · Alcance: app de macOS (`apps/macos`)

- **Inactivo:** Animación de icono normal (parpadeo, movimiento ocasional).
- **Pausado:** El elemento de estado usa `appearsDisabled`; sin movimiento.
- **Activador de voz (orejas grandes):** El detector de activación por voz llama a `AppState.triggerVoiceEars(ttl: nil)` cuando se escucha la palabra de activación, manteniendo `earBoostActive=true` mientras se captura la expresión. Las orejas se agrandan (1,9x), obtienen orificios circulares para legibilidad y luego caen mediante `stopVoiceEars()` después de 1 s de silencio. Solo se activa desde la canalización de voz dentro de la aplicación.
- **Trabajando (agente ejecutándose):** `AppState.isWorking=true` impulsa un micro-movimiento de "correr con la cola/patas": movimiento más rápido de las patas y un ligero desplazamiento mientras el trabajo está en curso. Actualmente se activa durante las ejecuciones del agente WebChat; añada la misma activación alrededor de otras tareas largas cuando las conecte.

Puntos de conexión

- Activación por voz: runtime/tester llaman a `AppState.triggerVoiceEars(ttl: nil)` al activar y a `stopVoiceEars()` después de 1 s de silencio para que coincida con la ventana de captura.
- Actividad del agente: establecer `AppStateStore.shared.setWorking(true/false)` alrededor de los intervalos de trabajo (ya hecho en la llamada al agente WebChat). Mantenga los intervalos cortos y restablezca en bloques `defer` para evitar animaciones atascadas.

Formas y tamaños

- Icono base dibujado en `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`.
- La escala de la oreja es `1.0` de forma predeterminada; el refuerzo de voz establece `earScale=1.9` y activa `earHoles=true` sin cambiar el marco general (imagen de plantilla de 18×18 pt renderizada en un almacén de respaldo Retina de 36×36 px).
- El movimiento rápido utiliza el movimiento de patas de hasta ~1.0 con una pequeña vibración horizontal; es aditivo a cualquier movimiento inactivo existente.

Notas de comportamiento

- Sin alternancia externa de CLI/broker para orejas/en funcionamiento; manténgalo interno a las señales de la propia aplicación para evitar aleteos accidentales.
- Mantenga los TTL cortos (&lt;10 s) para que el icono vuelva a la línea base rápidamente si un trabajo se bloquea.

import en from "/components/footer/en.mdx";

<en />
