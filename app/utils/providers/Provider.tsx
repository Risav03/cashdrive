'use client'
import { AppProvider } from "@/app/context/AppContext"
import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

export const Provider = ({children}:{children:ReactNode}) => {
    return (
        <SessionProvider>
            <AppProvider>
                {children}
            </AppProvider>
        </SessionProvider>
    )
}