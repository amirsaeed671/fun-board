import { auth } from "@/auth"

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/** Throws "UNAUTHORIZED" when there is no logged-in user. */
export async function requireUserId(): Promise<string> {
  const id = await getSessionUserId()
  if (!id) throw new Error("UNAUTHORIZED")
  return id
}
