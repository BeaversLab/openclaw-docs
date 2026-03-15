---
summary: "Referencia de CLI para `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secretos"
---

# `openclaw secrets`

Use `openclaw secrets` para administrar SecretRefs y mantener la instantánea de runtime activa sana.

Roles de comando:

- `reload`: RPC de gateway (`secrets.reload`) que resuelve nuevamente las referencias e intercambia la instantánea de runtime solo si tiene éxito total (no escribe configuración).
- `audit`: escaneo de solo lectura de los almacenes de configuración/autenticación/modelo-generado y residuos heredados en busca de texto sin formato, referencias sin resolver y deriva de precedencia.
- `configure`: planificador interactivo para la configuración del proveedor, asignación de objetivos y verificación previa (se requiere TTY).
- `apply`: ejecuta un plan guardado (`--dry-run` para validación solamente) y luego elimina los residuos de texto sin formato objetivo.

Bucle de operador recomendado:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Nota de código de salida para CI/compuertas:

- `audit --check` devuelve `1` cuando hay hallazgos.
- las referencias sin resolver devuelven `2`.

Relacionado:

- Guía de secretos: [Secrets Management](/es/gateway/secrets)
- Superficie de credenciales: [SecretRef Credential Surface](/es/reference/secretref-credential-surface)
- Guía de seguridad: [Security](/es/gateway/security)

## Recargar instantánea de runtime

Resolver nuevamente las referencias secretas e intercambiar atómicamente la instantánea de runtime.

```bash
openclaw secrets reload
openclaw secrets reload --json
```

Notas:

- Usa el método RPC de gateway `secrets.reload`.
- Si la resolución falla, el gateway mantiene la última instantánea conocida como buena y devuelve un error (sin activación parcial).
- La respuesta JSON incluye `warningCount`.

## Auditoría

Escanear el estado de OpenClaw en busca de:

- almacenamiento de secretos en texto sin formato
- referencias sin resolver
- deriva de precedencia (credenciales `auth-profiles.json` ocultando referencias `openclaw.json`)
- residuos `agents/*/agent/models.json` generados (valores `apiKey` del proveedor y encabezados sensibles del proveedor)
- residuos heredados (entradas del almacén de autenticación heredado, recordatorios de OAuth)

Nota sobre residuos de encabezado:

- La detección de cabeceras sensibles del proveedor se basa en heurísticas de nombres (nombres de cabeceras de autenticación/credenciales comunes y fragmentos como `authorization`, `x-api-key`, `token`, `secret`, `password` y `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
```

Comportamiento de salida:

- `--check` sale con código no cero cuando hay hallazgos.
- las referencias no resueltas salen con un código no cero de mayor prioridad.

Aspectos destacados del informe:

- `status`: `clean | findings | unresolved`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- códigos de hallazgo:
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurar (asistente interactivo)

Construya cambios de proveedor y SecretRef de forma interactiva, ejecute el preflight y aplique opcionalmente:

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

- Primero la configuración del proveedor (`add/edit/remove` para `secrets.providers` alias).
- Segundo la asignación de credenciales (seleccione campos y asigne referencias `{source, provider, id}`).
- Por último, preflight y aplicación opcional.

Opciones:

- `--providers-only`: configure solo `secrets.providers`, omita la asignación de credenciales.
- `--skip-provider-setup`: omita la configuración del proveedor y asigne las credenciales a los proveedores existentes.
- `--agent <id>`: limite el descubrimiento de objetivos `auth-profiles.json` y escrituras a un almacén de agente.

Notas:

- Requiere un TTY interactivo.
- No puede combinar `--providers-only` con `--skip-provider-setup`.
- `configure` apunta a campos que portan secretos en `openclaw.json` además de `auth-profiles.json` para el alcance del agente seleccionado.
- `configure` admite la creación de nuevas asignaciones `auth-profiles.json` directamente en el flujo del selector.
- Superficie compatible canónica: [SecretRef Credential Surface](/es/reference/secretref-credential-surface).
- Realiza la resolución del preflight antes de aplicar.
- Los planes generados de forma predeterminada usan opciones de limpieza (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` todas activadas).
- La ruta de aplicación es unidireccional para los valores de texto sin formato limpiados.
- Sin `--apply`, la CLI aún solicita `Apply this plan now?` después del prevuelo.
- Con `--apply` (y sin `--yes`), la CLI solicita una confirmación irreversible adicional.

Nota de seguridad del proveedor Exec:

- Las instalaciones de Homebrew a menudo exponen binarios enlazados simbólicamente bajo `/opt/homebrew/bin/*`.
- Establezca `allowSymlinkCommand: true` solo cuando sea necesario para rutas de administradores de paquetes de confianza y combínelo con `trustedDirs` (por ejemplo `["/opt/homebrew"]`).
- En Windows, si la verificación de ACL no está disponible para una ruta de proveedor, OpenClaw falla de forma cerrada. Solo para rutas de confianza, establezca `allowInsecurePath: true` en ese proveedor para omitir las comprobaciones de seguridad de la ruta.

## Aplicar un plan guardado

Aplique o realice un prevuelo de un plan generado anteriormente:

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Detalles del contrato del plan (rutas de destino permitidas, reglas de validación y semántica de fallo):

- [Contrato del plan de aplicación de Secrets](/es/gateway/secrets-plan-contract)

Lo que `apply` puede actualizar:

- `openclaw.json` (objetivos de SecretRef + inserciones/eliminaciones de proveedores)
- `auth-profiles.json` (limpieza de objetivos del proveedor)
- residuos `auth.json` heredados
- `~/.openclaw/.env` claves secretas conocidas cuyos valores fueron migrados

## Por qué no hay copias de seguridad de reversión

`secrets apply` intencionalmente no escribe copias de seguridad de reversión que contengan valores de texto sin formato antiguos.

La seguridad proviene de un prevuelo estricto + una aplicación casi atómica con una restauración en memoria de mejor esfuerzo en caso de fallo.

## Ejemplo

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` aún informa hallazgos de texto sin formato, actualice las rutas de destino reportadas restantes y vuelva a ejecutar la auditoría.

import es from "/components/footer/es.mdx";

<es />
