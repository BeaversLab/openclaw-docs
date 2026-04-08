---
summary: "Referencia de la CLI para `openclaw status` (diagnósticos, sondas, instantáneas de uso)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

Diagnósticos para canales + sesiones.

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notas:

- `--deep` ejecuta sondas en vivo (WhatsApp Web + Telegram + Discord + Slack + Signal).
- `--usage` imprime las ventanas de uso normalizadas del proveedor como `X% left`.
- Los campos brutos `usage_percent` / `usagePercent` de MiniMax son la cuota restante, por lo que OpenClaw los invierte antes de mostrarlos; los campos basados en recuento tienen prioridad si están presentes. Las respuestas de `model_remains` prefieren la entrada del modelo de chat, derivan la etiqueta de la ventana de las marcas de tiempo cuando es necesario e incluyen el nombre del modelo en la etiqueta del plan.
- Cuando la instantánea de la sesión actual es escasa, `/status` puede rellenar los contadores de tokens y caché desde el registro de uso de la transcripción más reciente. Los valores en vivo distintos de cero existentes todavía tienen prioridad sobre los valores de respaldo de la transcripción.
- El respaldo de la transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo cuando la entrada de la sesión en vivo carece de ella. Si ese modelo de transcripción difiere del modelo seleccionado, el estado resuelve la ventana de contexto contra el modelo de tiempo de ejecución recuperado en lugar del seleccionado.
- Para la contabilidad del tamaño del mensaje, el respaldo de la transcripción prefiere el total orientado al mensaje más grande cuando los metadatos de la sesión faltan o son menores, de modo que las sesiones de proveedores personalizados no colapsen en visualizaciones de tokens `0`.
- La salida incluye los almacenes de sesión por agente cuando hay varios agentes configurados.
- La descripción general incluye el estado de instalación/ejecución del servicio de Gateway + host de nodo cuando está disponible.
- La descripción general incluye el canal de actualización + el SHA de git (para las comprobaciones de código fuente).
- La información de actualización aparece en la descripción general; si hay una actualización disponible, el estado imprime una pista para ejecutar `openclaw update` (consulte [Actualización](/en/install/updating)).
- Las superficies de estado de solo lectura (`status`, `status --json`, `status --all`) resuelven los SecretRefs compatibles para sus rutas de configuración de destino cuando es posible.
- Si se configura un SecretRef de canal compatible pero no está disponible en la ruta de comando actual, el estado permanece de solo lectura e informa una salida degradada en lugar de fallar. La salida humana muestra advertencias como "configured token unavailable in this command path", y la salida JSON incluye `secretDiagnostics`.
- Cuando la resolución de SecretRef local al comando tiene éxito, el estado prefiere la instantánea resuelta y borra los marcadores de canal transitorios de “secreto no disponible” de la salida final.
- `status --all` incluye una fila de resumen de Secrets y una sección de diagnóstico que resume el diagnóstico de secretos (truncado para legibilidad) sin detener la generación del informe.
