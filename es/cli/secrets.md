---
summary: "Referencia de CLI para `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Resolver nuevamente las referencias secretas en tiempo de ejecución
  - Auditar residuos de texto plano y referencias sin resolver
  - Configurar SecretRefs y aplicar cambios de limpieza unidireccionales
title: "secrets"
---

# `openclaw secrets`

Use `openclaw secrets` para administrar SecretRefs y mantener la instantánea de tiempo de ejecución activa saludable.

Roles de los comandos:

- `reload`: RPC de puerta de enlace (`secrets.reload`) que resuelve nuevamente las referencias e intercambia la instantánea de tiempo de ejecución solo si tiene éxito completo (no escribe configuración).
- `audit`: escaneo de solo lectura de los almacenes de configuración/autorización/modelos-generados y residuos heredados para buscar texto plano, referencias sin resolver y deriva de precedencia (se omiten las referencias exec a menos que se establezca `--allow-exec`).
- `configure`: planificador interactivo para la configuración del proveedor, el mapeo de objetivos y el vuelo previo (se requiere TTY).
- `apply`: ejecuta un plan guardado (`--dry-run` solo para validación; dry-run omite las verificaciones exec de forma predeterminada, y el modo de escritura rechaza los planes que contienen exec a menos que se establezca `--allow-exec`) y luego limpia los residuos de texto plano objetivo.

Bucle recomendado para el operador:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Si su plan incluye SecretRefs/proveedores `exec`, pase `--allow-exec` tanto en los comandos de dry-run como en los de aplicación de escritura.

Nota sobre el código de salida para CI/puertas:

- `audit --check` devuelve `1` cuando hay hallazgos.
- las referencias sin resolver devuelven `2`.

Relacionado:

- Guía de Secrets: [Gestión de Secrets](/es/gateway/secrets)
- Superficie de credenciales: [Superficie de credenciales de SecretRef](/es/reference/secretref-credential-surface)
- Guía de seguridad: [Seguridad](/es/gateway/security)

## Recargar instantánea de tiempo de ejecución

Resolver nuevamente las referencias secretas e intercambiar atómicamente la instantánea de tiempo de ejecución.

```bash
openclaw secrets reload
openclaw secrets reload --json
```

Notas:

- Usa el método RPC de puerta de enlace `secrets.reload`.
- Si la resolución falla, la puerta de enlace mantiene la última instantánea correcta conocida y devuelve un error (no hay activación parcial).
- La respuesta JSON incluye `warningCount`.

## Auditoría

Escanear el estado de OpenClaw para buscar:

- almacenamiento de secretos en texto plano
- referencias sin resolver
- deriva de precedencia (credenciales `auth-profiles.json` ensombreciendo referencias `openclaw.json`)
- residuos `agents/*/agent/models.json` generados (valores `apiKey` del proveedor y encabezados sensibles del proveedor)
- residuos heredados (entradas de almacenamiento de autenticación heredadas, recordatorios de OAuth)

Nota sobre residuos de encabezado:

- La detección de encabezados sensibles del proveedor se basa en heurística de nombres (nombres y fragmentos comunes de encabezados de autenticación/credenciales como `authorization`, `x-api-key`, `token`, `secret`, `password` y `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

Comportamiento de salida:

- `--check` sale con código distinto de cero si hay hallazgos.
- las referencias sin resolver salen con un código distinto de cero de mayor prioridad.

Aspectos destacados del informe:

- `status`: `clean | findings | unresolved`
- `resolution`: `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- códigos de hallazgos:
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurar (asistente interactivo)

Construya cambios de proveedor y SecretRef de forma interactiva, ejecute el preflight y opcionalmente aplique:

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

Flujo:

- Primero la configuración del proveedor (`add/edit/remove` para alias de `secrets.providers`).
- Segundo la asignación de credenciales (seleccione campos y asigne referencias `{source, provider, id}`).
- Preflight y aplicación opcional al final.

Opciones:

- `--providers-only`: configure solo `secrets.providers`, omita la asignación de credenciales.
- `--skip-provider-setup`: omita la configuración del proveedor y asigne credenciales a proveedores existentes.
- `--agent <id>`: limite el descubrimiento de objetivos `auth-profiles.json` y las escrituras a un almacén de agente.
- `--allow-exec`: permitir comprobaciones exec de SecretRef durante el preflight/aplicación (puede ejecutar comandos del proveedor).

Notas:

- Requiere un TTY interactivo.
- No se puede combinar `--providers-only` con `--skip-provider-setup`.
- `configure` se dirige a campos que contienen secretos en `openclaw.json` más `auth-profiles.json` para el ámbito del agente seleccionado.
- `configure` permite crear nuevas asignaciones `auth-profiles.json` directamente en el flujo del selector.
- Superficie soportada canónica: [SecretRef Credential Surface](/es/reference/secretref-credential-surface).
- Realiza una resolución previa al vuelo antes de aplicar.
- Si la verificación previa/aplicación incluye referencias de ejecución, mantenga `--allow-exec` configurado para ambos pasos.
- Los planes generados tienen por defecto opciones de limpieza (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` todas habilitadas).
- La ruta de aplicación es unidireccional para los valores de texto plano limpiados.
- Sin `--apply`, la CLI aún solicita `Apply this plan now?` después de la verificación previa.
- Con `--apply` (y sin `--yes`), la CLI solicita una confirmación irreversible adicional.

Nota de seguridad del proveedor de ejecución:

- Las instalaciones de Homebrew a menudo exponen binarios enlazados simbólicamente bajo `/opt/homebrew/bin/*`.
- Establezca `allowSymlinkCommand: true` solo cuando sea necesario para rutas de administradores de paquetes confiables, y combínelo con `trustedDirs` (por ejemplo `["/opt/homebrew"]`).
- En Windows, si la verificación ACL no está disponible para una ruta de proveedor, OpenClaw falla de forma cerrada. Solo para rutas confiables, establezca `allowInsecurePath: true` en ese proveedor para omitir las comprobaciones de seguridad de ruta.

## Aplicar un plan guardado

Aplicar o verificar previamente un plan generado anteriormente:

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Comportamiento de ejecución:

- `--dry-run` valida la verificación previa sin escribir archivos.
- Las comprobaciones de ejecución de SecretRef se omiten de forma predeterminada en la ejecución en seco.
- el modo de escritura rechaza los planes que contienen SecretRefs/proveedores de ejecución a menos que se establezca `--allow-exec`.
- Use `--allow-exec` para aceptar las comprobaciones/ejecución del proveedor de ejecución en cualquier modo.

Detalles del contrato del plan (rutas de destino permitidas, reglas de validación y semántica de falla):

- [Secrets Apply Plan Contract](/es/gateway/secrets-plan-contract)

Lo que `apply` puede actualizar:

- `openclaw.json` (objetivos de SecretRef + inserciones/eliminaciones de proveedor)
- `auth-profiles.json` (limpieza de objetivos de proveedor)
- residuos `auth.json` heredados
- `~/.openclaw/.env` claves secretas conocidas cuyos valores fueron migrados

## Por qué no hay copias de seguridad de reversión

`secrets apply` intencionalmente no escribe copias de seguridad de reversión que contengan valores de texto antiguo en claro.

La seguridad proviene de un preflicht estricto + una aplicación casi atómica con una restauración en memoria de mejor esfuerzo en caso de fallo.

## Ejemplo

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` todavía informa hallazgos en texto plano, actualice las rutas de objetivo restantes informadas y vuelva a ejecutar la auditoría.

import en from "/components/footer/en.mdx";

<en />
