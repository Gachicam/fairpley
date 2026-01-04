"use server";

interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

interface GeocodeResponse {
  result?: GeocodeResult;
  error?: string;
}

/**
 * 住所から座標を取得（サーバーサイド）
 */
export async function geocodeAddress(address: string): Promise<GeocodeResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { error: "Google Maps API キーが設定されていません" };
  }

  if (!address.trim()) {
    return { error: "住所を入力してください" };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=ja&region=jp`
    );
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0];
      return {
        result: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
        },
      };
    }

    if (data.status === "ZERO_RESULTS") {
      return { error: "住所が見つかりませんでした" };
    }

    return { error: `Geocoding エラー: ${data.status}` };
  } catch (error) {
    console.error("Geocoding error:", error);
    return { error: "住所の検索に失敗しました" };
  }
}
