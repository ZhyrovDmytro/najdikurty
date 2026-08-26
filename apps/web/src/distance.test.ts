import { describe, expect, it, vi } from "vitest";
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
