import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { BedDouble, CheckCircle2, Loader2, Mountain, Plus, Star, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  nearbyForLift,
  saveItinerary,
  searchLifts,
  type NearbyPlace,
} from "@/lib/ski/itinerary.functions";
import type { LiftEntry } from "@/lib/ski/lifts.types";

interface Props {
  startDate: string | null;
  endDate: string | null;
  totalDays: number;
}

type Lift = LiftEntry;

export function ItineraryBuilder({ startDate, endDate, totalDays }: Props) {
  const findLifts = useServerFn(searchLifts);
  const findNearby = useServerFn(nearbyForLift);
  const persist = useServerFn(saveItinerary);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lift[]>([]);
  const [lift, setLift] = useState<Lift | null>(null);
  const [hotels, setHotels] = useState<NearbyPlace[]>([]);
  const [rentals, setRentals] = useState<NearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [hotel, setHotel] = useState<NearbyPlace | null>(null);
  const [rental, setRental] = useState<NearbyPlace | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typed = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserId(session?.user.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!typed.current || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await findLifts({ data: { query: query.trim() } });
      setResults(res.lifts as Lift[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, findLifts]);

  const chooseLift = async (entry: Lift) => {
    typed.current = false;
    setLift(entry);
    setQuery(entry.name);
    setResults([]);
    setHotel(null);
    setRental(null);
    setHotels([]);
    setRentals([]);
    setError(null);
    setMessage(null);
    setLoadingNearby(true);
    try {
      const [h, r] = await Promise.all([
        findNearby({ data: { lat: entry.lat, lng: entry.lng, kind: "hotel", radiusM: 10000 } }),
        findNearby({ data: { lat: entry.lat, lng: entry.lng, kind: "rental", radiusM: 10000 } }),
      ]);
      setHotels(h.places);
      setRentals(r.places);
      if (h.error || r.error) setError(h.error ?? r.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ricerca non riuscita");
    } finally {
      setLoadingNearby(false);
    }
  };

  const datesReady = Boolean(startDate && endDate);
  const canSave = datesReady && Boolean(lift) && Boolean(hotel) && Boolean(rental);

  const save = async () => {
    if (!canSave || !lift || !hotel || !rental || !startDate || !endDate) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await persist({
        data: {
          userId: userId ?? undefined,
          dates: { startDate, endDate, totalDays },
          resort: {
            slug: lift.resort ?? String(lift.id),
            name: lift.resortName ?? lift.name,
            coordinates: { lat: lift.lat, lng: lift.lng },
          },
          selectedHotel: {
            provider: hotel.provider,
            placeId: hotel.placeId,
            name: hotel.name,
            rating: hotel.rating,
            address: hotel.address,
          },
          selectedRental: {
            provider: rental.provider,
            placeId: rental.placeId,
            name: rental.name,
            rating: rental.rating,
            address: rental.address,
          },
        },
      });
      setMessage("Itinerario salvato: lo trovi nella scheda Profilo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={query}
          placeholder="Cerca un impianto di risalita (es. Plateau Rosa, Cervinia)"
          onChange={(e) => {
            typed.current = true;
            setQuery(e.target.value);
          }}
        />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
            {results.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
                  onClick={() => chooseLift(entry)}
                >
                  <span className="font-medium">{entry.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {entry.resortName ?? entry.resort} · {entry.type ?? "impianto"}
                    {entry.active === false ? " · dismesso" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lift && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mountain className="h-4 w-4 text-primary" />
          {lift.name} · {lift.resortName ?? lift.resort} ({lift.lat.toFixed(4)},{" "}
          {lift.lng.toFixed(4)})
        </p>
      )}

      {loadingNearby && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cerco hotel e noleggi entro 10 km…
        </p>
      )}

      {lift && !loadingNearby && (
        <div className="grid gap-4 md:grid-cols-2">
          <PlaceList
            title="Dove dormire"
            icon={<BedDouble className="h-4 w-4 text-primary" />}
            places={hotels}
            selected={hotel}
            onSelect={setHotel}
          />
          <PlaceList
            title="Dove noleggiare l'attrezzatura"
            icon={<Store className="h-4 w-4 text-primary" />}
            places={rentals}
            selected={rental}
            onSelect={setRental}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      )}

      {!datesReady && (
        <p className="text-sm text-muted-foreground">
          Scegli prima le date di andata e ritorno nel calendario qui sopra.
        </p>
      )}

      {userId ? (
        <Button className="w-full sm:w-auto" disabled={!canSave || saving} onClick={save}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Aggiungi itinerario
        </Button>
      ) : (
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/auth" search={{ next: "/itinerario" }}>
            Accedi per salvare l'itinerario
          </Link>
        </Button>
      )}
    </div>
  );
}

function PlaceList({
  title,
  icon,
  places,
  selected,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  places: NearbyPlace[];
  selected: NearbyPlace | null;
  onSelect: (place: NearbyPlace) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
        {icon}
        {title}
      </div>
      {places.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nessun risultato entro 10 km.</p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
          {places.map((place) => (
            <li key={place.placeId}>
              <button
                type="button"
                onClick={() => onSelect(place)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selected?.placeId === place.placeId
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <span className="block text-sm font-medium text-foreground">{place.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {place.address}
                </span>
                {place.rating !== null && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-current text-primary" />
                    {place.rating.toFixed(1)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
