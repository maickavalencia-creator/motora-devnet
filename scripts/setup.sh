#!/usr/bin/env bash
# Reproducible local environment setup (user-local, no sudo).
set -euo pipefail
source "$(dirname "$0")/env.sh"

echo "== MOTORA environment setup =="
need_tool curl
need_tool python3

if ! command -v rustup >/dev/null 2>&1; then
  echo "[1/5] Installing rustup + Rust 1.89.0"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.89.0
else
  echo "[1/5] rustup already installed"
fi
export PATH="$HOME/.cargo/bin:$PATH"
rustup toolchain install 1.89.0 --profile minimal >/dev/null
rustup default 1.89.0 >/dev/null

if ! command -v node >/dev/null 2>&1 || [ "$(node --version 2>/dev/null | cut -d. -f1)" -lt 20 ]; then
  echo "[2/5] Installing Node.js 22 LTS to ~/.local/node"
  mkdir -p "$HOME/.local/node"
  V=$(curl -sS https://nodejs.org/dist/latest-v22.x/ | grep -o 'node-v22[0-9.]*-linux-x64.tar.xz' | head -1)
  curl -sSfL "https://nodejs.org/dist/latest-v22.x/$V" | tar -xJ --strip-components=1 -C "$HOME/.local/node"
fi
export PATH="$HOME/.local/node/bin:$PATH"

if ! command -v solana >/dev/null 2>&1; then
  echo "[3/5] Installing Solana CLI 2.3.0"
  sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"
fi
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

if ! command -v anchor >/dev/null 2>&1; then
  echo "[4/5] Installing Anchor CLI 0.32.2"
  mkdir -p "$HOME/.local/bin"
  curl -sSfL https://github.com/solana-foundation/anchor/releases/download/v0.32.2/anchor-0.32.2-x86_64-unknown-linux-gnu \
    -o "$HOME/.local/bin/anchor"
  chmod +x "$HOME/.local/bin/anchor"
fi

echo "[5/5] Installing npm dependencies"
npm install --legacy-peer-deps --no-audit --no-fund

mkdir -p ~/.config/solana
if [ ! -f "$MOTORA_KEYPAIR" ]; then
  solana-keygen new --no-bip39-passphrase --silent -o "$MOTORA_KEYPAIR"
fi

echo
show_env
echo "Setup complete. Next: npm run idl:sync && anchor build && anchor test"
