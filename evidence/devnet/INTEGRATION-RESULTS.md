# MOTORA — pruebas válidas y rechazos en Devnet

- Generado: 2026-11-20T01:25:42.163Z
- RPC: https://api.devnet.solana.com
- Cluster: devnet
- Program ID: EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU — https://explorer.solana.com/address/EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU?cluster=devnet
- Wallet de firma (payer): DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH — https://explorer.solana.com/address/DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH?cluster=devnet
- Versión del cluster: {"feature-set":1591744305,"solana-core":"4.5.0-beta.0"}

| ID | Caso | Objetivo | Esperado | Obtenido | Estado | Firma |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | Registrar y leer motocicleta | Registrar una motocicleta y verificar su cuenta en la cadena | owner coincide, VIN hash almacenado, active=true | owner=9U4dMFRq3M5tdCMPwm6Ay6kZkRiy4snbKjAgtxVs9BCc, brand=Honda, mileage=100, active=true | PASS | [264Fsi3B…NRLWa9of](https://explorer.solana.com/tx/264Fsi3BcsDVVaehtZ3NXqjDvsg5MPSiLSC2zzEcJbSPPYbmWyJzmER2PSr9hzTJjhd2apXPN7rpmUeeNRLWa9of?cluster=devnet) |
| V2 | Actualizar motocicleta | Actualizar modelo y kilometraje sin reducir el odómetro | modelo actualizado y kilometraje 130 | model=CB500F ABS, mileage=130 | PASS | [2XzyuzpM…V5Y1AKtb](https://explorer.solana.com/tx/2XzyuzpMAVsCzVFz2krXvqhbyUUQSFSM7TZDUDcW4Zcig14e4VVxRwyaKta1jNZTnRANALrfQ7sr2bAPV5Y1AKtb?cluster=devnet) |
| V3 | Registrar talleres | Registrar dos talleres independientes con PDA por autoridad | Ambas PDAs existen; taller A activo | MOTORA Premium Service, authority=EvzbCNVA4wJMvjNNnt7PwUxkFoyugCEyZQn3dsyVsZ5m, active=true | PASS | [GL6xVV44…JNfNFgRT](https://explorer.solana.com/tx/GL6xVV44UVVLhtNmn1MWPBQ78eDvzisS6V57HHrxQTJLN1iBHNTjmRwdxetrB7yGVooJsrvwRysJfybJNfNFgRT?cluster=devnet) |
| V4 | Crear intervención | Crear un mantenimiento pendiente ligado a moto y taller | status=pending y motorcycle.pending_services=1 | status=pending, pending=1, workshop=EQKVS7oRw4Fp4LnaMNG9G2k3xswmm7uXRJTQbr3bJoai | PASS | [4u3KnAMd…Sd5ZsMZh](https://explorer.solana.com/tx/4u3KnAMdZCpYViQxGnNvYfMwUzXgPHwtkJ9JZtqRK5Q2cW4a5ZbfVQjD6wvDmvmcJWdXnvuG9gpWEEzoSd5ZsMZh?cluster=devnet) |
| V5 | Modificar intervención pendiente | Editar un registro pendiente por su taller autor | Datos actualizados en la cuenta | mileage=160, description=Synthetic 10W40 and OEM filter | PASS | [78B4anUz…Wro4zGrw](https://explorer.solana.com/tx/78B4anUzwZND3SvH2yXn8mU1j1VVwPLAt8PKgCtU7zifssD4jN47WiPgj3JYojm8ruh1R1arhN8PdPEWro4zGrw?cluster=devnet) |
| V6 | Finalizar intervención | Finalizar el mantenimiento y actualizar contadores/odómetro | status=finalized, pending=0, odómetro=160 | status=finalized, pending=0, mileage=160 | PASS | [MTSHqtdw…x22Y2q4U](https://explorer.solana.com/tx/MTSHqtdwGKQdCPgEUfxaT7zaHTon2W67g8q1xwrXnjNeX5wtAaHQUh7DSLzgU6jnnP6ore4zPAJTrYox22Y2q4U?cluster=devnet) |
| V7 | Crear reclamación de garantía | Abrir una garantía vinculada a un servicio finalizado, solo por el propietario | claim=open, vinculada al servicio, open_claims=1 | status=open, service=5CSWzMyrENR9PdLZ94WfKf4bKXo7nuZ5uiXY3Aq1gkgK, openClaims=1 | PASS | [4mk27v3C…sqmnHSjs](https://explorer.solana.com/tx/4mk27v3CQphc2P2v8REStZgbboRxdBmsBzpEQBaRW8PmNFtUfFdGLFMwXx8EfPSRyrRyULHN1gTzJEKcsqmnHSjs?cluster=devnet) |
| V8 | Resolver reclamación | Resolver la garantía únicamente desde el taller responsable | status=resolved, resolved_at definido, open_claims=0 | status=resolved, resolvedAt=1795137915, openClaims=0 | PASS | [3Hju66gf…iEQvnyfM](https://explorer.solana.com/tx/3Hju66gf1mdD1da1nsi4dMzxDnFPby1mZz1ZdAxwC7MWu61P6sgGD1Wzu1wsXxZA365BDCn6wXYUo7F6iEQvnyfM?cluster=devnet) |
| V9 | Archivado condicionado | Archivar una moto sin servicios pendientes ni garantías abiertas | active=false y cuenta conservada para auditoría | active=false, brand=Kawasaki | PASS | [CxmmKKo9…VzQ22JSX](https://explorer.solana.com/tx/CxmmKKo9z3T2eFXxKcVc2D2FmKrNmg758ApeXgCJc6W27cobCi56R4fTzcK4yabh8vMikrcDeshkNXfVzQ22JSX?cluster=devnet) |
| V10 | Consistencia entre cuentas | Verificar contadores globales y del taller tras el flujo válido | 2 motos (1 activa), 2 talleres, 1 servicio, 1 reclamación, 1 servicio completado | motorcycles=2, active=1, workshops=2, services=1, claims=1, completed=1 | PASS | — |
| R1 | Wallet ajena modifica motocicleta | Rechazar modificación por un wallet que no es el propietario | NotMotorcycleOwner y modelo sin cambios | NotMotorcycleOwner \| AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle.; model=CB500F ABS | PASS | — |
| R2 | Servicio sin autorización | Rechazar creación de intervención firmada por wallet que no controla el taller | UnauthorizedWorkshop y service_count sin cambios | UnauthorizedWorkshop \| AnchorError caused by account: workshop. Error Code: UnauthorizedWorkshop. Error Number: 6000. Error Message: The signer is not authorized for this operation.; serviceCount=1 | PASS | — |
| R3 | Taller modifica servicio ajeno | Rechazar que el taller B edite un servicio del taller A | AccountMismatch/UnauthorizedWorkshop y descripción sin cambios | AccountMismatch \| AnchorError caused by account: service_record. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together.; description=Synthetic 10W40 and OEM filter | PASS | — |
| R4 | Modificar servicio finalizado | Garantizar inmutabilidad de los registros finalizados | ServiceFinalized y estado sin cambios | ServiceFinalized \| AnchorError thrown in programs/motora/src/lib.rs:271. Error Code: ServiceFinalized. Error Number: 6008. Error Message: The service record is already finalized and cannot be modified.; mileage=160 | PASS | — |
| R5 | Reclamación sobre servicio inexistente | Rechazar una garantía cuyo servicio vinculado no existe | Error de cuenta/seeds y contador de reclamaciones sin cambios | AccountNotInitialized \| AnchorError caused by account: service_record. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized.; totalClaims=1 | PASS | — |
| R6 | No propietario abre reclamación | Solo el propietario puede iniciar una reclamación de garantía | NotMotorcycleOwner y open_claims sin cambios | NotMotorcycleOwner \| AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle.; openClaims=0 | PASS | — |
| R7 | Archivar con reclamación abierta | Rechazar archivado cuando existe una garantía abierta | OpenClaimsExist y moto sigue activa | OpenClaimsExist \| AnchorError thrown in programs/motora/src/lib.rs:481. Error Code: OpenClaimsExist. Error Number: 6015. Error Message: The motorcycle has open warranty claims.; active=true, openClaims=1 | PASS | [2sowFxND…GcR1Mndj](https://explorer.solana.com/tx/2sowFxNDefRjJHxaC1rB8cChHXgKY5UjBNd3VNzKMoZmi8MPgmqnrc95zKZV5oS9yp4dDZ1YfM6QqY7rGcR1Mndj?cluster=devnet) |
| V11 | Cierre de la reclamación de prueba | Restaurar un estado limpio después del caso R7 | Reclamación resuelta | status=resolved | PASS | [2WFqeqH8…ihXM2uqx](https://explorer.solana.com/tx/2WFqeqH8g2ZVrZVpaLU28UxvrZaB7CheDZpGj3bUxaETwjfJFKEqDcDQmmUFMTmWdTBD2d5CgDtjxJsyihXM2uqx?cluster=devnet) |
| R8 | Archivar con servicios pendientes | Rechazar archivado cuando existe una intervención pendiente | PendingServicesExist y moto sigue activa | PendingServicesExist \| AnchorError thrown in programs/motora/src/lib.rs:482. Error Code: PendingServicesExist. Error Number: 6016. Error Message: The motorcycle has pending maintenance interventions.; active=true, pending=1 | PASS | — |
| R9 | Kilometraje decreciente | Rechazar un odómetro menor al registrado | InvalidMileage y odómetro sin cambios | InvalidMileage \| AnchorError thrown in programs/motora/src/lib.rs:127. Error Code: InvalidMileage. Error Number: 6004. Error Message: The odometer reading is invalid or lower than the current one.; mileage=160 | PASS | — |
| R10 | PDA/seed incorrecta | Rechazar una instrucción construida con un identifier_hash equivocado | ConstraintSeeds / cuenta no encontrada y moto intacta | AccountMismatch \| AnchorError thrown in programs/motora/src/lib.rs:473. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together.; active=true | PASS | — |

## Detalle

### V1 — Registrar y leer motocicleta (PASS)

- **Objetivo:** Registrar una motocicleta y verificar su cuenta en la cadena
- **Preparación:** VIN hasheado localmente; PDA C8DgeCMABgHwqGj2348FC2cbf7eX8FETDrqu41cG6mRD
- **Operación:** register_motorcycle + account fetch
- **Resultado esperado:** owner coincide, VIN hash almacenado, active=true
- **Resultado obtenido:** owner=9U4dMFRq3M5tdCMPwm6Ay6kZkRiy4snbKjAgtxVs9BCc, brand=Honda, mileage=100, active=true
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/264Fsi3BcsDVVaehtZ3NXqjDvsg5MPSiLSC2zzEcJbSPPYbmWyJzmER2PSr9hzTJjhd2apXPN7rpmUeeNRLWa9of?cluster=devnet

### V2 — Actualizar motocicleta (PASS)

- **Objetivo:** Actualizar modelo y kilometraje sin reducir el odómetro
- **Preparación:** Motocicleta V1 con 100 km
- **Operación:** update_motorcycle(model='CB500F ABS', mileage=130)
- **Resultado esperado:** modelo actualizado y kilometraje 130
- **Resultado obtenido:** model=CB500F ABS, mileage=130
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/2XzyuzpMAVsCzVFz2krXvqhbyUUQSFSM7TZDUDcW4Zcig14e4VVxRwyaKta1jNZTnRANALrfQ7sr2bAPV5Y1AKtb?cluster=devnet

### V3 — Registrar talleres (PASS)

- **Objetivo:** Registrar dos talleres independientes con PDA por autoridad
- **Preparación:** Dos autoridades de taller financiadas
- **Operación:** register_workshop(name) para A y B
- **Resultado esperado:** Ambas PDAs existen; taller A activo
- **Resultado obtenido:** MOTORA Premium Service, authority=EvzbCNVA4wJMvjNNnt7PwUxkFoyugCEyZQn3dsyVsZ5m, active=true
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/GL6xVV44UVVLhtNmn1MWPBQ78eDvzisS6V57HHrxQTJLN1iBHNTjmRwdxetrB7yGVooJsrvwRysJfybJNfNFgRT?cluster=devnet

### V4 — Crear intervención (PASS)

- **Objetivo:** Crear un mantenimiento pendiente ligado a moto y taller
- **Preparación:** Moto activa y taller A activo
- **Operación:** create_service_record(record_id=1, mileage=150)
- **Resultado esperado:** status=pending y motorcycle.pending_services=1
- **Resultado obtenido:** status=pending, pending=1, workshop=EQKVS7oRw4Fp4LnaMNG9G2k3xswmm7uXRJTQbr3bJoai
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/4u3KnAMdZCpYViQxGnNvYfMwUzXgPHwtkJ9JZtqRK5Q2cW4a5ZbfVQjD6wvDmvmcJWdXnvuG9gpWEEzoSd5ZsMZh?cluster=devnet

### V5 — Modificar intervención pendiente (PASS)

- **Objetivo:** Editar un registro pendiente por su taller autor
- **Preparación:** Servicio 1 en estado pending
- **Operación:** update_service_record(mileage=160, nueva descripción)
- **Resultado esperado:** Datos actualizados en la cuenta
- **Resultado obtenido:** mileage=160, description=Synthetic 10W40 and OEM filter
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/78B4anUzwZND3SvH2yXn8mU1j1VVwPLAt8PKgCtU7zifssD4jN47WiPgj3JYojm8ruh1R1arhN8PdPEWro4zGrw?cluster=devnet

### V6 — Finalizar intervención (PASS)

- **Objetivo:** Finalizar el mantenimiento y actualizar contadores/odómetro
- **Preparación:** Servicio 1 pendiente con 160 km
- **Operación:** finalize_service_record
- **Resultado esperado:** status=finalized, pending=0, odómetro=160
- **Resultado obtenido:** status=finalized, pending=0, mileage=160
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/MTSHqtdwGKQdCPgEUfxaT7zaHTon2W67g8q1xwrXnjNeX5wtAaHQUh7DSLzgU6jnnP6ore4zPAJTrYox22Y2q4U?cluster=devnet

### V7 — Crear reclamación de garantía (PASS)

- **Objetivo:** Abrir una garantía vinculada a un servicio finalizado, solo por el propietario
- **Preparación:** Servicio 1 finalizado dentro de la ventana de 90 días
- **Operación:** create_warranty_claim(claim_id=1)
- **Resultado esperado:** claim=open, vinculada al servicio, open_claims=1
- **Resultado obtenido:** status=open, service=5CSWzMyrENR9PdLZ94WfKf4bKXo7nuZ5uiXY3Aq1gkgK, openClaims=1
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/4mk27v3CQphc2P2v8REStZgbboRxdBmsBzpEQBaRW8PmNFtUfFdGLFMwXx8EfPSRyrRyULHN1gTzJEKcsqmnHSjs?cluster=devnet

### V8 — Resolver reclamación (PASS)

- **Objetivo:** Resolver la garantía únicamente desde el taller responsable
- **Preparación:** Reclamación 1 abierta y ligada al taller A
- **Operación:** resolve_warranty_claim(resolution)
- **Resultado esperado:** status=resolved, resolved_at definido, open_claims=0
- **Resultado obtenido:** status=resolved, resolvedAt=1795137915, openClaims=0
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/3Hju66gf1mdD1da1nsi4dMzxDnFPby1mZz1ZdAxwC7MWu61P6sgGD1Wzu1wsXxZA365BDCn6wXYUo7F6iEQvnyfM?cluster=devnet

### V9 — Archivado condicionado (PASS)

- **Objetivo:** Archivar una moto sin servicios pendientes ni garantías abiertas
- **Preparación:** Moto 2 registrada sin intervenciones
- **Operación:** archive_motorcycle(identifier_hash)
- **Resultado esperado:** active=false y cuenta conservada para auditoría
- **Resultado obtenido:** active=false, brand=Kawasaki
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/CxmmKKo9z3T2eFXxKcVc2D2FmKrNmg758ApeXgCJc6W27cobCi56R4fTzcK4yabh8vMikrcDeshkNXfVzQ22JSX?cluster=devnet

### V10 — Consistencia entre cuentas (PASS)

- **Objetivo:** Verificar contadores globales y del taller tras el flujo válido
- **Preparación:** Flujo V1–V9 completado
- **Operación:** Lectura de Protocol y Workshop
- **Resultado esperado:** 2 motos (1 activa), 2 talleres, 1 servicio, 1 reclamación, 1 servicio completado
- **Resultado obtenido:** motorcycles=2, active=1, workshops=2, services=1, claims=1, completed=1
- **Estado:** PASS

### R1 — Wallet ajena modifica motocicleta (PASS)

- **Objetivo:** Rechazar modificación por un wallet que no es el propietario
- **Preparación:** Moto 1 pertenece a 9U4dMFRq3M5tdCMPwm6Ay6kZkRiy4snbKjAgtxVs9BCc
- **Operación:** other signs update_motorcycle
- **Resultado esperado:** NotMotorcycleOwner y modelo sin cambios
- **Resultado obtenido:** NotMotorcycleOwner | AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle.; model=CB500F ABS
- **Estado:** PASS

### R2 — Servicio sin autorización (PASS)

- **Objetivo:** Rechazar creación de intervención firmada por wallet que no controla el taller
- **Preparación:** Taller A pertenece a shopA
- **Operación:** other signs create_service_record using workshop A
- **Resultado esperado:** UnauthorizedWorkshop y service_count sin cambios
- **Resultado obtenido:** UnauthorizedWorkshop | AnchorError caused by account: workshop. Error Code: UnauthorizedWorkshop. Error Number: 6000. Error Message: The signer is not authorized for this operation.; serviceCount=1
- **Estado:** PASS

### R3 — Taller modifica servicio ajeno (PASS)

- **Objetivo:** Rechazar que el taller B edite un servicio del taller A
- **Preparación:** Servicio 1 pertenece al taller A
- **Operación:** shopB signs update_service_record con su PDA
- **Resultado esperado:** AccountMismatch/UnauthorizedWorkshop y descripción sin cambios
- **Resultado obtenido:** AccountMismatch | AnchorError caused by account: service_record. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together.; description=Synthetic 10W40 and OEM filter
- **Estado:** PASS

### R4 — Modificar servicio finalizado (PASS)

- **Objetivo:** Garantizar inmutabilidad de los registros finalizados
- **Preparación:** Servicio 1 finalizado en V6
- **Operación:** shopA signs update_service_record sobre servicio finalizado
- **Resultado esperado:** ServiceFinalized y estado sin cambios
- **Resultado obtenido:** ServiceFinalized | AnchorError thrown in programs/motora/src/lib.rs:271. Error Code: ServiceFinalized. Error Number: 6008. Error Message: The service record is already finalized and cannot be modified.; mileage=160
- **Estado:** PASS

### R5 — Reclamación sobre servicio inexistente (PASS)

- **Objetivo:** Rechazar una garantía cuyo servicio vinculado no existe
- **Preparación:** No existe servicio con id 99 para la moto 1
- **Operación:** create_warranty_claim con PDA de servicio fabricada
- **Resultado esperado:** Error de cuenta/seeds y contador de reclamaciones sin cambios
- **Resultado obtenido:** AccountNotInitialized | AnchorError caused by account: service_record. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized.; totalClaims=1
- **Estado:** PASS

### R6 — No propietario abre reclamación (PASS)

- **Objetivo:** Solo el propietario puede iniciar una reclamación de garantía
- **Preparación:** Moto 1 pertenece a 9U4dMFRq3M5tdCMPwm6Ay6kZkRiy4snbKjAgtxVs9BCc
- **Operación:** other signs create_warranty_claim(claim_id=2)
- **Resultado esperado:** NotMotorcycleOwner y open_claims sin cambios
- **Resultado obtenido:** NotMotorcycleOwner | AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle.; openClaims=0
- **Estado:** PASS

### R7 — Archivar con reclamación abierta (PASS)

- **Objetivo:** Rechazar archivado cuando existe una garantía abierta
- **Preparación:** Reclamación 2 abierta sobre la moto 1
- **Operación:** owner signs archive_motorcycle
- **Resultado esperado:** OpenClaimsExist y moto sigue activa
- **Resultado obtenido:** OpenClaimsExist | AnchorError thrown in programs/motora/src/lib.rs:481. Error Code: OpenClaimsExist. Error Number: 6015. Error Message: The motorcycle has open warranty claims.; active=true, openClaims=1
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/2sowFxNDefRjJHxaC1rB8cChHXgKY5UjBNd3VNzKMoZmi8MPgmqnrc95zKZV5oS9yp4dDZ1YfM6QqY7rGcR1Mndj?cluster=devnet

### V11 — Cierre de la reclamación de prueba (PASS)

- **Objetivo:** Restaurar un estado limpio después del caso R7
- **Preparación:** Reclamación 2 abierta
- **Operación:** resolve_warranty_claim por el taller responsable
- **Resultado esperado:** Reclamación resuelta
- **Resultado obtenido:** status=resolved
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/2WFqeqH8g2ZVrZVpaLU28UxvrZaB7CheDZpGj3bUxaETwjfJFKEqDcDQmmUFMTmWdTBD2d5CgDtjxJsyihXM2uqx?cluster=devnet

### R8 — Archivar con servicios pendientes (PASS)

- **Objetivo:** Rechazar archivado cuando existe una intervención pendiente
- **Preparación:** Moto 3 con un servicio pending
- **Operación:** owner signs archive_motorcycle
- **Resultado esperado:** PendingServicesExist y moto sigue activa
- **Resultado obtenido:** PendingServicesExist | AnchorError thrown in programs/motora/src/lib.rs:482. Error Code: PendingServicesExist. Error Number: 6016. Error Message: The motorcycle has pending maintenance interventions.; active=true, pending=1
- **Estado:** PASS

### R9 — Kilometraje decreciente (PASS)

- **Objetivo:** Rechazar un odómetro menor al registrado
- **Preparación:** Moto 1 con 160 km
- **Operación:** owner signs update_motorcycle(mileage=10)
- **Resultado esperado:** InvalidMileage y odómetro sin cambios
- **Resultado obtenido:** InvalidMileage | AnchorError thrown in programs/motora/src/lib.rs:127. Error Code: InvalidMileage. Error Number: 6004. Error Message: The odometer reading is invalid or lower than the current one.; mileage=160
- **Estado:** PASS

### R10 — PDA/seed incorrecta (PASS)

- **Objetivo:** Rechazar una instrucción construida con un identifier_hash equivocado
- **Preparación:** Moto 1 registrada bajo su hash original
- **Operación:** archive_motorcycle con hash aleatorio y cuenta de la moto 1
- **Resultado esperado:** ConstraintSeeds / cuenta no encontrada y moto intacta
- **Resultado obtenido:** AccountMismatch | AnchorError thrown in programs/motora/src/lib.rs:473. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together.; active=true
- **Estado:** PASS

## Cuentas verificadas en esta ejecución

- Protocol: https://explorer.solana.com/address/8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9?cluster=devnet
- Motocicleta 1: https://explorer.solana.com/address/C8DgeCMABgHwqGj2348FC2cbf7eX8FETDrqu41cG6mRD?cluster=devnet
- Taller A: https://explorer.solana.com/address/EQKVS7oRw4Fp4LnaMNG9G2k3xswmm7uXRJTQbr3bJoai?cluster=devnet
- Servicio 1: https://explorer.solana.com/address/5CSWzMyrENR9PdLZ94WfKf4bKXo7nuZ5uiXY3Aq1gkgK?cluster=devnet
- Reclamación 1: https://explorer.solana.com/address/5yrzYrYA2MfgHFg6RVB5wx9gDsomJP3Kvctc4ceauhrY?cluster=devnet

**Resumen:** 21 casos ejecutados, 21 PASS, 0 FAIL.
