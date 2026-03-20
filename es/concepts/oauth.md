---
summary: "OAuth en OpenClaw: intercambio de tokens, almacenamiento y patrones de múltiples cuentas"
read_when:
  - Quieres comprender el flujo de OAuth de OpenClaw de extremo a extremo
  - Te encuentras con problemas de invalidación de tokens / cierre de sesión
  - Quieres flujos de autenticación setup-token u OAuth
  - Quieres múltiples cuentas o enrutamiento de perfiles
title: "OAuth"
---

# OAuth

OpenClaw admite "autenticación de suscripción" mediante OAuth para proveedores que la ofrecen (notablemente **OpenAI Codex (ChatGPT OAuth)**). Para las suscripciones de Anthropic, utiliza el flujo **setup-token**. El uso de la suscripción de Anthropic fuera de Claude Code ha sido restringido para algunos usuarios en el pasado, así que trátalo como un riesgo de elección del usuario y verifica por ti mismo la política actual de Anthropic. El OAuth de OpenAI Codex es explícitamente compatible para su uso en herramientas externas como OpenClaw. Esta página explica:

Para Anthropic en producción, la autenticación con clave de API es la ruta recomendada más segura que la autenticación con setup-token de suscripción.

- cómo funciona el **intercambio de tokens** de OAuth (PKCE)
- dónde se **almacenan** los tokens (y por qué)
- cómo manejar **múltiples cuentas** (perfiles + anulaciones por sesión)

OpenClaw también admite **complementos de proveedores** que incluyen sus propios flujos de OAuth o clave de API.
Ejecútalos mediante:

```bash
openclaw models auth login --provider <id>
```

## El sumidero de tokens (por qué existe)

Los proveedores de OAuth suelen generar un **nuevo token de actualización** durante los flujos de inicio de sesión/actualización. Algunos proveedores (o clientes de OAuth) pueden invalidar los tokens de actualización anteriores cuando se emite uno nuevo para el mismo usuario/aplicación.

Síntoma práctico:

- inicias sesión a través de OpenClaw _y_ a través de Claude Code / Codex CLI → uno de ellos se cierra sesión aleatoriamente más tarde

Para reducir eso, OpenClaw trata `auth-profiles.json` como un **sumidero de tokens**:

- el tiempo de ejecución lee las credenciales de **un solo lugar**
- podemos mantener múltiples perfiles y enrutarlos de manera determinista

## Almacenamiento (dónde viven los tokens)

Los secretos se almacenan **por agente**:

- Perfiles de autenticación (OAuth + claves de API + referencias opcionales a nivel de valor): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Archivo de compatibilidad heredado: `~/.openclaw/agents/<agentId>/agent/auth.json`
  (las entradas estáticas `api_key` se eliminan cuando se descubren)

Archivo heredado de solo importación (todavía compatible, pero no el almacén principal):

- `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso)

Todo lo anterior también respeta `$OPENCLAW_STATE_DIR` (anulación del directorio de estado). Referencia completa: [/gateway/configuration](/es/gateway/configuration#auth-storage-oauth--api-keys)

Para obtener información sobre las referencias de secretos estáticos y el comportamiento de activación de instantáneas en tiempo de ejecución, consulte [Secrets Management](/es/gateway/secrets).

## Token de configuración de Anthropic (autenticación de suscripción)

<Warning>
  La compatibilidad con el token de configuración de Anthropic es una compatibilidad técnica, no una
  garantía política. Anthropic ha bloqueado algunos usos de suscripciones fuera de Claude Code en el
  pasado. Decida por sí mismo si utilizar la autenticación de suscripción y verifique los términos
  actuales de Anthropic.
</Warning>

Ejecute `claude setup-token` en cualquier máquina y luego péguelo en OpenClaw:

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

## Intercambio de OAuth (cómo funciona el inicio de sesión)

Los flujos de inicio de sesión interactivo de OpenClaw se implementan en `@mariozechner/pi-ai` y se conectan a los asistentes/comandos.

### Token de configuración de Anthropic

Forma del flujo:

1. ejecutar `claude setup-token`
2. pegar el token en OpenClaw
3. almacenar como un perfil de autenticación de token (sin actualización)

La ruta del asistente es `openclaw onboard` → elección de autenticación `setup-token` (Anthropic).

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth es explícitamente compatible para su uso fuera de la CLI de Codex, incluidos los flujos de trabajo de OpenClaw.

Forma del flujo (PKCE):

1. generar verificador/desafío PKCE + `state` aleatorio
2. abrir `https://auth.openai.com/oauth/authorize?...`
3. intentar capturar la devolución de llamada en `http://127.0.0.1:1455/auth/callback`
4. si la devolución de llamada no puede enlazarse (o está remoto/sin cabeza), pegue la URL/código de redirección
5. intercambiar en `https://auth.openai.com/oauth/token`
6. extraer `accountId` del token de acceso y almacenar `{ access, refresh, expires, accountId }`

La ruta del asistente es `openclaw onboard` → elección de autenticación `openai-codex`.

## Actualización + caducidad

Los perfiles almacenan una marca de tiempo `expires`.

En tiempo de ejecución:

- si `expires` está en el futuro → usar el token de acceso almacenado
- si ha caducado → actualizar (bajo un bloqueo de archivo) y sobrescribir las credenciales almacenadas

El flujo de actualización es automático; generalmente no necesita administrar los tokens manualmente.

## Múltiples cuentas (perfiles) + enrutamiento

Dos patrones:

### 1) Preferido: agentes separados

Si deseas que “personal” y “trabajo” nunca interactúen, usa agentes aislados (sesiones separadas + credenciales + espacio de trabajo):

```bash
openclaw agents add work
openclaw agents add personal
```

Luego configura la autenticación por agente (asistente) y enruta los chats al agente correcto.

### 2) Avanzado: múltiples perfiles en un agente

`auth-profiles.json` admite múltiples ID de perfil para el mismo proveedor.

Elige qué perfil se utiliza:

- globalmente mediante el orden de configuración (`auth.order`)
- por sesión mediante `/model ...@<profileId>`

Ejemplo (anulación de sesión):

- `/model Opus@anthropic:work`

Cómo ver qué ID de perfil existen:

- `openclaw channels list --json` (muestra `auth[]`)

Documentación relacionada:

- [/concepts/model-failover](/es/concepts/model-failover) (reglas de rotación + tiempo de espera)
- [/tools/slash-commands](/es/tools/slash-commands) (superficie de comandos)

import es from "/components/footer/es.mdx";

<es />
