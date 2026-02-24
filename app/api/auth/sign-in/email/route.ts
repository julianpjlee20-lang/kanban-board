import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 }
    )
  }

  try {
    const session = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers()
    })

    return NextResponse.json(session)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Invalid credentials" },
      { status: 401 }
    )
  }
}
