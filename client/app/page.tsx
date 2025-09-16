import { Typography } from "@/components/ui/typography"
import { TextScramble } from "@/components/ui/text-scramble"
import { TracingBeam } from "@/components/ui/tracing-beam"
import { Search, Users, Shield, Heart,CheckCircle, ArrowRight, Sparkles, AlertTriangle } from "lucide-react"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import HeroSection from "@/components/hero-section"
import { HomepageService } from "@/lib/homepage-service"
import { InfiniteSlider } from "@/components/ui/infinite-slider"
import { ProgressiveBlur } from "@/components/ui/progressive-blur"
import TestimonialDialog from "@/components/testimonial-dialog"


const iconMap: Record<string, any> = {
  Search: Search,
  Users: Users,
  Shield: Shield,
  Heart: Heart,
}

// ISR Configuration - Regenerate page every 1 minute (60 seconds)
export const revalidate = 60

export default async function Home() {
  // Fetch homepage data from API (public endpoint, no auth required)
  const homepageResponse = await HomepageService.getHomepageData()
  
  const homepageData = homepageResponse.data

  // Sort sections by order and filter active ones
  const orderedSections = homepageData
    .filter(section => section.isActive)
    .sort((a, b) => a.order - b.order)

  // Render sections based on order
  const renderSection = (section: any) => {
    switch (section.section) {
      case "hero":
        return <HeroSection key={section.section} />
      
      case "features":
        return (
          <section key={section.section} className="py-20">
            <div className="container mx-auto px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
                    {section.title}
                  </Typography>
                  <Typography variant="lead" className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    {section.subtitle}
                  </Typography>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {section.data.features.map((feature: any, index: number) => {
                    const IconComponent = iconMap[feature.icon] || Search // Fallback to Search icon
                    
                    return (
                      <div key={index} className="group">
                        <div className="relative bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-6 sm:p-10 h-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-lg transition-all duration-200">
                          {/* Icon */}
                          <div className="mb-6 sm:mb-8 flex justify-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-primary/15 transition-all duration-200">
                              <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-primary transition-colors duration-200" />
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="text-center space-y-3 sm:space-y-4">
                            <Typography variant="h3" as="h3" className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 text-foreground transition-colors duration-200">
                              {feature.title}
                            </Typography>
                            <Typography variant="muted" className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                              {feature.description}
                            </Typography>
                          </div>
                          
                          {/* Hover indicator */}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-20 sm:group-hover:w-24 transition-all duration-200"></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )

      case "impact":
  return (
          <section key={section.section} className="pt-16 pb-12">
            <div className="container mx-auto px-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
                    {section.title}
                  </Typography>
                  <Typography variant="lead" className="text-xl text-muted-foreground">
                    {section.subtitle}
                  </Typography>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {section.data.stats.map((stat: any, index: number) => (
                    <div key={index} className="group">
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm border border-border/50 p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
                        {/* Background gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Content */}
                        <div className="relative text-center">
                          <TextScramble 
                            as="div"
                            className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-3 group-hover:scale-105 transition-transform duration-300 leading-none"
                            duration={1.2}
                            speed={0.03}
                          >
                            {stat.value}
                          </TextScramble>
                          <TextScramble 
                            as="div"
                            className="text-lg font-semibold text-muted-foreground/90 group-hover:text-foreground transition-colors duration-300"
                            duration={1.0}
                            speed={0.04}
                          >
                            {stat.label}
                          </TextScramble>
                        </div>
                        
                        {/* Subtle border accent */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )

      case "guidance":
        return (
          <section key={section.section} className="py-20">
            <div className="container mx-auto px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
                    {section.title}
                  </Typography>
                  <Typography variant="lead" className="text-xl text-muted-foreground">
                    {section.subtitle}
                  </Typography>
                </div>

                {/* Desktop Layout with Cards and TracingBeam */}
                <div className="relative">
                  <TracingBeam className="px-6 hidden md:block">
                    <div className="space-y-12">
                      {section.data.steps.map((step: any, index: number) => (
                        <div key={`${step.type}-${step.step}-${index}`} className="relative">
                          <div className={`flex flex-col md:flex-row items-start ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} md:justify-between gap-6 md:gap-12`}>
                            {/* Missing Person Steps */}
                            {step.type === "missing" && (
                              <div className="w-full md:w-[47%]">
                                <div className="relative rounded-2xl p-8 bg-gradient-to-br from-red-100 via-red-50 to-red-200/80 dark:from-red-950/40 dark:via-red-950/30 dark:to-red-900/20 backdrop-blur-sm border border-red-300/80 dark:border-red-800/40 transition-all duration-200 shadow-xl shadow-red-500/20 dark:shadow-red-500/20">
                                  <GlowingEffect
                                    blur={0}
                                    borderWidth={3}
                                    spread={80}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                  />
                                  {/* Modern Status Badge */}
                                  <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 dark:bg-red-500/25 text-red-700 dark:text-red-400 text-xs font-semibold uppercase tracking-wider border border-red-400/70 dark:border-red-600/40 backdrop-blur-sm shadow-md shadow-red-500/15">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Missing
                                  </div>
                                  
                                  <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-red-500/40 border border-red-400/30">
                                      <span className="text-white font-bold text-lg">{step.step}</span>
                                    </div>
                                    <div>
                                      <Typography variant="h4" as="h3" className="font-bold text-xl mb-3 text-red-900 dark:text-red-100 leading-tight">
                                        {step.title}
                                      </Typography>
                                      <Typography variant="muted" className="text-base leading-relaxed text-red-700 dark:text-red-300 font-medium">
                                        {step.description}
                                      </Typography>
                                    </div>
                                  </div>
                                </div>
        </div>
                            )}

                            {/* Found Person Steps */}
                            {step.type === "found" && (
                              <div className="w-full md:w-[47%]">
                                <div className="relative rounded-2xl p-8 bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-200/80 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border border-emerald-300/80 dark:border-emerald-800/40 transition-all duration-200 shadow-xl shadow-emerald-500/20 dark:shadow-emerald-500/20">
                                  <GlowingEffect
                                    blur={0}
                                    borderWidth={3}
                                    spread={80}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                  />
                                  {/* Modern Status Badge */}
                                  <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider border border-emerald-400/70 dark:border-emerald-600/40 backdrop-blur-sm shadow-md shadow-emerald-500/15">
                                    <CheckCircle className="w-3.5 h-3.5" /> Found
                                  </div>
                                  
                                  <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-emerald-500/40 border border-emerald-400/30">
                                      <span className="text-white font-bold text-lg">{step.step}</span>
                                    </div>
                                    <div>
                                      <Typography variant="h4" as="h3" className="font-bold text-xl mb-3 text-emerald-900 dark:text-emerald-100 leading-tight">
                                        {step.title}
                                      </Typography>
                                      <Typography variant="muted" className="text-base leading-relaxed text-emerald-700 dark:text-emerald-300 font-medium">
                                        {step.description}
                                      </Typography>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TracingBeam>
                </div>

                {/* Mobile Layout - Grouped, Premium Cards */}
                <div className="block md:hidden">
                  <div className="space-y-12">
                    {/* Missing Group */}
                    <div>
                      <div className="mb-5 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold border border-red-300/60">
                          <AlertTriangle className="w-4 h-4" /> Missing Person Cases
                        </div>
                      </div>
                      <div className="space-y-5">
                        {section.data.steps.filter((s: any) => s.type === 'missing').map((step: any, index: number) => (
                          <div key={`m-${step.step}-${index}`} className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-red-50 to-red-100/60 dark:from-red-950/40 dark:to-red-900/20 border border-red-200/70 dark:border-red-800/40 shadow-md shadow-red-500/10">
                            {/* Top divider shimmer */}
                            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                                <span className="font-bold text-base">{step.step}</span>
                              </div>
                              <div className="text-left">
                                <Typography variant="h4" as="h3" className="font-semibold text-base mb-1 text-red-900 dark:text-red-100 leading-tight">
                                  {step.title}
                                </Typography>
                                <Typography variant="muted" className="text-sm leading-relaxed text-red-700 dark:text-red-300">
                                  {step.description}
                                </Typography>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section separator */}
                    <div className="flex items-center justify-center">
                      <div className="h-px w-100 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>

                    {/* Found Group */}
                    <div>
                      <div className="mb-5 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-300/60">
                          <CheckCircle className="w-4 h-4" /> Found Person Cases
                        </div>
                      </div>
                      <div className="space-y-5">
                        {section.data.steps.filter((s: any) => s.type === 'found').map((step: any, index: number) => (
                          <div key={`f-${step.step}-${index}`} className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/40 shadow-md shadow-emerald-500/10">
                            {/* Top divider shimmer */}
                            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <span className="font-bold text-base">{step.step}</span>
                              </div>
                              <div className="text-left">
                                <Typography variant="h4" as="h3" className="font-semibold text-base mb-1 text-emerald-900 dark:text-emerald-100 leading-tight">
                                  {step.title}
                                </Typography>
                                <Typography variant="muted" className="text-sm leading-relaxed text-emerald-700 dark:text-emerald-300">
                                  {step.description}
                                </Typography>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )

      case "testimonials":
        return (
          <section key={section.section} className="py-20">
            <div className="container mx-auto px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
                    {section.title}
                  </Typography>
                  <Typography variant="lead" className="text-xl text-muted-foreground mb-8">
                    {section.subtitle}
                  </Typography>
                  
                  {/* Testimonial Dialog Button */}
                  <div className="flex justify-center">
                    <TestimonialDialog />
                  </div>
                </div>

                {/* Infinite horizontal slider using the new component */}
                <div className="relative overflow-hidden">
                  <div className="relative py-6">
                    <InfiniteSlider
                      speedOnHover={20}
                      speed={40}
                      gap={50}>
                      {section.data.testimonials.map((testimonial: any, index: number) => (
                        <div key={index} className="inline-flex w-[16rem] sm:w-[20rem] md:w-[24rem] lg:w-[26rem] shrink-0">
                          <div className="relative bg-gradient-to-br from-background via-background/95 to-muted/20 dark:from-background dark:via-background/90 dark:to-muted/10 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg h-full flex flex-col">
                            {/* Decorative corner accent - smaller on mobile */}
                            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-bl from-primary/10 dark:from-primary/20 to-transparent rounded-bl-xl sm:rounded-bl-2xl rounded-tr-xl sm:rounded-tr-2xl"></div>
                            
                            {/* Quote icon - smaller on mobile */}
                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 dark:bg-primary/25 rounded-full flex items-center justify-center shadow-sm shadow-primary/10 dark:shadow-primary/20 ring-1 ring-primary/10 dark:ring-primary/20">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                              </svg>
                            </div>
                            
                            <Typography variant="muted" className="text-xs sm:text-sm mb-4 sm:mb-6 italic leading-relaxed flex-grow pl-6 sm:pl-8 text-foreground/80">
                              {testimonial.message}
                            </Typography>
                            
                            {/* Name with accent typography - smaller on mobile */}
                            <div className="mt-auto pt-3 sm:pt-4 border-t border-border/30">
                              <div className="text-right">
                                <div className="font-accent text-sm sm:text-lg font-bold text-primary tracking-wide">
                                  {testimonial.name}
                                </div>
                                <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-transparent to-primary/60 ml-auto mt-1"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </InfiniteSlider>

                    <div className="bg-gradient-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                    <div className="bg-gradient-to-l from-background absolute inset-y-0 right-0 w-20"></div>
                    <ProgressiveBlur
                      className="pointer-events-none absolute left-0 top-0 h-full w-20"
                      direction="left"
                      blurIntensity={1}
                    />
                    <ProgressiveBlur
                      className="pointer-events-none absolute right-0 top-0 h-full w-20"
                      direction="right"
                      blurIntensity={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      {/* Render sections in order */}
      {orderedSections.map(renderSection)}

    </div>
  )
}
