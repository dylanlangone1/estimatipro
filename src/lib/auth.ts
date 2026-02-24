import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const name = (credentials?.name as string) || "Demo User"

        if (!email) return null

        // Only allow demo account via credentials — all other users must use Google OAuth
        const DEMO_EMAIL = "demo@estimaipro.com"
        if (email.toLowerCase() !== DEMO_EMAIL) {
          return null
        }

        // Find or create demo user
        let user = await prisma.user.findUnique({
          where: { email: DEMO_EMAIL },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: DEMO_EMAIL,
              name,
              tier: "FREE",
            },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
