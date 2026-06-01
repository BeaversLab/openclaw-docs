---
summary: "Pide a los usuarios que aprueben las llamadas a herramientas de complementos y las solicitudes de permisos propiedad del complemento"
title: "Solicitudes de permisos de complementos"
sidebarTitle: "Solicitudes de permisos"
read_when:
  - You need a plugin hook or tool to ask before a side effect runs
  - You need to configure where plugin approval prompts are delivered
  - You are deciding between optional tools, exec approvals, and plugin approvals
---

Las solicitudes de permisos de complementos permiten que el código del complemento pause una llamada a herramienta o una operación propiedad del complemento hasta que un usuario la apruebe o la deniegue. Utilizan el flujo `plugin.approval.*` de Gateway y las mismas superficies de UI de aprobación que manejan los botones de aprobación en el chat y los comandos `/approve`.

Usa las solicitudes de permisos de complementos para permisos de complemento/aplicación. No reemplazan las aprobaciones de exec del host, las listas de permitidos (allowlists) de herramientas opcionales, ni la revisión de permisos nativa de Codex.

## Elige la puerta correcta

Elige la puerta que coincida con el punto de decisión que necesitas:

| Puerta                                   | Úsala cuando                                                                                                          | Lo que controla                                                                                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Herramientas opcionales                  | Una herramienta no debe ser visible para el modelo hasta que el usuario acepte explícitamente.                        | Exposición de herramientas a través de `tools.allow`.                                                                                                                                |
| Solicitudes de permisos de complementos  | Un gancho de complemento o una operación propiedad del complemento debe preguntar antes de que se ejecute una acción. | Aprobación en tiempo de ejecución a través de `plugin.approval.*`.                                                                                                                   |
| Aprobaciones de ejecución (exec)         | Un comando de host o una herramienta tipo shell necesita la aprobación del operador.                                  | Política de ejecución del host y listas de permitidos de ejecución duradera.                                                                                                         |
| Solicitudes de permisos nativas de Codex | Codex pregunta antes de las acciones nativas de shell, archivo, MCP o servidor de aplicaciones.                       | Manejo de aprobaciones de ganchos nativos o del servidor de aplicaciones de Codex, enrutadas a través de aprobaciones de complementos cuando OpenClaw es el propietario del mensaje. |
| Solicitudes de aprobación de MCP         | Un servidor MCP de Codex solicita aprobación para una llamada a herramienta.                                          | Respuestas de aprobación de MCP puenteadas a través de las aprobaciones del complemento OpenClaw.                                                                                    |

Las herramientas opcionales son una puerta en tiempo de descubrimiento. Las solicitudes de permisos de complementos son una puerta por llamada. Usa ambas cuando una herramienta sensible debería requerir una aceptación explícita antes de que el modelo pueda verla y aprobación antes de que se ejecute la acción.

## Solicitar aprobación antes de una llamada a herramienta

La mayoría de los mensajes creados por complementos deberían comenzar en un gancho `before_tool_call`. El gancho se ejecuta después de que el modelo selecciona una herramienta y antes de que OpenClaw la ejecute:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "deploy-policy",
  name: "Deploy Policy",
  register(api) {
    api.on("before_tool_call", async (event) => {
      if (event.toolName !== "deploy_service") {
        return;
      }

      const environment = typeof event.params.environment === "string" ? event.params.environment : "unknown";

      return {
        requireApproval: {
          title: "Deploy service",
          description: `Deploy service to ${environment}.`,
          severity: environment === "production" ? "critical" : "warning",
          allowedDecisions: environment === "production" ? ["allow-once", "deny"] : ["allow-once", "allow-always", "deny"],
          timeoutMs: 120_000,
          timeoutBehavior: "deny",
          onResolution(decision) {
            console.log(`deploy approval resolved: ${decision}`);
          },
        },
      };
    });
  },
});
```

Escribe el texto del mensaje para la persona que aprobará la acción:

- Mantén `title` breve y centrado en la acción. Gateway acepta hasta 80 caracteres.
- Mantenga `description` específico y acotado. El Gateway acepta hasta 256
  caracteres.
- Incluya la acción, el objetivo y el riesgo. No incluya secretos, tokens o
  cargas privadas que no deban aparecer en las superficies de aprobación del chat.
- Use `severity: "critical"` solo para acciones donde la decisión incorrecta podría
  causar daños en la producción o pérdida de datos.
- Use `allowedDecisions: ["allow-once", "deny"]` cuando la confianza persistente no sea
  segura para esa acción.

## Comportamiento de la decisión

OpenClaw crea una aprobación pendiente con un ID `plugin:`, la entrega a las
superficies de aprobación disponibles y espera una decisión.

| Decisión               | Resultado                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `allow-once`           | La llamada actual continúa.                                                               |
| `allow-always`         | La llamada actual continúa y la decisión se pasa al complemento.                          |
| `deny`                 | La llamada se bloquea con un resultado de herramienta denegado.                           |
| Tiempo de espera       | La llamada se bloquea a menos que `timeoutBehavior` sea `"allow"`.                        |
| Cancelación            | La llamada se bloquea cuando se aborta la ejecución.                                      |
| Sin ruta de aprobación | La llamada se bloquea porque ninguna superficie de aprobación conectada puede resolverla. |

`allow-always` solo es duradero cuando el complemento solicitante o el tiempo de ejecución implementa
esa persistencia. Para los hooks ordinarios `before_tool_call.requireApproval`,
OpenClaw trata `allow-once` y `allow-always` como decisiones de aprobación para la
llamada actual y pasa el valor resuelto a `onResolution`. Si su complemento
ofrece `allow-always`, documente e implemente exactamente qué futuras llamadas
confía.

Si el hook también devuelve `params`, OpenClaw aplica esos cambios de parámetros solo
después de que la aprobación tenga éxito. Un hook de menor prioridad aún puede bloquearse después de que
un hook de mayor prioridad solicitara la aprobación.

`allowedDecisions` limita los botones y comandos que se muestran al usuario. El
Gateway rechaza un intento de resolución para cualquier decisión que la solicitud no ofreció.

## Enrutamiento de mensajes de aprobación

Los mensajes de aprobación pueden resolverse en superficies de interfaz de usuario local o en canales de chat que
soporten el manejo de aprobaciones. Para reenviar los mensajes de aprobación del complemento a objetivos de chat
explícitos, configure `approvals.plugin`:

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

`approvals.plugin` es independiente de `approvals.exec`. Habilitar el reenvío de aprobaciones de exec no enruta los avisos de aprobación de complementos, y habilitar el reenvío de aprobaciones de complementos no cambia la política de exec del host.

Cuando un aviso incluye texto de aprobación manual, resuélvalo con una de las decisiones ofrecidas:

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

Consulte [Advanced exec approvals](/es/tools/exec-approvals-advanced#plugin-approval-forwarding)
para obtener el modelo completo de reenvío, el comportamiento de aprobación en el mismo chat, la entrega nativa al canal y las reglas del aprobador específicas del canal.

## Permisos nativos de Codex

Los avisos de permisos nativos de Codex también pueden viajar a través de las aprobaciones de complementos, pero tienen una propiedad diferente a la de los hooks creados por complementos.

- Las solicitudes de aprobación del servidor de aplicaciones de Codex se enrutan a través de OpenClaw después de la revisión de Codex.
- El relé del hook nativo `permission_request` puede preguntar a través de
  `plugin.approval.request` cuando ese relé está habilitado.
- Las solicitudes de aprobación de herramientas de MCP se enrutan a través de las aprobaciones de complementos cuando Codex marca
  `_meta.codex_approval_kind` como `"mcp_tool_call"`.

Consulte [Codex harness runtime](/es/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
para conocer el comportamiento específico de Codex y las reglas de respaldo.

## Solución de problemas

**La herramienta dice que las aprobaciones de complementos no están disponibles.** Ninguna interfaz de usuario de aprobación o ruta de aprobación configurada aceptó la solicitud. Conecte un cliente con capacidad de aprobación, use un canal que admita el mismo chat `/approve` o configure `approvals.plugin`.

**Aparece `allow-always` pero la siguiente llamada vuelve a pedir.** El flujo genérico de aprobación de complementos no conserva automáticamente la confianza para hooks arbitrarios. Conserve la confianza propiedad del complemento en su complemento después de `onResolution("allow-always")`, o
ofrezca solo `allow-once` y `deny`.

**`/approve` rechaza la decisión.** La solicitud restringía
`allowedDecisions`. Use una de las decisiones impresas en el aviso.

**Un aviso de Slack, Discord, Telegram o Matrix se enruta de manera diferente a las aprobaciones de exec.** Las aprobaciones de complementos y las aprobaciones de exec usan configuraciones separadas y pueden usar diferentes comprobaciones de autorización. Verifique `approvals.plugin` y el soporte de aprobación de complementos del canal en lugar de solo verificar `approvals.exec`.

## Relacionado

- [Complementos (hooks)](/es/plugins/hooks#tool-call-policy)
- [Creación de complementos](/es/plugins/building-plugins#registering-agent-tools)
- [Aprobaciones de exec avanzadas](/es/tools/exec-approvals-advanced#plugin-approval-forwarding)
- [Protocolo de puerta de enlace](/es/gateway/protocol)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
