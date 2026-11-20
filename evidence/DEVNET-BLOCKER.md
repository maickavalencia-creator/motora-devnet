# Bloqueo real para el despliegue en Devnet (RESUELTO)

Fecha: 2026-11-19/20. Se conserva como registro histórico del bloqueo y de las vías evaluadas; **no se sustituyó por datos simulados**.

> **Resolución (2026-11-20):** el usuario financió manualmente el payer con 5 SOL en `faucet.solana.com` (autorizando GitHub con un repositorio público para pasar la validación `Too few public repos`) y se ejecutó `npm run devnet:all`. El programa quedó desplegado con el Program ID `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU` y 21 operaciones reales pasaron en Devnet. Ver [`devnet/DEPLOYMENT.md`](devnet/DEPLOYMENT.md) y [`INDEX.md`](INDEX.md).

## Wallet de desarrollo

- Ruta: `~/.config/solana/id.json` (clave privada nunca mostrada ni versionada).
- Pubkey: `DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH`
- Balance en Devnet al resolver el bloqueo: `5 SOL` (recibidos manualmente; balance actual ≈ `2.69 SOL` después del deploy y las pruebas).

## Intentos ejecutados (salida real)

1. `solana airdrop 2 --url devnet`
   ```
   Requesting airdrop of 2 SOL
   Error: airdrop request failed. This can happen when the rate limit is reached.
   ```
2. `solana airdrop 1 --url devnet`
   ```
   Requesting airdrop of 1 SOL
   Error: airdrop request failed. This can happen when the rate limit is reached.
   ```
3. Llamada directa por JSON-RPC a `https://api.devnet.solana.com` con `requestAirdrop` para 0.5, 1 y 2 SOL:
   ```json
   {"jsonrpc":"2.0","error":{"code":410,"message":"The RPC faucet is closed on this cluster. Request test SOL at https://faucet.solana.com"},"id":1}
   ```

La web `https://faucet.solana.com` indica explícitamente que los agentes de IA no deben usar ese faucet y recomienda métodos programáticos. El RPC público ya no entrega airdrops (`code 410`).

## Alternativa programática evaluada: faucet de prueba de trabajo

Se implementó el protocolo público del faucet PoW recomendado por la documentación de Solana (programa `PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL`) en `scripts/funding/pow-faucet.ts` y se consultaron en vivo sus 24 cuentas `spec`. Resultado real:

- Solo 2 faucets tienen saldo.
- El único con saldo suficiente para pagar su recompensa (`5NHijp3cQCTYpRJh9WayDHXzouvX7FQLqP8iNpJ946u7`) paga **100 lamports por reclamo** y tiene 0.9997 SOL.
- Cada reclamo crea una cuenta de recibo que exige **890 880 lamports** de renta, así que vaciar ese faucet costaría ≈8.9 SOL en rentas para ganar ≈1 SOL: económicamente inviable.
- El otro faucet con saldo (0.0009 SOL) no alcanza su recompensa de 0.019 SOL.

Además, la CLI oficial `devnet-pow 0.1.4` no compila con el toolchain actual por dependencias antiguas (`wasm-bindgen < 0.2.88`, `openssl-sys 0.9.88` y `time 0.3.21` incompatibles con Rust ≥1.80 / OpenSSL 4); se probaron Rust 1.89 y 1.83 con OpenSSL 3 (el intento con 1.79 se canceló al reiniciarse el entorno). El minero TypeScript propio sí funciona, pero no hay faucets rentables.

`faucet.solana.com` indica explícitamente que **los agentes de IA no deben usarlo**, por lo que este asistente no lo utiliza. Sin embargo, la configuración pública actual de la página permite a una persona, sin autenticarse, hasta **5 SOL por solicitud** y **2 solicitudes cada 8 horas** (`tier: {coveredHours: 8, allowedRequests: 2, maxAmountPerRequest: 5}`; importes disponibles: 0.5, 1, 2.5 y 5 SOL). Eso es suficiente para desbloquear el despliegue si el usuario realiza la solicitud manualmente con la dirección `DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH`. El formulario admite parámetros precargados:

`https://faucet.solana.com/?walletAddress=DgPTJUHviG1ZngsAvbgNqGUiTPgsxLdnvrPZsvWuHpzH&amount=5&cluster=devnet`

Conectar GitHub eleva el límite y, en la práctica, el faucet exigió autorizar GitHub a esta cuenta: primero rechazó la solicitud con `Too few public repos` y solo la aceptó después de crear un repositorio público. La solicitud también requiere completar un CAPTCHA de Cloudflare, otro motivo por el que debe hacerla una persona. Los faucets web de terceros requieren autenticación GitHub interactiva y tampoco se usan aquí.

## Qué se necesita para desbloquear

- Un wallet con ≥ 2.7 SOL en Devnet (renta del binario de 397 KB ≈ 2.06 SOL + margen).
- No es necesario compartir claves privadas: basta con que el usuario financie localmente el wallet apuntado por `MOTORA_KEYPAIR` (o configure esa variable con la ruta de su wallet), y luego ejecutar los comandos siguientes.

No se aceptarán credenciales de terceros ni se intentará financiar el wallet con métodos que vulneren las políticas de los faucets.

Una vez financiado:

```bash
npm run deploy:devnet
npm run devnet:init
npm run devnet:integration
npm run devnet:verify
```

Hasta que se ejecutaron esos comandos no existía Program ID de Devnet ni transacción verificable de este proyecto en la red. El resultado real está en [`devnet/DEPLOYMENT.md`](devnet/DEPLOYMENT.md).
