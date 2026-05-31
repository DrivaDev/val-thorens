const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.websiteUri,places.id';

// Las 7 queries predefinidas para cubrir los tipos de empleadores de Val Thorens
const VAL_THORENS_QUERIES = [
  'hotels Val Thorens',
  'restaurants Val Thorens',
  'bars Val Thorens',
  'ski schools Val Thorens',
  'shops Val Thorens',
  'nightclubs Val Thorens',
  'chalets Val Thorens',
];

export interface Employer {
  placeId: string;
  name: string;
  address: string;
  website: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverEmployers(): Promise<Employer[]> {
  const allEmployers = new Map<string, Employer>(); // dedup por placeId
  // WR-04: contador global de requests para aplicar rate limit entre queries también
  let requestCount = 0;

  for (const query of VAL_THORENS_QUERIES) {
    try {
      let pageToken: string | undefined;
      let page = 0;

      do {
        // DISC-05: rate limit 1 req/s — aplicar entre todas las requests, no solo entre páginas
        if (requestCount > 0) await sleep(1000);
        requestCount++;

        const bodyPayload: Record<string, unknown> = { textQuery: query, pageSize: 20 };
        if (pageToken) bodyPayload.pageToken = pageToken;

        const res = await fetch(PLACES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
            'X-Goog-FieldMask': FIELD_MASK + ',nextPageToken',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!res.ok) {
          console.error(`[places] HTTP ${res.status} para query "${query}"`);
          break;
        }

        const data = await res.json();

        for (const place of data.places ?? []) {
          const employer: Employer = {
            placeId: place.id,
            name: place.displayName?.text ?? 'Unknown',
            address: place.formattedAddress ?? '',
            website: place.websiteUri ?? null,
          };
          allEmployers.set(employer.placeId, employer); // DISC-04: dedup por placeId
        }

        pageToken = data.nextPageToken;
        page++;
      } while (pageToken && page < 3); // DISC-03: máx 3 páginas = 60 resultados por query

    } catch (err) {
      console.error(`[places] Error en query "${query}":`, err);
      // CLAUDE.md: log y continuar — nunca abortar el discovery completo
    }
  }

  return Array.from(allEmployers.values());
}
