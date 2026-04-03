---
summary: "OAuth en OpenClaw: intercambio de tokens, almacenamiento y patrones de múltiples cuentas"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want setup-token or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw admite "autenticación de suscripción" a través de OAuth para proveedores que la ofrecen (notablemente **OpenAI Codex (ChatGPT OAuth)**). Para las suscripciones de Anthropic, puede usar el flujo de **setup-token** o reutilizar un inicio de sesión local de **Claude CLI** en el host de puerta de enlace. El uso de la suscripción de Anthropic fuera de Claude Code ha sido restringido para algunos usuarios en el pasado, así que trátelo como un riesgo de elección del usuario y verifique usted mismo la política actual de Anthropic. El OAuth de OpenAI Codex es explícitamente compatible para su uso en herramientas externas como OpenClaw. Esta página explica:

Para Anthropic en producción, la autenticación con clave de API es la ruta recomendada más segura en comparación con la autenticación por token de configuración de suscripción.

- cómo funciona el **intercambio de tokens** OAuth (PKCE)
- dónde se **almacenan** los tokens (y por qué)
- cómo manejar **múltiples cuentas** (perfiles + anulaciones por sesión)

OpenClaw también admite **complementos de proveedor** que incluyen sus propios flujos de OAuth o clave de API.
Ejecútelos a través de:

```bash
openclaw models auth login --provider <id>
```

## El sumidero de tokens (por qué existe)

Los proveedores de OAuth comúnmente emiten un **nuevo token de actualización** durante los flujos de inicio de sesión/actualización. Algunos proveedores (o clientes OAuth) pueden invalidar los tokens de actualización más antiguos cuando se emite uno nuevo para el mismo usuario/aplicación.

Síntoma práctico:

- inicia sesión a través de OpenClaw _y_ a través de Claude Code / Codex CLI → uno de ellos se "cierra sesión" aleatoriamente más tarde

Para reducir eso, OpenClaw trata `auth-profiles.json` como un **token sink**:

- el tiempo de ejecución lee las credenciales de **un solo lugar**
- podemos mantener múltiples perfiles y enrutarlos de manera determinista

## Almacenamiento (dónde viven los tokens)

Los secretos se almacenan **por agente**:

- Perfiles de autenticación (OAuth + claves API + referencias opcionales a nivel de valor): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Archivo de compatibilidad heredado: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (las entradas estáticas de `api_key` se eliminan cuando se descubren)

Archivo heredado de solo importación (todavía compatible, pero no el almacén principal):

- `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso)

Todo lo anterior también respeta `$OPENCLAW_STATE_DIR` (anulación del directorio de estado). Referencia completa: [/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

Para las referencias estáticas de secretos y el comportamiento de activación de instantáneas en tiempo de ejecución, consulte [Gestión de secretos](/en/gateway/secrets).

## Token de configuración de Anthropic (autenticación de suscripción)

<Warning>El soporte de Anthropic setup-token es compatibilidad técnica, no una garantía de política. Anthropic ha bloqueado el uso de algunas suscripciones fuera de Claude Code en el pasado. Decida por sí mismo si usar la autenticación de suscripción y verifique los términos actuales de Anthropic.</Warning>

Ejecute `claude setup-token` en cualquier máquina, luego péguelo en OpenClaw:

```bash
openclaw models auth setup-token --provider anthropic
```

Si generó el token en otro lugar, péguelo manualmente:

```bash
openclaw models auth paste-token --provider anthropic
```

Verificar:

```bash
openclaw models status
```

## Migración de Anthropic Claude CLI

Si Claude CLI ya está instalado y ha iniciado sesión en el host de puerta de enlace, puede
cambiar la selección del modelo Anthropic al backend local de CLI:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Acceso directo de incorporación:

```bash
openclaw onboard --auth-choice anthropic-cli
```

Esto mantiene los perfiles de autenticación de Anthropic existentes para la reversión, pero reescribe la ruta
principal del modelo predeterminado de `anthropic/...` a `claude-cli/...`.

## Intercambio de OAuth (cómo funciona el inicio de sesión)

Los flujos de inicio de sesión interactivo de OpenClaw se implementan en `@mariozechner/pi-ai` y se conectan a los asistentes/comandos.

### Setup-token de Anthropic / Claude CLI

Forma del flujo:

Ruta del setup-token:

1. ejecute `claude setup-token`
2. pegue el token en OpenClaw
3. almacene como un perfil de autenticación de token (sin actualización)

Ruta de Claude CLI:

1. inicie sesión con `claude auth login` en el host de la puerta de enlace
2. ejecute `openclaw models auth login --provider anthropic --method cli --set-default`
3. no almacene ningún nuevo perfil de autenticación; cambie la selección del modelo a `claude-cli/...`

Rutas del asistente:

- `openclaw onboard` → elección de autenticación `anthropic-cli`
- `openclaw onboard` → elección de autenticación `setup-token` (Anthropic)

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth es compatible explícitamente para su uso fuera de la CLI de Codex, incluidos los flujos de trabajo de OpenClaw.

Forma del flujo (PKCE):

1. generar verificador/desafío PKCE + `state` aleatorio
2. abrir `https://auth.openai.com/oauth/authorize?...`
3. intentar capturar la devolución de llamada en `http://127.0.0.1:1455/auth/callback`
4. si la devolución de llamada no se puede vincular (o si está remoto/sin interfaz), pegue la URL/código de redirección
5. intercambiar en `https://auth.openai.com/oauth/token`
6. extraer `accountId` del token de acceso y almacenar `{ access, refresh, expires, accountId }`

La ruta del asistente es `openclaw onboard` → elección de autenticación `openai-codex`.

## Actualización + expiración

Los perfiles almacenan una marca de tiempo `expires`.

En tiempo de ejecución:

- si `expires` está en el futuro → usar el token de acceso almacenado
- si ha expirado → actualizar (bajo un bloqueo de archivo) y sobrescribir las credenciales almacenadas

El flujo de actualización es automático; generalmente no necesita gestionar los tokens manualmente.

## Múltiples cuentas (perfiles) + enrutamiento

Dos patrones:

### 1) Recomendado: agentes separados

Si desea que lo “personal” y el “trabajo” nunca interactúen, use agentes aislados (sesiones separadas + credenciales + espacio de trabajo):

```bash
openclaw agents add work
openclaw agents add personal
```

Luego configure la autenticación por agente (asistente) y enrute los chats al agente correcto.

### 2) Avanzado: múltiples perfiles en un solo agente

`auth-profiles.json` admite múltiples ID de perfil para el mismo proveedor.

Elija qué perfil se usa:

- globalmente mediante el orden de configuración (`auth.order`)
- por sesión mediante `/model ...@<profileId>`

Ejemplo (anulación de sesión):

- `/model Opus@anthropic:work`

Cómo ver qué ID de perfiles existen:

- `openclaw channels list --json` (muestra `auth[]`)

Documentación relacionada:

- [/concepts/model-failover](/en/concepts/model-failover) (reglas de rotación + tiempo de espera)
- [/tools/slash-commands](/en/tools/slash-commands) (superficie de comandos)

## Relacionado

- [Authentication](/en/gateway/authentication) — descripción general de autenticación del proveedor de modelos
- [Secrets](/en/gateway/secrets) — almacenamiento de credenciales y SecretRef
- [Configuration Reference](/en/gateway/configuration-reference#auth-storage) — claves de configuración de autenticación
