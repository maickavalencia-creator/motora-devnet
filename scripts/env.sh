#!/usr/bin/env bash
# Source this file from other scripts: source scripts/env.sh
# All tool locations are user-local so the project works without sudo.

export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.local/node/bin:$PATH"

export MOTORA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export MOTORA_RPC="${MOTORA_RPC:-https://api.devnet.solana.com}"
export MOTORA_KEYPAIR="${MOTORA_KEYPAIR:-$HOME/.config/solana/id.json}"
export MOTORA_PROGRAM_ID="${MOTORA_PROGRAM_ID:-$(python3 -c "import json;print(json.load(open('$MOTORA_ROOT/target/idl/motora.json'))['address'])" 2>/dev/null || echo '')}"

cd "$MOTORA_ROOT"

need_tool() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: herramienta requerida no encontrada: $1" >&2; exit 1; }
}

show_env() {
  echo "RPC:         $MOTORA_RPC"
  echo "Wallet:      $(solana-keygen pubkey "$MOTORA_KEYPAIR" 2>/dev/null || echo 'no disponible')"
  echo "Program ID:  $MOTORA_PROGRAM_ID"
  echo "Solana CLI:  $(solana --version 2>/dev/null || echo 'no instalada')"
  echo "Anchor CLI:  $(anchor --version 2>/dev/null || echo 'no instalada')"
}
