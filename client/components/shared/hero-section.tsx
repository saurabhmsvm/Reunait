import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"

interface HeroSectionProps {
  title: string
  subtitle: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function HeroSection({ 
  title, 
  subtitle, 
  description, 
  primaryAction, 
  secondaryAction 
}: HeroSectionProps) {
  return (
    <section className="text-center py-16">
      <Typography variant="h1" as="h1" className="mb-6">
        {title}
        <span className="block text-3xl md:text-4xl text-muted-foreground mt-2">
          {subtitle}
        </span>
      </Typography>
      <Typography variant="lead" className="mb-8 max-w-2xl mx-auto">
        {description}
      </Typography>
      
             {(primaryAction || secondaryAction) && (
         <div className="flex flex-col sm:flex-row gap-4 justify-center">
           {primaryAction && (
             <Button size="lg" className="text-lg px-8 hover:scale-105 transition-transform" onClick={primaryAction.onClick}>
               {primaryAction.label}
             </Button>
           )}
           {secondaryAction && (
             <Button variant="outline" size="lg" className="text-lg px-8 hover:scale-105 transition-transform" onClick={secondaryAction.onClick}>
               {secondaryAction.label}
             </Button>
           )}
         </div>
       )}
    </section>
  )
} 