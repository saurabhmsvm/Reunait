"use client"

import { Vortex } from "@/components/ui/vortex"
import { Typography } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { APP_FEATURES, APP_STATS } from "@/lib/constants"
import { Search, Users, Shield, Heart } from "lucide-react"

export default function Home() {
  const handleLearnMore = () => {}
  const handleViewCases = () => { window.location.href = "/cases" }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section with Vortex (demo settings) */}
      <div className="relative h-screen overflow-hidden">
        <Vortex
          backgroundColor="transparent"
          rangeY={800}
          particleCount={500}
          baseHue={120}
          baseSpeed={0.0}
          rangeSpeed={0.8}
          baseRadius={1.8}
          rangeRadius={2.8}
          containerClassName="absolute inset-0 w-full h-full"
          className="relative z-20 flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-full"
        >
          <section className="relative w-full h-full">
            {/* removed scrim overlay for clean background */}
            <div className="relative container mx-auto px-6 py-24 lg:py-32 h-full flex items-center">
              <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                  <Typography variant="h1" as="h1" className="text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                    Reuniting Families
                    <span className="block text-2xl lg:text-3xl font-normal text-muted-foreground mt-4">
                      Through Advanced Technology
                    </span>
                  </Typography>
                  <Typography variant="lead" className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                    Join thousands of volunteers using AI-powered facial recognition to help find missing persons and bring families back together.
                  </Typography>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                  <Button 
                    size="default" 
                    className="text-base px-8 py-4 h-auto font-semibold shadow-lg rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0" 
                    onClick={handleViewCases}
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Search Cases
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="text-base px-8 py-4 h-auto font-semibold border-2 rounded-xl" 
                    onClick={handleLearnMore}
                  >
                    Learn More
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Trusted by Law Enforcement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>10,000+ Volunteers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    <span>500+ Families Reunited</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Vortex>
      </div>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
                How We Help
              </Typography>
              <Typography variant="lead" className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our platform combines cutting-edge technology with community support to create the most effective missing persons search system.
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {APP_FEATURES.map((feature, index) => (
                <div key={index} className="group relative">
                  <div className="rounded-xl p-8 h-full">
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <Typography variant="h4" as="h3" className="font-semibold mb-3">
                      {feature.title}
                    </Typography>
                    <Typography variant="muted" className="text-sm leading-relaxed">
                      {feature.description}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
                Our Impact
              </Typography>
              <Typography variant="lead" className="text-xl text-muted-foreground">
                Real results from real people working together
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {APP_STATS.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="rounded-xl p-8">
                    <div className="text-4xl font-bold text-primary mb-3">
                      {stat.value}
                    </div>
                    <Typography variant="muted" className="text-sm font-medium">
                      {stat.label}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
              Ready to Make a Difference?
            </Typography>
            <Typography variant="lead" className="text-xl mb-8 opacity-90">
              Join our community of volunteers and help reunite families today.
            </Typography>
            <Button
              size="default"
              variant="secondary"
              className="text-base px-8 py-4 h-auto font-semibold shadow-lg rounded-xl"
              onClick={handleViewCases}
            >
              <Search className="w-5 h-5 mr-2" />
              Start Searching
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
