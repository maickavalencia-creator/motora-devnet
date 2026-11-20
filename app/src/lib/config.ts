import { PublicKey } from "@solana/web3.js";

/** Program ID used by the deployed program (override with NEXT_PUBLIC_PROGRAM_ID). */
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "EtK8VMUzDmJwEwDkuNif9LXSKWrWiXxmpDviLRsGu1XU",
);

/** Public salt: prevents storing the VIN verbatim; see README for the brute-force caveat. */
export const VIN_SALT = process.env.NEXT_PUBLIC_VIN_SALT || "motora-v1";

export const EXPLORER_CLUSTER = "devnet";

export const explorerTx = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${EXPLORER_CLUSTER}`;

export const explorerAddress = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=${EXPLORER_CLUSTER}`;

export const short = (value: string, size = 5) =>
  value.length > size * 2 ? `${value.slice(0, size)}…${value.slice(-size)}` : value;
