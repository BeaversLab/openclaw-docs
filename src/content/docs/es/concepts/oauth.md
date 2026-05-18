---
summary: "OAuth en OpenClaw: intercambio de tokens, almacenamiento y patrones de múltiples cuentas"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw soporta "subscription auth" a través de OAuth para proveedores que lo ofrecen
(notablemente **OpenAI Codex (ChatGPT OAuth)**). Para Anthropic, la división práctica
es ahora:

- **Clave de API de Anthropic**: facturación normal de la API de Anthropic
- **CLI de Anthropic Claude / autenticación de suscripción dentro de OpenClaw**: el personal de
  Anthropic nos informó que este uso está permitido nuevamente

El OAuth de OpenAI Codex es compatible explícitamente para su uso en herramientas externas como
OpenClaw. Esta página explica:

Para Anthropic en producción, la autenticación con clave de API es la ruta recomendada más segura.

- cómo funciona el **intercambio de tokens** de OAuth (PKCE)
- dónde se **almacenan** los tokens (y por qué)
- cómo manejar **múltiples cuentas** (perfiles + anulaciones por sesión)

OpenClaw también soporta **provider plugins** que incluyen sus propios flujos de OAuth o claves de API.
Ejecute estos a través de:

```bash
openclaw models auth login --provider <id>
```

## El sumidero de tokens (por qué existe)

Los proveedores de OAuth suelen generar un **nuevo token de actualización** durante los flujos de inicio de sesión/actualización. Algunos proveedores (o clientes de OAuth) pueden invalidar los tokens de actualización anteriores cuando se emite uno nuevo para el mismo usuario/aplicación.

Síntoma práctico:

- inicia sesión a través de OpenClaw _y_ a través de Claude Code / Codex CLI → uno de ellos es "desconectado" aleatoriamente más tarde

Para reducir eso, OpenClaw trata `auth-profiles.json` como un **sumidero de tokens**:

- el tiempo de ejecución lee las credenciales de **un solo lugar**
- podemos mantener múltiples perfiles y enrutarlos de manera determinista
- la reutilización de la CLI externa es específica del proveedor: la CLI de Codex puede arrancar un perfil `openai-codex:default` vacío, pero una vez que OpenClaw tiene un perfil OAuth local, el token de actualización local es canónico. Si ese token de actualización local es rechazado, OpenClaw puede usar un token utilizable de la CLI de Codex de la misma cuenta como alternativa solo en tiempo de ejecución; otras integraciones pueden permanecer gestionadas externamente y releer su almacén de autenticación de la CLI
- rutas de estado e inicio que ya conocen el conjunto de proveedores configurados limitan
  el descubrimiento de CLI externo a ese conjunto, de modo que no se sondea un almacén de inicio de sesión de CLI no relacionado
  para una configuración de un solo proveedor

## Almacenamiento (dónde residen los tokens)

Los secretos se almacenan en los almacenes de autenticación de los agentes:

- Perfiles de autenticación (OAuth + claves de API + referencias opcionales a nivel de valor): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Archivo de compatibilidad heredado: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (las entradas `api_key` estáticas se eliminan cuando se descubren)

Archivo heredado solo de importación (aún admitido, pero no el almacenamiento principal):

- `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso)

Todo lo anterior también respeta `$OPENCLAW_STATE_DIR` (anulación del directorio de estado). Referencia completa: [/gateway/configuration](/es/gateway/configuration-reference#auth-storage)

Para ver las referencias de secretos estáticos y el comportamiento de activación de instantáneas en tiempo de ejecución, consulte [Secrets Management](/es/gateway/secrets).

Cuando un agente secundario no tiene un perfil de autenticación local, OpenClaw utiliza la herencia
read-through desde el almacén del agente predeterminado/principal. No clona el
`auth-profiles.json` del agente principal al leer. Los tokens de actualización de OAuth son especialmente
sensibles: los flujos de copia normales los omiten de forma predeterminada porque algunos proveedores rotan
o invalidan los tokens de actualización después de su uso. Configure un inicio de sesión de OAuth independiente para un
agente cuando necesite una cuenta independiente.

## Compatibilidad con tokens heredados de Anthropic

<Warning>
Los documentos públicos de Claude Code de Anthropic indican que el uso directo de Claude Code se mantiene dentro de los límites de la suscripción Claude, y el personal de Anthropic nos informó que el uso de la CLI Claude estilo OpenClaw está permitido nuevamente. Por lo tanto, OpenClaw trata la reutilización de la CLI Claude y el uso de `claude -p` como autorizados para esta integración, a menos que Anthropic publique una nueva política.

Para ver los documentos actuales del plan directo-Claude-Code de Anthropic, consulte [Using Claude Code
with your Pro or Max
plan](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
y [Using Claude Code with your Team or Enterprise
plan](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

Si desea otras opciones de tipo suscripción en OpenClaw, consulte [OpenAI
Codex](/es/providers/openai), [Qwen Cloud Coding
Plan](/es/providers/qwen), [MiniMax Coding Plan](/es/providers/minimax)
y [Z.AI / GLM Coding Plan](/es/providers/glm).

</Warning>

OpenClaw también expone el setup-token de Anthropic como una ruta de autenticación por token admitida, pero ahora prefiere la reutilización de Claude CLI y `claude -p` cuando están disponibles.

## Migración de Anthropic Claude CLI

OpenClaw vuelve a admitir la reutilización de Anthropic Claude CLI. Si ya tiene un inicio de sesión local de Claude en el host, la incorporación/configuración puede reutilizarlo directamente.

## Intercambio de OAuth (cómo funciona el inicio de sesión)

Los flujos de inicio de sesión interactivo de OpenClaw se implementan en `@earendil-works/pi-ai` y se conectan a los asistentes/comandos.

### setup-token de Anthropic

Forma del flujo:

1. iniciar el setup-token de Anthropic o pegar el token desde OpenClaw
2. OpenClaw almacena la credencial resultante de Anthropic en un perfil de autenticación
3. la selección del modelo se mantiene en `anthropic/...`
4. los perfiles de autenticación de Anthropic existentes siguen disponibles para el control de reversión/orden

### OpenAI Codex (ChatGPT OAuth)

El OAuth de OpenAI Codex es compatible explícitamente para su uso fuera de la CLI de Codex, incluidos los flujos de trabajo de OpenClaw.

Forma del flujo (PKCE):

1. generar verificador/desafío PKCE + `state` aleatorio
2. abrir `https://auth.openai.com/oauth/authorize?...`
3. intentar capturar la devolución de llamada en `http://127.0.0.1:1455/auth/callback`
4. si la devolución de llamada no puede vincularse (o si es remoto/sin cabeza), pegue la URL/código de redireccionamiento
5. intercambiar en `https://auth.openai.com/oauth/token`
6. extraer `accountId` del token de acceso y almacenar `{ access, refresh, expires, accountId }`

La ruta del asistente es `openclaw onboard` → elección de autenticación `openai-codex`.

## Actualización + caducidad

Los perfiles almacenan una marca de tiempo `expires`.

En tiempo de ejecución:

- si `expires` está en el futuro → usar el token de acceso almacenado
- si ha caducado → actualizar (bajo un bloqueo de archivo) y sobrescribir las credenciales almacenadas
- si un agente secundario lee un perfil OAuth heredado del agente principal, la actualización
  escribe de nuevo en el almacén del agente principal en lugar de copiar el token de actualización en
  el almacén del agente secundario
- excepción: algunas credenciales externas de la CLI permanecen gestionadas externamente; OpenClaw vuelve a leer esos almacenes de autenticación de la CLI en lugar de gastar tokens de actualización copiados. El arranque de la CLI de Codex es intencionalmente más limitado: inicializa un perfil `openai-codex:default` vacío y luego las actualizaciones propiedad de OpenClaw mantienen el perfil local como canónico. Si la actualización local de Codex falla y la CLI de Codex tiene un token utilizable para la misma cuenta, OpenClaw puede usar ese token para la solicitud de tiempo de ejecución actual sin escribirlo de nuevo en `auth-profiles.json`.

El flujo de actualización es automático; por lo general, no necesitas gestionar los tokens manualmente.

## Múltiples cuentas (perfiles) + enrutamiento

Dos patrones:

### 1) Recomendado: agentes separados

Si quieres que lo "personal" y lo "laboral" nunca interactúen, usa agentes aislados (sesiones separadas + credenciales + espacio de trabajo):

```bash
openclaw agents add work
openclaw agents add personal
```

A continuación, configura la autenticación por agente (asistente) y enruta los chats al agente correcto.

### 2) Avanzado: múltiples perfiles en un agente

`auth-profiles.json` admite múltiples ID de perfil para el mismo proveedor.

Elige qué perfil se usa:

- globalmente mediante el orden de configuración (`auth.order`)
- por sesión mediante `/model ...@<profileId>`

Ejemplo (anulación de sesión):

- `/model Opus@anthropic:work`

Cómo ver qué IDs de perfil existen:

- `openclaw channels list --json` (muestra `auth[]`)

Documentos relacionados:

- [Conmutación por error del modelo](/es/concepts/model-failover) (reglas de rotación + enfriamiento)
- [Comandos de barra](/es/tools/slash-commands) (superficie de comandos)

## Relacionado

- [Autenticación](/es/gateway/authentication) - descripción general de la autenticación del proveedor de modelos
- [Secretos](/es/gateway/secrets) - almacenamiento de credenciales y SecretRef
- [Referencia de configuración](/es/gateway/configuration-reference#auth-storage) - claves de configuración de autenticación
