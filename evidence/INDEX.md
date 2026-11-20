# Evidencias MOTORA

Este índice distingue entre evidencia **ya ejecutada** y **no ejecutada**. No se han creado capturas ni firmas artificiales. Todas las firmas y enlaces de Explorer son transacciones reales confirmadas.

## 1. Devnet — ejecutado (20 de noviembre de 2026, UTC)

Despliegue real completado el **2026-11-20** con fondos aportados manualmente por el usuario en `faucet.solana.com` (5 SOL). Detalle completo en [`devnet/DEPLOYMENT.md`](devnet/DEPLOYMENT.md).

- **Program ID:** `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU` — [Explorer](https://explorer.solana.com/address/EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU?cluster=devnet)
- **Payer:** `DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH` — [Explorer](https://explorer.solana.com/address/DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH?cluster=devnet)
- **Deploy:** [firma](https://explorer.solana.com/tx/5c2fKaZMEcVVqJzM81QJVzAgL3C5H8jGaqgyMNDozb9HN5eY6dbn7uVAGDU2cfPAxrLJp5WyKubSYNtkzjjsd9uc?cluster=devnet) · slot 524185698
- **`initialize`:** [firma](https://explorer.solana.com/tx/4n7nvVUhQqgmb2zrRsM7EwGSoQhPB4UAH3vFs65x2CKsVU7YKnaTyBDdsySX9FjRqVMG2es1z4L1QMVfB988wueU?cluster=devnet) · slot 524185879

| Archivo | Contenido | Estado |
| --- | --- | --- |
| [`devnet/DEPLOYMENT.md`](devnet/DEPLOYMENT.md) | Program ID, ProgramData, authority, firmas de deploy/init, slots, fees y verificación por `getTransaction`. | **COMPLETADO** |
| [`devnet/INIT-RESULTS.md`](devnet/INIT-RESULTS.md) | I1 creación del `Protocol` y I0 rechazo de una segunda inicialización (`AccountAlreadyInUse`, 0x0). | **2 PASS / 0 FAIL** |
| [`devnet/INTEGRATION-RESULTS.md`](devnet/INTEGRATION-RESULTS.md) | V1–V10 + V11 y R1–R10: 11 operaciones válidas y 10 rechazos con error exacto de Anchor, estado inalterado y firmas verificables. | **21 PASS / 0 FAIL** |
| [`devnet/VERIFY-ACCOUNTS.md`](devnet/VERIFY-ACCOUNTS.md) | Lecturas on-chain: `Protocol`, 3 motocicletas, 2 talleres, 2 servicios y 2 garantías con sus relaciones. | **COMPLETADO** |
| [`devnet/deploy.log`](devnet/deploy.log) | Salida cruda del deploy con Program ID y firma. | **COMPLETADO** |

Los rechazos se probaron con solicitudes on-chain controladas al programa desplegado: las transacciones se construyeron y enviaron, y el programa las rechazó con `NotMotorcycleOwner`, `UnauthorizedWorkshop`, `AccountMismatch`, `ServiceFinalized`, `AccountNotInitialized`, `OpenClaimsExist`, `PendingServicesExist`, `InvalidMileage`, etc. No se usaron botones desactivados ni fallos de RPC como prueba.

## 2. Validador local — ejecutado

| Archivo | Contenido | Estado |
| --- | --- | --- |
| [`TEST-RESULTS.md`](TEST-RESULTS.md) | 20 casos: V1–V10 válidos y R1–R10 de rechazo. Incluye objetivo, preparación, operación, esperado, obtenido, error exacto de Anchor y PASS/FAIL. Generado por `anchor test --skip-build`. | **20 PASS / 0 FAIL** |

## 3. Reproducción

```bash
npm run setup
npm install --legacy-peer-deps
npm run verify                 # typecheck + 20 pruebas locales + build del frontend
npm run devnet:all             # deploy → init → integration → verify (requiere payer financiado)
```

El bloqueo previo por falta de SOL y las vías evaluadas quedan documentados en [`DEVNET-BLOCKER.md`](DEVNET-BLOCKER.md) como registro histórico; ya está resuelto.

## 4. Capturas de pantalla

No se incluyen capturas porque no se han obtenido de una ejecución real con wallet conectada en este entorno. Se prefiere dejar el hueco vacío y documentado antes que fabricarlas. La demo (`DEMO.md`) describe exactamente qué capturar.
