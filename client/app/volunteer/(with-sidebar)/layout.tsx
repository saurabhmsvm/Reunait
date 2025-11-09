import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppVolunteerSidebar } from '@/components/app-volunteer-sidebar'

export default async function VolunteerWithSidebarLayout({ children }: { children: React.ReactNode }) {
	const user = await currentUser()
	if (!user) redirect('/sign-in')
	const role = (user.publicMetadata as any)?.role
	if (role !== 'volunteer') notFound()

	return (
		<SidebarProvider>
			<AppVolunteerSidebar />
			<SidebarInset className="md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none">
				{/* Sticky local toolbar */}
				<div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
					<div className="flex h-12 items-center gap-2 px-3 sm:h-14 sm:px-4">
						<SidebarTrigger className="-ml-1" />
						<div className="text-sm font-medium text-muted-foreground">Volunteer Console</div>
						<div className="ml-auto flex items-center gap-2">
							{/* Right-side actions placeholder if needed */}
						</div>
					</div>
				</div>
				<main className="relative z-10 min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] bg-background">
					<div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-32">
						{children}
						</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}


