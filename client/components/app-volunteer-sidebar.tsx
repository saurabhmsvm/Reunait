"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar"
import { ShieldCheck, Flag } from "lucide-react"

const items = [
	{ title: "Verifications", href: "/volunteer/verifications", icon: ShieldCheck },
	{ title: "Flagged Cases", href: "/volunteer/flagged", icon: Flag },
]

export function AppVolunteerSidebar() {
	const pathname = usePathname()
	const { isLoading: isNavLoading, mounted, startLoading } = useNavigationLoader()

	return (
		<>
			{isNavLoading && mounted && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
					<SimpleLoader />
				</div>
			)}
		<Sidebar
			variant="inset"
			collapsible="offcanvas"
		>
			<SidebarHeader>
				<div className="px-2 py-1.5 text-sm font-semibold">Volunteer</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
						Moderation
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => {
								const isActive = pathname?.startsWith(item.href)
								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton asChild isActive={Boolean(isActive)} tooltip={item.title} className="text-sm font-medium">
											<Link href={item.href} onClick={() => startLoading({ expectRouteChange: true })} aria-current={isActive ? 'page' : undefined} className="flex items-center gap-2">
												<item.icon className="h-5 w-5" />
												<span className="truncate leading-6">{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
		</>
	)
}


