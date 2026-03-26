---
summary: "Cómo OpenClaw actualiza el complemento Matrix anterior en su lugar, incluidos los límites de recuperación del estado cifrado y los pasos de recuperación manual."
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Migración de Matrix"
---

# Migración de Matrix

Esta página cubre las actualizaciones del complemento público anterior `matrix` a la implementación actual.

Para la mayoría de los usuarios, la actualización es en su lugar:

- el complemento se mantiene `@openclaw/matrix`
- el canal se mantiene `matrix`
- su configuración se mantiene en `channels.matrix`
- las credenciales en caché se mantienen en `~/.openclaw/credentials/matrix/`
- el estado de ejecución se mantiene en `~/.openclaw/matrix/`

No necesita cambiar el nombre de las claves de configuración ni reinstalar el complemento con un nuevo nombre.

## Lo que hace la migración automáticamente

Cuando se inicia la puerta de enlace y cuando ejecuta [`openclaw doctor --fix`](/es/gateway/doctor), OpenClaw intenta reparar el estado antiguo de Matrix automáticamente.
Antes de que cualquier paso de migración de Matrix accionable mute el estado en disco, OpenClaw crea o reutiliza una instantánea de recuperación enfocada.

Cuando usa `openclaw update`, el disparador exacto depende de cómo esté instalado OpenClaw:

- las instalaciones desde el código fuente ejecutan `openclaw doctor --fix` durante el flujo de actualización y luego reinician la puerta de enlace de manera predeterminada
- las instalaciones mediante el administrador de paquetes actualizan el paquete, ejecutan un pase de doctor no interactivo y luego confían en el reinicio predeterminado de la puerta de enlace para que el inicio pueda finalizar la migración de Matrix
- si usa `openclaw update --no-restart`, la migración de Matrix respaldada por el inicio se pospone hasta que luego ejecute `openclaw doctor --fix` y reinicie la puerta de enlace

La migración automática cubre:

- crear o reutilizar una instantánea de pre-migración en `~/Backups/openclaw-migrations/`
- reutilizar sus credenciales de Matrix en caché
- mantener la misma selección de cuenta y la configuración `channels.matrix`
- mover el almacén de sincronización plano más antiguo de Matrix a la ubicación actual con ámbito de cuenta
- mover el almacén de cifrado plano más antiguo de Matrix a la ubicación actual con ámbito de cuenta cuando la cuenta de destino se pueda resolver de forma segura
- extraer una clave de descifrado de copia de seguridad de claves de sala de Matrix guardada previamente del antiguo almacén de cifrado de rust, cuando esa clave existe localmente
- reutilizando la raíz de almacenamiento de hash de token más completa existente para la misma cuenta de Matrix, servidor de inicio y usuario cuando el token de acceso cambia más tarde
- escaneando las raíces de almacenamiento de hash de token hermanas en busca de metadatos de restauración de estado cifrado pendientes cuando el token de acceso de Matrix cambió pero la identidad de la cuenta/dispositivo se mantuvo igual
- restaurando las claves de sala respaldadas en el nuevo almacén criptográfico en el próximo inicio de Matrix

Detalles de la instantánea:

- OpenClaw escribe un archivo de marcador en `~/.openclaw/matrix/migration-snapshot.json` después de una instantánea exitosa para que los posteriores inicios y pasadas de reparación puedan reutilizar el mismo archivo.
- Estas instantáneas automáticas de migración de Matrix respaldan solo la configuración + el estado (`includeWorkspace: false`).
- Si Matrix solo tiene un estado de migración de solo advertencia, por ejemplo porque `userId` o `accessToken` aún faltan, OpenClaw aún no crea la instantánea porque ninguna mutación de Matrix es ejecutable.
- Si el paso de instantánea falla, OpenClaw omite la migración de Matrix para esa ejecución en lugar de mutar el estado sin un punto de recuperación.

Acerca de las actualizaciones multicuenta:

- el almacén de Matrix plano más antiguo (`~/.openclaw/matrix/bot-storage.json` y `~/.openclaw/matrix/crypto/`) proviene de un diseño de un solo almacén, por lo que OpenClaw solo puede migrarlo a un objetivo de cuenta de Matrix resuelto
- los almacenes de Matrix heredados ya con ámbito de cuenta se detectan y preparan por cada cuenta de Matrix configurada

## Lo que la migración no puede hacer automáticamente

El complemento público de Matrix anterior **no** creaba automáticamente copias de seguridad de las claves de sala de Matrix. Persistía el estado criptográfico local y solicitaba la verificación del dispositivo, pero no garantizaba que sus claves de sala estuvieran respaldadas en el servidor de inicio.

Eso significa que algunas instalaciones cifradas solo se pueden migrar parcialmente.

OpenClaw no puede recuperar automáticamente:

- claves de sala solo locales que nunca fueron respaldadas
- estado cifrado cuando la cuenta de Matrix de destino aún no se puede resolver porque `homeserver`, `userId` o `accessToken` aún no están disponibles
- migración automática de un almacén plano de Matrix compartido cuando hay varias cuentas de Matrix configuradas pero `channels.matrix.defaultAccount` no está establecido
- instalaciones de ruta de complemento personalizado que están fijadas a una ruta de repositorio en lugar del paquete Matrix estándar
- una clave de recuperación faltante cuando el almacén antiguo tenía claves respaldadas pero no conservaba la clave de descifrado localmente

Ámbito de advertencia actual:

- las instalaciones de ruta de complemento de Matrix personalizadas se muestran tanto al iniciar la puerta de enlace como en `openclaw doctor`

Si su instalación antigua tenía un historial cifrado solo local que nunca se respaldó, algunos mensajes cifrados antiguos pueden permanecer ilegibles después de la actualización.

## Flujo de actualización recomendado

1. Actualice OpenClaw y el complemento de Matrix normalmente.
   Prefiera `openclaw update` simple sin `--no-restart` para que el inicio pueda finalizar la migración de Matrix inmediatamente.
2. Ejecute:

   ```bash
   openclaw doctor --fix
   ```

   Si Matrix tiene trabajo de migración ejecutable, el doctor creará o reutilizará primero la instantánea previa a la migración e imprimirá la ruta del archivo.

3. Inicie o reinicie la puerta de enlace.
4. Verifique el estado actual de verificación y respaldo:

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. Si OpenClaw le indica que se necesita una clave de recuperación, ejecute:

   ```bash
   openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"
   ```

6. Si este dispositivo todavía no está verificado, ejecute:

   ```bash
   openclaw matrix verify device "<your-recovery-key>"
   ```

7. Si intencionalmente está abandonando un historial antiguo irrecuperable y desea una línea base de respaldo nueva para mensajes futuros, ejecute:

   ```bash
   openclaw matrix verify backup reset --yes
   ```

8. Si aún no existe un respaldo de clave del lado del servidor, cree uno para recuperaciones futuras:

   ```bash
   openclaw matrix verify bootstrap
   ```

## Cómo funciona la migración cifrada

La migración cifrada es un proceso de dos etapas:

1. El inicio o `openclaw doctor --fix` crea o reutiliza la instantánea previa a la migración si la migración cifrada es ejecutable.
2. El inicio o `openclaw doctor --fix` inspecciona el almacén criptográfico de Matrix antiguo a través de la instalación activa del complemento de Matrix.
3. Si se encuentra una clave de descifrado de respaldo, OpenClaw la escribe en el nuevo flujo de clave de recuperación y marca la restauración de clave de sala como pendiente.
4. En el próximo inicio de Matrix, OpenClaw restaura las claves de sala respaldadas en el nuevo almacén criptográfico automáticamente.

Si el almacén antiguo informa claves de sala que nunca se respaldaron, OpenClaw advierte en lugar de fingir que la recuperación tuvo éxito.

## Mensajes comunes y lo que significan

### Mensajes de actualización y detección

`Matrix plugin upgraded in place.`

- Significado: se detectó el estado antiguo de Matrix en disco y se migró al diseño actual.
- Qué hacer: nada a menos que la misma salida también incluya advertencias.

`Matrix migration snapshot created before applying Matrix upgrades.`

- Significado: OpenClaw creó un archivo de recuperación antes de modificar el estado de Matrix.
- Qué hacer: conserve la ruta del archivo impresa hasta que confirme que la migración tuvo éxito.

`Matrix migration snapshot reused before applying Matrix upgrades.`

- Significado: OpenClaw encontró un marcador de instantánea de migración de Matrix existente y reutilizó ese archivo en lugar de crear una copia de seguridad duplicada.
- Qué hacer: conserve la ruta del archivo impreso hasta que confirme que la migración se realizó correctamente.

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- Significado: existe un estado antiguo de Matrix, pero OpenClaw no puede asignarlo a una cuenta actual de Matrix porque Matrix no está configurado.
- Qué hacer: configure `channels.matrix`, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Significado: OpenClaw encontró un estado antiguo, pero aún así no puede determinar la raíz exacta de la cuenta/dispositivo actual.
- Qué hacer: inicie la puerta de enlace una vez con un inicio de sesión de Matrix funcional, o vuelva a ejecutar `openclaw doctor --fix` después de que existan las credenciales en caché.

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Significado: OpenClaw encontró un almacén compartido plano de Matrix, pero se niega a adivinar qué cuenta con nombre de Matrix debe recibirlo.
- Qué hacer: establezca `channels.matrix.defaultAccount` en la cuenta prevista, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Matrix legacy sync store not migrated because the target already exists (...)`

- Significado: la nueva ubicación con alcance de cuenta ya tiene un almacén de sincronización o cifrado, por lo que OpenClaw no lo sobrescribió automáticamente.
- Qué hacer: verifique que la cuenta actual sea la correcta antes de eliminar o mover manualmente el destino conflictivo.

`Failed migrating Matrix legacy sync store (...)` o `Failed migrating Matrix legacy crypto store (...)`

- Significado: OpenClaw intentó mover el estado antiguo de Matrix, pero la operación del sistema de archivos falló.
- Qué hacer: inspeccione los permisos del sistema de archivos y el estado del disco, luego vuelva a ejecutar `openclaw doctor --fix`.

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- Significado: OpenClaw encontró un almacén cifrado antiguo de Matrix, pero no hay una configuración actual de Matrix para adjuntarlo.
- Qué hacer: configure `channels.matrix`, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Significado: el almacén cifrado existe, pero OpenClaw no puede decidir de forma segura a qué cuenta/dispositivo actual pertenece.
- Qué hacer: inicie la puerta de enlace una vez con un inicio de sesión de Matrix funcional, o vuelva a ejecutar `openclaw doctor --fix` después de que las credenciales en caché estén disponibles.

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Significado: OpenClaw encontró un almacén criptográfico heredado plano compartido, pero se niega a adivinar qué cuenta de Matrix con nombre debería recibirlo.
- Qué hacer: establezca `channels.matrix.defaultAccount` en la cuenta prevista, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- Significado: OpenClaw detectó un estado antiguo de Matrix, pero la migración todavía está bloqueada por datos de identidad o credenciales faltantes.
- Qué hacer: complete el inicio de sesión o la configuración de Matrix, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- Significado: OpenClaw encontró un estado antiguo cifrado de Matrix, pero no pudo cargar el punto de entrada auxiliar desde el complemento de Matrix que normalmente inspecciona ese almacén.
- Qué hacer: reinstale o repare el complemento de Matrix (`openclaw plugins install @openclaw/matrix`, o `openclaw plugins install ./extensions/matrix` para una copia del repositorio), luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- Significado: OpenClaw encontró una ruta de archivo auxiliar que escapa de la raíz del complemento o falla las comprobaciones de límites del complemento, por lo que se negó a importarlo.
- Qué hacer: reinstale el complemento de Matrix desde una ruta confiable, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- Significado: OpenClaw se negó a mutar el estado de Matrix porque no pudo crear primero la instantánea de recuperación.
- Qué hacer: resuelva el error de copia de seguridad, luego vuelva a ejecutar `openclaw doctor --fix` o reinicie la puerta de enlace.

`Failed migrating legacy Matrix client storage: ...`

- Significado: la alternativa del lado del cliente de Matrix encontró un almacenamiento plano antiguo, pero el movimiento falló. OpenClaw ahora aborta esa alternativa en lugar de comenzar silenciosamente con un almacén nuevo.
- Qué hacer: inspeccione los permisos o conflictos del sistema de archivos, mantenga el estado antiguo intacto y vuelva a intentarlo después de corregir el error.

`Matrix is installed from a custom path: ...`

- Significado: Matrix está anclado a una instalación de ruta, por lo que las actualizaciones de la línea principal no lo reemplazan automáticamente con el paquete estándar de Matrix del repositorio.
- Qué hacer: reinstale con `openclaw plugins install @openclaw/matrix` cuando desee volver al complemento predeterminado de Matrix.

### Mensajes de recuperación del estado cifrado

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- Significado: las claves de sala respaldadas se restauraron correctamente en el nuevo almacén criptográfico.
- Qué hacer: generalmente nada.

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- Significado: algunas claves de sala antiguas existían solo en el almacén local antiguo y nunca se habían cargado en la copia de seguridad de Matrix.
- Qué hacer: espere que parte del historial encriptado antiguo permanezca disponible a menos que pueda recuperar esas claves manualmente desde otro cliente verificado.

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- Significado: la copia de seguridad existe, pero OpenClaw no pudo recuperar la clave de recuperación automáticamente.
- Qué hacer: ejecute `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`.

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- Significado: OpenClaw encontró el almacén encriptado antiguo, pero no pudo inspeccionarlo con la seguridad suficiente para preparar la recuperación.
- Qué hacer: vuelva a ejecutar `openclaw doctor --fix`. Si se repite, mantenga el directorio de estado antiguo intacto y recupere usando otro cliente de Matrix verificado más `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`.

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- Significado: OpenClaw detectó un conflicto de clave de copia de seguridad y se negó a sobrescribir el archivo de clave de recuperación actual automáticamente.
- Qué hacer: verifique qué clave de recuperación es correcta antes de volver a intentar cualquier comando de restauración.

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- Significado: este es el límite estricto del formato de almacenamiento antiguo.
- Qué hacer: las claves con copia de seguridad todavía se pueden restaurar, pero el historial encriptado solo local puede permanecer no disponible.

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- Significado: el nuevo complemento intentó la restauración pero Matrix devolvió un error.
- Qué hacer: ejecute `openclaw matrix verify backup status`, luego vuelva a intentar con `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` si es necesario.

### Mensajes de recuperación manual

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- Significado: OpenClaw sabe que debería tener una clave de copia de seguridad, pero no está activa en este dispositivo.
- Qué hacer: ejecute `openclaw matrix verify backup restore`, o pase `--recovery-key` si es necesario.

`Store a recovery key with 'openclaw matrix verify device <key>', then run 'openclaw matrix verify backup restore'.`

- Significado: este dispositivo actualmente no tiene la clave de recuperación almacenada.
- Qué hacer: verifique el dispositivo con su clave de recuperación primero, luego restaure la copia de seguridad.

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device <key>' with the matching recovery key.`

- Significado: la clave almacenada no coincide con la copia de seguridad activa de Matrix.
- Qué hacer: vuelva a ejecutar `openclaw matrix verify device "<your-recovery-key>"` con la clave correcta.

Si acepta perder el historial encriptado antiguo irrecuperable, en su lugar puede restablecer la línea base de la copia de seguridad actual con `openclaw matrix verify backup reset --yes`.

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device <key>'.`

- Significado: la copia de seguridad existe, pero este dispositivo aún no confía lo suficiente en la cadena de firma cruzada.
- Qué hacer: vuelve a ejecutar `openclaw matrix verify device "<your-recovery-key>"`.

`Matrix recovery key is required`

- Significado: intentaste un paso de recuperación sin proporcionar una clave de recuperación cuando se requería una.
- Qué hacer: vuelve a ejecutar el comando con tu clave de recuperación.

`Invalid Matrix recovery key: ...`

- Significado: la clave proporcionada no se pudo analizar o no coincidía con el formato esperado.
- Qué hacer: reinténtalo con la clave de recuperación exacta de tu cliente de Matrix o del archivo de clave de recuperación.

`Matrix device is still unverified after applying recovery key. Verify your recovery key and ensure cross-signing is available.`

- Significado: se aplicó la clave, pero el dispositivo aún no pudo completar la verificación.
- Qué hacer: confirma que usaste la clave correcta y que la firma cruzada está disponible en la cuenta, y luego reinténtalo.

`Matrix key backup is not active on this device after loading from secret storage.`

- Significado: el almacenamiento de secretos no produjo una sesión de copia de seguridad activa en este dispositivo.
- Qué hacer: verifica el dispositivo primero y luego vuelve a comprobar con `openclaw matrix verify backup status`.

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device <key>' first.`

- Significado: este dispositivo no puede restaurarse desde el almacenamiento de secretos hasta que se complete la verificación del dispositivo.
- Qué hacer: ejecuta `openclaw matrix verify device "<your-recovery-key>"` primero.

### Mensajes de instalación de complemento personalizado

`Matrix is installed from a custom path that no longer exists: ...`

- Significado: el registro de instalación de tu complemento apunta a una ruta local que ya no existe.
- Qué hacer: reinstala con `openclaw plugins install @openclaw/matrix`, o si estás ejecutando desde una copia del repositorio, `openclaw plugins install ./extensions/matrix`.

## Si el historial cifrado aún no vuelve

Realiza estas comprobaciones en orden:

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
openclaw matrix verify backup restore --recovery-key "<your-recovery-key>" --verbose
```

Si la copia de seguridad se restaura correctamente pero a algunas salas antiguas aún les falta el historial, es probable que esas claves faltantes nunca hayan sido respaldadas por el complemento anterior.

## Si quieres empezar de cero para mensajes futuros

Si aceptas perder el historial cifrado antiguo irrecuperable y solo deseas una línea base limpia de copia de seguridad de ahora en adelante, ejecuta estos comandos en orden:

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Si el dispositivo sigue sin verificarse después de eso, completa la verificación desde tu cliente de Matrix comparando los emoji SAS o los códigos decimales y confirmando que coinciden.

## Páginas relacionadas

- [Matrix](/es/channels/matrix)
- [Doctor](/es/gateway/doctor)
- [Migrating](/es/install/migrating)
- [Plugins](/es/tools/plugin)

import es from "/components/footer/es.mdx";

<es />
