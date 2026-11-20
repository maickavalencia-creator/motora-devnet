"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Activity, ArrowUpRight, Bike, CheckCircle2, CircleDot, ClipboardCheck,
  ExternalLink, Gauge, LockKeyhole, Plus, RefreshCw, ShieldCheck,
  Wrench, XCircle,
} from "lucide-react";
import { useMotora, type AccountRow } from "@/lib/useMotora";
import { PROGRAM_ID, EXPLORER_CLUSTER, explorerAddress, explorerTx, short } from "@/lib/config";

type Tab = "dashboard" | "motorcycles" | "workshops" | "maintenance" | "warranties" | "activity";

const TABS: { id: Tab; label: string; icon: typeof Bike }[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "motorcycles", label: "Mis motocicletas", icon: Bike },
  { id: "workshops", label: "Talleres", icon: Wrench },
  { id: "maintenance", label: "Mantenimiento", icon: ClipboardCheck },
  { id: "warranties", label: "Garantías", icon: ShieldCheck },
  { id: "activity", label: "Actividad", icon: Activity },
];

const status = (value: any) => Object.keys(value || {})[0] || "—";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  );
}

function TxLink({ signature }: { signature: string }) {
  return (
    <a href={explorerTx(signature)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-acid hover:underline">
      {short(signature, 8)} <ExternalLink size={12} />
    </a>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-edge px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export default function Home() {
  const m = useMotora();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const connected = !!m.wallet.publicKey;
  const my = m.mine;

  const card = (title: string, value: any, hint: string, icon: React.ReactNode) => (
    <div className="card animate-rise p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted">{title}</span>
        <span className="text-acid/80">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );

  const needWallet = (message = "Conecta tu wallet para ejecutar esta operación") => {
    if (!connected) {
      m.run("Verificación de wallet", async () => { throw new Error(message); });
      return true;
    }
    return false;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-acid/40 bg-acid/10 shadow-glow">
            <Bike size={22} className="text-acid" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[.22em]">MOTORA</h1>
            <p className="text-[11px] uppercase tracking-[.18em] text-muted">Verifiable maintenance ledger</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="tag border-acid/30 bg-acid/10 text-acid">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-acid" /> DEVNET
          </span>
          <span className="hidden font-mono text-[11px] text-muted sm:inline" title={PROGRAM_ID.toBase58()}>
            {short(PROGRAM_ID.toBase58(), 6)}
          </span>
          <WalletMultiButton />
        </div>
      </header>

      {m.notice && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          m.notice.kind === "ok" ? "border-acid/30 bg-acid/5 text-acid" : "border-ember/30 bg-ember/5 text-ember"
        }`}>
          {m.notice.kind === "ok" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span className="flex-1">{m.notice.text}</span>
          <button onClick={() => m.refresh()} className="opacity-70 hover:opacity-100" title="Actualizar">
            <RefreshCw size={14} className={m.busy ? "animate-spin" : ""} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <nav className="scroll-thin mb-8 flex gap-1 overflow-x-auto border-b border-edge pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === t.id ? "border-acid text-acid" : "border-transparent text-muted hover:text-white"
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </nav>

      {/* Dashboard */}
      {tab === "dashboard" && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {card("Mis motocicletas", my.motorcycles.length, "Registradas con tu wallet", <Bike size={20} />)}
            {card("Mis intervenciones", my.services.length, "Servicios vinculados", <Wrench size={20} />)}
            {card("Pendientes", my.services.filter((r) => status(r.account.status) === "pending").length, "Aún no finalizados", <CircleDot size={20} />)}
            {card("Garantías abiertas", my.claims.filter((r) => status(r.account.status) === "open").length, "Reclamaciones activas", <ShieldCheck size={20} />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-6 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.14em] text-muted">Estado del protocolo</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Motocicletas", m.rows.protocol?.totalMotorcycles?.toString() ?? "—"],
                  ["Activas", m.rows.protocol?.activeMotorcycles?.toString() ?? "—"],
                  ["Talleres", m.rows.protocol?.totalWorkshops?.toString() ?? "—"],
                  ["Servicios", m.rows.protocol?.totalServiceRecords?.toString() ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-edge bg-black/30 p-4">
                    <p className="text-2xl font-semibold">{v}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{k}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted">
                Cada cifra se lee desde la cuenta <span className="font-mono text-slate-300">Protocol</span> en {EXPLORER_CLUSTER}.
                Las reclamaciones de garantía se vinculan a mantenimientos finalizados y se resuelven solo en el program, nunca en esta interfaz.
              </p>
            </div>
            <div className="card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.14em] text-muted">Actividad reciente</h2>
              {m.activity.length === 0 ? (
                <Empty>Aún no hay transacciones firmadas desde este navegador.</Empty>
              ) : (
                <ul className="space-y-3">
                  {m.activity.slice(0, 4).map((a) => (
                    <li key={a.signature} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-slate-300">{a.action}</span>
                      <TxLink signature={a.signature} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Motorcycles */}
      {tab === "motorcycles" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-5 text-lg font-semibold">Registrar motocicleta</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              if (needWallet()) return;
              const vin = form.vin || "";
              if (vin.trim().length < 6) {
                m.run("validar VIN", async () => { throw new Error("El VIN debe tener al menos 6 caracteres"); });
                return;
              }
              const identifierHash = await m.hashVin(vin);
              await m.run("Registro de motocicleta", () =>
                m.client.registerMotorcycle({
                  owner: m.wallet.publicKey!,
                  identifierHash,
                  brand: form.brand || "",
                  model: form.model || "",
                  year: Number(form.year || new Date().getFullYear()),
                  initialMileage: Number(form.mileage || 0),
                }),
              );
              setForm({});
            }}>
              <Field label="VIN (nunca se guarda en la chain)"><input className="field" value={form.vin || ""} onChange={(e) => set("vin")(e.target.value)} placeholder="JH2PC4000M1000001" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Marca"><input className="field" value={form.brand || ""} onChange={(e) => set("brand")(e.target.value)} placeholder="Honda" /></Field>
                <Field label="Modelo"><input className="field" value={form.model || ""} onChange={(e) => set("model")(e.target.value)} placeholder="CB500F" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Año"><input className="field" type="number" value={form.year || ""} onChange={(e) => set("year")(e.target.value)} placeholder="2023" /></Field>
                <Field label="Kilometraje inicial"><input className="field" type="number" value={form.mileage || ""} onChange={(e) => set("mileage")(e.target.value)} placeholder="0" /></Field>
              </div>
              <button className="btn-primary w-full" disabled={m.busy}><Plus size={16} /> Registrar en Devnet</button>
            </form>
          </div>
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold">Actualizar / archivar</h2>
              {my.motorcycles.length === 0 ? <Empty>Aún no registras motocicletas.</Empty> : (
                <div className="space-y-4">
                  <Field label="Motocicleta">
                    <Select value={form.editBike || ""} onChange={set("editBike")}>
                      <option value="">Selecciona…</option>
                      {my.motorcycles.map((b) => (
                        <option key={b.publicKey} value={b.publicKey}>
                          {b.account.brand} {b.account.model} · {short(b.publicKey, 4)} {b.account.active ? "" : "(archivada)"}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    if (needWallet()) return;
                    const bike = my.motorcycles.find((b) => b.publicKey === form.editBike);
                    if (!bike) return;
                    await m.run("Actualización de motocicleta", () =>
                      m.client.updateMotorcycle({
                        owner: m.wallet.publicKey!,
                        identifierHash: new Uint8Array(bike.account.identifierHash),
                        brand: form.editBrand || bike.account.brand,
                        model: form.editModel || bike.account.model,
                        mileage: Number(form.editMileage || bike.account.currentMileage),
                      }),
                    );
                  }}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Marca"><input className="field" value={form.editBrand || ""} onChange={(e) => set("editBrand")(e.target.value)} placeholder="Nueva marca" /></Field>
                      <Field label="Modelo"><input className="field" value={form.editModel || ""} onChange={(e) => set("editModel")(e.target.value)} placeholder="Nuevo modelo" /></Field>
                    </div>
                    <Field label="Kilometraje"><input className="field" type="number" value={form.editMileage || ""} onChange={(e) => set("editMileage")(e.target.value)} placeholder="Debe ser >= al actual" /></Field>
                    <button className="btn-ghost w-full" disabled={m.busy}><RefreshCw size={15} /> Actualizar datos</button>
                  </form>
                  <button
                    className="btn-danger w-full"
                    disabled={m.busy}
                    onClick={async () => {
                      if (needWallet()) return;
                      const bike = my.motorcycles.find((b) => b.publicKey === form.editBike);
                      if (!bike) return;
                      await m.run("Archivado condicionado", () =>
                        m.client.archiveMotorcycle({
                          owner: m.wallet.publicKey!,
                          identifierHash: new Uint8Array(bike.account.identifierHash),
                        }),
                      );
                    }}
                  >
                    <LockKeyhole size={15} /> Archivar (sin garantías ni servicios pendientes)
                  </button>
                </div>
              )}
            </div>
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold">Historial on-chain</h2>
              {m.rows.motorcycles.length === 0 ? <Empty>Sin registros en la red.</Empty> : (
                <ul className="scroll-thin max-h-64 space-y-3 overflow-y-auto">
                  {m.rows.motorcycles.map((b: AccountRow) => {
                    const pending = m.rows.services.filter((s) => s.account.motorcycle.toBase58() === b.publicKey && status(s.account.status) === "pending").length;
                    return (
                      <li key={b.publicKey} className="rounded-xl border border-edge bg-black/30 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{b.account.brand} {b.account.model}</span>
                          <span className={`tag ${b.account.active ? "border-acid/30 bg-acid/10 text-acid" : "border-slate-600 text-muted"}`}>
                            {b.account.active ? "ACTIVA" : "ARCHIVADA"}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          <a href={explorerAddress(b.publicKey)} target="_blank" rel="noreferrer" className="hover:text-acid">{short(b.publicKey, 8)}</a>
                          {" · "}{b.account.year} · {b.account.currentMileage.toString()} km · {b.account.serviceCount.toString()} servicios · {pending} pendientes
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Workshops */}
      {tab === "workshops" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-5 text-lg font-semibold">Registrar taller</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              if (needWallet()) return;
              await m.run("Registro de taller", () =>
                m.client.registerWorkshop({ authority: m.wallet.publicKey!, name: form.wsName || "" }),
              );
              setForm({});
            }}>
              <Field label="Nombre del taller"><input className="field" value={form.wsName || ""} onChange={(e) => set("wsName")(e.target.value)} placeholder="MOTORA Premium Service" /></Field>
              <button className="btn-primary w-full" disabled={m.busy}><Plus size={16} /> Registrar taller</button>
            </form>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              La PDA del taller deriva de la autoridad: una wallet solo puede registrar y controlar un taller.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Talleres en la red</h2>
            {m.rows.workshops.length === 0 ? <Empty>No hay talleres registrados.</Empty> : (
              <ul className="space-y-3">
                {m.rows.workshops.map((w) => {
                  const isMine = w.account.authority.toBase58() === myAddress(m);
                  return (
                    <li key={w.publicKey} className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-black/30 p-4">
                      <div>
                        <p className="font-semibold">{w.account.name}</p>
                        <p className="font-mono text-[11px] text-muted">
                          <a href={explorerAddress(w.publicKey)} target="_blank" rel="noreferrer" className="hover:text-acid">{short(w.publicKey, 6)}</a>
                          {" · "}{w.account.servicesCompleted.toString()} servicios · {w.account.claimsResolved.toString()} garantías
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`tag ${w.account.active ? "border-acid/30 bg-acid/10 text-acid" : "border-ember/30 bg-ember/10 text-ember"}`}>
                          {w.account.active ? "ACTIVO" : "INACTIVO"}
                        </span>
                        {isMine && (
                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            disabled={m.busy}
                            onClick={async () => {
                              if (needWallet()) return;
                              await m.run("Cambio de estado de taller", () =>
                                m.client.setWorkshopStatus({ authority: m.wallet.publicKey!, active: !w.account.active }),
                              );
                            }}
                          >
                            {w.account.active ? "Desactivar" : "Activar"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Maintenance */}
      {tab === "maintenance" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-5 text-lg font-semibold">Nueva intervención</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              if (needWallet()) return;
              const bike = m.rows.motorcycles.find((b) => b.publicKey === form.svcBike);
              if (!bike) return;
              await m.run("Creación de mantenimiento", () =>
                m.client.createServiceRecord({
                  authority: m.wallet.publicKey!,
                  identifierHash: new Uint8Array(bike.account.identifierHash),
                  motorcycle: bike.publicKey,
                  recordId: bike.account.serviceCount.toNumber() + 1,
                  mileage: Number(form.svcMileage || 0),
                  serviceType: form.svcType || "",
                  description: form.svcDesc || "",
                }),
              );
              setForm({});
            }}>
              <Field label="Motocicleta">
                <Select value={form.svcBike || ""} onChange={set("svcBike")}>
                  <option value="">Selecciona…</option>
                  {m.rows.motorcycles.filter((b) => b.account.active).map((b) => (
                    <option key={b.publicKey} value={b.publicKey}>{b.account.brand} {b.account.model} · {short(b.publicKey, 4)}</option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo de servicio"><input className="field" value={form.svcType || ""} onChange={(e) => set("svcType")(e.target.value)} placeholder="Cambio de aceite" /></Field>
                <Field label="Kilometraje"><input className="field" type="number" value={form.svcMileage || ""} onChange={(e) => set("svcMileage")(e.target.value)} placeholder="15000" /></Field>
              </div>
              <Field label="Descripción"><textarea className="field" rows={3} value={form.svcDesc || ""} onChange={(e) => set("svcDesc")(e.target.value)} placeholder="Detalles de la intervención" /></Field>
              <button className="btn-primary w-full" disabled={m.busy}><Plus size={16} /> Crear mantenimiento</button>
            </form>
          </div>
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Registros de mantenimiento</h2>
            {m.rows.services.length === 0 ? <Empty>Sin intervenciones registradas.</Empty> : (
              <ul className="scroll-thin max-h-[540px] space-y-3 overflow-y-auto">
                {m.rows.services.map((s) => (
                  <ServiceCard key={s.publicKey} row={s} m={m} set={set} form={form} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Warranties */}
      {tab === "warranties" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-5 text-lg font-semibold">Nueva reclamación de garantía</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              if (needWallet()) return;
              const svc = m.rows.services.find((s) => s.publicKey === form.claimSvc);
              if (!svc) return;
              await m.run("Reclamación de garantía", () =>
                m.client.createWarrantyClaim({
                  claimant: m.wallet.publicKey!,
                  motorcycle: svc.account.motorcycle,
                  serviceRecord: svc.publicKey,
                  claimId: svc.account.claimCount.toNumber() + 1,
                  description: form.claimDesc || "",
                }),
              );
              setForm({});
            }}>
              <Field label="Mantenimiento finalizado">
                <Select value={form.claimSvc || ""} onChange={set("claimSvc")}>
                  <option value="">Selecciona…</option>
                  {m.rows.services
                    .filter((s) => status(s.account.status) === "finalized" && !s.account.openClaim)
                    .map((s) => (
                      <option key={s.publicKey} value={s.publicKey}>
                        #{s.account.recordId.toString()} · {s.account.serviceType} · {short(s.publicKey, 4)}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Motivo"><textarea className="field" rows={4} value={form.claimDesc || ""} onChange={(e) => set("claimDesc")(e.target.value)} placeholder="Describe el problema cubierto por la garantía" /></Field>
              <button className="btn-primary w-full" disabled={m.busy}><ShieldCheck size={16} /> Abrir reclamación</button>
            </form>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Regla original MOTORA: solo el propietario puede reclamar, el servicio debe estar finalizado y
              la ventana de 90 días debe estar abierta. Solo el taller responsable puede resolverla.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Reclamaciones</h2>
            {m.rows.claims.length === 0 ? <Empty>No hay reclamaciones.</Empty> : (
              <ul className="scroll-thin max-h-[540px] space-y-3 overflow-y-auto">
                {m.rows.claims.map((c) => (
                  <li key={c.publicKey} className="rounded-xl border border-edge bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`tag ${status(c.account.status) === "open" ? "border-ember/40 bg-ember/10 text-ember" : "border-acid/30 bg-acid/10 text-acid"}`}>
                        {status(c.account.status).toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] text-muted">{short(c.publicKey, 6)}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{c.account.description}</p>
                    {c.account.resolution && <p className="mt-2 text-xs text-muted">Resolución: {c.account.resolution}</p>}
                    <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
                      moto {short(c.account.motorcycle.toBase58(), 4)} · servicio {short(c.account.serviceRecord.toBase58(), 4)} · reclamante {short(c.account.claimant.toBase58(), 4)}
                    </p>
                    {status(c.account.status) === "open" && isWorkshopAuthority(m, c.account.workshop.toBase58()) && (
                      <div className="mt-3 flex gap-2">
                        <input className="field" value={form[`res-${c.publicKey}`] || ""} onChange={(e) => set(`res-${c.publicKey}`)(e.target.value)} placeholder="Resolución del taller" />
                        <button className="btn-primary shrink-0" disabled={m.busy} onClick={async () => {
                          if (needWallet()) return;
                          await m.run("Resolución de garantía", () =>
                            m.client.resolveWarrantyClaim({
                              authority: m.wallet.publicKey!,
                              motorcycle: c.account.motorcycle,
                              serviceRecord: c.account.serviceRecord,
                              warrantyClaim: c.publicKey,
                              resolution: form[`res-${c.publicKey}`] || "Resuelta por el taller",
                            }),
                          );
                        }}>Resolver</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Activity */}
      {tab === "activity" && (
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Explorador de actividad</h2>
            <a href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=${EXPLORER_CLUSTER}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-acid hover:underline">
              Programa en Explorer <ArrowUpRight size={13} />
            </a>
          </div>
          {m.activity.length === 0 ? (
            <Empty>Las transacciones firmadas desde este navegador aparecerán aquí con su firma y enlace a Explorer.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted">
                  <tr><th className="py-2">Operación</th><th>Firma</th><th>Cuenta</th><th>Fecha</th></tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {m.activity.map((a) => (
                    <tr key={a.signature}>
                      <td className="py-3 pr-4">{a.action}</td>
                      <td className="py-3 pr-4"><TxLink signature={a.signature} /></td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-muted">{a.address ? short(a.address, 6) : "—"}</td>
                      <td className="py-3 text-xs text-muted">{new Date(a.time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-6 text-[11px] text-muted">
        <span>MOTORA · Solana Devnet · programa {short(PROGRAM_ID.toBase58(), 8)}</span>
        <span className="inline-flex items-center gap-1"><LockKeyhole size={12} /> Nunca pedimos claves privadas ni frases semilla</span>
      </footer>
    </main>
  );
}

function myAddress(m: ReturnType<typeof useMotora>) {
  return m.wallet.publicKey?.toBase58();
}

function isWorkshopAuthority(m: ReturnType<typeof useMotora>, workshop: string) {
  return m.rows.workshops.some(
    (w) => w.publicKey === workshop && w.account.authority.toBase58() === myAddress(m),
  );
}

function ServiceCard({ row, m, set, form }: {
  row: AccountRow;
  m: ReturnType<typeof useMotora>;
  set: (key: string) => (value: string) => void;
  form: Record<string, string>;
}) {
  const s = row.account;
  const isPending = status(s.status) === "pending";
  const canEdit = s.authority.toBase58() === myAddress(m);
  return (
    <li className="rounded-xl border border-edge bg-black/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{s.serviceType}</span>
        <span className={`tag ${isPending ? "border-ember/40 bg-ember/10 text-ember" : "border-acid/30 bg-acid/10 text-acid"}`}>
          {status(s.status).toUpperCase()}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">{s.description}</p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
        moto {short(s.motorcycle.toBase58(), 5)} · {s.mileage.toString()} km · #{s.recordId?.toString() ?? "—"}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <a href={explorerAddress(row.publicKey)} target="_blank" rel="noreferrer" className="text-[11px] text-acid hover:underline">
          Ver cuenta <ExternalLink size={11} className="inline" />
        </a>
        {isPending && canEdit && (
          <>
            <button
              className="btn-ghost ml-auto px-3 py-1.5 text-xs"
              disabled={m.busy}
              onClick={async () => {
                const motorcycle = m.rows.motorcycles.find((b) => b.publicKey === s.motorcycle.toBase58());
                if (!motorcycle) return;
                await m.run("Actualización de mantenimiento", () =>
                  m.client.updateServiceRecord({
                    authority: m.wallet.publicKey!,
                    motorcycle: motorcycle.publicKey,
                    serviceRecord: row.publicKey,
                    mileage: Number(form[`upd-mile-${row.publicKey}`] || s.mileage.toString()),
                    serviceType: form[`upd-type-${row.publicKey}`] || s.serviceType,
                    description: form[`upd-desc-${row.publicKey}`] || s.description,
                  }),
                );
              }}
            >Guardar</button>
            <button
              className="btn-primary px-3 py-1.5 text-xs"
              disabled={m.busy}
              onClick={async () => {
                const motorcycle = m.rows.motorcycles.find((b) => b.publicKey === s.motorcycle.toBase58());
                if (!motorcycle) return;
                await m.run("Finalización de mantenimiento", () =>
                  m.client.finalizeServiceRecord({
                    authority: m.wallet.publicKey!,
                    motorcycle: motorcycle.publicKey,
                    serviceRecord: row.publicKey,
                  }),
                );
              }}
            >Finalizar</button>
          </>
        )}
      </div>
      {isPending && canEdit && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input className="field" value={form[`upd-type-${row.publicKey}`] || ""} onChange={(e) => set(`upd-type-${row.publicKey}`)(e.target.value)} placeholder="Tipo" />
          <input className="field" type="number" value={form[`upd-mile-${row.publicKey}`] || ""} onChange={(e) => set(`upd-mile-${row.publicKey}`)(e.target.value)} placeholder="Km" />
          <input className="field col-span-2" value={form[`upd-desc-${row.publicKey}`] || ""} onChange={(e) => set(`upd-desc-${row.publicKey}`)(e.target.value)} placeholder="Descripción" />
        </div>
      )}
    </li>
  );
}
