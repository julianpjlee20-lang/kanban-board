import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, password } = body

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Name, email and password are required" },
      { status: 400 }
    )
  }

  try {
    const session = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers()
    })

    return NextResponse.json(session)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Sign up failed" },
      { status: 400 }
    )
  }
}
