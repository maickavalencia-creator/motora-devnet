/** Shared helpers for the reproducible Devnet integration scripts. */
import { AnchorProvider, BN, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import IDL_JSON from "../../client/src/idl/motora.json";

export const RPC = process.env.MOTORA_RPC || "https://api.devnet.solana.com";
export const SALT = process.env.MOTORA_VIN_SALT || "motora-v1";
export const PROGRAM_ID = new PublicKey(
  process.env.MOTORA_PROGRAM_ID || (IDL_JSON as any).address,
);
export const EXPLORER = "https://explorer.solana.com";

const keypairPath =
  process.env.MOTORA_KEYPAIR || resolve(homedir(), ".config/solana/id.json");

export function loadKeypair(path = keypairPath): Keypair {
  const secret = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export const payer = loadKeypair();
export const connection = new Connection(RPC, "confirmed");
export const provider = new AnchorProvider(
  connection,
  new Wallet(payer),
  { commitment: "confirmed" },
);
export const program: any = new Program(
  { ...(IDL_JSON as any), address: PROGRAM_ID.toBase58() } as Idl,
  provider,
);

export const enc = (s: string) => Buffer.from(s, "utf8");
export const le64 = (n: number) => new BN(n).toArrayLike(Buffer, "le", 8);

export const pda = {
  protocol: () => PublicKey.findProgramAddressSync([enc("protocol")], PROGRAM_ID)[0],
  motorcycle: (hash: Uint8Array) =>
    PublicKey.findProgramAddressSync([enc("motorcycle"), Buffer.from(hash)], PROGRAM_ID)[0],
  workshop: (authority: PublicKey) =>
    PublicKey.findProgramAddressSync([enc("workshop"), authority.toBuffer()], PROGRAM_ID)[0],
  service: (motorcycle: PublicKey, id: number) =>
    PublicKey.findProgramAddressSync(
      [enc("service"), motorcycle.toBuffer(), le64(id)],
      PROGRAM_ID,
    )[0],
  claim: (service: PublicKey, id: number) =>
    PublicKey.findProgramAddressSync(
      [enc("warranty"), service.toBuffer(), le64(id)],
      PROGRAM_ID,
    )[0],
};

/** Same normalization used by the browser client. Only the digest goes on-chain. */
export const hashVin = (vin: string): Uint8Array =>
  new Uint8Array(
    createHash("sha256").update(`${vin.trim().toUpperCase()}|${SALT}`).digest(),
  );

export const vin = (tag: string) =>
  `MOTORA-DEVNET-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const short = (value: string, n = 8) =>
  value.length > n * 2 ? `${value.slice(0, n)}…${value.slice(-n)}` : value;

export const txLink = (signature: string) =>
  `${EXPLORER}/tx/${signature}?cluster=devnet`;
export const addressLink = (address: string) =>
  `${EXPLORER}/address/${address}?cluster=devnet`;

export type Step = {
  id: string;
  caseName: string;
  objective: string;
  setup: string;
  operation: string;
  expected: string;
  obtained: string;
  status: "PASS" | "FAIL";
  signature?: string;
};

export const steps: Step[] = [];

export function ok(step: Omit<Step, "status"> & { signature?: string }) {
  steps.push({ ...step, status: "PASS" });
  console.log(`PASS ${step.id} — ${step.caseName}`);
}

export function fail(step: Omit<Step, "status"> & { signature?: string }) {
  steps.push({ ...step, status: "FAIL" });
  console.error(`FAIL ${step.id} — ${step.caseName}: ${step.obtained}`);
}

export function errorText(err: any): string {
  const code =
    err?.error?.errorCode?.code ||
    err?.error?.code ||
    err?.errorCode?.code ||
    err?.message?.match(/custom program error: 0x[0-9a-f]+/i)?.[0];
  const hex = err?.message?.match(/custom program error: 0x([0-9a-f]+)/i)?.[1];
  return [code, hex ? `0x${hex}` : undefined, String(err?.message || "").split("\n")[0]]
    .filter(Boolean)
    .join(" | ");
}

export async function captureError(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "UNEXPECTED SUCCESS";
  } catch (err) {
    return errorText(err);
  }
}

export async function writeEvidence(filename: string, title: string, extra: string[] = []) {
  const lines = [
    `# ${title}`,
    "",
    `- Generado: ${new Date().toISOString()}`,
    `- RPC: ${RPC}`,
    `- Cluster: devnet`,
    `- Program ID: ${PROGRAM_ID.toBase58()} — ${addressLink(PROGRAM_ID.toBase58())}`,
    `- Wallet de firma (payer): ${payer.publicKey.toBase58()} — ${addressLink(payer.publicKey.toBase58())}`,
    `- Versión del cluster: ${JSON.stringify(await connection.getVersion())}`,
    "",
    "| ID | Caso | Objetivo | Esperado | Obtenido | Estado | Firma |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...steps.map((s) =>
      `| ${s.id} | ${s.caseName} | ${s.objective} | ${s.expected} | ${s.obtained.replace(/\|/g, "\\|")} | ${s.status} | ${s.signature ? `[${short(s.signature)}](${txLink(s.signature)})` : "—"} |`,
    ),
    "",
    "## Detalle",
    "",
    ...steps.flatMap((s) => [
      `### ${s.id} — ${s.caseName} (${s.status})`,
      "",
      `- **Objetivo:** ${s.objective}`,
      `- **Preparación:** ${s.setup}`,
      `- **Operación:** ${s.operation}`,
      `- **Resultado esperado:** ${s.expected}`,
      `- **Resultado obtenido:** ${s.obtained}`,
      `- **Estado:** ${s.status}`,
      ...(s.signature ? [`- **Firma verificable:** ${txLink(s.signature)}`] : []),
      "",
    ]),
    ...extra,
    "",
  ];
  const path = resolve(process.cwd(), "evidence/devnet", filename);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n"), "utf8");
  console.log(`Evidencia escrita: evidence/devnet/${filename}`);
}

export async function ensureBalance(minSol = 0.2) {
  const balance = (await connection.getBalance(payer.publicKey)) / 1e9;
  if (balance < minSol) {
    throw new Error(
      `El wallet ${payer.publicKey.toBase58()} tiene ${balance.toFixed(4)} SOL. ` +
        `Necesita al menos ${minSol} SOL en Devnet. No se inventarán transacciones.`,
    );
  }
  return balance;
}
