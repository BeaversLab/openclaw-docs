---
summary: "Referencia de la CLI para `openclaw status` (diagnósticos, sondas, instantáneas de uso)"
read_when:
  - Quiere un diagnóstico rápido del estado del canal + los destinatarios de sesiones recientes
  - Quiere un estado “completo” que se pueda pegar para la depuración
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

- `--deep` ejecuta sondas en vivo (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- La salida incluye los almacenes de sesiones por agente cuando se configuran múltiples agentes.
- La descripción general incluye el estado de instalación/ejecución del servicio de host de Gateway + nodo cuando está disponible.
- La descripción general incluye el canal de actualización + el SHA de git (para las descargas de código fuente).
- La información de actualización aparece en la descripción general; si hay una actualización disponible, el estado imprime una sugerencia para ejecutar `openclaw update` (consulte [Actualización](/es/install/updating)).
- Las superficies de estado de solo lectura (`status`, `status --json`, `status --all`) resuelven los SecretRefs compatibles para sus rutas de configuración de destino cuando es posible.
- Si se configura un SecretRef de canal compatible pero no está disponible en la ruta del comando actual, el estado permanece de solo lectura e informa una salida degradada en lugar de bloquearse. La salida humana muestra advertencias como “configured token unavailable in this command path”, y la salida JSON incluye `secretDiagnostics`.
- Cuando la resolución local de comandos de SecretRef tiene éxito, el estado prefiere la instantánea resuelta y borra los marcadores de canal transitorios de “secreto no disponible” de la salida final.
- `status --all` incluye una fila de descripción general de Secrets y una sección de diagnóstico que resume los diagnósticos de secretos (truncados para facilitar la lectura) sin detener la generación del informe.

import en from "/components/footer/en.mdx";

<en />
