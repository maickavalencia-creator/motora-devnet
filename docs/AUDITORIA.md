# Auditoría final de cumplimiento — MOTORA

Fecha: 2026-11-20. Se revisan los criterios del track y la lista de cumplimiento pública de WayLearn. Estado `VERIFICADO` significa que existe código/evidence ejecutada en este repositorio. El despliegue en Devnet se ejecutó y está verificado; el bloqueo previo por faucet se conserva como registro histórico en `evidence/DEVNET-BLOCKER.md`.

## Criterios del proyecto final

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| Programa funcional en Rust y Anchor | VERIFICADO | `anchor build` exitoso; IDL generado con 11 instrucciones y 5 cuentas |
| Cuentas relacionadas y PDAs | VERIFICADO | seeds documentadas en `docs/ARQUITECTURA.md`; constraints en `lib.rs` |
| Creación, lectura y modificación | VERIFICADO | V1–V8 y V11 en Devnet; métodos `*.all()` del cliente |
| Permisos y validación de autoridad | VERIFICADO | R1, R2, R3, R6, R10 (local y Devnet) |
| Baja o cierre condicionado | VERIFICADO | `archive_motorcycle` + V9, R7, R8 (local y Devnet) |
| Cliente TypeScript coherente con el IDL | VERIFICADO | `client/src/index.ts` importa `./idl/motora.json` generado; `npm run typecheck` limpio |
| Frontend funcional | VERIFICADO | `npm run --workspace motora-app build` exitoso, 6 secciones y wallet adapter |
| Wallet conectable | VERIFICADO (código) | `WalletMultiButton` + proveedores Phantom/Solflare/Ledger; requiere prueba manual con extensión |
| Operaciones requieren firma | VERIFICADO | `AnchorProvider` con wallet conectada; `.rpc()` en cada wrapper |
| Transacciones confirmadas y reflejadas en UI | VERIFICADO | clientes esperan `confirmed`; 11 transacciones válidas confirmadas en Devnet y enlazadas en la UI |
| Pruebas válidas y rechazo | VERIFICADO | 20/20 PASS locales y 21/21 PASS en Devnet |
| Programa desplegado en Devnet | **VERIFICADO** | Program ID `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU`; [firma de deploy](https://explorer.solana.com/tx/5c2fKaZMEcVVqJzM81QJVzAgL3C5H8jGaqgyMNDozb9HN5eY6dbn7uVAGDU2cfPAxrLJp5WyKubSYNtkzjjsd9uc?cluster=devnet); `evidence/devnet/DEPLOYMENT.md` |
| Al menos una transacción verificable | **VERIFICADO** | 12+ firmas reales con enlace a Explorer en `evidence/devnet/` |
| Aporte funcional implementado y documentado | VERIFICADO | garantías ligadas a historial, README §20 y docs |
| README reproducible | VERIFICADO | `README.md` con comandos y datos reales de Devnet |
| Evidencias verificables | VERIFICADO | local + Devnet con firmas, errores y lecturas on-chain |
| Demo 60–90 s | VERIFICADO | `DEMO.md` con guion timed contra el programa desplegado |

## Lista de cumplimiento de WayLearn (5 puntos)

1. **Flujo funcional programa ↔ frontend.** Implementado: todas las secciones envían transacciones reales y recargan cuentas tras confirmación. El programa está en Devnet y las operaciones equivalentes se ejecutaron y verificaron por script; la prueba manual con la wallet del evaluador sigue siendo opcional.
2. **Reglas críticas en el programa.** Implementado y probado: autoridad, pertenencia y cierre condicionado están en Rust (ver `docs/SEGURIDAD.md`).
3. **Firma, confirmación, actualización y errores.** Implementado: `explainError()` traduce los 20 códigos propios; la UI muestra el error y no actualiza estado en caso de rechazo. Los rechazos Devnet muestran los códigos exactos de Anchor.
4. **Reproducibilidad.** Implementado: `npm run setup`, `anchor build`, `anchor test`, scripts `devnet:*`, `npm run verify` y `npm run devnet:all`.
5. **Aporte identificable.** Garantías vinculadas a mantenimientos finalizados, con reglas y rechazos propios.

## Evidencia de rechazo — calidad

WayLearn exige que los rechazos se demuestren con solicitudes on-chain controladas, no con UI desactivada o fallo de RPC. En MOTORA:

- cada caso R usa `.rpc()` con el firmante equivocado o el estado preparado para fallar;
- se captura el error exacto de Anchor (código y mensaje);
- se vuelve a leer la cuenta para comprobar que no cambió (por ejemplo `model=...`, `description=...`, `pending=...`);
- los resultados están en `evidence/TEST-RESULTS.md` y en `evidence/devnet/INTEGRATION-RESULTS.md`, con 10/10 PASS en Devnet.

## IDL / cliente / Program ID

`npm run idl:sync` copia `target/idl/motora.json` a `idl/`, `client/src/idl/` y `app/src/idl/`. El script `deploy:devnet` reescribe `declare_id!`, `[programs.devnet]` y `NEXT_PUBLIC_PROGRAM_ID` con el mismo valor, y vuelve a compilar/sincronizar. El Program ID vigente es `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU`, coincide en `[programs.devnet]` y `[programs.localnet]` de `Anchor.toml`, `lib.rs`, las tres copias del IDL y `app/src/lib/config.ts`, y está verificado en Explorer. Mantener localnet y devnet con el mismo ID evita `DeclaredProgramIdMismatch` en `anchor test --skip-build`, porque el binario compilado contiene un único `declare_id!`.

## Acciones opcionales antes de un uso productivo

1. Decidir si se conserva o transfiere la upgrade authority del programa (actualmente el payer de Devnet).
2. Capturas reales de la app con wallet conectada; no se han fabricado capturas.
3. Auditoría externa y refuerzo del esquema de hash del VIN (sal pública, ver `docs/SEGURIDAD.md`).
