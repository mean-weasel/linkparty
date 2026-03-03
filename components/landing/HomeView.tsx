'use client'

import { AppHome } from './AppHome'
import { LandingPage } from './LandingPage'

export function HomeView({ isAuthenticated }: { isAuthenticated: boolean }) {
  return isAuthenticated ? <AppHome /> : <LandingPage />
}
