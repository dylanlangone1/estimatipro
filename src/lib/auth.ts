import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = (credentials?.email as string)?.toLowerCase().trim()
          const password = credentials?.password as string

          if (!email || !password) return null

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) return null

          // Find user by email
          const user = await prisma.user.findFirst({
            where: { email },
          })

          if (!user || !user.password) {
            // User doesn't exist or has no password (Google-only user)
            return null
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(password, user.password)
          if (!passwordMatch) return null

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
          let dbUser = await prisma.user.findFirst({
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
