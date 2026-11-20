/** Initialize the MOTORA protocol account on Devnet (idempotent handling). */
import {
  addressLink, captureError, ensureBalance, errorText, ok, payer, pda,
  program, steps, txLink, writeEvidence,
} from "./common";

async function main() {
  await ensureBalance();
  const protocol = pda.protocol();
  const existing = await program.account.protocol.fetchNullable(protocol);

  if (existing) {
    ok({
      id: "I0",
      caseName: "Protocolo ya inicializado",
      objective: "Verificar que initialize no se ejecuta dos veces sobre la misma PDA",
      setup: `La cuenta Protocol ya existe en ${protocol.toBase58()}`,
      operation: "fetchNullable + initialize controlado (debe ser rechazado por Anchor)",
      expected: "La cuenta se lee correctamente y una segunda inicialización falla",
      obtained: `Cuenta existente; segunda inicialización: ${await captureError(() => program.methods.initialize().accounts({ authority: payer.publicKey }).rpc())}`,
    });
  } else {
    const signature: string = await program.methods
      .initialize()
      .accounts({ authority: payer.publicKey })
      .rpc();
    const acc: any = await program.account.protocol.fetch(protocol);
    ok({
      id: "I1",
      caseName: "Inicialización del protocolo",
      objective: "Crear la cuenta singleton Protocol y verificar sus contadores iniciales",
      setup: "No existía cuenta Protocol en Devnet",
      operation: "initialize() firmado por el wallet de despliegue",
      expected: "Cuenta creada con todos los contadores en cero",
      obtained: `motorcycles=${acc.totalMotorcycles}, workshops=${acc.totalWorkshops}, services=${acc.totalServiceRecords}, claims=${acc.totalWarrantyClaims}`,
      signature,
    });
  }

  await writeEvidence("INIT-RESULTS.md", "MOTORA — inicialización en Devnet", [
    `Cuenta Protocol: ${addressLink(protocol.toBase58())}`,
  ]);
}

main().catch((err) => {
  console.error("ERROR:", errorText(err));
  process.exit(1);
});
