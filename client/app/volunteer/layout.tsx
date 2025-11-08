import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
	const user = await currentUser()
	if (!user) redirect('/sign-in')
	const role = (user.publicMetadata as any)?.role
	if (role !== 'volunteer') redirect('/')

	return children
}


