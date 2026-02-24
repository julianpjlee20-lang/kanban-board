import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const GET = toNextJsHandler(auth).GET
export const POST = toNextJsHandler(auth).POST
