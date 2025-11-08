import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { VerificationsClient } from '@/components/volunteer/VerificationsClient'

export default async function VerificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  const role = (user.publicMetadata as any)?.role
  if (role !== 'volunteer') notFound()

  const sp = await searchParams
  const country = typeof sp.country === 'string' ? sp.country : 'all'

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Verifications</h1>
      </div>

      <VerificationsClient initialCountry={country} />
    </div>
  )
}


