# MOTORA — automated program test results

Executed: 2026-11-20T01:29:46.130Z
Validator / cluster: http://127.0.0.1:8899
Program ID: EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU

| ID | Case | Objective | Expected | Obtained | Status |
| --- | --- | --- | --- | --- | --- |
| V1 | Register and read motorcycle | Register a bike and verify the on-chain account is readable with the expected fields | Account exists, owner matches signer, VIN hash stored, active = true | owner=8WsYo67p, brand=Honda, mileage=100, active=true | PASS |
| V2 | Update motorcycle | Update allowed descriptive fields and advance the odometer | Model updated and mileage = 130 | model=CB500F ABS, mileage=130 | PASS |
| V3 | Register workshop | Register two independent workshops keyed by their authority | Both PDAs exist and workshop A is active | workshop=MOTORA Premium Service, authority=EHgdjVYb, active=true | PASS |
| V4 | Create service record | Create a linked pending intervention and update motorcycle counters | Service is pending, motorcycle.pending_services = 1 | status={"pending":{}}, pending=1, workshop=FtnDRP3F | PASS |
| V5 | Update pending service | A pending service may be edited by its authoring workshop | Stored service reflects the new values | description=Synthetic oil 10W40 and OEM filter replaced, mileage=160 | PASS |
| V6 | Finalize service | Finalize a service, clear the pending counter and advance the odometer | Status Finalized, pending_services = 0, motorcycle mileage = 160 | status={"finalized":{}}, pending=0, mileage=160 | PASS |
| V7 | Create warranty claim | Owner opens a claim tied to a finalized service | Claim Open, linked to service 1, motorcycle.open_claims = 1 | status={"open":{}}, openClaims=1, linkedService=BgLKVy6U | PASS |
| V8 | Resolve warranty claim | Responsible workshop resolves an open claim | Claim Resolved with timestamp, open_claims = 0 | status={"resolved":{}}, resolvedAt=1795138183, openClaims=0 | PASS |
| V9 | Conditional archival | Archive a motorcycle with no pending services and no open claims | active = false while the account and its history remain readable | active=false, account still readable=Yamaha | PASS |
| V10 | Cross-account consistency | Verify global counters and workshop counters after the valid flow | Counters reflect 2 motorcycles (1 active), 2 workshops, 1 service, 1 claim, 1 completed service | motorcycles=2, active=1, workshops=2, services=1, claims=1, completed=1 | PASS |
| R1 | Foreign wallet updates motorcycle | Reject a non-owner modifying a motorcycle | NotMotorcycleOwner | NotMotorcycleOwner \| AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle. | PASS |
| R2 | Unauthorized service record | Reject a wallet that is not the workshop authority | UnauthorizedWorkshop | UnauthorizedWorkshop \| AnchorError caused by account: workshop. Error Code: UnauthorizedWorkshop. Error Number: 6000. Error Message: The signer is not authorized for this operation. | PASS |
| R3 | Cross-workshop modification | Reject workshop B editing workshop A's service | AccountMismatch / UnauthorizedWorkshop | AccountMismatch \| AnchorError caused by account: service_record. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together. | PASS |
| R4 | Modify finalized service | Reject any modification of a finalized record | ServiceFinalized | ServiceFinalized \| AnchorError thrown in programs/motora/src/lib.rs:271. Error Code: ServiceFinalized. Error Number: 6008. Error Message: The service record is already finalized and cannot be modified. | PASS |
| R5 | Claim on missing service | Reject a claim whose service account does not exist | AccountNotInitialized / ConstraintSeeds | AccountNotInitialized \| AnchorError caused by account: service_record. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized. | PASS |
| R6 | Non-owner warranty claim | Only the motorcycle owner may open a claim | NotMotorcycleOwner | NotMotorcycleOwner \| AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle. | PASS |
| R7 | Archive with open claim | Reject archival while a warranty claim is open | OpenClaimsExist | OpenClaimsExist \| AnchorError thrown in programs/motora/src/lib.rs:481. Error Code: OpenClaimsExist. Error Number: 6015. Error Message: The motorcycle has open warranty claims. | PASS |
| R8 | Archive with pending service | Reject archival while an intervention is pending | PendingServicesExist | PendingServicesExist \| AnchorError thrown in programs/motora/src/lib.rs:482. Error Code: PendingServicesExist. Error Number: 6016. Error Message: The motorcycle has pending maintenance interventions. | PASS |
| R9 | Decreasing mileage | Reject an odometer value below the current one | InvalidMileage | InvalidMileage \| AnchorError thrown in programs/motora/src/lib.rs:127. Error Code: InvalidMileage. Error Number: 6004. Error Message: The odometer reading is invalid or lower than the current one. | PASS |
| R10 | Wrong PDA seed | Reject an instruction built with an incorrect identifier hash | ConstraintSeeds / account not found | AccountMismatch \| AnchorError thrown in programs/motora/src/lib.rs:473. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together. | PASS |

## Detail

### V1 — Register and read motorcycle (PASS)

- **Objetivo:** Register a bike and verify the on-chain account is readable with the expected fields
- **Preparación:** Fresh PDA derived from SHA-256(VIN+salt); owner wallet funded
- **Operación:** register_motorcycle + account.motorcycle.fetch
- **Resultado esperado:** Account exists, owner matches signer, VIN hash stored, active = true
- **Resultado obtenido:** owner=8WsYo67p, brand=Honda, mileage=100, active=true
- **Estado:** PASS

### V2 — Update motorcycle (PASS)

- **Objetivo:** Update allowed descriptive fields and advance the odometer
- **Preparación:** Motorcycle V1 registered with 100 km
- **Operación:** update_motorcycle(model='CB500F ABS', mileage=130)
- **Resultado esperado:** Model updated and mileage = 130
- **Resultado obtenido:** model=CB500F ABS, mileage=130
- **Estado:** PASS

### V3 — Register workshop (PASS)

- **Objetivo:** Register two independent workshops keyed by their authority
- **Preparación:** Two funded workshop authority keypairs
- **Operación:** register_workshop(name)
- **Resultado esperado:** Both PDAs exist and workshop A is active
- **Resultado obtenido:** workshop=MOTORA Premium Service, authority=EHgdjVYb, active=true
- **Estado:** PASS

### V4 — Create service record (PASS)

- **Objetivo:** Create a linked pending intervention and update motorcycle counters
- **Preparación:** Motorcycle and active workshop registered
- **Operación:** create_service_record(record_id=1, mileage=150)
- **Resultado esperado:** Service is pending, motorcycle.pending_services = 1
- **Resultado obtenido:** status={"pending":{}}, pending=1, workshop=FtnDRP3F
- **Estado:** PASS

### V5 — Update pending service (PASS)

- **Objetivo:** A pending service may be edited by its authoring workshop
- **Preparación:** Service 1 is Pending and authored by workshop A
- **Operación:** update_service_record(mileage=160, new description)
- **Resultado esperado:** Stored service reflects the new values
- **Resultado obtenido:** description=Synthetic oil 10W40 and OEM filter replaced, mileage=160
- **Estado:** PASS

### V6 — Finalize service (PASS)

- **Objetivo:** Finalize a service, clear the pending counter and advance the odometer
- **Preparación:** Service 1 pending with mileage 160
- **Operación:** finalize_service_record
- **Resultado esperado:** Status Finalized, pending_services = 0, motorcycle mileage = 160
- **Resultado obtenido:** status={"finalized":{}}, pending=0, mileage=160
- **Estado:** PASS

### V7 — Create warranty claim (PASS)

- **Objetivo:** Owner opens a claim tied to a finalized service
- **Preparación:** Service 1 finalized inside the 90-day window
- **Operación:** create_warranty_claim(claim_id=1)
- **Resultado esperado:** Claim Open, linked to service 1, motorcycle.open_claims = 1
- **Resultado obtenido:** status={"open":{}}, openClaims=1, linkedService=BgLKVy6U
- **Estado:** PASS

### V8 — Resolve warranty claim (PASS)

- **Objetivo:** Responsible workshop resolves an open claim
- **Preparación:** Claim 1 open and linked to workshop A
- **Operación:** resolve_warranty_claim(resolution)
- **Resultado esperado:** Claim Resolved with timestamp, open_claims = 0
- **Resultado obtenido:** status={"resolved":{}}, resolvedAt=1795138183, openClaims=0
- **Estado:** PASS

### V9 — Conditional archival (PASS)

- **Objetivo:** Archive a motorcycle with no pending services and no open claims
- **Preparación:** Bike 3 registered, no interventions and no claims
- **Operación:** archive_motorcycle(identifier_hash)
- **Resultado esperado:** active = false while the account and its history remain readable
- **Resultado obtenido:** active=false, account still readable=Yamaha
- **Estado:** PASS

### V10 — Cross-account consistency (PASS)

- **Objetivo:** Verify global counters and workshop counters after the valid flow
- **Preparación:** All previous valid cases executed
- **Operación:** Read Protocol and Workshop accounts
- **Resultado esperado:** Counters reflect 2 motorcycles (1 active), 2 workshops, 1 service, 1 claim, 1 completed service
- **Resultado obtenido:** motorcycles=2, active=1, workshops=2, services=1, claims=1, completed=1
- **Estado:** PASS

### R1 — Foreign wallet updates motorcycle (PASS)

- **Objetivo:** Reject a non-owner modifying a motorcycle
- **Preparación:** Bike 1 owned by owner
- **Operación:** otherOwner signs update_motorcycle
- **Resultado esperado:** NotMotorcycleOwner
- **Resultado obtenido:** NotMotorcycleOwner | AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle.
- **Estado:** PASS

### R2 — Unauthorized service record (PASS)

- **Objetivo:** Reject a wallet that is not the workshop authority
- **Preparación:** Workshop A belongs to workshopA keypair
- **Operación:** otherOwner signs create_service_record with workshop A
- **Resultado esperado:** UnauthorizedWorkshop
- **Resultado obtenido:** UnauthorizedWorkshop | AnchorError caused by account: workshop. Error Code: UnauthorizedWorkshop. Error Number: 6000. Error Message: The signer is not authorized for this operation.
- **Estado:** PASS

### R3 — Cross-workshop modification (PASS)

- **Objetivo:** Reject workshop B editing workshop A's service
- **Preparación:** Service 1 belongs to workshop A
- **Operación:** workshopB signs update_service_record using wsB
- **Resultado esperado:** AccountMismatch / UnauthorizedWorkshop
- **Resultado obtenido:** AccountMismatch | AnchorError caused by account: service_record. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together.
- **Estado:** PASS

### R4 — Modify finalized service (PASS)

- **Objetivo:** Reject any modification of a finalized record
- **Preparación:** Service 1 finalized in V6
- **Operación:** workshopA signs update_service_record on service 1
- **Resultado esperado:** ServiceFinalized
- **Resultado obtenido:** ServiceFinalized | AnchorError thrown in programs/motora/src/lib.rs:271. Error Code: ServiceFinalized. Error Number: 6008. Error Message: The service record is already finalized and cannot be modified.
- **Estado:** PASS

### R5 — Claim on missing service (PASS)

- **Objetivo:** Reject a claim whose service account does not exist
- **Preparación:** No service with id 99 for bike 1
- **Operación:** create_warranty_claim with fabricated service PDA
- **Resultado esperado:** AccountNotInitialized / ConstraintSeeds
- **Resultado obtenido:** AccountNotInitialized | AnchorError caused by account: service_record. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized.
- **Estado:** PASS

### R6 — Non-owner warranty claim (PASS)

- **Objetivo:** Only the motorcycle owner may open a claim
- **Preparación:** Bike 1 owned by owner
- **Operación:** otherOwner signs create_warranty_claim with a fresh claim id
- **Resultado esperado:** NotMotorcycleOwner
- **Resultado obtenido:** NotMotorcycleOwner | AnchorError caused by account: motorcycle. Error Code: NotMotorcycleOwner. Error Number: 6001. Error Message: The signer is not the owner of this motorcycle.
- **Estado:** PASS

### R7 — Archive with open claim (PASS)

- **Objetivo:** Reject archival while a warranty claim is open
- **Preparación:** Claim 2 on bike 1 is open
- **Operación:** owner signs archive_motorcycle
- **Resultado esperado:** OpenClaimsExist
- **Resultado obtenido:** OpenClaimsExist | AnchorError thrown in programs/motora/src/lib.rs:481. Error Code: OpenClaimsExist. Error Number: 6015. Error Message: The motorcycle has open warranty claims.
- **Estado:** PASS

### R8 — Archive with pending service (PASS)

- **Objetivo:** Reject archival while an intervention is pending
- **Preparación:** Bike 2 has one pending service
- **Operación:** otherOwner signs archive_motorcycle
- **Resultado esperado:** PendingServicesExist
- **Resultado obtenido:** PendingServicesExist | AnchorError thrown in programs/motora/src/lib.rs:482. Error Code: PendingServicesExist. Error Number: 6016. Error Message: The motorcycle has pending maintenance interventions.
- **Estado:** PASS

### R9 — Decreasing mileage (PASS)

- **Objetivo:** Reject an odometer value below the current one
- **Preparación:** Bike 1 current mileage = 160
- **Operación:** owner signs update_motorcycle(mileage=10)
- **Resultado esperado:** InvalidMileage
- **Resultado obtenido:** InvalidMileage | AnchorError thrown in programs/motora/src/lib.rs:127. Error Code: InvalidMileage. Error Number: 6004. Error Message: The odometer reading is invalid or lower than the current one.
- **Estado:** PASS

### R10 — Wrong PDA seed (PASS)

- **Objetivo:** Reject an instruction built with an incorrect identifier hash
- **Preparación:** Bike 1 exists under hash1
- **Operación:** archive_motorcycle with a different identifier_hash
- **Resultado esperado:** ConstraintSeeds / account not found
- **Resultado obtenido:** AccountMismatch | AnchorError thrown in programs/motora/src/lib.rs:473. Error Code: AccountMismatch. Error Number: 6018. Error Message: Accounts passed to this instruction do not belong together.
- **Estado:** PASS
