import { jwtVerify } from "jose"
import { cookies } from "next/headers"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")

  if (!token) {
    return null
  }

  try {
    const verified = await jwtVerify(token.value, secret)
    return verified.payload
  } catch (err) {
    return null
  }
}
