/**
 * Programmatic Devnet funding via the Solana Foundation-recommended
 * proof-of-work faucet (program PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL).
 *
 * This is a standard TypeScript implementation of the public protocol documented at
 * https://github.com/jarry-xiao/proof-of-work-faucet — no private keys are printed
 * and no transaction is simulated: every claim is a real Devnet transaction.
 *
 * Usage:
 *   npx ts-node scripts/funding/pow-faucet.ts list
 *   npx ts-node scripts/funding/pow-faucet.ts mine --target-sol 3
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL",
);
const RPC = process.env.MOTORA_RPC || "https://api.devnet.solana.com";
const KEYPAIR_PATH =
  process.env.MOTORA_KEYPAIR || resolve(homedir(), ".config/solana/id.json");
const connection = new Connection(RPC, "confirmed");
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"))));

const AIRDROP_DISCRIMINATOR = createHash("sha256")
  .update("global:airdrop")
  .digest()
  .subarray(0, 8);
const enc = (s: string) => Buffer.from(s, "utf8");
const le64 = (n: bigint | number) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};

type Faucet = {
  difficulty: number;
  amount: bigint;
  spec: PublicKey;
  source: PublicKey;
};

async function listFaucets(): Promise<Faucet[]> {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 17 }],
    encoding: "base64",
    commitment: "confirmed",
  });
  const result: Faucet[] = [];
  for (const { pubkey, account } of accounts) {
    const raw = account.data as unknown as [string, string] | string;
    const data = Buffer.from(Array.isArray(raw) ? raw[0] : raw, "base64");
    if (data.length !== 17) continue;
    const difficulty = data.readUInt8(8);
    const amount = data.readBigUInt64LE(9);
    if (amount < 895880n) continue; // not profitable after receipt rent
    const [source] = PublicKey.findProgramAddressSync(
      [enc("source"), pubkey.toBuffer()],
      PROGRAM_ID,
    );
    const balance = await connection.getBalance(source, "confirmed");
    if (BigInt(balance) < amount) continue;
    result.push({ difficulty, amount, spec: pubkey, source });
  }
  return result.sort(
    (a, b) => a.difficulty - b.difficulty || (a.amount > b.amount ? -1 : 1),
  );
}

async function claim(faucet: Faucet, signer: Keypair): Promise<string> {
  const [receipt] = PublicKey.findProgramAddressSync(
    [
      enc("receipt"),
      signer.publicKey.toBuffer(),
      Buffer.from([faucet.difficulty]),
    ],
    PROGRAM_ID,
  );
  const ix = {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: faucet.spec, isSigner: false, isWritable: false },
      { pubkey: faucet.source, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(AIRDROP_DISCRIMINATOR),
  };
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(ix);
  return sendAndConfirmTransaction(connection, tx, [payer, signer], {
    commitment: "confirmed",
  });
}

async function main() {
  const [command] = process.argv.slice(2);
  const faucets = await listFaucets();
  console.log(`Faucets activos: ${faucets.length}`);
  for (const f of faucets) {
    console.log(
      `  difficulty=${f.difficulty} reward=${Number(f.amount) / 1e9} SOL source=${f.source.toBase58()}`,
    );
  }
  if (command !== "mine") return;
  if (faucets.length === 0) {
    console.error("No hay faucets con saldo. No se puede financiar programáticamente.");
    process.exit(1);
  }

  const targetSol = Number(process.argv[4] || "3");
  const targetLamports = BigInt(Math.round(targetSol * 1e9));
  const minDifficulty = Math.min(...faucets.map((f) => f.difficulty));
  const prefix = "A".repeat(minDifficulty);
  let mined = 0n;
  let attempts = 0;
  console.log(`Minando difficulty=${minDifficulty}, objetivo=${targetSol} SOL`);

  while (mined < targetLamports) {
    const signer = Keypair.generate();
    attempts++;
    if (!signer.publicKey.toBase58().startsWith(prefix)) continue;
    if (attempts % 50000 === 0) console.log(`  intentos=${attempts}, obtenido=${Number(mined) / 1e9} SOL`);

    for (const faucet of faucets) {
      if (faucet.difficulty > minDifficulty && !signer.publicKey.toBase58().startsWith("A".repeat(faucet.difficulty))) {
        continue;
      }
      try {
        const signature = await claim(faucet, signer);
        mined += faucet.amount;
        console.log(
          `  +${Number(faucet.amount) / 1e9} SOL  total=${Number(mined) / 1e9}  tx=${signature}`,
        );
      } catch (err: any) {
        console.log(`  claim fallido en ${faucet.source.toBase58()}: ${err?.message?.split("\n")[0]}`);
      }
      if (mined >= targetLamports) break;
    }
  }

  const balance = await connection.getBalance(payer.publicKey, "confirmed");
  console.log(`Listo. Balance: ${balance / 1e9} SOL (intentos: ${attempts})`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
