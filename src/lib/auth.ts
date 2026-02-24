import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Email Login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        try {
          const email = (credentials?.email as string)?.toLowerCase().trim()
          const name = (credentials?.name as string) || email?.split("@")[0] || "User"

          if (!email) return null

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) return null

          // Find existing user or create new account
          let user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
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
        } catch (error) {
          console.error("Credentials auth error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth: find or create user in database
      if (account?.provider === "google" && profile?.email) {
        try {
          const email = profile.email.toLowerCase().trim()
          let dbUser = await prisma.user.findUnique({
            where: { email },
          })

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email,
                name: profile.name || email.split("@")[0],
                image: profile.picture || null,
                tier: "FREE",
              },
            })
          } else if (profile.picture && !dbUser.image) {
            // Update image if user doesn't have one
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { image: profile.picture },
            })
          }

          // Attach DB user id to the user object for the jwt callback
          user.id = dbUser.id
        } catch (error) {
          console.error("Google signIn error:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
