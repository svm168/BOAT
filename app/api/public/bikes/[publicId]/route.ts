import { NextResponse } from "next/server";
import { getPublicBike } from "@/lib/bikes";

type Params = { params: Promise<{ publicId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { publicId } = await params;
  const bike = await getPublicBike(publicId.toLowerCase());
  if (!bike) return NextResponse.json({ error: "Unknown bicycle." }, { status: 404 });
  return NextResponse.json({ bike });
}
