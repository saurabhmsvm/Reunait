import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

interface FeaturesSectionProps {
  title: string
  subtitle: string
  features: Feature[]
}

export function FeaturesSection({ title, subtitle, features }: FeaturesSectionProps) {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <Typography variant="h2" as="h2" className="mb-4">{title}</Typography>
        <Typography variant="lead" className="text-muted-foreground">
          {subtitle}
        </Typography>
      </div>
      
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {features.map((feature, index) => (
           <Card key={index} className="text-center hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader>
                             <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit hover:bg-primary/20 transition-colors">
                 <feature.icon className="h-6 w-6 text-primary" />
               </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
} 