import { afterEach, describe, expect, it, vi } from "vitest";
import { browserCoordinates, distanceInKilometers } from "./distance";

describe("distanceInKilometers", () => {
  it("returns zero for the same position", () => {
    expect(distanceInKilometers(
      { latitude: 50.0755, longitude: 14.4378 },
      { latitude: 50.0755, longitude: 14.4378 }
    )).toBe(0);
  });

  it("calculates the great-circle distance", () => {
    expect(distanceInKilometers(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 }
    )).toBeCloseTo(111.2, 1);
  });
});

describe("browserCoordinates", () => {
  it("resolves only the latitude and longitude returned by the browser", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({
      coords: { latitude: 50.1, longitude: 14.4 } as GeolocationCoordinates
    } as GeolocationPosition));

    await expect(browserCoordinates({ getCurrentPosition } as unknown as Geolocation)).resolves.toEqual({
      latitude: 50.1,
      longitude: 14.4
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });
});

describe("remembered location permission", () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup(state: PermissionState | null, saved: string | null = null) {
    const values = new Map<string, string>();
    if (saved) values.set("mamekurt-location-permission-v1", saved);
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    } });
    vi.stubGlobal("navigator", { permissions: state === null ? undefined : {
      query: vi.fn().mockResolvedValue({ state })
    } });
    return values;
  }

  it("remembers refusal across later searches and page loads", async () => {
    const values = setup("prompt");
    const getCurrentPosition = vi.fn((_success, failure) => failure({ code: 1 }));
    const geo = { getCurrentPosition } as unknown as Geolocation;
    await expect(browserCoordinates(geo)).rejects.toMatchObject({ code: 1 });
    expect(values.get("mamekurt-location-permission-v1")).toBe("denied");
    await expect(browserCoordinates(geo)).rejects.toMatchObject({ code: 1 });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it.each(["granted", "denied"])("does not re-prompt after saved %s when permission expires", async (saved) => {
    setup("prompt", saved);
    const getCurrentPosition = vi.fn();
    await expect(browserCoordinates({ getCurrentPosition } as unknown as Geolocation)).rejects.toMatchObject({ code: 1 });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("honors permission re-enabled in browser settings and stores no coordinates", async () => {
    const values = setup("granted", "denied");
    const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: 50.1, longitude: 14.4 } }));
    await expect(browserCoordinates({ getCurrentPosition } as unknown as Geolocation)).resolves.toEqual({ latitude: 50.1, longitude: 14.4 });
    expect([...values.values()]).toEqual(["granted"]);
  });

  it("respects browser denial without calling geolocation", async () => {
    setup("denied");
    const getCurrentPosition = vi.fn();
    await expect(browserCoordinates({ getCurrentPosition } as unknown as Geolocation)).rejects.toMatchObject({ code: 1 });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("does not save temporary failures as a refusal", async () => {
    const values = setup("prompt");
    const getCurrentPosition = vi.fn((_success, failure) => failure({ code: 3 }));
    const geo = { getCurrentPosition } as unknown as Geolocation;
    await expect(browserCoordinates(geo)).rejects.toMatchObject({ code: 3 });
    expect(values.size).toBe(0);
  });

  it("still works when storage and permission queries are blocked", async () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("blocked"); } });
    vi.stubGlobal("navigator", { permissions: { query: vi.fn().mockRejectedValue(new Error("unsupported")) } });
    const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: 50.1, longitude: 14.4 } }));
    await expect(browserCoordinates({ getCurrentPosition } as unknown as Geolocation)).resolves.toEqual({ latitude: 50.1, longitude: 14.4 });
  });

  it("respects a saved refusal without the Permissions API", async () => {
    setup(null, "denied");
    const getCurrentPosition = vi.fn();
    await expect(browserCoordinates({ getCurrentPosition } as unknown as Geolocation)).rejects.toMatchObject({ code: 1 });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
