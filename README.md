# MOTORA

**Historial de mantenimiento verificable de motocicletas sobre Solana**

MOTORA es un programa Anchor **desplegado y verificado en Solana Devnet** que registra motocicletas, talleres, intervenciones mecánicas y reclamaciones de garantía como cuentas on-chain relacionadas. Cada cambio relevante pasa por el programa: la interfaz web solo construye y firma transacciones; no decide permisos.

- **Program ID (Devnet):** `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU` — [Explorer](https://explorer.solana.com/address/EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU?cluster=devnet)
- **Deploy:** [firma](https://explorer.solana.com/tx/5c2fKaZMEcVVqJzM81QJVzAgL3C5H8jGaqgyMNDozb9HN5eY6dbn7uVAGDU2cfPAxrLJp5WyKubSYNtkzjjsd9uc?cluster=devnet) · **21/21 operaciones Devnet PASS** (11 válidas + 10 rechazos) · [evidencia](evidence/devnet/INTEGRATION-RESULTS.md)

---

## 1. Problema que resuelve

El historial de mantenimiento de una motocicleta suele vivir en papeles, PDFs o bases de datos privadas. Eso dificulta:

- demostrar qué intervenciones se hicieron realmente y cuándo;
- probar que una garantía corresponde a un mantenimiento finalizado;
- impedir que un tercero modifique registros ajenos;
- archivar un vehículo sin dejar reclamaciones o servicios pendientes.

MOTORA traslada esas reglas a un programa de Solana: las cuentas son públicas, verificables y están ligadas por PDAs deterministas.

## 2. Propuesta de valor

- Historial **append-only** de intervenciones: una vez finalizado, un servicio es inmutable.
- Garantías **vinculadas al historial**: una reclamación solo puede abrirse sobre un servicio finalizado, dentro de 90 días, y solo por el propietario.
- **Cierre condicionado**: archivar una moto exige cero reclamaciones abiertas y cero servicios pendientes; la cuenta se conserva para auditoría.
- Permisos comprobados **en Rust**, no en el frontend.
- Cliente TypeScript generado a partir del IDL real y frontend Next.js con Solana Wallet Adapter.

## 3. Ruta elegida

**Proyecto propio** (no se reproduce el registro de ventas del bootcamp). La equivalencia con los casos oficiales es:

| Caso oficial | Equivalente en MOTORA |
| --- | --- |
| Registro (cliente) | `Motorcycle` (Propietario + VIN hasheado) |
| Cliente | `Workshop` (autoridad del taller) |
| Venta | `ServiceRecord` (intervención creada y contadores actualizados) |
| Devolución / cierre | `archive_motorcycle` con precondiciones |
| Regla funcional adicional | `WarrantyClaim` ligada a servicios finalizados |

## 4. Arquitectura

```
programs/motora/src/lib.rs   Programa Anchor: 11 instrucciones, 5 cuentas, eventos y errores
tests/motora.ts              20 casos reales (10 válidos + 10 rechazo) sobre solana-test-validator
client/src/index.ts          Cliente TS: PDAs, instrucciones, lecturas, traducción de errores
idl/motora.json              IDL generado por `anchor build` (copia canónica)
app/                         Next.js 15 + React 19 + Wallet Adapter + Tailwind
scripts/                     Setup, deploy, init, integración, verificación y sincronía de IDL
evidence/                    Resultados reales local y Devnet
docs/                        Arquitectura, seguridad y auditoría
```

Flujo: la wallet conectada firma la instrucción → Anchor valida signers, seeds y reglas → el programa actualiza las cuentas y emite eventos → el cliente espera confirmación `confirmed` → la UI recarga y muestra el enlace a Solana Explorer.

## 5. Tecnologías

| Capa | Versión |
| --- | --- |
| Anchor CLI / anchor-lang | 0.32.2 |
| Solana CLI / Agave | 2.3.0 |
| Rust (host / platform tools) | 1.89.0 / 1.84.1 (BPF) |
| Node.js | 22.x |
| @coral-xyz/anchor | 0.32.1 |
| Next.js / React | 15 / 19 |
| Solana Wallet Adapter | 0.15.x / 0.9.x |

Se eligió Anchor 0.32 porque estabiliza la generación de IDL en Rust estable y es la combinación verificada con Solana CLI 2.3.x. El cliente npm `@coral-xyz/anchor` se mantiene en 0.32.1 (última publicación de ese paquete).

## 6. Estructura del repositorio

Ver el árbol en la sección 4. No hay carpetas duplicadas: el IDL canónico vive en `idl/`, y `scripts/sync-idl.mjs` copia el artefacto de `target/idl/` a `idl/`, `client/src/idl/` y `app/src/idl/`.

## 7. Modelo de cuentas

| Cuenta | Campos clave |
| --- | --- |
| `Protocol` | authority, total_motorcycles, active_motorcycles, total_workshops, total_service_records, total_warranty_claims, bump |
| `Motorcycle` | owner, identifier_hash `[u8;32]`, brand, model, year, current_mileage, active, created_at, service_count, pending_services, open_claims, bump |
| `Workshop` | authority, name, active, created_at, services_completed, claims_resolved, bump |
| `ServiceRecord` | motorcycle, workshop, authority, record_id, mileage, service_type, description, status, claim_count, open_claim, created_at, updated_at, bump |
| `WarrantyClaim` | motorcycle, service_record, claimant, workshop, claim_id, description, status, resolution, created_at, resolved_at, bump |

Tamaños calculados con `#[derive(InitSpace)]` y `#[max_len(...)]` en las cuentas. Los límites de los argumentos de texto se validan explícitamente con `require_len()` porque Anchor 0.32 no admite `#[max_len]` en argumentos de instrucción.

## 8. PDAs y seeds

| Cuenta | Seeds |
| --- | --- |
| Protocol | `[b"protocol"]` |
| Motorcycle | `[b"motorcycle", identifier_hash]` |
| Workshop | `[b"workshop", authority]` |
| ServiceRecord | `[b"service", motorcycle, record_id_le]` |
| WarrantyClaim | `[b"warranty", service_record, claim_id_le]` |

El VIN **nunca** se almacena en texto plano. El cliente normaliza el VIN (`trim` + mayúsculas), le añade una sal pública (`NEXT_PUBLIC_VIN_SALT`) y calcula SHA-256. Ese digest es `identifier_hash` y forma parte de la seed, por lo que un mismo VIN no puede registrarse dos veces con distinto propietario.

## 9. Instrucciones

1. `initialize` — crea el `Protocol` singleton.
2. `register_motorcycle` — alta de moto y contadores globales.
3. `update_motorcycle` — marca/modelo/odómetro (nunca decreciente).
4. `register_workshop` — alta de taller (una PDA por autoridad).
5. `set_workshop_status` — activar/desactivar por su autoridad.
6. `create_service_record` — intervención pendiente con id secuencial.
7. `update_service_record` — edición solo si está pendiente y por su taller.
8. `finalize_service_record` — inmutabiliza el servicio y actualiza odómetro/contadores.
9. `create_warranty_claim` — garantía ligada a servicio finalizado.
10. `resolve_warranty_claim` — resolución por el taller responsable.
11. `archive_motorcycle` — archivado condicionado.

## 10. Reglas de negocio (implementadas en Rust)

- Una reclamación exige servicio `Finalized`, dentro de los 90 días posteriores a la finalización.
- Solo el `owner` de la moto puede abrir una reclamación.
- Solo la autoridad del taller responsable puede resolverla.
- Un servicio finalizado no se puede modificar.
- No se puede archivar con `open_claims > 0` ni con `pending_services > 0`.
- Un taller no puede modificar servicios de otro taller.
- Las cuentas pasadas deben pertenecer a la misma relación (seeds + constraints).
- Un servicio solo admite una reclamación abierta a la vez.
- Kilometraje `<= 10_000_000` y nunca menor al actual.
- Todos los contadores usan `checked_add` / `checked_sub`.

## 11. Seguridad y permisos

Ver [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md). Resumen: `Signer` en cada autoridad, `seeds`/`bump` verificados en cada contexto, `constraint` de propiedad/pertenencia, validación de estado antes de mutar, errores personalizados y sin `close` incondicional. El archivado mantiene las cuentas para no perder historial.

## 12. Configuración local

```bash
npm run setup          # Rust 1.89, Solana 2.3.0, Anchor 0.32.2, Node 22, npm install
npm run idl:sync       # sincroniza IDL tras cualquier cambio del programa
anchor build
anchor test            # levanta solana-test-validator y ejecuta 20 pruebas
```

El wallet de desarrollo se crea en `~/.config/solana/id.json` si no existe. **Nunca** se imprime ni se versiona una clave privada.

## 13. Instalación de dependencias

```bash
npm install --legacy-peer-deps
```

## 14. Ejecución del programa

```bash
anchor build
anchor localnet        # validador local con el programa desplegado (opcional)
npm run test:program   # contra el validador que levante `anchor test`
```

## 15. Ejecución del frontend

```bash
npm run --workspace motora-app dev
```

Abre `http://localhost:3000`, conecta una wallet (Phantom, Solflare o Ledger) y cambia la red de la wallet a **Devnet**. Variables opcionales:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<program id real>
NEXT_PUBLIC_VIN_SALT=motora-v1
```

## 16. Ejecución de pruebas

```bash
anchor test --skip-build    # 20 casos: V1–V10 y R1–R10
npm run verify              # typecheck + pruebas + build del frontend
```

Los resultados reales se escriben en [`evidence/TEST-RESULTS.md`](evidence/TEST-RESULTS.md) con objetivo, preparación, operación, esperado, obtenido y estado por caso.

## 17. Despliegue en Devnet — EJECUTADO

Desplegado el **2026-11-20** con 5 SOL obtenidos manualmente por el usuario en `faucet.solana.com`. Registro completo: [`evidence/devnet/DEPLOYMENT.md`](evidence/devnet/DEPLOYMENT.md).

| Dato | Valor |
| --- | --- |
| Program ID | `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU` |
| Firma de deploy | [`5c2fKaZ…d9uc`](https://explorer.solana.com/tx/5c2fKaZMEcVVqJzM81QJVzAgL3C5H8jGaqgyMNDozb9HN5eY6dbn7uVAGDU2cfPAxrLJp5WyKubSYNtkzjjsd9uc?cluster=devnet) (slot 524185698) |
| Firma de `initialize` | [`4n7nvVU…wueU`](https://explorer.solana.com/tx/4n7nvVUhQqgmb2zrRsM7EwGSoQhPB4UAH3vFs65x2CKsVU7YKnaTyBDdsySX9FjRqVMG2es1z4L1QMVfB988wueU?cluster=devnet) (slot 524185879) |
| Cuenta `Protocol` | [`8CvchS2…ip9`](https://explorer.solana.com/address/8CvchS2i8LfdYEuDvLUsrKXGhB1PPvMePw2YE9fukip9?cluster=devnet) |
| Resultado | 2 init + 11 válidos + 10 rechazos = **23/23 PASS** en Devnet |

Para reproducirlo desde cero con otro payer financiado (≈2.7 SOL: renta del binario + margen):

```bash
export MOTORA_KEYPAIR=/ruta/a/tu/wallet.json   # nunca compartas esta clave
solana balance --url https://api.devnet.solana.com
npm run devnet:all    # deploy → init → integration → verify, sin simulaciones
```

El airdrop por RPC está cerrado (`code 410`); una persona puede obtener SOL en `https://faucet.solana.com`. El bloqueo original y las alternativas evaluadas quedan documentados en [`evidence/DEVNET-BLOCKER.md`](evidence/DEVNET-BLOCKER.md). Si no hay fondos, los scripts fallan explícitamente: **no se simula ningún despliegue ni se inventan firmas**.

## 18. Program ID

El Program ID **real de Devnet** es `EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU` y se escribe automáticamente en:

- `Anchor.toml` → `[programs.devnet] motora` y `[programs.localnet] motora` (mismo ID para que el validador local no produzca `DeclaredProgramIdMismatch`)
- `programs/motora/src/lib.rs` → `declare_id!`
- `app/src/lib/config.ts` → `NEXT_PUBLIC_PROGRAM_ID`
- `target/idl/motora.json` y sus copias

Consulta siempre el valor vigente en `target/idl/motora.json` (campo `address`). Los scripts `devnet:*` usan ese mismo valor, por lo que no puede haber desincronización silenciosa.

## 19. Transacciones verificables

Las firmas reales, errores y enlaces de Explorer generados por las ejecuciones están en:

- [`evidence/devnet/DEPLOYMENT.md`](evidence/devnet/DEPLOYMENT.md) — deploy, init, slots y verificación `getTransaction`.
- [`evidence/devnet/INIT-RESULTS.md`](evidence/devnet/INIT-RESULTS.md)
- [`evidence/devnet/INTEGRATION-RESULTS.md`](evidence/devnet/INTEGRATION-RESULTS.md)
- [`evidence/devnet/VERIFY-ACCOUNTS.md`](evidence/devnet/VERIFY-ACCOUNTS.md)

Cada caso válido lleva su enlace a Explorer y cada rechazo registra el código/mensaje exacto de Anchor y la comprobación de que la cuenta no cambió. No se sustituyeron por datos de prueba.

## 20. Aporte funcional propio

**Garantías vinculadas a historial verificado.** A diferencia de un simple registro de ventas, MOTORA exige que la garantía apunte a una intervención finalizada, inmutabiliza esa intervención, restringe quién puede abrirla y quién puede resolverla, impide reclamaciones duplicadas abiertas y bloquea el archivado mientras haya garantías o servicios pendientes. Esto se demuestra con V6→V7→V8 y R4→R7 en las pruebas.

## 21. Limitaciones conocidas

- La sal del hash del VIN es pública: el hash evita guardar el VIN en texto plano, pero no resiste un ataque de fuerza bruta si el espacio de VIN es pequeño. En producción se recomendaría una sal secreta off-chain o un esquema de compromiso con sal aleatoria por moto.
- Las cuentas/archivos no se cierran: el historial se conserva; el "cierre" es un flag `active=false` condicionado.
- No hay transferencia de propiedad; un cambio de dueño requiere un nuevo registro.
- Los contadores globales son escritura caliente en escenarios de alta concurrencia.
- Las lecturas `all()` del cliente son adecuadas para Devnet/demo; en producción conviene indexar con eventos/RPC deducido.
- No se almacenan datos personales reales en la evidencia (VIN sintéticos).

## 22. Demo

Guion de 60–90 segundos: [`DEMO.md`](DEMO.md).
