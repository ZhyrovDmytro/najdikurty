export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6_371;

export function distanceInKilometers(from: Coordinates, to: Coordinates): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export async function browserCoordinates(
  geolocation: Geolocation,
  options: PositionOptions = { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 20_000 }
): Promise<Coordinates> {
  let storage: Storage | undefined;
  let savedChoice: string | null = null;
  try {
    storage = window.localStorage;
    savedChoice = storage.getItem("mamekurt-location-permission-v1");
  } catch {
    // Location still works when browser storage is unavailable.
  }

  let permission: PermissionState | undefined;
  try {
    permission = (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch {
    // Some browsers cannot query geolocation permissions.
  }

  function remember(choice: "granted" | "denied") {
    try {
      storage?.setItem("mamekurt-location-permission-v1", choice);
    } catch {
      // The browser remains the authority when preferences cannot be saved.
    }
  }

  // A previous choice must not trigger another prompt if a one-time grant expires.
  if (permission === "denied" || (permission !== "granted" && (savedChoice === "denied" || savedChoice === "granted"))) {
    if (permission === "denied") remember("denied");
    throw Object.assign(new Error("Location access requires permission in browser site settings."), { code: 1 });
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        remember("granted");
        resolve({ latitude: coords.latitude, longitude: coords.longitude });
      },
      (error) => {
        if (error.code === 1) remember("denied");
        reject(error);
      },
      options
    );
  });
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}
