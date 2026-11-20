#!/usr/bin/env bash
# Deploy the compiled MOTORA program to Devnet. Never invents an ID: the real
# program keypair address is written into Anchor.toml and declare_id! before build.
set -euo pipefail
source "$(dirname "$0")/env.sh"

need_tool solana
need_tool solana-keygen
need_tool anchor
need_tool python3

echo "== MOTORA Devnet deployment =="
show_env

SO_BYTES=$(stat -c %s target/deploy/motora.so 2>/dev/null || echo 406438)
RENT_SOL=$(solana rent "$SO_BYTES" --url "$MOTORA_RPC" 2>/dev/null | awk '/Rent-exempt/{print $3}' || echo 2.1)
# Renta del programa + margen para fees, buffer de deploy y ejecución de pruebas.
REQUIRED_SOL=$(python3 -c "print(f'{float(\"${RENT_SOL}\") + 0.6:.2f}')")
BALANCE_SOL=$(solana balance --url "$MOTORA_RPC" --keypair "$MOTORA_KEYPAIR" 2>/dev/null | awk '{print $1}' || echo 0)
if python3 -c "import sys; sys.exit(0 if float('${BALANCE_SOL}') >= float('${REQUIRED_SOL}') else 1)"; then
  echo "Balance suficiente: ${BALANCE_SOL} SOL (requerido ≈ ${REQUIRED_SOL} SOL)"
else
  echo "ERROR: el wallet de despliegue necesita al menos ${REQUIRED_SOL} SOL en Devnet." >&2
  echo "  (renta del binario de ${SO_BYTES} bytes: ${RENT_SOL} SOL + 0.6 SOL de margen)" >&2
  echo "Balance actual: ${BALANCE_SOL} SOL" >&2
  echo "Financia localmente el wallet indicado por MOTORA_KEYPAIR; ver evidence/DEVNET-BLOCKER.md" >&2
  exit 1
fi

mkdir -p keypairs evidence
PROGRAM_KEYPAIR="keypairs/devnet-program.json"
if [ ! -f "$PROGRAM_KEYPAIR" ]; then
  solana-keygen new --no-bip39-passphrase --silent -o "$PROGRAM_KEYPAIR"
fi
PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR")

python3 - "$PROGRAM_ID" <<'PY'
import pathlib, re, sys
pid = sys.argv[1]
root = pathlib.Path('.')
lib = root / 'programs/motora/src/lib.rs'
text = lib.read_text()
text, n = re.subn(r'declare_id!\("[^"]+"\);', f'declare_id!("{pid}");', text)
assert n == 1, 'No se pudo actualizar declare_id!'
lib.write_text(text)

anchor_toml = root / 'Anchor.toml'
text = anchor_toml.read_text()
# El binario y el IDL llevan el mismo declare_id!, así que localnet y devnet
# deben apuntar al mismo ID para evitar DeclaredProgramIdMismatch en las pruebas.
text, n = re.subn(r'(\[programs\.(?:localnet|devnet)\]\nmotora = )"[^"]+"', rf'\1"{pid}"', text)
assert n == 2, f'No se pudieron actualizar las dos secciones de Anchor.toml (n={n})'
anchor_toml.write_text(text)

cfg = root / 'app/src/lib/config.ts'
text = cfg.read_text()
text, n = re.subn(r'(process\.env\.NEXT_PUBLIC_PROGRAM_ID \|\| ")[^"]+(")', rf'\g<1>{pid}\g<2>', text)
assert n == 1, 'No se pudo actualizar el Program ID del frontend'
cfg.write_text(text)
print(f'Program ID sincronizado: {pid}')
PY

cp "$PROGRAM_KEYPAIR" target/deploy/motora-keypair.json
echo "Compilando con el Program ID real..."
anchor build

echo "Desplegando..."
LOG="evidence/devnet/deploy.log"
mkdir -p "$(dirname "$LOG")"
{
  echo "# Registro real de despliegue — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo '```text'
  solana program deploy --url "$MOTORA_RPC" --keypair "$MOTORA_KEYPAIR" \
    --program-id "$PROGRAM_KEYPAIR" target/deploy/motora.so 2>&1
  echo '```'
} | tee "$LOG"

node scripts/sync-idl.mjs
echo "Deployment finalizado. Program ID: $PROGRAM_ID"
echo "Siguiente paso: npm run devnet:init"
