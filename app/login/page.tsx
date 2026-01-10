export const dynamic = "force-dynamic";

import { signIn, signOut, useSession } from "next-auth/react"

export default function LoginButton() {
  const { data: session } = useSession()

  if (!session)
    return (
      <button onClick={() => signIn("google")}>
        Sign in with Google
      </button>
    )

  return (
    <>
      <p>Signed in as {session.user?.email}</p>
      <button onClick={() => signOut()}>Logout</button>
    </>
  )
}
