"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { MotoraClient, explainError, hashVin } from "@motora/client";
import { PROGRAM_ID, VIN_SALT } from "./config";

export type AccountRow = { publicKey: string; account: any };
export type ActivityItem = {
  signature: string;
  action: string;
  address?: string;
  time: number;
};

const STORAGE_KEY = "motora.activity.v1";

function readActivity(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useMotora() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [rows, setRows] = useState<{
    protocol: any;
    motorcycles: AccountRow[];
    workshops: AccountRow[];
    services: AccountRow[];
    claims: AccountRow[];
  }>({ protocol: null, motorcycles: [], workshops: [], services: [], claims: [] });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>(readActivity);

  const client = useMemo(() => {
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    return new MotoraClient(provider, PROGRAM_ID);
  }, [connection, wallet]);

  const refresh = useCallback(async () => {
    const load = () =>
      Promise.all([
        client.protocol().catch(() => null),
        client.motorcycles(),
        client.workshops(),
        client.serviceRecords(),
        client.claims(),
      ]);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [protocol, motorcycles, workshops, services, claims] = await load();
        const serialize = (list: any[]): AccountRow[] =>
          list.map((r) => ({ publicKey: r.publicKey.toBase58(), account: r.account }));
        setRows({
          protocol,
          motorcycles: serialize(motorcycles),
          workshops: serialize(workshops),
          services: serialize(services),
          claims: serialize(claims),
        });
        return;
      } catch (err) {
        const text = explainError(err);
        const throttled = /429|too many requests/i.test(text);
        if (throttled && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
          continue;
        }
        setNotice({
          kind: "error",
          text: throttled
            ? "Devnet está limitando las consultas. Espera unos segundos y pulsa Actualizar."
            : text,
        });
        return;
      }
    }
  }, [client]);

  useEffect(() => {
    // Sin auto-refresh: el RPC público de Devnet limita a ~5 llamadas por ventana
    // y cada refresh hace varias peticiones `all()`. La UI se actualiza al firmar
    // una transacción y mediante el botón "Actualizar" de la cabecera.
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (action: string, fn: () => Promise<{ signature: string; address?: any }>) => {
      if (!wallet.publicKey) {
        setNotice({ kind: "error", text: "Conecta tu wallet para firmar la transacción." });
        return null;
      }
      setBusy(true);
      setNotice(null);
      try {
        const result = await fn();
        const item: ActivityItem = {
          signature: result.signature,
          action,
          address: result.address?.toBase58?.(),
          time: Date.now(),
        };
        setActivity((prev) => {
          const next = [item, ...prev].slice(0, 60);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
        setNotice({
          kind: "ok",
          text: `${action} confirmada en Devnet: ${result.signature.slice(0, 16)}…`,
        });
        await refresh();
        return result;
      } catch (err) {
        setNotice({ kind: "error", text: explainError(err) });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [wallet.publicKey, refresh],
  );

  const myAddress = wallet.publicKey?.toBase58();
  const mine = {
    motorcycles: rows.motorcycles.filter((r) => r.account.owner.toBase58() === myAddress),
    workshops: rows.workshops.filter((r) => r.account.authority.toBase58() === myAddress),
    services: rows.services.filter(
      (r) =>
        r.account.authority.toBase58() === myAddress ||
        rows.motorcycles.some(
          (m) => m.publicKey === r.account.motorcycle.toBase58() && m.account.owner.toBase58() === myAddress,
        ),
    ),
    claims: rows.claims.filter((r) => {
      const ws = rows.workshops.find((w) => w.publicKey === r.account.workshop.toBase58());
      return (
        r.account.claimant.toBase58() === myAddress ||
        ws?.account.authority.toBase58() === myAddress
      );
    }),
  };

  return {
    client,
    wallet,
    connection,
    rows,
    mine,
    busy,
    notice,
    activity,
    refresh,
    run,
    hashVin: (vin: string) => hashVin(vin, VIN_SALT),
  };
}
