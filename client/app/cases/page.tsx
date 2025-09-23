import { CasesSection } from "@/components/cases/cases-section"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full md:max-w-none lg:max-w-screen-2xl px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 py-0 -mt-4">
        <CasesSection />
      </div>
    </div>
  )
}