'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Typography } from '@/components/ui/typography'
import { MessageSquare, Send, CheckCircle, AlertCircle, Quote } from 'lucide-react'

interface TestimonialFormData {
  name: string
  message: string
}

export default function TestimonialDialog() {
  const [formData, setFormData] = useState<TestimonialFormData>({
    name: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.3:3001'}/api/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSubmitStatus('success')
        setFormData({ name: '', message: '' })
        // Close dialog after 2 seconds
        setTimeout(() => {
          setIsOpen(false)
          setSubmitStatus('idle')
        }, 2000)
      } else {
        setSubmitStatus('error')
        setErrorMessage(result.message || 'Failed to submit testimonial')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.name.trim() && formData.message.trim()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="group relative overflow-hidden bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20 hover:border-primary/40 transition-all duration-300 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
          Share Your Story
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            Share Your Story
          </DialogTitle>
          <DialogDescription className="text-base">
            Write your testimonial directly on the card below. Click on the text areas to start typing.
          </DialogDescription>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <Typography variant="h3" className="text-green-600 dark:text-green-400 mb-2">
              Thank You!
            </Typography>
            <Typography variant="p" className="text-muted-foreground">
              Your testimonial has been submitted successfully.
            </Typography>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Interactive Testimonial Card */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <form onSubmit={handleSubmit}>
                  <div className="relative bg-gradient-to-br from-background via-background/95 to-muted/20 dark:from-background dark:via-background/90 dark:to-muted/10 backdrop-blur-sm border border-border/50 rounded-xl p-4 sm:p-6 shadow-lg h-full flex flex-col min-h-[250px] hover:border-primary/30 transition-all duration-300">
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/10 dark:from-primary/20 to-transparent rounded-bl-xl rounded-tr-xl"></div>
                    
                    {/* Quote icon */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 dark:bg-primary/25 rounded-full flex items-center justify-center shadow-sm shadow-primary/10 dark:shadow-primary/20 ring-1 ring-primary/10 dark:ring-primary/20">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                      </svg>
                    </div>

                    {/* Message - Direct editing */}
                    <div className="flex-1 mb-2 sm:mb-3 pl-6 sm:pl-8">
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Share your experience with our platform. How has it helped you or your family?"
                        required
                        maxLength={300}
                        className="w-full resize-none bg-transparent border-none p-0 text-xs sm:text-sm italic leading-relaxed text-foreground/80 placeholder:text-muted-foreground/50 focus:ring-0 focus:outline-none overflow-y-auto"
                        style={{ 
                          height: '120px',
                          maxHeight: '120px',
                          minHeight: '120px'
                        }}
                      />
                    </div>

                    {/* Name - Direct editing */}
                    <div className="mt-auto pt-3 sm:pt-4 border-t border-border/30">
                      <div className="text-right">
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your Name"
                          required
                          className="w-full text-right bg-transparent border-none p-0 font-accent text-sm sm:text-lg font-bold text-primary tracking-wide placeholder:text-primary/50 focus:ring-0 focus:outline-none"
                        />
                        <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-transparent to-primary/60 ml-auto mt-1"></div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Character counter and submit button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {formData.message.length}/300 characters
              </div>
              
              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 w-full sm:w-auto">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <Typography variant="small" className="text-red-600 dark:text-red-400">
                    {errorMessage}
                  </Typography>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                size="lg"
                className="w-full sm:w-auto hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                    Submit Testimonial
                  </>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <Typography variant="small" className="text-muted-foreground">
                💡 <strong>Tip:</strong> Click on the text areas above to start typing. Your testimonial will be reviewed before being published.
              </Typography>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
