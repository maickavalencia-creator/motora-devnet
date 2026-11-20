# Arquitectura técnica — MOTORA

## Visión general

```
Wallet (Phantom / Solflare / Ledger)
        │  firma transacción
        ▼
Next.js (app/)  ──► @motora/client (client/) ──► @coral-xyz/anchor ──► Devnet
        │                                                                │
        └── lee cuentas con program.account.*.all() ◄─────────────────────┘
                                                       Programa Anchor (Rust)
```

El frontend **no** contiene reglas de autoridad: construye instrucciones con las PDAs derivadas y envía la transacción. El programa es la única fuente de verdad.

## Decisiones de diseño

| Decisión | Motivo |
| --- | --- |
| VIN hasheado en cliente con sal pública | Evita almacenar el identificador físico en texto plano y permite unicidad global mediante la seed |
| PDA de moto por hash (no por owner) | El mismo VIN no puede registrarse dos veces con wallets distintas |
| `record_id` y `claim_id` secuenciales dentro de su padre | Ids deterministas, PDA estable y prevención de sustitución |
| Contadores en `Motorcycle` (`pending_services`, `open_claims`) | Hacer explícitas y baratas las precondiciones de archivado |
| Servicios finalizados inmutables | Historial auditable; la garantía apunta a un hecho cerrado |
| Archivado con flag en vez de `close` | Conservar el historial; el cierre condicionado se demuestra en Rust |
| Un `Protocol` singleton | Contadores globales y punto de inicialización único |
| Eventos en cada transición | Permitir indexación futura sin depender de `getProgramAccounts` |

## Modelo de datos

### Protocol
Autoridad y contadores globales. Se crea en `initialize`.

### Motorcycle
Dueño, hash del VIN, marca/modelo/año, odómetro, flags de actividad y tres contadores: total de servicios, servicios pendientes y reclamaciones abiertas.

### Workshop
Autoridad, nombre, estado activo, servicios completados y reclamaciones resueltas. Una PDA por autoridad.

### ServiceRecord
Relaciones `motorcycle`/`workshop`, autor que lo creó, kilometraje, tipo, descripción, estado (`Pending`/`Finalized`), `claim_count` y flag `open_claim`. `updated_at` marca también el inicio de la ventana de garantía.

### WarrantyClaim
Relaciones `motorcycle`/`service_record`/`workshop`, reclamante, id secuencial, descripción, estado (`Open`/`Resolved`), resolución y timestamps.

## Seeds

| Cuenta | Seeds | Notas |
| --- | --- | --- |
| Protocol | `["protocol"]` | Singleton |
| Motorcycle | `["motorcycle", identifier_hash]` | Unicidad global del VIN hasheado |
| Workshop | `["workshop", authority]` | Un taller por autoridad |
| ServiceRecord | `["service", motorcycle, record_id_le]` | Secuencia por moto |
| WarrantyClaim | `["warranty", service_record, claim_id_le]` | Secuencia por servicio |

Todas las derivaciones están centralizadas en `client/src/index.ts` (`derivePdas`, `deriveWorkshopPda`, `deriveServicePda`, `deriveClaimPda`) y se usan también en los scripts de integración. No hay strings de seed duplicados en el frontend.

## Flujo de una intervención y su garantía

```
register_motorcycle (owner)
   └─ create_service_record (taller, Pending)
        ├─ update_service_record (solo ese taller, mientras Pending)
        └─ finalize_service_record (solo ese taller)
              └─ create_warranty_claim (solo owner, <=90 días, sin claim abierta)
                    └─ resolve_warranty_claim (solo autoridad del taller responsable)

archive_motorcycle (solo owner)
   └─ exige open_claims == 0 && pending_services == 0
```

## Tamaños de cuenta

Se calculan con `InitSpace` de Anchor. Límites: marca/modelo 48 bytes, nombre de taller 64, tipo de servicio 64, descripción 256, descripción de reclamación 512, resolución 256. Los mismos límites se aplican a argumentos con `require_len()`.

## Versiones y compatibilidad

Anchor CLI 0.32.2 + anchor-lang 0.32.2 + Solana CLI 2.3.0 + Rust 1.89 son la combinación verificada. El lockfile se generó con el cargo de platform-tools para fijar dependencias compatibles con Rust 1.84 del toolchain BPF (ver `.cargo/config.toml`). Cambiar estas versiones sin regenerar el lockfile puede romper `anchor build`.

## Pruebas y evidencia

- Local: `anchor test --skip-build` → 20 casos, escritos en `evidence/TEST-RESULTS.md`.
- Devnet: `npm run devnet:integration` → mismos casos contra el programa desplegado, con firmas reales en `evidence/devnet/`.
- Verificación de cuentas: `npm run devnet:verify` → direcciones y relaciones leídas desde la cadena.
