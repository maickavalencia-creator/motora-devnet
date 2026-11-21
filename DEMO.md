# DEMO.md — MOTORA (60–90 segundos)

Guion de demostración contra el programa **ya desplegado en Devnet** (`EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU`). Las operaciones se realizan en la app real y cada paso deja una transacción confirmada visible en Solana Explorer. No se inventan firmas ni capturas.

## Preparación (antes de grabar)

1. `npm run --workspace motora-app dev` y abrir `http://localhost:3000`.
2. Wallet (Phantom/Solflare) en **Devnet** con algo de SOL.
3. Tener abierta la pestaña *Actividad* para ver las firmas.
4. Verificar el Program ID en `app/src/lib/config.ts` y tener abierto `evidence/devnet/DEPLOYMENT.md` por si hace falta mostrar la firma del deploy.

---

## 0:00–0:10 — Identidad y arquitectura

> «MOTORA es un historial de mantenimiento de motocicletas en Solana. El VIN nunca se guarda en texto plano: el cliente calcula SHA-256 y esa huella forma parte de la PDA de la moto. Todas las reglas están en Rust.»

Mostrar: cabecera, badge **DEVNET**, Program ID acortado y el panel *Estado del protocolo* leído desde la cadena.

## 0:10–0:25 — Registro y actualización

1. Pestaña **Mis motocicletas** → registrar (`Honda / CB500F / 2023 / 0 km`) con un VIN sintético.
2. Firmar en la wallet; esperar el aviso verde con la firma.
3. Cambiar modelo a `CB500F ABS` y kilometraje a `130`; firmar de nuevo.

> «Dos transacciones reales: creación y modificación. El odómetro solo puede avanzar; lo valida el programa.»

## 0:25–0:45 — Taller y mantenimiento

1. **Talleres** → registrar un taller con la misma wallet (o con una segunda wallet) y mostrar el PDA en Explorer.
2. **Mantenimiento** → crear intervención (150 km, «Cambio de aceite»), firmar.
3. Editar la intervención pendiente (160 km) y finalizarla.
4. Señalar el badge **FINALIZED**.

> «Una vez finalizado, el registro se vuelve inmutable: lo demostramos con el caso R4 de las pruebas.»

## 0:45–1:05 — Aporte propio: garantía vinculada

1. **Garantías** → abrir reclamación sobre el servicio finalizado (`claim_id=1`).
2. Mostrar en la tarjeta la relación moto → servicio → reclamante.
3. Si la wallet es la autoridad del taller: escribir resolución y pulsar **Resolver**.
4. Si no, cambiar a la wallet del taller y resolver desde ahí.

> «La garantía solo puede crearla el propietario, solo sobre un servicio finalizado y solo dentro de 90 días. La resuelve el taller responsable. No es una regla de la interfaz: está en `create_warranty_claim` y `resolve_warranty_claim`.»

## 1:05–1:15 — Rechazo controlado y cierre condicionado

> «Las pruebas R1–R10 envían transacciones deliberadamente inválidas y comprueban que el estado permanece intacto: wallet ajena, servicio finalizado, reclamación abierta, PDA incorrecta…»

Mostrar brevemente `evidence/devnet/INTEGRATION-RESULTS.md` y la fila **R7 — OpenClaimsExist**, con su firma y el error exacto de Anchor.

Luego archivar una moto **sin** pendientes y mostrar el badge **ARCHIVADA** con el historial todavía legible.

## 1:15–1:25 — Verificación

1. Pestaña **Actividad**: abrir el enlace de una firma en Solana Explorer (Devnet).
2. Mostrar la cuenta `Protocol` en Explorer y los contadores actualizados.

> «Cada cifra del dashboard se lee de cuentas on-chain. El enlace de actividad permite verificar la transacción sin confiar en la interfaz.»

## 1:25–1:30 — Cierre

> «MOTORA: historial verificable, garantías ligadas al mantenimiento y cierre condicionado, con permisos aplicados dentro del programa. Repositorio, IDL, cliente, pruebas y evidencias están en `motora-devnet/`.»

---

## Notas para la grabación

- Usa VIN sintéticos (`MOTORA-DEMO-…`); nunca datos personales reales.
- No muestres frases semilla ni archivos de keypair.
- Si una transacción tarda, espera el estado `confirmed` antes de seguir; la app recarga sola.
- La resolución de garantía solo aparece habilitada para la wallet autoridad del taller; eso es intencionado y también se prueba en las pruebas automatizadas.
