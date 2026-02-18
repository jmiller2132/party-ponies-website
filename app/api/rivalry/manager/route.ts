import { NextRequest, NextResponse } from "next/server"
import { getTopRivalriesForManager } from "@/lib/rivalry-utils"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const manager = searchParams.get("manager")

    if (!manager) {
      return NextResponse.json(
        { error: "Manager parameter is required" },
        { status: 400 }
      )
    }

    const rivalries = await getTopRivalriesForManager(manager, 20)

    return NextResponse.json({ rivalries })
  } catch (error) {
    console.error("Error fetching manager rivalries:", error)
    return NextResponse.json(
      { error: "Failed to fetch manager rivalries" },
      { status: 500 }
    )
  }
}
