#!/usr/bin/env bash
# Run the complete Devnet deliverable once the payer wallet is funded.
# Every step is a real on-chain operation; no step is skipped or simulated.
set -euo pipefail
source "$(dirname "$0")/env.sh"

need_tool solana
need_tool solana-keygen
need_tool npm

PUBKEY=$(solana-keygen pubkey "$MOTORA_KEYPAIR")
BALANCE=$(solana balance --url "$MOTORA_RPC" --keypair "$MOTORA_KEYPAIR" 2>/dev/null || echo "0 SOL")

echo "== MOTORA Devnet — ejecución completa =="
echo "Wallet (payer): $PUBKEY"
echo "Balance:        $BALANCE"
echo "RPC:            $MOTORA_RPC"
echo

npm run deploy:devnet
npm run devnet:init
npm run devnet:integration
npm run devnet:verify

echo
echo "== Ejecución completada =="
echo "Program ID y transacciones reales: evidence/devnet/"
echo "No compartas claves privadas ni frases semilla."
