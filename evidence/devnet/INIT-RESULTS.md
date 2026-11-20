# MOTORA — inicialización en Devnet

- Generado: 2026-11-20T01:24:53.322Z
- RPC: https://api.devnet.solana.com
- Cluster: devnet
- Program ID: EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU — https://explorer.solana.com/address/EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU?cluster=devnet
- Wallet de firma (payer): DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH — https://explorer.solana.com/address/DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH?cluster=devnet
- Versión del cluster: {"feature-set":1591744305,"solana-core":"4.5.0-beta.0"}

| ID | Caso | Objetivo | Esperado | Obtenido | Estado | Firma |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | Inicialización del protocolo | Crear la cuenta singleton Protocol y verificar sus contadores iniciales | Cuenta creada con todos los contadores en cero | motorcycles=0, workshops=0, services=0, claims=0 | PASS | [4n7nvVUh…988wueU](https://explorer.solana.com/tx/4n7nvVUhQqgmb2zrRsM7EwGSoQhPB4UAH3vFs65x2CKsVU7YKnaTyBDdsySX9FjRqVMG2es1z4L1QMVfB988wueU?cluster=devnet) |
| I0 | Protocolo ya inicializado | Verificar que initialize no se ejecuta dos veces sobre la misma PDA | La cuenta se lee correctamente y una segunda inicialización falla | Cuenta existente; segunda inicialización: custom program error: 0x0 \| 0x0 \| Simulation failed.  | PASS | — |

## Detalle

### I1 — Inicialización del protocolo (PASS)

- **Objetivo:** Crear la cuenta singleton Protocol y verificar sus contadores iniciales
- **Preparación:** No existía cuenta Protocol en Devnet antes de esta transacción
- **Operación:** `initialize()` firmado por el wallet de despliegue
- **Resultado esperado:** Cuenta creada con todos los contadores en cero
- **Resultado obtenido:** motorcycles=0, workshops=0, services=0, claims=0
- **Estado:** PASS
- **Firma verificable:** https://explorer.solana.com/tx/4n7nvVUhQqgmb2zrRsM7EwGSoQhPB4UAH3vFs65x2CKsVU7YKnaTyBDdsySX9FjRqVMG2es1z4L1QMVfB988wueU?cluster=devnet
- **Nota:** la cuenta se creó en el slot 524185879 (2026-11-20 01:24:43 UTC); el detalle del deploy está en [`DEPLOYMENT.md`](DEPLOYMENT.md).

### I0 — Protocolo ya inicializado (PASS)

- **Objetivo:** Verificar que initialize no se ejecuta dos veces sobre la misma PDA
- **Preparación:** La cuenta Protocol ya existe en 8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9
- **Operación:** fetchNullable + initialize controlado (debe ser rechazado por Anchor)
- **Resultado esperado:** La cuenta se lee correctamente y una segunda inicialización falla
- **Resultado obtenido:** Cuenta existente; segunda inicialización: custom program error: 0x0 | 0x0 | Simulation failed. 
- **Estado:** PASS

Cuenta Protocol: https://explorer.solana.com/address/8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9?cluster=devnet
