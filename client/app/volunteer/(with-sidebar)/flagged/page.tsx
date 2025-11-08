import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { FlaggedClient } from '@/components/volunteer/FlaggedClient'

export default async function FlaggedCasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  const role = (user.publicMetadata as any)?.role
  if (role !== 'volunteer') notFound()

  const sp = await searchParams
  const country = typeof sp.country === 'string' ? sp.country : 'all'

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Flagged Cases</h1>
      </div>

      <FlaggedClient initialCountry={country} />
    </div>
  )
}



