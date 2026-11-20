# MOTORA — verificación de cuentas en Devnet

- Generado: 2026-11-20T01:25:48.338Z
- RPC: https://api.devnet.solana.com
- Cluster: devnet
- Program ID: EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU — https://explorer.solana.com/address/EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU?cluster=devnet
- Wallet de firma (payer): DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH — https://explorer.solana.com/address/DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH?cluster=devnet
- Versión del cluster: {"feature-set":1591744305,"solana-core":"4.5.0-beta.0"}

| ID | Caso | Objetivo | Esperado | Obtenido | Estado | Firma |
| --- | --- | --- | --- | --- | --- | --- |

## Detalle

## Lecturas on-chain

- Cuenta Protocol: https://explorer.solana.com/address/8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9?cluster=devnet
- Owner on-chain de la cuenta: EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU (¿programa? true)
- Datos: {"authority":"DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH","totalMotorcycles":"3","activeMotorcycles":"2","totalWorkshops":"2","totalServiceRecords":"2","totalWarrantyClaims":"2"}

## Cuentas por tipo

| Tipo | Cantidad | Direcciones (Explorer) |
| --- | --- | --- |
| Motorcycle | 3 | https://explorer.solana.com/address/C8DgeCMABgHwqGj2348FC2cbf7eX8FETDrqu41cG6mRD?cluster=devnet, https://explorer.solana.com/address/FAvvUQGNBVU3HJm22Va35jg8GGWTJ7PN3g8XCzawvEmx?cluster=devnet, https://explorer.solana.com/address/Fixya5iAs44FxmWXcYRZqU72ipGk6oY8Jhng3XayFqk8?cluster=devnet |
| Workshop | 2 | https://explorer.solana.com/address/6XdkcV1rQstk3f9SDezzUzbQZ93rZDMnXDwLojT1xZbf?cluster=devnet, https://explorer.solana.com/address/EQKVS7oRw4Fp4LnaMNG9G2k3xswmm7uXRJTQbr3bJoai?cluster=devnet |
| ServiceRecord | 2 | https://explorer.solana.com/address/5CSWzMyrENR9PdLZ94WfKf4bKXo7nuZ5uiXY3Aq1gkgK?cluster=devnet, https://explorer.solana.com/address/DWYUJ8TS767PwLWdM7zGtwfxpZmpGabxVLQ44XKY4YLC?cluster=devnet |
| WarrantyClaim | 2 | https://explorer.solana.com/address/5yrzYrYA2MfgHFg6RVB5wx9gDsomJP3Kvctc4ceauhrY?cluster=devnet, https://explorer.solana.com/address/FUYdmCvcDHBaB5iUtogQa8GpVsfuqJjmXQKKbRcsjEwF?cluster=devnet |

## Detalle de relaciones

- Servicio 5CSWzMyrENR9PdLZ94WfKf4bKXo7nuZ5uiXY3Aq1gkgK → moto C8DgeCMABgHwqGj2348FC2cbf7eX8FETDrqu41cG6mRD → taller EQKVS7oRw4Fp4LnaMNG9G2k3xswmm7uXRJTQbr3bJoai (estado finalized, claim_count 2)
  - Garantía 5yrzYrYA2MfgHFg6RVB5wx9gDsomJP3Kvctc4ceauhrY → reclamante 9U4dMFRq3M5tdCMPwm6Ay6kZkRiy4snbKjAgtxVs9BCc (estado resolved)
  - Garantía FUYdmCvcDHBaB5iUtogQa8GpVsfuqJjmXQKKbRcsjEwF → reclamante 9U4dMFRq3M5tdCMPwm6Ay6kZkRiy4snbKjAgtxVs9BCc (estado resolved)
- Servicio DWYUJ8TS767PwLWdM7zGtwfxpZmpGabxVLQ44XKY4YLC → moto FAvvUQGNBVU3HJm22Va35jg8GGWTJ7PN3g8XCzawvEmx → taller EQKVS7oRw4Fp4LnaMNG9G2k3xswmm7uXRJTQbr3bJoai (estado pending, claim_count 0)

