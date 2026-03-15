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

- `--deep` ejecuta sondas en vivo (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- La salida incluye los almacenes de sesión por agente cuando se han configurado varios agentes.
- La descripción general incluye el estado de instalación/ejecución del servicio del host Gateway + nodo cuando está disponible.
- La descripción general incluye el canal de actualización + el SHA de git (para las descargas del código fuente).
- La información de actualización aparece en la descripción general; si hay una actualización disponible, el estado imprime una sugerencia para ejecutar `openclaw update` (consulte [Actualización](/es/install/updating)).
- Las superficies de estado de solo lectura (`status`, `status --json`, `status --all`) resuelven los SecretRefs admitidos para sus rutas de configuración de destino cuando es posible.
- Si se configura un SecretRef de canal admitido pero no está disponible en la ruta de comando actual, el estado permanece de solo lectura e informa una salida degradada en lugar de bloquearse. La salida humana muestra advertencias como "configured token unavailable in this command path", y la salida JSON incluye `secretDiagnostics`.

import es from "/components/footer/es.mdx";

<es />
