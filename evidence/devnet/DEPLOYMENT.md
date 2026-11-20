# MOTORA — despliegue real en Devnet

- Ejecutado: 2026-11-20 (UTC) mediante `npm run devnet:all`.
- Cluster: `devnet` · RPC: `https://api.devnet.solana.com`
- Wallet firmante (payer): `DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH` — [Explorer](https://explorer.solana.com/address/DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH?cluster=devnet)
- TypeScript / Anchor: `@coral-xyz/anchor 0.32.1`; Anchor CLI `0.32.2`; Solana CLI `2.3.0`.

## Identificadores

| Elemento | Valor | Verificación |
| --- | --- | --- |
| Program ID | `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU` | [Explorer](https://explorer.solana.com/address/EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU?cluster=devnet) |
| ProgramData | `5fsvgVSJa4J5vBFM7onUnpB5F1LJq1zkefAZ4gGE5sC9` | [Explorer](https://explorer.solana.com/address/5fsvgVSJa4J5vBFM7onUnpB5F1LJq1zkefAZ4gGE5sC9?cluster=devnet) |
| Upgrade authority | `DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH` | igual que el payer |
| Cuenta `Protocol` (PDA) | `8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9` | [Explorer](https://explorer.solana.com/address/8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9?cluster=devnet) |

`solana program show` confirma: owner `BPFLoaderUpgradeab1e11111111111111111111111`, `Data Length: 406080 bytes`, `Last Deployed In Slot: 524185698`.

## Transacciones

| Paso | Firma | Slot | Block time (UTC) | Fee | Explorer |
| --- | --- | --- | --- | --- | --- |
| Deploy del programa | `5c2fKaZMEcVVqJzM81QJVzAgL3C5H8jGaqgyMNDozb9HN5eY6dbn7uVAGDU2cfPAxrLJp5WyKubSYNtkzjjsd9uc` | 524185698 | 2026-11-20 01:24:00 | — | [Ver](https://explorer.solana.com/tx/5c2fKaZMEcVVqJzM81QJVzAgL3C5H8jGaqgyMNDozb9HN5eY6dbn7uVAGDU2cfPAxrLJp5WyKubSYNtkzjjsd9uc?cluster=devnet) |
| `initialize` | `4n7nvVUhQqgmb2zrRsM7EwGSoQhPB4UAH3vFs65x2CKsVU7YKnaTyBDdsySX9FjRqVMG2es1z4L1QMVfB988wueU` | 524185879 | 2026-11-20 01:24:43 | 5000 lamports | [Ver](https://explorer.solana.com/tx/4n7nvVUhQqgmb2zrRsM7EwGSoQhPB4UAH3vFs65x2CKsVU7YKnaTyBDdsySX9FjRqVMG2es1z4L1QMVfB988wueU?cluster=devnet) |

Ambas firmas se verificaron con `getTransaction` contra `api.devnet.solana.com`: `err: null`. Los logs de `initialize` incluyen `Program log: Instruction: Initialize` y la invocación al programa `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU`.

## Nota sobre el primer intento de `initialize`

Inmediatamente después del deploy, el primer envío devolvió `Simulation failed` por propagación del cluster (el programa aún no era visible para el RPC consultado). No se registró ninguna firma de ese intento. Al reintentar contra el mismo RPC, la transacción fue confirmada y es la que figura arriba. La cuenta `Protocol` existe y es legible, y un segundo `initialize` falla con `custom program error: 0x0` (`AccountAlreadyInUse`), registrado en [`INIT-RESULTS.md`](INIT-RESULTS.md).

## Financiación

El usuario financió manualmente el payer con **5 SOL** en `faucet.solana.com` tras verificar su cuenta de GitHub con un repositorio público. El script `deploy:devnet` comprobó `5 SOL >= 2.66 SOL` requeridos (renta dinámica calculada para el binario de 406 KB). No se compartieron claves privadas ni frases semilla.

## Resultados posteriores

- [`INIT-RESULTS.md`](INIT-RESULTS.md) — inicialización y prueba de no idempotencia.
- [`INTEGRATION-RESULTS.md`](INTEGRATION-RESULTS.md) — 21 operaciones: 11 válidas y 10 rechazos, con firmas y errores exactos de Anchor.
- [`VERIFY-ACCOUNTS.md`](VERIFY-ACCOUNTS.md) — lecturas on-chain y relaciones entre cuentas.
