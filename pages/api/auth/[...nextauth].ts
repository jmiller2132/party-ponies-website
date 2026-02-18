import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Pages Router API route: NextAuth receives req.headers (middleware-set host works).
// App Router route was removed so /api/auth/* is handled here.
export default NextAuth(authOptions)
