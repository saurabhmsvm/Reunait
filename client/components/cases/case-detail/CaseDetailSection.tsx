import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface CaseDetailItem {
  label: string
  value?: string | null
  link?: string
  fullWidth?: boolean
  onClick?: () => void
  isClickable?: boolean
}

interface CaseDetailSection {
  title: string
  items: CaseDetailItem[]
}

interface CaseDetailSectionProps {
  sections: CaseDetailSection[]
  status?: 'success' | 'error'
  onRetry?: () => void
}

export function CaseDetailSection({ sections, status = 'success', onRetry }: CaseDetailSectionProps) {
  // Show error state with retry button
  if (status === 'error') {
    return (
      <Card className="border border-destructive/20 bg-destructive/5 shadow-sm rounded-xl">
        <CardContent className="pt-0 pb-0 px-5 py-8">
          <div className="text-center space-y-4">
            <div className="text-destructive font-semibold">
              Failed to load case details
            </div>
            <p className="text-muted-foreground text-sm">
              There was an error loading the case information. Please try again.
            </p>
            {onRetry && (
              <Button 
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show success state (normal content)
  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => {
        // Filter out items with null/undefined values
        const validItems = section.items.filter(item => item.value != null && item.value !== '')

        // Don't render section if no valid items
        if (validItems.length === 0) {
          return null
        }

        return (
          <Card key={sectionIndex} className="border border-border bg-card shadow-sm rounded-xl">
            <CardContent className="pt-0 pb-0 px-5 space-y-4">
              <div className="text-lg uppercase tracking-widest text-foreground font-extrabold pt-0 pb-2">
                {section.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {validItems.map((item, index) => (
                  <div key={index} className={`space-y-1.5 min-w-0 ${item.fullWidth ? 'sm:col-span-2' : ''}`}>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-muted-foreground break-words whitespace-pre-wrap leading-relaxed">
                      {item.link ? (
                        <a href={item.link} className="text-primary hover:underline break-words">
                          {item.value}
                        </a>
                      ) : item.onClick && item.isClickable ? (
                        <button
                          onClick={item.onClick}
                          className="text-primary hover:underline break-words cursor-pointer text-left"
                        >
                          {item.value}
                        </button>
                      ) : (
                        item.value
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
