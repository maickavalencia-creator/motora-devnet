# Revisión de seguridad — MOTORA

Fecha de la revisión: 2026-11-19. Alcance: `programs/motora/src/lib.rs`, IDL generado, cliente TypeScript y frontend. Metodología: revisión estática de constraints + ejecución de 20 casos automatizados contra `solana-test-validator` (`anchor test --skip-build`), con verificación de estado antes/después en los casos de rechazo.

**No se afirma que el programa sea "seguro" en abstracto.** Se documentan las comprobaciones ejecutadas, su resultado y las limitaciones.

## 1. Signers y autoridad

| Instrucción | Requiren signer | Comprobación |
| --- | --- | --- |
| `initialize` | authority | Crea `Protocol` con `authority = signer` |
| `register_motorcycle` | owner | dueño grabado en la cuenta; `payer = owner` |
| `update_motorcycle` | owner | `constraint: motorcycle.owner == owner.key()` |
| `register_workshop` | authority | PDA derivada de `authority.key()` |
| `set_workshop_status` | authority | `constraint: workshop.authority == authority.key()` |
| `create_service_record` | authority | `constraint: workshop.authority == authority.key()` |
| `update_service_record` | authority | `record.authority == authority.key()` en el body |
| `finalize_service_record` | authority | mismo check + taller activo |
| `create_warranty_claim` | claimant | `claimant.key() == motorcycle.owner` en contexto y body |
| `resolve_warranty_claim` | authority | `workshop.authority == authority.key()` y `workshop.key() == claim.workshop` |
| `archive_motorcycle` | owner | `motorcycle.owner == owner.key()` |

Evidencia: R1, R2, R3, R6 y R10 rechazan firmantes ajenos o cuentas inconsistentes.

## 2. Seeds, bumps y sustitución de cuentas

Todas las cuentas se validan con `seeds = [...]` y `bump = account.bump` en el contexto, no solo con direcciones calculadas por el cliente. Las relaciones se comprueban además con constraints:

- `service_record.motorcycle == motorcycle.key()`
- `service_record.workshop == workshop.key()`
- `warranty_claim.service_record == service_record.key()`
- `warranty_claim.motorcycle == motorcycle.key()`
- `warranty_claim.workshop == workshop.key()`

El `record_id` y el `claim_id` son secuenciales y forman parte de la seed, de modo que no puede elegirse una PDA arbitraria para reutilizar un registro ajeno. R5 y R10 cubren servicio inexistente y seed incorrecta.

## 3. Doble creación

`init` con seeds canónicos impide crear dos veces la misma moto, taller, servicio o reclamación. El id secuencial se exige con `record_id == motorcycle.service_count + 1` y `claim_id == record.claim_count + 1`. `initialize` solo puede ejecutarse una vez (cuenta `Protocol` singleton). La inicialización repetida se comprueba en `scripts/devnet/init.ts`.

## 4. Estados inválidos y reglas de negocio

- `update_service_record` exige `status == Pending`.
- `finalize_service_record` exige `status == Pending` y taller activo.
- `create_warranty_claim` exige servicio `Finalized`, sin reclamación abierta, dentro de `WARRANTY_WINDOW_SECONDS` y moto activa.
- `resolve_warranty_claim` exige `status == Open`.
- `archive_motorcycle` exige `active`, `open_claims == 0` y `pending_services == 0`.

Evidencia: R4 (finalizado inmutable), R7 (reclamación abierta), R8 (servicio pendiente).

## 5. Aritmética y desbordamiento

Todos los contadores usan `checked_add`/`checked_sub` y devuelven `ArithmeticOverflow`. Las restas de contadores están protegidas por las comprobaciones de estado previas. El mileage se limita a `MAX_MILEAGE = 10_000_000` y no puede decrecer (R9). `now.saturating_sub(record.updated_at)` evita underflow en la ventana de garantía.

## 6. Longitud de strings y espacio de cuentas

Las cuentas usan `#[derive(InitSpace)]` con `#[max_len]` por campo. Anchor 0.32 no admite `#[max_len]` en argumentos de instrucción, por lo que se añadió `require_len()` con los mismos límites antes de escribir. Sin esta validación, un string más largo del previsto provocaría error de serialización o asignación insuficiente.

## 7. Cierre condicionado

No se usa `close` incondicional. `archive_motorcycle` cambia `active = false` y decrementa `active_motorcycles`, conservando la cuenta y su historial. Las precondiciones se comprueban en Rust antes de cualquier mutación; una operación rechazada no altera ninguna cuenta (R7, R8).

## 8. Privacidad

Solo se guarda un digest SHA-256 de 32 bytes del VIN normalizado con una sal pública. No hay nombres, direcciones postales, correos ni datos personales en las cuentas. La dirección de la wallet del propietario es pública por diseño en Solana.

**Limitación:** la sal es pública y está en el frontend; un atacante con un espacio de VIN pequeño podría intentar fuerza bruta offline. Para producción se recomienda sal secreta por moto gestionada off-chain o un commitment con aleatoriedad oculta. Documentado también en README.

## 9. Errores observados en las pruebas de rechazo

Los casos R1–R10 se ejecutaron como solicitudes on-chain controladas. Los mensajes exactos y el estado antes/después están en `evidence/TEST-RESULTS.md`. Ningún caso depende de desactivar un botón ni de un fallo de RPC: la transacción se construye y se envía, y es rechazada por el programa.

## 10. Superficie no auditada

- No se ha realizado auditoría externa ni fuzzing.
- No se han probado ataques de MEV, replay de transacciones ni congestión extrema del RPC.
- El programa no tiene autoridad de upgrade configurada explícitamente en este repositorio; antes de producción debe decidirse y documentarse (programa inmutable vs. upgrade authority controlada).
- Codama no se incorporó: el cliente se mantiene sincronizado copiando el IDL generado por Anchor con `scripts/sync-idl.mjs`. La combinación Anchor 0.32 + `@coral-xyz/anchor 0.32.1` ofrece IDL y tipos coherentes sin una capa adicional de generación; introducir Codama añadiría una dependencia más sin cubrir un requisito del track.

## 11. Conclusión operativa

Las comprobaciones ejecutadas cubren signers, seeds, pertenencia, estados, aritmética y cierre condicionado con 20 casos reales. Antes de considerar el programa apto para producción quedan pendientes la auditoría externa, la decisión sobre upgrade authority y el refuerzo del esquema de hash del VIN.
