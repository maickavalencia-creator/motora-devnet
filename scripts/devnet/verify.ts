/** Read and verify live MOTORA accounts on Devnet. */
import {
  addressLink, connection, ensureBalance, PROGRAM_ID, program, pda,
  writeEvidence,
} from "./common";

async function main() {
  await ensureBalance(0.001);
  const protocol = pda.protocol();
  const [protocolAcc, motorcycles, workshops, services, claims] = await Promise.all([
    program.account.protocol.fetch(protocol),
    program.account.motorcycle.all(),
    program.account.workshop.all(),
    program.account.serviceRecord.all(),
    program.account.warrantyClaim.all(),
  ]);

  const info = await connection.getAccountInfo(protocol);
  const ownerMatches = !!info && info.owner.equals(PROGRAM_ID);
  const extra = [
    "## Lecturas on-chain",
    "",
    `- Cuenta Protocol: ${addressLink(protocol.toBase58())}`,
    `- Owner on-chain de la cuenta: ${info?.owner.toBase58()} (¿programa? ${ownerMatches})`,
    `- Datos: ${JSON.stringify({
      authority: protocolAcc.authority.toBase58(),
      totalMotorcycles: protocolAcc.totalMotorcycles.toString(),
      activeMotorcycles: protocolAcc.activeMotorcycles.toString(),
      totalWorkshops: protocolAcc.totalWorkshops.toString(),
      totalServiceRecords: protocolAcc.totalServiceRecords.toString(),
      totalWarrantyClaims: protocolAcc.totalWarrantyClaims.toString(),
    })}`,
    "",
    "## Cuentas por tipo",
    "",
    "| Tipo | Cantidad | Direcciones (Explorer) |",
    "| --- | --- | --- |",
    `| Motorcycle | ${motorcycles.length} | ${motorcycles.map((r: any) => addressLink(r.publicKey.toBase58())).join(", ") || "—"} |`,
    `| Workshop | ${workshops.length} | ${workshops.map((r: any) => addressLink(r.publicKey.toBase58())).join(", ") || "—"} |`,
    `| ServiceRecord | ${services.length} | ${services.map((r: any) => addressLink(r.publicKey.toBase58())).join(", ") || "—"} |`,
    `| WarrantyClaim | ${claims.length} | ${claims.map((r: any) => addressLink(r.publicKey.toBase58())).join(", ") || "—"} |`,
    "",
    "## Detalle de relaciones",
    "",
    ...services.flatMap((s: any) => [
      `- Servicio ${s.publicKey.toBase58()} → moto ${s.account.motorcycle.toBase58()} → taller ${s.account.workshop.toBase58()} (estado ${Object.keys(s.account.status)[0]}, claim_count ${s.account.claimCount})`,
      ...claims
        .filter((c: any) => c.account.serviceRecord.equals(s.publicKey))
        .map((c: any) => `  - Garantía ${c.publicKey.toBase58()} → reclamante ${c.account.claimant.toBase58()} (estado ${Object.keys(c.account.status)[0]})`),
    ]),
    "",
  ];

  await writeEvidence("VERIFY-ACCOUNTS.md", "MOTORA — verificación de cuentas en Devnet", extra);
  console.log(`Protocol: ${JSON.stringify(protocolAcc.toObject?.() ?? protocolAcc)}`);
  if (!ownerMatches) {
    console.error("ERROR: la cuenta Protocol no pertenece al programa esperado");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
