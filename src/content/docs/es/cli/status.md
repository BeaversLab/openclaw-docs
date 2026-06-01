---
summary: "Referencia de la CLI para `openclaw status` (diagnósticos, sondas, instantáneas de uso)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable "all" status for debugging
title: "estado de openclaw"
---

Diagnósticos para canales + sesiones.

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notas:

- `--deep` ejecuta sondas en vivo (WhatsApp Web + Telegram + Discord + Slack + Signal).
- El `openclaw status` plano se mantiene en la ruta rápida de solo lectura y marca la memoria como `not checked` en lugar de no disponible cuando omite la inspección de memoria. La auditoría de seguridad pesada, la compatibilidad de complementos y las sondas de vectores de memoria se dejan para `openclaw status --all`, `openclaw status --deep`, `openclaw security audit` y `openclaw memory status --deep`.
- `status --json --all` reporta detalles de memoria del tiempo de ejecución del complemento de memoria activo seleccionado por `plugins.slots.memory`. Los complementos de memoria personalizados pueden dejar el `agents.defaults.memorySearch.enabled` integrado deshabilitado y aún reportar sus propios archivos, fragmentos, vectores y estado FTS.
- `--usage` imprime ventanas de uso del proveedor normalizadas como `X% left`.
- El resultado del estado de la sesión separa `Execution:` de `Runtime:`. `Execution` es la ruta del sandbox (`direct`, `docker/*`), mientras que `Runtime` te indica si la sesión está utilizando `OpenClaw Default`, `OpenAI Codex`, un backend CLI, o un backend ACP como `codex (acp/acpx)`. Consulte [Agent runtimes](/es/concepts/agent-runtimes) para conocer la distinción entre proveedor/modelo/runtime.
- Los campos `usage_percent` / `usagePercent` sin procesar de MiniMax son cuota restante, por lo que OpenClaw los invierte antes de mostrarlos; los campos basados en conteo tienen prioridad cuando están presentes. Las respuestas `model_remains` prefieren la entrada del modelo de chat, derivan la etiqueta de la ventana de las marcas de tiempo cuando es necesario e incluyen el nombre del modelo en la etiqueta del plan.
- Cuando la instantánea de la sesión actual es dispersa, `/status` puede rellenar los contadores de tokens y caché desde el registro de uso de la transcripción más reciente. Los valores vivos distintos de cero existentes siguen teniendo prioridad sobre los valores de reserva de la transcripción.
- `/status` incluye el tiempo de actividad compacto del proceso Gateway y el tiempo de actividad del sistema host.
- La reserva de transcripción también puede recuperar la etiqueta del modelo de tiempo de ejecución activo cuando la entrada de la sesión en vivo carece de ella. Si ese modelo de transcripción difiere del modelo seleccionado, el estado resuelve la ventana de contexto contra el modelo de tiempo de ejecución recuperado en lugar del seleccionado.
- Cuando una sesión está fijada a un modelo que difiere del principal configurado, el estado imprime ambos valores, el motivo (`session override`) y la sugerencia de limpieza (`/model <configured-default>` o `/reset`). El principal configurado se aplica a sesiones nuevas o no fijadas; las sesiones fijadas existentes mantienen su selección de sesión hasta que se limpien.
- Para la contabilidad del tamaño del prompt, el respaldo de la transcripción prefiere el total orientado al prompt más grande cuando faltan los metadatos de la sesión o son más pequeños, de modo que las sesiones de proveedores personalizados no colapsen a visualizaciones de tokens `0`.
- La salida incluye almacenes de sesión por agente cuando se configuran múltiples agentes.
- La descripción general incluye el estado de instalación/ejecución del servicio de host de Gateway + nodo cuando está disponible.
- La descripción general incluye el canal de actualización + el SHA de git (para las descargas de código fuente).
- La información de actualización aparece en la descripción general; si hay una actualización disponible, el estado imprime una sugerencia para ejecutar `openclaw update` (consulte [Actualización](/es/install/updating)).
- Los fallos de actualización de precios de modelos se muestran como advertencias de precios opcionales. No
  significan que la Gateway o los canales no estén sanos.
- Las superficies de estado de solo lectura (`status`, `status --json`, `status --all`) resuelven los SecretRefs admitidos para sus rutas de configuración objetivo cuando es posible.
- Si se configura un SecretRef de canal admitido pero no está disponible en la ruta del comando actual, el estado permanece de solo lectura e informa una salida degradada en lugar de bloquearse. La salida humana muestra advertencias como "configured token unavailable in this command path", y la salida JSON incluye `secretDiagnostics`.
- Cuando la resolución de SecretRef local al comando tiene éxito, el estado prefiere la instantánea resuelta y elimina los marcadores de canal transitorios de "secreto no disponible" de la salida final.
- `status --all` incluye una fila de resumen de Secrets y una sección de diagnóstico que resume los diagnósticos de secretos (truncados para facilitar la lectura) sin detener la generación del informe.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Doctor](/es/gateway/doctor)
