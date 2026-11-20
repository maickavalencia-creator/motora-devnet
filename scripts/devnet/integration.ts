/**
 * Reproducible Devnet integration run for MOTORA.
 * Executes the 10 valid cases and the 10 controlled rejection cases against the
 * real deployed program. Every signature/error is recorded verbatim.
 */
import {
  Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  addressLink, captureError, connection, ensureBalance, hashVin, ok, fail,
  payer, pda, program, steps, vin, writeEvidence, type Step,
} from "./common";

type Fields = Omit<Step, "status">;
const record = (fields: Fields, pass: boolean) => (pass ? ok(fields) : fail(fields));
const status = (value: any) => Object.keys(value || {})[0] || "unknown";

async function fund(address: PublicKey, sol = 0.06) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: address,
      lamports: Math.round(sol * 1e9),
    }),
  );
  return sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
}

async function main() {
  const balance = await ensureBalance(0.4);
  console.log(`Payer balance: ${balance.toFixed(4)} SOL`);

  const owner = Keypair.generate();
  const other = Keypair.generate();
  const shopA = Keypair.generate();
  const shopB = Keypair.generate();
  for (const actor of [owner, other, shopA, shopB]) {
    await fund(actor.publicKey);
  }

  const protocol = pda.protocol();
  if (!(await program.account.protocol.fetchNullable(protocol))) {
    await program.methods.initialize().accounts({ authority: payer.publicKey }).rpc();
  }

  const h1 = hashVin(vin("BIKE-1"));
  const h2 = hashVin(vin("BIKE-2"));
  const h3 = hashVin(vin("BIKE-3"));
  const bike1 = pda.motorcycle(h1);
  const bike2 = pda.motorcycle(h2);
  const bike3 = pda.motorcycle(h3);
  const wsA = pda.workshop(shopA.publicKey);
  const wsB = pda.workshop(shopB.publicKey);
  const svc1 = pda.service(bike1, 1);
  const claim1 = pda.claim(svc1, 1);
  const claim2 = pda.claim(svc1, 2);

  // ---------------------------------------------------------------- valid ---
  let signature: string = await program.methods
    .registerMotorcycle(Array.from(h1), "Honda", "CB500F", 2023, new BN(100))
    .accounts({ owner: owner.publicKey })
    .signers([owner])
    .rpc();
  let bike: any = await program.account.motorcycle.fetch(bike1);
  record({
    id: "V1", caseName: "Registrar y leer motocicleta",
    objective: "Registrar una motocicleta y verificar su cuenta en la cadena",
    setup: `VIN hasheado localmente; PDA ${bike1.toBase58()}`,
    operation: "register_motorcycle + account fetch",
    expected: "owner coincide, VIN hash almacenado, active=true",
    obtained: `owner=${bike.owner.toBase58()}, brand=${bike.brand}, mileage=${bike.currentMileage}, active=${bike.active}`,
    signature,
  }, bike.owner.equals(owner.publicKey) && bike.active);

  signature = await program.methods
    .updateMotorcycle("Honda", "CB500F ABS", new BN(130))
    .accounts({ motorcycle: bike1, owner: owner.publicKey })
    .signers([owner])
    .rpc();
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "V2", caseName: "Actualizar motocicleta",
    objective: "Actualizar modelo y kilometraje sin reducir el odómetro",
    setup: "Motocicleta V1 con 100 km",
    operation: "update_motorcycle(model='CB500F ABS', mileage=130)",
    expected: "modelo actualizado y kilometraje 130",
    obtained: `model=${bike.model}, mileage=${bike.currentMileage}`,
    signature,
  }, bike.model === "CB500F ABS" && bike.currentMileage.toNumber() === 130);

  await program.methods.registerWorkshop("MOTORA Premium Service")
    .accounts({ authority: shopA.publicKey }).signers([shopA]).rpc();
  signature = await program.methods.registerWorkshop("Second Gear Workshop")
    .accounts({ authority: shopB.publicKey }).signers([shopB]).rpc();
  const ws: any = await program.account.workshop.fetch(wsA);
  record({
    id: "V3", caseName: "Registrar talleres",
    objective: "Registrar dos talleres independientes con PDA por autoridad",
    setup: "Dos autoridades de taller financiadas",
    operation: "register_workshop(name) para A y B",
    expected: "Ambas PDAs existen; taller A activo",
    obtained: `${ws.name}, authority=${ws.authority.toBase58()}, active=${ws.active}`,
    signature,
  }, ws.active && ws.authority.equals(shopA.publicKey));

  signature = await program.methods
    .createServiceRecord(new BN(1), new BN(150), "Oil change", "Full synthetic oil and filter")
    .accounts({ motorcycle: bike1, workshop: wsA, authority: shopA.publicKey })
    .signers([shopA]).rpc();
  let svc: any = await program.account.serviceRecord.fetch(svc1);
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "V4", caseName: "Crear intervención",
    objective: "Crear un mantenimiento pendiente ligado a moto y taller",
    setup: "Moto activa y taller A activo",
    operation: "create_service_record(record_id=1, mileage=150)",
    expected: "status=pending y motorcycle.pending_services=1",
    obtained: `status=${status(svc.status)}, pending=${bike.pendingServices}, workshop=${svc.workshop.toBase58()}`,
    signature,
  }, status(svc.status) === "pending" && bike.pendingServices.toNumber() === 1);

  signature = await program.methods
    .updateServiceRecord(new BN(160), "Oil change + filter", "Synthetic 10W40 and OEM filter")
    .accounts({ motorcycle: bike1, workshop: wsA, serviceRecord: svc1, authority: shopA.publicKey })
    .signers([shopA]).rpc();
  svc = await program.account.serviceRecord.fetch(svc1);
  record({
    id: "V5", caseName: "Modificar intervención pendiente",
    objective: "Editar un registro pendiente por su taller autor",
    setup: "Servicio 1 en estado pending",
    operation: "update_service_record(mileage=160, nueva descripción)",
    expected: "Datos actualizados en la cuenta",
    obtained: `mileage=${svc.mileage}, description=${svc.description}`,
    signature,
  }, svc.mileage.toNumber() === 160 && svc.description.includes("OEM"));

  signature = await program.methods.finalizeServiceRecord()
    .accounts({ motorcycle: bike1, workshop: wsA, serviceRecord: svc1, authority: shopA.publicKey })
    .signers([shopA]).rpc();
  svc = await program.account.serviceRecord.fetch(svc1);
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "V6", caseName: "Finalizar intervención",
    objective: "Finalizar el mantenimiento y actualizar contadores/odómetro",
    setup: "Servicio 1 pendiente con 160 km",
    operation: "finalize_service_record",
    expected: "status=finalized, pending=0, odómetro=160",
    obtained: `status=${status(svc.status)}, pending=${bike.pendingServices}, mileage=${bike.currentMileage}`,
    signature,
  }, status(svc.status) === "finalized" && bike.pendingServices.toNumber() === 0 && bike.currentMileage.toNumber() === 160);

  signature = await program.methods
    .createWarrantyClaim(new BN(1), "Engine noise returned after service")
    .accounts({ motorcycle: bike1, serviceRecord: svc1, claimant: owner.publicKey })
    .signers([owner]).rpc();
  let claim: any = await program.account.warrantyClaim.fetch(claim1);
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "V7", caseName: "Crear reclamación de garantía",
    objective: "Abrir una garantía vinculada a un servicio finalizado, solo por el propietario",
    setup: "Servicio 1 finalizado dentro de la ventana de 90 días",
    operation: "create_warranty_claim(claim_id=1)",
    expected: "claim=open, vinculada al servicio, open_claims=1",
    obtained: `status=${status(claim.status)}, service=${claim.serviceRecord.toBase58()}, openClaims=${bike.openClaims}`,
    signature,
  }, status(claim.status) === "open" && claim.serviceRecord.equals(svc1) && bike.openClaims.toNumber() === 1);

  signature = await program.methods.resolveWarrantyClaim("Inspected and repaired at no cost")
    .accounts({
      warrantyClaim: claim1, serviceRecord: svc1, motorcycle: bike1,
      workshop: wsA, authority: shopA.publicKey,
    }).signers([shopA]).rpc();
  claim = await program.account.warrantyClaim.fetch(claim1);
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "V8", caseName: "Resolver reclamación",
    objective: "Resolver la garantía únicamente desde el taller responsable",
    setup: "Reclamación 1 abierta y ligada al taller A",
    operation: "resolve_warranty_claim(resolution)",
    expected: "status=resolved, resolved_at definido, open_claims=0",
    obtained: `status=${status(claim.status)}, resolvedAt=${claim.resolvedAt?.toString()}, openClaims=${bike.openClaims}`,
    signature,
  }, status(claim.status) === "resolved" && !!claim.resolvedAt && bike.openClaims.toNumber() === 0);

  await program.methods.registerMotorcycle(Array.from(h2), "Kawasaki", "Ninja 400", 2022, new BN(50))
    .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
  signature = await program.methods.archiveMotorcycle(Array.from(h2))
    .accounts({ motorcycle: bike2, owner: owner.publicKey }).signers([owner]).rpc();
  bike = await program.account.motorcycle.fetch(bike2);
  record({
    id: "V9", caseName: "Archivado condicionado",
    objective: "Archivar una moto sin servicios pendientes ni garantías abiertas",
    setup: "Moto 2 registrada sin intervenciones",
    operation: "archive_motorcycle(identifier_hash)",
    expected: "active=false y cuenta conservada para auditoría",
    obtained: `active=${bike.active}, brand=${bike.brand}`,
    signature,
  }, bike.active === false);

  const protocolAcc: any = await program.account.protocol.fetch(protocol);
  const wsAfter: any = await program.account.workshop.fetch(wsA);
  record({
    id: "V10", caseName: "Consistencia entre cuentas",
    objective: "Verificar contadores globales y del taller tras el flujo válido",
    setup: "Flujo V1–V9 completado",
    operation: "Lectura de Protocol y Workshop",
    expected: "2 motos (1 activa), 2 talleres, 1 servicio, 1 reclamación, 1 servicio completado",
    obtained: `motorcycles=${protocolAcc.totalMotorcycles}, active=${protocolAcc.activeMotorcycles}, workshops=${protocolAcc.totalWorkshops}, services=${protocolAcc.totalServiceRecords}, claims=${protocolAcc.totalWarrantyClaims}, completed=${wsAfter.servicesCompleted}`,
  }, protocolAcc.totalMotorcycles.toNumber() === 2 && protocolAcc.activeMotorcycles.toNumber() === 1 &&
     protocolAcc.totalWorkshops.toNumber() === 2 && protocolAcc.totalServiceRecords.toNumber() === 1 &&
     protocolAcc.totalWarrantyClaims.toNumber() === 1 && wsAfter.servicesCompleted.toNumber() === 1);

  // ------------------------------------------------------------ rejection ---
  const beforeModel = (await program.account.motorcycle.fetch(bike1)).model;
  let err = await captureError(() => program.methods
    .updateMotorcycle("Honda", "STOLEN", new BN(999))
    .accounts({ motorcycle: bike1, owner: other.publicKey }).signers([other]).rpc());
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "R1", caseName: "Wallet ajena modifica motocicleta",
    objective: "Rechazar modificación por un wallet que no es el propietario",
    setup: `Moto 1 pertenece a ${owner.publicKey.toBase58()}`,
    operation: "other signs update_motorcycle",
    expected: "NotMotorcycleOwner y modelo sin cambios",
    obtained: `${err}; model=${bike.model}`,
  }, /NotMotorcycleOwner|6001/i.test(err) && bike.model === beforeModel);

  const beforeCount = (await program.account.motorcycle.fetch(bike1)).serviceCount.toNumber();
  err = await captureError(() => program.methods
    .createServiceRecord(new BN(2), new BN(200), "Inspection", "Unauthorized")
    .accounts({ motorcycle: bike1, workshop: wsA, authority: other.publicKey }).signers([other]).rpc());
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "R2", caseName: "Servicio sin autorización",
    objective: "Rechazar creación de intervención firmada por wallet que no controla el taller",
    setup: "Taller A pertenece a shopA",
    operation: "other signs create_service_record using workshop A",
    expected: "UnauthorizedWorkshop y service_count sin cambios",
    obtained: `${err}; serviceCount=${bike.serviceCount}`,
  }, /UnauthorizedWorkshop|6000/i.test(err) && bike.serviceCount.toNumber() === beforeCount);

  const beforeDesc = (await program.account.serviceRecord.fetch(svc1)).description;
  err = await captureError(() => program.methods
    .updateServiceRecord(new BN(180), "Tampered", "Tampering attempt")
    .accounts({ motorcycle: bike1, workshop: wsB, serviceRecord: svc1, authority: shopB.publicKey })
    .signers([shopB]).rpc());
  svc = await program.account.serviceRecord.fetch(svc1);
  record({
    id: "R3", caseName: "Taller modifica servicio ajeno",
    objective: "Rechazar que el taller B edite un servicio del taller A",
    setup: "Servicio 1 pertenece al taller A",
    operation: "shopB signs update_service_record con su PDA",
    expected: "AccountMismatch/UnauthorizedWorkshop y descripción sin cambios",
    obtained: `${err}; description=${svc.description}`,
  }, err !== "UNEXPECTED SUCCESS" && svc.description === beforeDesc);

  err = await captureError(() => program.methods
    .updateServiceRecord(new BN(200), "Tamper", "Edit after finalization")
    .accounts({ motorcycle: bike1, workshop: wsA, serviceRecord: svc1, authority: shopA.publicKey })
    .signers([shopA]).rpc());
  svc = await program.account.serviceRecord.fetch(svc1);
  record({
    id: "R4", caseName: "Modificar servicio finalizado",
    objective: "Garantizar inmutabilidad de los registros finalizados",
    setup: "Servicio 1 finalizado en V6",
    operation: "shopA signs update_service_record sobre servicio finalizado",
    expected: "ServiceFinalized y estado sin cambios",
    obtained: `${err}; mileage=${svc.mileage}`,
  }, /ServiceFinalized|6008/i.test(err) && svc.mileage.toNumber() === 160);

  const beforeClaims = (await program.account.protocol.fetch(protocol)).totalWarrantyClaims.toNumber();
  const missing = pda.service(bike1, 99);
  err = await captureError(() => program.methods
    .createWarrantyClaim(new BN(1), "Claim on missing service")
    .accounts({ motorcycle: bike1, serviceRecord: missing, claimant: owner.publicKey })
    .signers([owner]).rpc());
  const afterClaims = (await program.account.protocol.fetch(protocol)).totalWarrantyClaims.toNumber();
  record({
    id: "R5", caseName: "Reclamación sobre servicio inexistente",
    objective: "Rechazar una garantía cuyo servicio vinculado no existe",
    setup: "No existe servicio con id 99 para la moto 1",
    operation: "create_warranty_claim con PDA de servicio fabricada",
    expected: "Error de cuenta/seeds y contador de reclamaciones sin cambios",
    obtained: `${err}; totalClaims=${afterClaims}`,
  }, err !== "UNEXPECTED SUCCESS" && afterClaims === beforeClaims);

  bike = await program.account.motorcycle.fetch(bike1);
  const beforeOpen = bike.openClaims.toNumber();
  err = await captureError(() => program.methods
    .createWarrantyClaim(new BN(2), "I am not the owner")
    .accounts({ motorcycle: bike1, serviceRecord: svc1, claimant: other.publicKey })
    .signers([other]).rpc());
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "R6", caseName: "No propietario abre reclamación",
    objective: "Solo el propietario puede iniciar una reclamación de garantía",
    setup: `Moto 1 pertenece a ${owner.publicKey.toBase58()}`,
    operation: "other signs create_warranty_claim(claim_id=2)",
    expected: "NotMotorcycleOwner y open_claims sin cambios",
    obtained: `${err}; openClaims=${bike.openClaims}`,
  }, /NotMotorcycleOwner|6001/i.test(err) && bike.openClaims.toNumber() === beforeOpen);

  signature = await program.methods
    .createWarrantyClaim(new BN(2), "Second claim intentionally left open")
    .accounts({ motorcycle: bike1, serviceRecord: svc1, claimant: owner.publicKey })
    .signers([owner]).rpc();
  err = await captureError(() => program.methods.archiveMotorcycle(Array.from(h1))
    .accounts({ motorcycle: bike1, owner: owner.publicKey }).signers([owner]).rpc());
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "R7", caseName: "Archivar con reclamación abierta",
    objective: "Rechazar archivado cuando existe una garantía abierta",
    setup: "Reclamación 2 abierta sobre la moto 1",
    operation: "owner signs archive_motorcycle",
    expected: "OpenClaimsExist y moto sigue activa",
    obtained: `${err}; active=${bike.active}, openClaims=${bike.openClaims}`,
    signature,
  }, /OpenClaimsExist|6015/i.test(err) && bike.active === true);

  signature = await program.methods.resolveWarrantyClaim("Closed to restore a clean state")
    .accounts({
      warrantyClaim: claim2, serviceRecord: svc1, motorcycle: bike1,
      workshop: wsA, authority: shopA.publicKey,
    }).signers([shopA]).rpc();
  record({
    id: "V11", caseName: "Cierre de la reclamación de prueba",
    objective: "Restaurar un estado limpio después del caso R7",
    setup: "Reclamación 2 abierta",
    operation: "resolve_warranty_claim por el taller responsable",
    expected: "Reclamación resuelta",
    obtained: `status=${status((await program.account.warrantyClaim.fetch(claim2)).status)}`,
    signature,
  }, status((await program.account.warrantyClaim.fetch(claim2)).status) === "resolved");

  await program.methods.registerMotorcycle(Array.from(h3), "Yamaha", "MT-07", 2023, new BN(0))
    .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
  await program.methods.createServiceRecord(new BN(1), new BN(10), "Brake check", "Pending inspection")
    .accounts({ motorcycle: bike3, workshop: wsA, authority: shopA.publicKey })
    .signers([shopA]).rpc();
  err = await captureError(() => program.methods.archiveMotorcycle(Array.from(h3))
    .accounts({ motorcycle: bike3, owner: owner.publicKey }).signers([owner]).rpc());
  const b3: any = await program.account.motorcycle.fetch(bike3);
  record({
    id: "R8", caseName: "Archivar con servicios pendientes",
    objective: "Rechazar archivado cuando existe una intervención pendiente",
    setup: "Moto 3 con un servicio pending",
    operation: "owner signs archive_motorcycle",
    expected: "PendingServicesExist y moto sigue activa",
    obtained: `${err}; active=${b3.active}, pending=${b3.pendingServices}`,
  }, /PendingServicesExist|6016/i.test(err) && b3.active === true);

  const mileageBefore = (await program.account.motorcycle.fetch(bike1)).currentMileage.toNumber();
  err = await captureError(() => program.methods
    .updateMotorcycle("Honda", "CB500F ABS", new BN(10))
    .accounts({ motorcycle: bike1, owner: owner.publicKey }).signers([owner]).rpc());
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "R9", caseName: "Kilometraje decreciente",
    objective: "Rechazar un odómetro menor al registrado",
    setup: `Moto 1 con ${mileageBefore} km`,
    operation: "owner signs update_motorcycle(mileage=10)",
    expected: "InvalidMileage y odómetro sin cambios",
    obtained: `${err}; mileage=${bike.currentMileage}`,
  }, /InvalidMileage|6004/i.test(err) && bike.currentMileage.toNumber() === mileageBefore);

  const randomHash = hashVin(vin("WRONG-PDA"));
  err = await captureError(() => program.methods.archiveMotorcycle(Array.from(randomHash))
    .accounts({ motorcycle: bike1, owner: owner.publicKey }).signers([owner]).rpc());
  bike = await program.account.motorcycle.fetch(bike1);
  record({
    id: "R10", caseName: "PDA/seed incorrecta",
    objective: "Rechazar una instrucción construida con un identifier_hash equivocado",
    setup: "Moto 1 registrada bajo su hash original",
    operation: "archive_motorcycle con hash aleatorio y cuenta de la moto 1",
    expected: "ConstraintSeeds / cuenta no encontrada y moto intacta",
    obtained: `${err}; active=${bike.active}`,
  }, err !== "UNEXPECTED SUCCESS" && bike.active === true);

  const failed = steps.filter((s) => s.status === "FAIL").length;
  await writeEvidence("INTEGRATION-RESULTS.md", "MOTORA — pruebas válidas y rechazos en Devnet", [
    "## Cuentas verificadas en esta ejecución",
    "",
    `- Protocol: ${addressLink(protocol.toBase58())}`,
    `- Motocicleta 1: ${addressLink(bike1.toBase58())}`,
    `- Taller A: ${addressLink(wsA.toBase58())}`,
    `- Servicio 1: ${addressLink(svc1.toBase58())}`,
    `- Reclamación 1: ${addressLink(claim1.toBase58())}`,
    "",
    `**Resumen:** ${steps.length} casos ejecutados, ${steps.length - failed} PASS, ${failed} FAIL.`,
  ]);

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("ERROR FATAL:", err);
  process.exit(1);
});
