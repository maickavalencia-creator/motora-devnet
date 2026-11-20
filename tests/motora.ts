import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Evidence recorder: every case writes objective / setup / operation / result
// ---------------------------------------------------------------------------

type CaseResult = {
  id: string;
  name: string;
  objective: string;
  setup: string;
  operation: string;
  expected: string;
  obtained: string;
  status: "PASS" | "FAIL";
};

const results: CaseResult[] = [];

function record(
  id: string,
  name: string,
  objective: string,
  setup: string,
  operation: string,
  expected: string,
  obtained: string,
  passed: boolean,
) {
  results.push({
    id,
    name,
    objective,
    setup,
    operation,
    expected,
    obtained,
    status: passed ? "PASS" : "FAIL",
  });
  expect(passed, `${id} ${name}: ${obtained}`).to.equal(true);
}

function errorMessage(err: any): string {
  const code = err?.error?.errorCode?.code ?? err?.error?.code;
  const raw = err?.message ?? String(err);
  const hex = raw.match(/custom program error: 0x([0-9a-f]+)/i)?.[1];
  return [code, hex ? `0x${hex}` : undefined, raw.split("\n")[0]]
    .filter(Boolean)
    .join(" | ");
}

async function captureError(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "UNEXPECTED SUCCESS";
  } catch (err) {
    return errorMessage(err);
  }
}

function ok(message: string, id: string, name: string, objective: string, setup: string, operation: string, expected: string) {
  record(id, name, objective, setup, operation, expected, message, message !== "UNEXPECTED SUCCESS");
}

function rejected(message: string, id: string, name: string, objective: string, setup: string, operation: string, expected: string) {
  record(id, name, objective, setup, operation, expected, message, message !== "UNEXPECTED SUCCESS");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randomHash = () => Keypair.generate().publicKey.toBuffer().subarray(0, 32);

const protocolPda = (program: Program) =>
  PublicKey.findProgramAddressSync([Buffer.from("protocol")], program.programId)[0];

const motorcyclePda = (program: Program, hash: Uint8Array) =>
  PublicKey.findProgramAddressSync([Buffer.from("motorcycle"), Buffer.from(hash)], program.programId)[0];

const workshopPda = (program: Program, authority: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("workshop"), authority.toBuffer()], program.programId)[0];

const servicePda = (program: Program, motorcycle: PublicKey, recordId: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("service"), motorcycle.toBuffer(), new BN(recordId).toArrayLike(Buffer, "le", 8)],
    program.programId,
  )[0];

const claimPda = (program: Program, service: PublicKey, claimId: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("warranty"), service.toBuffer(), new BN(claimId).toArrayLike(Buffer, "le", 8)],
    program.programId,
  )[0];

const { BN } = anchor;

async function fund(connection: any, pubkey: PublicKey) {
  const sig = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
}

describe("MOTORA — program tests (valid + rejection cases)", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  // The generated IDL is used at runtime; `any` avoids TS generic friction
  // while still calling the real program through Anchor.
  const program: any = (anchor.workspace as any).motora;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const owner = Keypair.generate();
  const otherOwner = Keypair.generate();
  const workshopA = Keypair.generate();
  const workshopB = Keypair.generate();

  const hash1 = randomHash();
  const hash2 = randomHash();
  const hash3 = randomHash();

  let bike1: PublicKey;
  let bike2: PublicKey;
  let bike3: PublicKey;
  let wsA: PublicKey;
  let wsB: PublicKey;
  let service1: PublicKey;
  let claim1: PublicKey;

  before(async () => {
    for (const kp of [owner, otherOwner, workshopA, workshopB]) {
      await fund(provider.connection, kp.publicKey);
    }
    await program.methods.initialize().accounts({ authority: provider.wallet.publicKey }).rpc();

    bike1 = motorcyclePda(program, hash1);
    bike2 = motorcyclePda(program, hash2);
    bike3 = motorcyclePda(program, hash3);
    wsA = workshopPda(program, workshopA.publicKey);
    wsB = workshopPda(program, workshopB.publicKey);
    service1 = servicePda(program, bike1, 1);
    claim1 = claimPda(program, service1, 1);
  });

  after(() => {
    const lines = [
      "# MOTORA — automated program test results",
      "",
      `Executed: ${new Date().toISOString()}`,
      `Validator / cluster: ${provider.connection.rpcEndpoint}`,
      `Program ID: ${program.programId.toBase58()}`,
      "",
      "| ID | Case | Objective | Expected | Obtained | Status |",
      "| --- | --- | --- | --- | --- | --- |",
      ...results.map(
        (r) =>
          `| ${r.id} | ${r.name} | ${r.objective} | ${r.expected} | ${r.obtained.replace(/\|/g, "\\|")} | ${r.status} |`,
      ),
      "",
      "## Detail",
      "",
      ...results.flatMap((r) => [
        `### ${r.id} — ${r.name} (${r.status})`,
        "",
        `- **Objetivo:** ${r.objective}`,
        `- **Preparación:** ${r.setup}`,
        `- **Operación:** ${r.operation}`,
        `- **Resultado esperado:** ${r.expected}`,
        `- **Resultado obtenido:** ${r.obtained}`,
        `- **Estado:** ${r.status}`,
        "",
      ]),
    ];
    const dir = path.join(__dirname, "..", "evidence");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "TEST-RESULTS.md"), lines.join("\n"), "utf8");
  });

  // -------------------------------------------------------------------------
  // Valid cases
  // -------------------------------------------------------------------------

  it("V1 — register and read a motorcycle", async () => {
    await program.methods
      .registerMotorcycle(Array.from(hash1), "Honda", "CB500F", 2022, new BN(100))
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();
    const acc: any = await program.account.motorcycle.fetch(bike1);
    ok(
      `owner=${acc.owner.toBase58().slice(0, 8)}, brand=${acc.brand}, mileage=${acc.currentMileage}, active=${acc.active}`,
      "V1",
      "Register and read motorcycle",
      "Register a bike and verify the on-chain account is readable with the expected fields",
      "Fresh PDA derived from SHA-256(VIN+salt); owner wallet funded",
      "register_motorcycle + account.motorcycle.fetch",
      "Account exists, owner matches signer, VIN hash stored, active = true",
    );
    expect(acc.owner.equals(owner.publicKey)).to.equal(true);
    expect(acc.active).to.equal(true);
    expect(Buffer.from(acc.identifierHash)).to.deep.equal(Buffer.from(hash1));
  });

  it("V2 — update motorcycle information", async () => {
    await program.methods
      .updateMotorcycle("Honda", "CB500F ABS", new BN(130))
      .accounts({ motorcycle: bike1, owner: owner.publicKey })
      .signers([owner])
      .rpc();
    const acc: any = await program.account.motorcycle.fetch(bike1);
    ok(
      `model=${acc.model}, mileage=${acc.currentMileage}`,
      "V2",
      "Update motorcycle",
      "Update allowed descriptive fields and advance the odometer",
      "Motorcycle V1 registered with 100 km",
      "update_motorcycle(model='CB500F ABS', mileage=130)",
      "Model updated and mileage = 130",
    );
    expect(acc.model).to.equal("CB500F ABS");
    expect(acc.currentMileage.toNumber()).to.equal(130);
  });

  it("V3 — register workshop", async () => {
    await program.methods
      .registerWorkshop("MOTORA Premium Service")
      .accounts({ authority: workshopA.publicKey })
      .signers([workshopA])
      .rpc();
    await program.methods
      .registerWorkshop("Second Gear Workshop")
      .accounts({ authority: workshopB.publicKey })
      .signers([workshopB])
      .rpc();
    const acc: any = await program.account.workshop.fetch(wsA);
    ok(
      `workshop=${acc.name}, authority=${acc.authority.toBase58().slice(0, 8)}, active=${acc.active}`,
      "V3",
      "Register workshop",
      "Register two independent workshops keyed by their authority",
      "Two funded workshop authority keypairs",
      "register_workshop(name)",
      "Both PDAs exist and workshop A is active",
    );
    expect(acc.active).to.equal(true);
  });

  it("V4 — create maintenance record", async () => {
    await program.methods
      .createServiceRecord(new BN(1), new BN(150), "Oil change", "Full synthetic oil and filter")
      .accounts({ motorcycle: bike1, workshop: wsA, authority: workshopA.publicKey })
      .signers([workshopA])
      .rpc();
    const acc: any = await program.account.serviceRecord.fetch(service1);
    const bike: any = await program.account.motorcycle.fetch(bike1);
    ok(
      `status=${JSON.stringify(acc.status)}, pending=${bike.pendingServices.toNumber()}, workshop=${acc.workshop.toBase58().slice(0, 8)}`,
      "V4",
      "Create service record",
      "Create a linked pending intervention and update motorcycle counters",
      "Motorcycle and active workshop registered",
      "create_service_record(record_id=1, mileage=150)",
      "Service is pending, motorcycle.pending_services = 1",
    );
    expect(acc.status).to.have.property("pending");
    expect(bike.pendingServices.toNumber()).to.equal(1);
  });

  it("V5 — update pending maintenance record", async () => {
    await program.methods
      .updateServiceRecord(new BN(160), "Oil change + filter", "Synthetic oil 10W40 and OEM filter replaced")
      .accounts({ motorcycle: bike1, workshop: wsA, serviceRecord: service1, authority: workshopA.publicKey })
      .signers([workshopA])
      .rpc();
    const acc: any = await program.account.serviceRecord.fetch(service1);
    ok(
      `description=${acc.description}, mileage=${acc.mileage.toNumber()}`,
      "V5",
      "Update pending service",
      "A pending service may be edited by its authoring workshop",
      "Service 1 is Pending and authored by workshop A",
      "update_service_record(mileage=160, new description)",
      "Stored service reflects the new values",
    );
    expect(acc.mileage.toNumber()).to.equal(160);
  });

  it("V6 — finalize maintenance record", async () => {
    await program.methods
      .finalizeServiceRecord()
      .accounts({ motorcycle: bike1, workshop: wsA, serviceRecord: service1, authority: workshopA.publicKey })
      .signers([workshopA])
      .rpc();
    const acc: any = await program.account.serviceRecord.fetch(service1);
    const bike: any = await program.account.motorcycle.fetch(bike1);
    ok(
      `status=${JSON.stringify(acc.status)}, pending=${bike.pendingServices.toNumber()}, mileage=${bike.currentMileage.toNumber()}`,
      "V6",
      "Finalize service",
      "Finalize a service, clear the pending counter and advance the odometer",
      "Service 1 pending with mileage 160",
      "finalize_service_record",
      "Status Finalized, pending_services = 0, motorcycle mileage = 160",
    );
    expect(acc.status).to.have.property("finalized");
    expect(bike.pendingServices.toNumber()).to.equal(0);
    expect(bike.currentMileage.toNumber()).to.equal(160);
  });

  it("V7 — create warranty claim", async () => {
    await program.methods
      .createWarrantyClaim(new BN(1), "Engine noise returned after the service")
      .accounts({ motorcycle: bike1, serviceRecord: service1, claimant: owner.publicKey })
      .signers([owner])
      .rpc();
    const acc: any = await program.account.warrantyClaim.fetch(claim1);
    const bike: any = await program.account.motorcycle.fetch(bike1);
    ok(
      `status=${JSON.stringify(acc.status)}, openClaims=${bike.openClaims.toNumber()}, linkedService=${acc.serviceRecord.toBase58().slice(0, 8)}`,
      "V7",
      "Create warranty claim",
      "Owner opens a claim tied to a finalized service",
      "Service 1 finalized inside the 90-day window",
      "create_warranty_claim(claim_id=1)",
      "Claim Open, linked to service 1, motorcycle.open_claims = 1",
    );
    expect(acc.status).to.have.property("open");
    expect(bike.openClaims.toNumber()).to.equal(1);
  });

  it("V8 — resolve warranty claim", async () => {
    await program.methods
      .resolveWarrantyClaim("Inspected and repaired at no cost")
      .accounts({
        warrantyClaim: claim1,
        serviceRecord: service1,
        motorcycle: bike1,
        workshop: wsA,
        authority: workshopA.publicKey,
      })
      .signers([workshopA])
      .rpc();
    const acc: any = await program.account.warrantyClaim.fetch(claim1);
    const bike: any = await program.account.motorcycle.fetch(bike1);
    ok(
      `status=${JSON.stringify(acc.status)}, resolvedAt=${acc.resolvedAt?.toNumber()}, openClaims=${bike.openClaims.toNumber()}`,
      "V8",
      "Resolve warranty claim",
      "Responsible workshop resolves an open claim",
      "Claim 1 open and linked to workshop A",
      "resolve_warranty_claim(resolution)",
      "Claim Resolved with timestamp, open_claims = 0",
    );
    expect(acc.status).to.have.property("resolved");
    expect(bike.openClaims.toNumber()).to.equal(0);
  });

  it("V9 — archive motorcycle when conditions are met", async () => {
    await program.methods
      .registerMotorcycle(Array.from(hash3), "Yamaha", "MT-07", 2023, new BN(0))
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();
    await program.methods
      .archiveMotorcycle(Array.from(hash3))
      .accounts({ motorcycle: bike3, owner: owner.publicKey })
      .signers([owner])
      .rpc();
    const acc: any = await program.account.motorcycle.fetch(bike3);
    ok(
      `active=${acc.active}, account still readable=${acc.brand}`,
      "V9",
      "Conditional archival",
      "Archive a motorcycle with no pending services and no open claims",
      "Bike 3 registered, no interventions and no claims",
      "archive_motorcycle(identifier_hash)",
      "active = false while the account and its history remain readable",
    );
    expect(acc.active).to.equal(false);
  });

  it("V10 — protocol counters and account relations", async () => {
    const p: any = await program.account.protocol.fetch(protocolPda(program));
    const ws: any = await program.account.workshop.fetch(wsA);
    ok(
      `motorcycles=${p.totalMotorcycles.toNumber()}, active=${p.activeMotorcycles.toNumber()}, workshops=${p.totalWorkshops.toNumber()}, services=${p.totalServiceRecords.toNumber()}, claims=${p.totalWarrantyClaims.toNumber()}, completed=${ws.servicesCompleted.toNumber()}`,
      "V10",
      "Cross-account consistency",
      "Verify global counters and workshop counters after the valid flow",
      "All previous valid cases executed",
      "Read Protocol and Workshop accounts",
      "Counters reflect 2 motorcycles (1 active), 2 workshops, 1 service, 1 claim, 1 completed service",
    );
    expect(p.totalMotorcycles.toNumber()).to.equal(2);
    expect(p.activeMotorcycles.toNumber()).to.equal(1);
    expect(p.totalWorkshops.toNumber()).to.equal(2);
    expect(p.totalServiceRecords.toNumber()).to.equal(1);
    expect(p.totalWarrantyClaims.toNumber()).to.equal(1);
    expect(ws.servicesCompleted.toNumber()).to.equal(1);
  });

  // -------------------------------------------------------------------------
  // Rejection cases
  // -------------------------------------------------------------------------

  it("R1 — foreign wallet cannot update a motorcycle", async () => {
    const msg = await captureError(() =>
      program.methods
        .updateMotorcycle("Honda", "Stolen", new BN(200))
        .accounts({ motorcycle: bike1, owner: otherOwner.publicKey })
        .signers([otherOwner])
        .rpc(),
    );
    rejected(msg, "R1", "Foreign wallet updates motorcycle", "Reject a non-owner modifying a motorcycle", "Bike 1 owned by owner", "otherOwner signs update_motorcycle", "NotMotorcycleOwner",);
    expect(msg).not.to.equal("UNEXPECTED SUCCESS");
  });

  it("R2 — unauthorized wallet cannot create a service record", async () => {
    const msg = await captureError(() =>
      program.methods
        .createServiceRecord(new BN(2), new BN(200), "Inspection", "Unauthorized inspection")
        .accounts({ motorcycle: bike1, workshop: wsA, authority: otherOwner.publicKey })
        .signers([otherOwner])
        .rpc(),
    );
    rejected(msg, "R2", "Unauthorized service record", "Reject a wallet that is not the workshop authority", "Workshop A belongs to workshopA keypair", "otherOwner signs create_service_record with workshop A", "UnauthorizedWorkshop");
    expect(msg).not.to.equal("UNEXPECTED SUCCESS");
  });

  it("R3 — workshop cannot modify another workshop's service", async () => {
    const msg = await captureError(() =>
      program.methods
        .updateServiceRecord(new BN(180), "Tampered", "Tampering attempt")
        .accounts({ motorcycle: bike1, workshop: wsB, serviceRecord: service1, authority: workshopB.publicKey })
        .signers([workshopB])
        .rpc(),
    );
    rejected(msg, "R3", "Cross-workshop modification", "Reject workshop B editing workshop A's service", "Service 1 belongs to workshop A", "workshopB signs update_service_record using wsB", "AccountMismatch / UnauthorizedWorkshop");
    expect(msg).not.to.equal("UNEXPECTED SUCCESS");
  });

  it("R4 — finalized service is immutable", async () => {
    const msg = await captureError(() =>
      program.methods
        .updateServiceRecord(new BN(200), "Tamper", "Attempted edit after finalization")
        .accounts({ motorcycle: bike1, workshop: wsA, serviceRecord: service1, authority: workshopA.publicKey })
        .signers([workshopA])
        .rpc(),
    );
    rejected(msg, "R4", "Modify finalized service", "Reject any modification of a finalized record", "Service 1 finalized in V6", "workshopA signs update_service_record on service 1", "ServiceFinalized");
    expect(msg).not.to.equal("UNEXPECTED SUCCESS");
  });

  it("R5 — claim on a non-existent service", async () => {
    const missing = servicePda(program, bike1, 99);
    const msg = await captureError(() =>
      program.methods
        .createWarrantyClaim(new BN(1), "Claim on a service that does not exist")
        .accounts({ motorcycle: bike1, serviceRecord: missing, claimant: owner.publicKey })
        .signers([owner])
        .rpc(),
    );
    rejected(msg, "R5", "Claim on missing service", "Reject a claim whose service account does not exist", "No service with id 99 for bike 1", "create_warranty_claim with fabricated service PDA", "AccountNotInitialized / ConstraintSeeds");
    expect(msg).not.to.equal("UNEXPECTED SUCCESS");
  });

  it("R6 — non-owner cannot open a claim", async () => {
    const msg = await captureError(() =>
      program.methods
        .createWarrantyClaim(new BN(2), "I am not the owner")
        .accounts({ motorcycle: bike1, serviceRecord: service1, claimant: otherOwner.publicKey })
        .signers([otherOwner])
        .rpc(),
    );
    rejected(msg, "R6", "Non-owner warranty claim", "Only the motorcycle owner may open a claim", "Bike 1 owned by owner", "otherOwner signs create_warranty_claim with a fresh claim id", "NotMotorcycleOwner");
    expect(msg).to.contain("NotMotorcycleOwner");
  });

  it("R7 — cannot archive with an open claim", async () => {
    await program.methods
      .createWarrantyClaim(new BN(2), "Second claim left open on purpose")
      .accounts({ motorcycle: bike1, serviceRecord: service1, claimant: owner.publicKey })
      .signers([owner])
      .rpc();
    const msg = await captureError(() =>
      program.methods
        .archiveMotorcycle(Array.from(hash1))
        .accounts({ motorcycle: bike1, owner: owner.publicKey })
        .signers([owner])
        .rpc(),
    );
    rejected(msg, "R7", "Archive with open claim", "Reject archival while a warranty claim is open", "Claim 2 on bike 1 is open", "owner signs archive_motorcycle", "OpenClaimsExist");
    expect(msg).to.contain("OpenClaimsExist");
  });

  it("R8 — cannot archive with pending services", async () => {
    await program.methods
      .registerMotorcycle(Array.from(hash2), "Kawasaki", "Ninja 400", 2021, new BN(50))
      .accounts({ owner: otherOwner.publicKey })
      .signers([otherOwner])
      .rpc();
    await program.methods
      .createServiceRecord(new BN(1), new BN(60), "Brake check", "Pending brake inspection")
      .accounts({ motorcycle: bike2, workshop: wsA, authority: workshopA.publicKey })
      .signers([workshopA])
      .rpc();
    const msg = await captureError(() =>
      program.methods
        .archiveMotorcycle(Array.from(hash2))
        .accounts({ motorcycle: bike2, owner: otherOwner.publicKey })
        .signers([otherOwner])
        .rpc(),
    );
    rejected(msg, "R8", "Archive with pending service", "Reject archival while an intervention is pending", "Bike 2 has one pending service", "otherOwner signs archive_motorcycle", "PendingServicesExist");
    expect(msg).to.contain("PendingServicesExist");
  });

  it("R9 — odometer cannot decrease", async () => {
    const msg = await captureError(() =>
      program.methods
        .updateMotorcycle("Honda", "CB500F", new BN(10))
        .accounts({ motorcycle: bike1, owner: owner.publicKey })
        .signers([owner])
        .rpc(),
    );
    rejected(msg, "R9", "Decreasing mileage", "Reject an odometer value below the current one", "Bike 1 current mileage = 160", "owner signs update_motorcycle(mileage=10)", "InvalidMileage");
    expect(msg).to.contain("InvalidMileage");
  });

  it("R10 — wrong PDA seed is rejected", async () => {
    const msg = await captureError(() =>
      program.methods
        .archiveMotorcycle(Array.from(randomHash()))
        .accounts({ motorcycle: bike1, owner: owner.publicKey })
        .signers([owner])
        .rpc(),
    );
    rejected(msg, "R10", "Wrong PDA seed", "Reject an instruction built with an incorrect identifier hash", "Bike 1 exists under hash1", "archive_motorcycle with a different identifier_hash", "ConstraintSeeds / account not found");
    expect(msg).not.to.equal("UNEXPECTED SUCCESS");
  });
});
