"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { PhoneInput } from "@/components/ui/phone-input"
import { CountriesStatesService } from "@/lib/countries-states"
import { useToast } from "@/contexts/toast-context"
import { User, MapPin, Camera, FileText, Shield } from "lucide-react"
import { ImageUploadDropzone } from "@/components/cases/image-upload-dropzone"
import { countries } from "countries-list"
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader"
import { IconSquareRoundedX } from "@tabler/icons-react"

// Loading states for multi-step loader
const loadingStates = [
  {
    text: "Validating case information",
  },
  {
    text: "Checking case reference number uniqueness",
  },
  {
    text: "Scanning images for content safety",
  },
  {
    text: "Processing and optimizing images",
  },
  {
    text: "Analyzing case details",
  },
  {
    text: "Uploading images to secure storage",
  },
  {
    text: "Storing case in secure database",
  },
  {
    text: "Setting up AI matching system",
  },
  {
    text: "Finalizing case registration and encryption",
  },
];

// Validation schema
const schema = z
  .object({
    // Personal Information
    fullName: z.string().min(1, "Full name is required"),
    age: z.string().min(1, "Age is required").regex(/^\d+$/, "Age must be a number"),
    gender: z.enum(["male", "female", "other"]),
    contactNumber: z.string().min(8, "Enter a valid phone number"),
    height: z.string().min(1, "Height is required"),
    complexion: z.string().min(1, "Complexion is required"),
    identificationMark: z.string().optional().refine((val) => {
      if (!val) return true
      // Check character count (max 100 characters)
      if (val.length > 100) return false
      // Allow only letters, numbers, spaces, commas, periods, and common punctuation
      return /^[a-zA-Z0-9\s,.\-()]+$/.test(val)
    }, "Maximum 100 characters allowed. Only letters, numbers, spaces, and basic punctuation"),
    
    // Case Details
    status: z.enum(["missing", "found"]),
    dateMissingFound: z.string().min(1, "Date is required"),
    description: z.string().optional().refine((val) => {
      if (!val) return true
      // Check character count (max 250 characters)
      if (val.length > 250) return false
      // Allow only letters, numbers, spaces, commas, periods, and common punctuation
      return /^[a-zA-Z0-9\s,.\-()!?]+$/.test(val)
    }, "Maximum 250 characters allowed. Only letters, numbers, spaces, and basic punctuation"),
    reward: z.string().optional().refine((val) => {
      if (!val) return true
      // Only allow numbers (including decimals)
      return /^\d+(\.\d{1,2})?$/.test(val)
    }, "Reward amount must be a valid number"),
    
    // Location Information
    address: z.string().min(1, "Address is required"),
    country: z.string().min(1, "Country is required"),
    state: z.string().optional(),
    city: z.string().optional(),
    pincode: z.string().min(1, "Pincode is required"),
    landMark: z.string().optional().refine((val) => {
      if (!val) return true
      // Check character count (max 75 characters)
      if (val.length > 75) return false
      return true
    }, "Maximum 75 characters allowed"),
    
    // Police Information
    FIRNumber: z.string().min(1, "Case Reference Number is required"),
    policeStationName: z.string().min(1, "Police Station Name is required"),
    policeStationCountry: z.string().min(1, "Police station country is required"),
    policeStationState: z.string().optional(),
    policeStationCity: z.string().optional(),
    policeStationPincode: z.string().min(1, "Police Station Postal Code is required"),
    
    // Images
    images: z.array(z.instanceof(File)).min(1, "At least 1 image is required").max(2, "Maximum 2 images allowed"),
    
    // Police bypass option
    bypassVerification: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    
    // Case Reference Number validation if provided
    if (val.FIRNumber && val.FIRNumber.trim() !== "") {
      if (!/^[A-Za-z0-9\- ]+$/.test(val.FIRNumber.trim()) || val.FIRNumber.trim().length < 2) {
        ctx.addIssue({ 
          path: ["FIRNumber"], 
          code: z.ZodIssueCode.custom, 
          message: "Case reference number must contain only letters, numbers, dashes, and spaces (minimum 2 characters)" 
        })
      }
    }

    // Main location validation (cascading dropdowns)
    const selectedCountry = (val.country || "").trim()
    const selectedState = (val.state || "").trim()
    const selectedCity = (val.city || "").trim()
    
    // If any location field is filled, validate the cascading requirements
    if (selectedCountry || selectedState || selectedCity || (val.pincode && val.pincode.trim())) {
      // Country is always required for location
      if (!selectedCountry) {
        ctx.addIssue({ path: ["country"], code: z.ZodIssueCode.custom, message: "Country is required" })
      } else {
        // If country is selected, check state requirement
        const availableStates = CountriesStatesService.getStates(selectedCountry)
        if (availableStates.length > 0) {
          if (!selectedState) {
            ctx.addIssue({ path: ["state"], code: z.ZodIssueCode.custom, message: "State is required" })
          } else {
            // If state is selected, check city requirement
            const availableCities = CountriesStatesService.getCities(selectedCountry, selectedState)
            if (availableCities.length > 0) {
              if (!selectedCity) {
                ctx.addIssue({ path: ["city"], code: z.ZodIssueCode.custom, message: "City is required" })
              }
            }
          }
        }
      }
    }

    // Police station location validation (same as onboarding)
    const selectedPoliceCountry = (val.policeStationCountry || "").trim()
    const selectedPoliceState = (val.policeStationState || "").trim()
    const selectedPoliceCity = (val.policeStationCity || "").trim()
    
    // If any police location field is filled, validate the cascading requirements
    if (selectedPoliceCountry || selectedPoliceState || selectedPoliceCity || (val.policeStationPincode && val.policeStationPincode.trim())) {
      // Police country is always required for police location
      if (!selectedPoliceCountry) {
        ctx.addIssue({ path: ["policeStationCountry"], code: z.ZodIssueCode.custom, message: "Police station country is required" })
      } else {
        // If police country is selected, check state requirement
        const availablePoliceStates = CountriesStatesService.getStates(selectedPoliceCountry)
        if (availablePoliceStates.length > 0) {
          if (!selectedPoliceState) {
            ctx.addIssue({ path: ["policeStationState"], code: z.ZodIssueCode.custom, message: "Police station state is required" })
          } else {
            // If police state is selected, check city requirement
            const availablePoliceCities = CountriesStatesService.getCities(selectedPoliceCountry, selectedPoliceState)
            if (availablePoliceCities.length > 0) {
              if (!selectedPoliceCity) {
                ctx.addIssue({ path: ["policeStationCity"], code: z.ZodIssueCode.custom, message: "Police station city is required" })
              }
            }
          }
        }
      }
    }
  })

type FormValues = z.infer<typeof schema>

// Helper function to get currency code based on country using countries-list library
const getCurrencyForCountry = (country: string): string => {
  // Find the country by name in the countries-list
  const countryEntry = Object.values(countries).find(
    (countryData) => countryData.name === country
  )
  
  if (countryEntry && countryEntry.currency) {
    // Get the currency code (currency is an array, take the first one)
    const currencyCode = Array.isArray(countryEntry.currency) 
      ? countryEntry.currency[0] 
      : countryEntry.currency
    
    return currencyCode
  }
  
  return 'INR' // Default to Indian Rupee code if country not found
}


export default function RegisterCasePage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const { showSuccess, showError } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Location state
  const [countries, setCountries] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  
  // Police location state
  const [policeStates, setPoliceStates] = useState<string[]>([])
  const [policeCities, setPoliceCities] = useState<string[]>([])

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      age: "",
      gender: "male",
      contactNumber: "",
      height: "",
      complexion: "",
      identificationMark: "",
      status: "missing",
      dateMissingFound: new Date().toISOString().split('T')[0],
      description: "",
      reward: "",
      address: "",
      country: "",
      state: "",
      city: "",
      pincode: "",
      landMark: "",
      FIRNumber: "",
      policeStationName: "",
      policeStationCountry: "",
      policeStationState: "",
      policeStationCity: "",
      policeStationPincode: "",
      images: [],
      bypassVerification: false,
    },
    mode: "onBlur",
  })

  // Set basic user data from Clerk
  useEffect(() => {
    if (user) {
      const basicProfile = {
        phoneNumber: user.phoneNumbers?.[0]?.phoneNumber || "",
        role: (user.publicMetadata as any)?.role || "general_user"
      }
      setUserProfile(basicProfile)
      form.setValue("contactNumber", basicProfile.phoneNumber)
    }
  }, [user, form])

  // Load countries
  useEffect(() => {
    const allCountries = CountriesStatesService.getCountries()
    setCountries(allCountries)
  }, [])

  // Memoize watched values to prevent excessive re-renders
  const watchedCountry = form.watch("country")
  const watchedState = form.watch("state")
  const watchedStatus = form.watch("status")
  const watchedHeight = form.watch("height")
  const watchedDateMissingFound = form.watch("dateMissingFound")
  
  // Police location watched values
  const watchedPoliceCountry = form.watch("policeStationCountry")
  const watchedPoliceState = form.watch("policeStationState")
  
  

  // Handle country change
  useEffect(() => {
    if (!watchedCountry) {
      setStates([])
      setCities([])
      form.setValue("state", "", { shouldValidate: true })
      form.setValue("city", "", { shouldValidate: true })
      return
    }
    const newStates = CountriesStatesService.getStates(watchedCountry)
    setStates(newStates)
    setCities([])
    form.setValue("state", "", { shouldValidate: true })
    form.setValue("city", "", { shouldValidate: true })
  }, [watchedCountry, form])

  // Handle state change
  useEffect(() => {
    if (!watchedCountry || !watchedState) {
      setCities([])
      form.setValue("city", "", { shouldValidate: true })
      return
    }
    const newCities = CountriesStatesService.getCities(watchedCountry, watchedState)
    setCities(newCities)
    form.setValue("city", "", { shouldValidate: true })
  }, [watchedCountry, watchedState, form])

  // Handle police country change
  useEffect(() => {
    if (!watchedPoliceCountry) {
      setPoliceStates([])
      setPoliceCities([])
      form.setValue("policeStationState", "", { shouldValidate: true })
      form.setValue("policeStationCity", "", { shouldValidate: true })
      return
    }
    const newPoliceStates = CountriesStatesService.getStates(watchedPoliceCountry)
    setPoliceStates(newPoliceStates)
    setPoliceCities([])
    form.setValue("policeStationState", "", { shouldValidate: true })
    form.setValue("policeStationCity", "", { shouldValidate: true })
  }, [watchedPoliceCountry, form])

  // Handle police state change
  useEffect(() => {
    if (!watchedPoliceCountry || !watchedPoliceState) {
      setPoliceCities([])
      form.setValue("policeStationCity", "", { shouldValidate: true })
      return
    }
    const newPoliceCities = CountriesStatesService.getCities(watchedPoliceCountry, watchedPoliceState)
    setPoliceCities(newPoliceCities)
    form.setValue("policeStationCity", "", { shouldValidate: true })
  }, [watchedPoliceCountry, watchedPoliceState, form])


  // Calculate form completion percentage
  const calculateProgress = () => {
    const fields = [
      'fullName', 'age', 'gender', 'contactNumber', 'status', 'dateMissingFound',
      'country', 'state', 'city', 'pincode', 'images'
    ]
    const completedFields = fields.filter(field => {
      const value = form.watch(field as keyof FormValues)
      if (field === 'images') return Array.isArray(value) && value.length === 2
      return value && value.toString().trim() !== ""
    })
    return Math.round((completedFields.length / fields.length) * 100)
  }

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true)
      setLoading(true)
      const token = await getToken()
      if (!token) {
        showError("Not authenticated. Please sign in again.")
        setLoading(false)
        return
      }

      // Create FormData for file upload
      const formData = new FormData()
      
      // Add all form fields with default values for missing fields
      Object.entries(values).forEach(([key, value]) => {
        if (key === 'images') {
          // Handle images separately
          values.images.forEach((file, index) => {
            formData.append('images', file)
          })
        } else if (key === 'reward') {
          // Handle reward specially - only send if user filled it, with currency suffix
          if (value !== undefined && value !== null && value !== "") {
            const currency = getCurrencyForCountry(values.country || "")
            formData.append(key, `${value} ${currency}`)
          }
          // Don't send reward field if empty
        } else {
          // Send the value or default empty string for missing fields
          const fieldValue = (value !== undefined && value !== null && value !== "") ? value.toString() : ""
          formData.append(key, fieldValue)
        }
      })

      // User ID will be automatically extracted from Clerk auth context on backend

      // Add reportedBy based on user role
      const userRole = userProfile?.role || 'general_user'
      formData.append('reportedBy', userRole)

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.1.3:3001"
      const response = await fetch(`${base}/auth/registerCase`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      
      if (data.status === true) {
        showSuccess(data.message || "Case registered successfully!")
        // Small delay to show the final loading state
        setTimeout(() => {
          setLoading(false)
          router.push(`/cases/${data.caseId}`)
        }, 1000)
      } else {
        setLoading(false)
        showError(data.message || "Failed to register case. Please try again.")
        // Stay on the same page to allow user to retry
      }
    } catch (error) {
      console.error("Registration error:", error)
      setLoading(false)
      showError("Unable to register case. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }


  const progress = calculateProgress()

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-10 lg:py-14 max-w-6xl">
      {/* Multi Step Loader */}
      <Loader loadingStates={loadingStates} loading={loading} duration={1500} />

      <div className="w-full">
        {/* Form */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 lg:p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Register a Case</h1>
              <p className="text-sm lg:text-base text-muted-foreground mt-1">
                Help us find missing persons or report found individuals. Every detail matters.
              </p>
              
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.5 : 1 }}>
              {/* Personal Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Provide details about the person
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input 
                      id="fullName" 
                      placeholder="Enter full name" 
                      {...form.register("fullName")}
                      aria-invalid={!!form.formState.errors.fullName}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age *</Label>
                      <Input 
                        id="age" 
                        placeholder="Enter age" 
                        type="number"
                        min="0"
                        max="150"
                        {...form.register("age")}
                        aria-invalid={!!form.formState.errors.age}
                      />
                      {form.formState.errors.age && (
                        <p className="text-xs text-destructive">{form.formState.errors.age.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Height *</Label>
                      <Select 
                        value={watchedHeight || "not-specified"} 
                        onValueChange={(v) => form.setValue("height", v === "not-specified" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select height" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="not-specified">Not specified</SelectItem>
                          {Array.from({ length: 81 }, (_, i) => {
                            const cm = (i * 2) + 50 // 50cm to 210cm, increment by 2
                            return (
                              <SelectItem key={cm} value={`${cm} cm`}>
                                {cm} cm
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    {/* Mobile: Dropdown */}
                    <div className="block md:hidden">
                      <Select 
                        value={form.watch("gender")} 
                        onValueChange={(v) => form.setValue("gender", v as FormValues["gender"], { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Desktop: Radio buttons */}
                    <div className="hidden md:block">
                      <RadioGroup
                        value={form.watch("gender")}
                        onValueChange={(v) => form.setValue("gender", v as FormValues["gender"], { shouldValidate: true })}
                        className="flex flex-wrap gap-4"
                      >
                        {(() => {
                          const gender = form.watch("gender")
                          const base = "flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer transition-colors"
                          const selected = (k: FormValues["gender"]) => gender === k ? "border-primary bg-accent/20" : "hover:bg-muted/50"
                          return (
                            <>
                              <Label className={`${base} ${selected("male")}`}>
                                <RadioGroupItem className="cursor-pointer" value="male" />
                                <span>Male</span>
                              </Label>
                              <Label className={`${base} ${selected("female")}`}>
                                <RadioGroupItem className="cursor-pointer" value="female" />
                                <span>Female</span>
                              </Label>
                              <Label className={`${base} ${selected("other")}`}>
                                <RadioGroupItem className="cursor-pointer" value="other" />
                                <span>Other</span>
                              </Label>
                            </>
                          )
                        })()}
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Contact Number *</Label>
                      <PhoneInput
                        value={form.watch("contactNumber")}
                        onChange={(val: string) => form.setValue("contactNumber", val, { shouldValidate: true })}
                        defaultCountry="IN"
                        autoPrefixDialCode
                      />
                      {form.formState.errors.contactNumber && (
                        <p className="text-xs text-destructive">{form.formState.errors.contactNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complexion">Complexion *</Label>
                      <Select value={form.watch("complexion") || ""} onValueChange={(v) => form.setValue("complexion", v, { shouldValidate: true })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select complexion" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="wheatish">Wheatish</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="olive">Olive</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.complexion && (
                        <p className="text-xs text-destructive">{form.formState.errors.complexion.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identificationMark">Identification Mark</Label>
                    <Textarea 
                      id="identificationMark" 
                      placeholder="Any distinctive marks, scars, tattoos, etc." 
                      maxLength={100}
                      {...form.register("identificationMark")}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.watch("identificationMark")?.length || 0}/100 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Case Details Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Case Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {watchedStatus === "missing" 
                      ? "Information about when the person went missing"
                      : "Information about when the person was found"
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <RadioGroup
                      value={form.watch("status")}
                      onValueChange={(v) => form.setValue("status", v as FormValues["status"], { shouldValidate: true })}
                      className="flex flex-wrap gap-4"
                    >
                      {(() => {
                        const status = form.watch("status")
                        const base = "flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer transition-colors"
                        const selected = (k: FormValues["status"]) => status === k ? "border-primary bg-accent/20" : "hover:bg-muted/50"
                        return (
                          <>
                            <Label className={`${base} ${selected("missing")}`}>
                              <RadioGroupItem className="cursor-pointer" value="missing" />
                              <span>Missing Person</span>
                            </Label>
                            <Label className={`${base} ${selected("found")}`}>
                              <RadioGroupItem className="cursor-pointer" value="found" />
                              <span>Found Person</span>
                            </Label>
                          </>
                        )
                      })()}
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>
                        {watchedStatus === "missing" ? "Date Missing *" : "Date Found *"}
                      </Label>
                      {(() => {
                        const date = watchedDateMissingFound ? new Date(watchedDateMissingFound) : undefined
                        return (
                          <DatePicker
                            date={date}
                            onDateChange={(d) => {
                              if (!d) return form.setValue("dateMissingFound", "", { shouldValidate: true })
                              const yyyy = d.getFullYear()
                              const mm = String(d.getMonth() + 1).padStart(2, "0")
                              const dd = String(d.getDate()).padStart(2, "0")
                              form.setValue("dateMissingFound", `${yyyy}-${mm}-${dd}`, { shouldValidate: true })
                            }}
                            placeholder={`Select ${watchedStatus === "missing" ? "missing" : "found"} date`}
                            captionLayout="dropdown"
                          />
                        )
                      })()}
                      {form.formState.errors.dateMissingFound && (
                        <p className="text-xs text-destructive">{form.formState.errors.dateMissingFound.message}</p>
                      )}
                    </div>

                    {watchedStatus === "missing" && (
                      <div className="space-y-2">
                        <Label htmlFor="reward">Reward Amount</Label>
                        <Input 
                          id="reward" 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter reward amount (e.g., 1000)" 
                          {...form.register("reward")}
                          aria-invalid={!!form.formState.errors.reward}
                        />
                        {form.formState.errors.reward && (
                          <p className="text-xs text-destructive">{form.formState.errors.reward.message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Anything about the case or person..." 
                      maxLength={250}
                      {...form.register("description")}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.watch("description")?.length || 0}/250 characters
                    </p>
                  </div>

                </CardContent>
              </Card>

              {/* Location Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {watchedStatus === "missing" 
                      ? "Where the person was last seen"
                      : "Where the person was found"
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">

                  {/* Address field */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input 
                      id="address" 
                      placeholder="House No, Building, Street, Area" 
                      {...form.register("address")}
                      aria-invalid={!!form.formState.errors.address}
                    />
                    {form.formState.errors.address && (
                      <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                    )}
                  </div>

                  {/* Location grid matching onboarding layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Country</Label>
                      <Select value={form.watch("country") || ""} onValueChange={(v) => form.setValue("country", v, { shouldValidate: true })}>
                        <SelectTrigger className="h-10 w-full px-3 rounded-md border bg-background text-sm truncate cursor-pointer">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {countries.map((country) => (
                            <SelectItem key={country} value={country} className="text-sm">
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.country && (
                        <p className="text-xs text-destructive">{form.formState.errors.country.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={form.watch("state") || ""} onValueChange={(v) => form.setValue("state", v, { shouldValidate: true })} disabled={!states.length}>
                        <SelectTrigger className="h-10 w-full px-3 rounded-md border bg-background text-sm truncate cursor-pointer">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {states.map((state) => (
                            <SelectItem key={state} value={state} className="text-sm">
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.state && (
                        <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label>City</Label>
                      <Select value={form.watch("city") || ""} onValueChange={(v) => form.setValue("city", v, { shouldValidate: true })} disabled={!cities.length}>
                        <SelectTrigger className="h-10 w-full px-3 rounded-md border bg-background text-sm truncate cursor-pointer">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {cities.map((city) => (
                            <SelectItem key={city} value={city} className="text-sm">
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.city && (
                        <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Postal code</Label>
                      <Input 
                        id="pincode" 
                        className="h-10 w-full"
                        placeholder="Enter postal code"
                        {...form.register("pincode")}
                        aria-invalid={!!form.formState.errors.pincode}
                      />
                      {form.formState.errors.pincode && (
                        <p className="text-xs text-destructive">{form.formState.errors.pincode.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="landMark">Landmark</Label>
                    <Input 
                      id="landMark" 
                      placeholder="Nearby landmark or area" 
                      maxLength={75}
                      {...form.register("landMark")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.watch("landMark")?.length || 0}/75 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Image Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Upload Images *
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload 2 clear photos of the person
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ImageUploadDropzone
                    images={form.watch("images")}
                    onImagesChange={(images) => form.setValue("images", images, { shouldValidate: true })}
                    error={form.formState.errors.images?.message}
                    maxImages={2}
                  />

                  {user?.publicMetadata?.role === "police" && (
                    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/40">
                      <input
                        type="checkbox"
                        id="bypassVerification"
                        checked={form.watch("bypassVerification")}
                        onChange={(e) => form.setValue("bypassVerification", e.target.checked)}
                        className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor="bypassVerification"
                        className="text-sm font-medium cursor-pointer select-none"
                      >
                        Bypass AI verification
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Police Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Police Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Additional details for case tracking
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="FIRNumber">Case Reference Number *</Label>
                      <Input 
                        id="FIRNumber" 
                        placeholder="Enter case reference number" 
                        {...form.register("FIRNumber")}
                        aria-invalid={!!form.formState.errors.FIRNumber}
                      />
                      {form.formState.errors.FIRNumber && (
                        <p className="text-xs text-destructive">{form.formState.errors.FIRNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policeStationName">Police Station Name *</Label>
                      <Input 
                        id="policeStationName" 
                        placeholder="Enter police station name" 
                        {...form.register("policeStationName")}
                      />
                    </div>
                  </div>

                  {/* Police Station Location */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Police Station Location</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="policeStationCountry">Country *</Label>
                        <Select 
                          value={form.watch("policeStationCountry") || ""} 
                          onValueChange={(v) => form.setValue("policeStationCountry", v, { shouldValidate: true })}
                        >
                          <SelectTrigger className="h-10 w-full px-3 rounded-md border bg-background text-sm truncate cursor-pointer">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {countries.map((country) => (
                              <SelectItem key={country} value={country} className="text-sm">
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.policeStationCountry && (
                          <p className="text-xs text-destructive">{form.formState.errors.policeStationCountry.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="policeStationState">State</Label>
                        <Select 
                          value={form.watch("policeStationState") || ""} 
                          onValueChange={(v) => form.setValue("policeStationState", v, { shouldValidate: true })}
                          disabled={!watchedPoliceCountry || policeStates.length === 0}
                        >
                          <SelectTrigger className="h-10 w-full px-3 rounded-md border bg-background text-sm truncate cursor-pointer">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {policeStates.map((state) => (
                              <SelectItem key={state} value={state} className="text-sm">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.policeStationState && (
                          <p className="text-xs text-destructive">{form.formState.errors.policeStationState.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="policeStationCity">City</Label>
                        <Select 
                          value={form.watch("policeStationCity") || ""} 
                          onValueChange={(v) => form.setValue("policeStationCity", v, { shouldValidate: true })}
                          disabled={!watchedPoliceCountry || !watchedPoliceState || policeCities.length === 0}
                        >
                          <SelectTrigger className="h-10 w-full px-3 rounded-md border bg-background text-sm truncate cursor-pointer">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {policeCities.map((city) => (
                              <SelectItem key={city} value={city} className="text-sm">
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.policeStationCity && (
                          <p className="text-xs text-destructive">{form.formState.errors.policeStationCity.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="policeStationPincode">Postal Code *</Label>
                        <Input 
                          id="policeStationPincode" 
                          placeholder="Enter postal code" 
                          {...form.register("policeStationPincode")}
                          aria-invalid={!!form.formState.errors.policeStationPincode}
                        />
                        {form.formState.errors.policeStationPincode && (
                          <p className="text-xs text-destructive">{form.formState.errors.policeStationPincode.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="space-y-3 pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base cursor-pointer" 
                  disabled={submitting || loading || !form.formState.isValid}
                >
                  {submitting || loading ? "Registering Case..." : "Register Case"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By submitting this form, you confirm that all information provided is accurate and you have the right to share these details.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
