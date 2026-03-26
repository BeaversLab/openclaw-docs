---
summary: "Cómo OpenClaw rota los perfiles de autenticación y cambia a modelos alternativos"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
title: "Conmutación por error de modelos"
---

# Conmutación por error de modelos

OpenClaw gestiona los fallos en dos etapas:

1. **Rotación de perfiles de autenticación** dentro del proveedor actual.
2. **Conmutación por error de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Este documento explica las reglas de tiempo de ejecución y los datos que las respaldan.

## Almacenamiento de autenticación (claves + OAuth)

OpenClaw utiliza **perfiles de autenticación** tanto para claves de API como para tokens de OAuth.

- Los secretos se almacenan en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (legado: `~/.openclaw/agent/auth-profiles.json`).
- La configuración `auth.profiles` / `auth.order` es **solo metadatos y enrutamiento** (sin secretos).
- Archivo de OAuth heredado de solo importación: `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso).

Más detalles: [/concepts/oauth](/es/concepts/oauth)

Tipos de credenciales:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para algunos proveedores)

## ID de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que puedan coexistir múltiples cuentas.

- Predeterminado: `provider:default` cuando no hay ningún correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo, `google-antigravity:user@gmail.com`).

Los perfiles residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene varios perfiles, OpenClaw elige un orden de la siguiente manera:

1. **Configuración explícita**: `auth.order[provider]` (si está configurado).
2. **Perfiles configurados**: `auth.profiles` filtrados por proveedor.
3. **Perfiles almacenados**: entradas en `auth-profiles.json` para el proveedor.

Si no se configura un orden explícito, OpenClaw utiliza un orden round‑robin:

- **Clave principal:** tipo de perfil (**OAuth antes que las claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (primero los más antiguos, dentro de cada tipo).
- Los **perfiles en período de espera/deshabilitados** se mueven al final, ordenados por la caducidad más próxima.

### Adhesión de sesión (compatible con caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener las cachés de los proveedores activas.
**No** rota en cada solicitud. El perfil fijado se reutiliza hasta:

- la sesión se reinicia (`/new` / `/reset`)
- se completa una compactación (el recuento de compactaciones se incrementa)
- el perfil está en tiempo de espera/deshabilitado

La selección manual mediante `/model …@<profileId>` establece una **anulación del usuario** para esa sesión
y no se rota automáticamente hasta que comienza una nueva sesión.

Los perfiles autofijados (seleccionados por el enrutador de sesión) se tratan como una **preferencia**:
se prueban primero, pero OpenClaw puede rotar a otro perfil debido a límites de tasa/tiempos de espera.
Los perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y se han configurado
retiradas alternativas del modelo, OpenClaw pasa al siguiente modelo en lugar de cambiar de perfil.

### Por qué OAuth puede "parecer perdido"

Si tiene un perfil de OAuth y un perfil de clave de API para el mismo proveedor, el round‑robin puede cambiar entre ellos en los mensajes a menos que se fije. Para forzar un solo perfil:

- Fije con `auth.order[provider] = ["provider:profileId"]`, o
- Use una anulación por sesión mediante `/model …` con una anulación de perfil (cuando su interfaz de usuario/superficie de chat lo admita).

## Tiempos de espera

Cuando un perfil falla debido a errores de autenticación/límite de tasa (o un tiempo de espera que parece
un límite de tasa), OpenClaw lo marca en tiempo de espera y pasa al siguiente perfil.
Los errores de formato/solicitud no válida (por ejemplo, fallos de validación del ID de llamada de herramienta
de Cloud Code Assist) se tratan como susceptibles de retirada alternativa y utilizan los mismos tiempos de espera.
Los errores de motivo de detención compatibles con OpenAI, como `Unhandled stop reason: error`,
`stop reason: error` y `reason: error`, se clasifican como señales de tiempo de espera/retirada alternativa.

Los tiempos de espera utilizan retroceso exponencial:

- 1 minuto
- 5 minutos
- 25 minutos
- 1 hora (límite)

El estado se almacena en `auth-profiles.json` bajo `usageStats`:

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## Deshabilitaciones por facturación

Los fallos de facturación/crédito (por ejemplo, “créditos insuficientes” / “saldo de crédito demasiado bajo”) se tratan como susceptibles de retirada alternativa, pero por lo general no son transitorios. En lugar de un tiempo de espera breve, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

El estado se almacena en `auth-profiles.json`:

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

Valores predeterminados:

- El retroceso de facturación comienza en **5 horas**, se duplica por cada fallo de facturación y tiene un máximo de **24 horas**.
- Los contadores de retroceso se restablecen si el perfil no ha fallado durante **24 horas** (configurable).

## Respaldo de modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en
`agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y
tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan el respaldo).

Cuando una ejecución comienza con una anulación de modelo (ganchos o CLI), los respaldos aún terminan en
`agents.defaults.model.primary` después de intentar cualquier respaldo configurado.

## Configuración relacionada

Consulte [Gateway configuration](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- Enrutamiento de `agents.defaults.imageModel`

Consulte [Models](/es/concepts/models) para obtener una visión general más amplia de la selección y el respaldo de modelos.

import es from "/components/footer/es.mdx";

<es />
