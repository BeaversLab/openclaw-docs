---
summary: "Referencia de la CLI para `openclaw status` (diagnósticos, sondas, instantáneas de uso)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "Estado"
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
- El resultado del estado de la sesión separa `Execution:` de `Runtime:`. `Execution` es la ruta del sandbox (`direct`, `docker/*`), mientras que `Runtime` te indica si la sesión está utilizando `OpenClaw Pi Default`, `OpenAI Codex`, un backend de CLI, o un backend de ACP como `codex (acp/acpx)`. Consulta [Agent runtimes](/es/concepts/agent-runtimes) para conocer la distinción entre proveedor/modelo/runtime.
- Los campos `usage_percent` / `usagePercent` sin procesar de MiniMax son la cuota restante, por lo que OpenClaw los invierte antes de mostrarlos; los campos basados en recuentos tienen prioridad cuando están presentes. Las respuestas de `model_remains` prefieren la entrada del modelo de chat, derivan la etiqueta de la ventana de las marcas de tiempo cuando es necesario e incluyen el nombre del modelo en la etiqueta del plan.
- Cuando la instantánea de la sesión actual es escasa, `/status` puede rellenar los contadores de tokens y caché desde el registro de uso de la transcripción más reciente. Los valores en vivo distintos de cero existentes siguen teniendo prioridad sobre los valores de reserva de la transcripción.
- La reserva de la transcripción también puede recuperar la etiqueta del modelo de runtime activo cuando falta en la entrada de la sesión en vivo. Si ese modelo de transcripción difiere del modelo seleccionado, el estado resuelve la ventana de contexto contra el modelo de runtime recuperado en lugar del seleccionado.
- Para la contabilidad del tamaño del prompt, la reserva de la transcripción prefiere el total orientado al prompt más grande cuando los metadatos de la sesión faltan o son menores, de modo que las sesiones de proveedores personalizados no colapsen a visualizaciones de tokens `0`.
- La salida incluye los almacenes de sesión por agente cuando hay varios agentes configurados.
- La descripción general incluye el estado de instalación/ejecución del servicio de host de Gateway + nodo cuando está disponible.
- La descripción general incluye el canal de actualización + el SHA de git (para las checkouts de código fuente).
- La información de actualización aparece en la descripción general; si hay una actualización disponible, el estado imprime una sugerencia para ejecutar `openclaw update` (consulte [Updating](/es/install/updating)).
- Las superficies de estado de solo lectura (`status`, `status --json`, `status --all`) resuelven los SecretRefs admitidos para sus rutas de configuración de destino cuando es posible.
- Si se configura un SecretRef de canal admitido pero no está disponible en la ruta del comando actual, el estado permanece de solo lectura e informa una salida degradada en lugar de fallar. La salida humana muestra advertencias como "configured token unavailable in this command path", y la salida JSON incluye `secretDiagnostics`.
- Cuando la resolución local del comando de SecretRef tiene éxito, el estado prefiere la instantánea resuelta y borra los marcadores de canal transitorios de "secreto no disponible" de la salida final.
- `status --all` incluye una fila de resumen de Secrets y una sección de diagnóstico que resume los diagnósticos de secretos (truncados para legibilidad) sin detener la generación del informe.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Doctor](/es/gateway/doctor)
