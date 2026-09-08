import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, LogOut, MapPin, Mountain, Pencil, Route as RouteIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import resortsData from "@/data/resorts.json";
import {
  DEFAULT_PROFILE,
  LEVEL_LABELS,
  loadProfile,
  saveProfile,
  type SkiProfile,
} from "@/lib/ski/profile";
import { SavedItineraries } from "@/components/ski/SavedItineraries";
import type { SkierLevel } from "@/lib/ski/types";

type ResortLite = { id: string; name: string; region: string; total_ski_km: number };
const resorts = resortsData as unknown as ResortLite[];

export const Route = createFileRoute("/profilo")({
  head: () => ({
    meta: [
      { title: "Il tuo profilo sciatore — SkiScore" },
      {
        name: "description",
        content:
          "Livello sciatore, comprensori visitati, chilometri sciati e itinerari salvati: la tua dashboard SkiScore.",
      },
      { property: "og:title", content: "Il tuo profilo sciatore — SkiScore" },
      {
        property: "og:description",
        content: "Gestisci livello, badge dei comprensori visitati e itinerari preferiti.",
      },
    ],
  }),
  component: ProfilePage,
});

const LEVELS: SkierLevel[] = ["beginner", "intermediate", "advanced"];

function ProfilePage() {
  const [profile, setProfile] = useState<SkiProfile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  const update = (patch: Partial<SkiProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  };

  const toggleVisited = (id: string) => {
    const visited = profile.visitedResortIds.includes(id)
      ? profile.visitedResortIds.filter((v) => v !== id)
      : [...profile.visitedResortIds, id];
    update({ visitedResortIds: visited });
  };

  const visitedKm = resorts
    .filter((r) => profile.visitedResortIds.includes(r.id))
    .reduce((sum, r) => sum + r.total_ski_km, 0);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-card p-6 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-xl font-semibold text-primary">
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            {editing ? (
              <Input
                value={profile.name}
                onChange={(e) => update({ name: e.target.value })}
                className="max-w-56"
                aria-label="Nome utente"
              />
            ) : (
              <h1 className="truncate font-display text-2xl font-semibold text-foreground">
                {profile.name}
              </h1>
            )}
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {profile.loggedIn ? "Sessione attiva" : "Non hai effettuato l'accesso"} ·{" "}
              {LEVEL_LABELS[profile.level]}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-4 w-4" /> {editing ? "Fatto" : "Modifica"}
          </Button>
          <Button size="sm" onClick={() => update({ loggedIn: !profile.loggedIn })}>
            {profile.loggedIn ? (
              <>
                <LogOut className="h-4 w-4" /> Esci
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Accedi
              </>
            )}
          </Button>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Livello sciatore</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={profile.level === l}
              onClick={() => update({ level: l })}
              className={`rounded-xl border p-4 text-left text-sm font-semibold transition-colors ${
                profile.level === l
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-accent"
              }`}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <h2 className="min-w-0 truncate font-display text-lg font-semibold text-foreground">
            Comprensori visitati
          </h2>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {profile.visitedResortIds.length} badge · {visitedKm} km
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {resorts.map((r) => {
            const active = profile.visitedResortIds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleVisited(r.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Mountain className="h-4 w-4 shrink-0" />
                {r.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Itinerari salvati e preferiti
        </h2>
        {!ready || profile.saved.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
            <RouteIcon className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Non hai ancora salvato itinerari. Creane uno e salvalo dai risultati.
            </p>
            <Button asChild className="mt-4">
              <Link to="/itinerario">Crea itinerario</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {profile.saved.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.resortName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {s.label} · {new Date(s.date).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <a href={`/risultati${s.search}`}>Apri</a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Rimuovi ${s.resortName}`}
                    onClick={() => update({ saved: profile.saved.filter((x) => x.id !== s.id) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SavedItineraries />
    </main>
  );
}
