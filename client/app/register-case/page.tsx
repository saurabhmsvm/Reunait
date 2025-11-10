"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
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
import { PoliceStationAutocomplete } from "@/components/cases/police-station-autocomplete"
import { countries } from "countries-list"
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader"
import { SimpleLoader } from "@/components/ui/simple-loader"
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
const normalize = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim()

const schema = z
  .object({
    // Personal Information
    fullName: z.string()
      .min(2, "Full name must be at least 2 characters")
      .max(120, "Full name must be at most 120 characters")
      .transform(normalize),
    age: z.string()
      .min(1, "Age is required")
      .regex(/^\d+$/, "Age must be a number")
      .refine((val) => {
        const n = Number(val)
        return Number.isFinite(n) && n >= 1 && n <= 150
      }, "Age must be between 1 and 150"),
    gender: z.enum(["male", "female", "other"]),
    contactNumber: z.string().min(8, "Enter a valid phone number").max(20).transform(normalize),
    height: z.string().min(1, "Height is required"),
    complexion: z.string().min(1, "Complexion is required"),
    identificationMark: z.string().optional().refine((val) => {
      if (!val) return true
      if (val.length < 3) return false
      if (val.length > 100) return false
      // Temporarily allow all characters to test
      return true
    }, "Must be 3–100 characters. Letters, numbers, punctuation, and spaces allowed"),
    
    // Case Details
    status: z.enum(["missing", "found"]),
    dateMissingFound: z.string().min(1, "Date is required"),
    description: z.string().optional().refine((val) => {
      if (!val) return true
      if (val.length < 10) return false
      if (val.length > 250) return false
      // Temporarily allow all characters to test
      return true
    }, "Must be 10–250 characters. Letters, numbers, punctuation, and spaces allowed"),
    reward: z.string().optional().refine((val) => {
      if (!val) return true
      const v = (val || '').trim()
      if (!/^\d+(?:\.\d+)?$/.test(v)) return false
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 && n <= 999999999.99
    }, "Reward must be a valid amount (numbers only, decimals allowed) up to 999,999,999.99"),
    
    // Location Information
    address: z.string().min(8, "Address must be at least 8 characters").max(300, "Address must be at most 300 characters").transform(normalize),
    country: z.string().min(1, "Country is required").max(64).transform(normalize),
    state: z.string().max(64).transform(normalize).optional(),
    city: z.string().max(64).transform(normalize).optional(),
    postalCode: z.string()
      .min(1, "Postal code is required")
      .refine((val) => {
        const v = (val || '').trim()
        if (v.length < 3 || v.length > 12) return false
        return /^[A-Za-z0-9 \-]+$/.test(v)
      }, "Postal Code must be 3–12 characters (letters, numbers, spaces, hyphen)")
      .transform(normalize),
    landMark: z.string().optional().refine((val) => {
      if (!val) return true
      if (val.length < 3) return false
      if (val.length > 75) return false
      return true
    }, "Must be 3–75 characters"),
    
    // Police Information
    FIRNumber: z.string().optional().refine((val) => {
      if (!val) return true
      const v = (val || '').trim()
      if (v.length < 2 || v.length > 50) return false
      return /^[A-Za-z0-9 \-]+$/.test(v)
    }, "Case Reference Number must contain only letters, numbers, dashes, and spaces (minimum 2 characters)"),
    policeStationName: z.string().optional().refine((val) => {
      if (!val) return true
      const v = (val || '').trim()
      return v.length >= 3 && v.length <= 120
    }, "Police Station Name must be 3–120 characters"),
    policeStationCountry: z.string().max(64).transform(normalize).optional(),
    policeStationState: z.string().max(64).transform(normalize).optional(),
    policeStationCity: z.string().max(64).transform(normalize).optional(),
    policeStationPostalCode: z.string().optional().refine((val) => {
      if (!val) return true
      const v = (val || '').trim()
      if (v.length < 3 || v.length > 12) return false
      return /^[A-Za-z0-9 \-]+$/.test(v)
    }, "Police Station Postal Code must be 3–12 characters (letters, numbers, spaces, hyphen)"),
    policeStationId: z.string().optional(), // Selected station ID from autocomplete
    
    // Images
    images: z.array(z.instanceof(File)).min(2, "Exactly 2 images are required").max(2, "Exactly 2 images are required"),
    
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
    if (selectedCountry || selectedState || selectedCity || (val.postalCode && val.postalCode.trim())) {
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

    // Police information rules based on status
    const isMissing = val.status === 'missing'
    const selectedPoliceCountry = (val.policeStationCountry || "").trim()
    const selectedPoliceState = (val.policeStationState || "").trim()
    const selectedPoliceCity = (val.policeStationCity || "").trim()

    if (isMissing) {
      // For missing cases: police info is mandatory (as before)
      // FIR Number
      const fir = (val.FIRNumber || '').trim()
      if (!fir || fir.length < 2 || fir.length > 50 || !/^[A-Za-z0-9 \-]+$/.test(fir)) {
        ctx.addIssue({ path: ["FIRNumber"], code: z.ZodIssueCode.custom, message: "Case reference number must contain only letters, numbers, dashes, and spaces (minimum 2 characters)" })
      }
      // Police Station Name
      const psn = (val.policeStationName || '').trim()
      if (!psn || psn.length < 3 || psn.length > 120) {
        ctx.addIssue({ path: ["policeStationName"], code: z.ZodIssueCode.custom, message: "Police Station Name must be 3–120 characters" })
      }
      // Country/state/city cascading
      if (!selectedPoliceCountry) {
        ctx.addIssue({ path: ["policeStationCountry"], code: z.ZodIssueCode.custom, message: "Police station country is required" })
      } else {
        const availablePoliceStates = CountriesStatesService.getStates(selectedPoliceCountry)
        if (availablePoliceStates.length > 0) {
          if (!selectedPoliceState) {
            ctx.addIssue({ path: ["policeStationState"], code: z.ZodIssueCode.custom, message: "Police station state is required" })
          } else {
            const availablePoliceCities = CountriesStatesService.getCities(selectedPoliceCountry, selectedPoliceState)
            if (availablePoliceCities.length > 0 && !selectedPoliceCity) {
              ctx.addIssue({ path: ["policeStationCity"], code: z.ZodIssueCode.custom, message: "Police station city is required" })
            }
          }
        }
      }
      // Postal code
      const pspc = (val.policeStationPostalCode || '').trim()
      if (!pspc || pspc.length < 3 || pspc.length > 12 || !/^[A-Za-z0-9 \-]+$/.test(pspc)) {
        ctx.addIssue({ path: ["policeStationPostalCode"], code: z.ZodIssueCode.custom, message: "Police Station Postal Code must be 3–12 characters (letters, numbers, spaces, hyphen)" })
      }
    } else {
      // For found cases: police info optional, but if partially provided enforce cascading consistency
      const anyPoliceProvided = selectedPoliceCountry || selectedPoliceState || selectedPoliceCity || (val.policeStationPostalCode && val.policeStationPostalCode.trim()) || val.FIRNumber || val.policeStationName
      if (anyPoliceProvided) {
        if (!selectedPoliceCountry) {
          ctx.addIssue({ path: ["policeStationCountry"], code: z.ZodIssueCode.custom, message: "Police station country is required" })
        } else {
          const availablePoliceStates = CountriesStatesService.getStates(selectedPoliceCountry)
          if (availablePoliceStates.length > 0 && !selectedPoliceState) {
            ctx.addIssue({ path: ["policeStationState"], code: z.ZodIssueCode.custom, message: "Police station state is required" })
          } else if (availablePoliceStates.length > 0) {
            const availablePoliceCities = CountriesStatesService.getCities(selectedPoliceCountry, selectedPoliceState)
            if (availablePoliceCities.length > 0 && !selectedPoliceCity) {
              ctx.addIssue({ path: ["policeStationCity"], code: z.ZodIssueCode.custom, message: "Police station city is required" })
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
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isNavigatingToCase, setIsNavigatingToCase] = useState(false)

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
    mode: "onChange",
    reValidateMode: "onChange",
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
      postalCode: "",
      landMark: "",
      FIRNumber: "",
      policeStationName: "",
      policeStationCountry: "",
      policeStationState: "",
      policeStationCity: "",
      policeStationPostalCode: "",
      policeStationId: "",
      images: [],
      bypassVerification: false,
    },
  })

  const shouldShowError = (name: keyof FormValues) => {
    const errors: any = form.formState.errors
    if (!errors?.[name]) return false
    if (form.formState.isSubmitted) return true
    const dirty: any = form.formState.dirtyFields
    const touched: any = form.formState.touchedFields
    // For police country and postal code, show only after touch or submit
    if (name === 'policeStationCountry' || name === 'policeStationPostalCode') {
      return !!touched?.[name]
    }
    if (dirty?.[name] || touched?.[name]) return true
    const value: any = (form as any).getValues?.(name as any)
    return value !== undefined && value !== null && String(value).length > 0
  }

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
  const watchedPoliceCity = form.watch("policeStationCity")
  
  // Police station selection state
  const [selectedPoliceStation, setSelectedPoliceStation] = useState<{
    id: string
    name: string
    city: string
    state: string
    country: string
  } | null>(null)
  
  // Memoize form state to prevent unnecessary re-renders
  const formState = useMemo(() => form.formState, [form.formState.isValid, form.formState.errors, form.formState.isSubmitting])

  // Ensure police section validity reflects in isValid when status is missing
  useEffect(() => {
    if (watchedStatus === 'missing') {
      form.trigger([
        'FIRNumber',
        'policeStationName',
        'policeStationCountry',
        'policeStationState',
        'policeStationCity',
        'policeStationPostalCode',
      ])
    }
  }, [watchedStatus, form])
  
  // Memoize event handlers to prevent unnecessary re-renders
  const handleGenderChange = useCallback((value: string) => {
    form.setValue("gender", value as FormValues["gender"], { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleStatusChange = useCallback((value: string) => {
    form.setValue("status", value as FormValues["status"], { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleComplexionChange = useCallback((value: string) => {
    form.setValue("complexion", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleCountryChange = useCallback((value: string) => {
    form.setValue("country", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleStateChange = useCallback((value: string) => {
    form.setValue("state", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleCityChange = useCallback((value: string) => {
    form.setValue("city", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handlePoliceCountryChange = useCallback((value: string) => {
    form.setValue("policeStationCountry", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handlePoliceStateChange = useCallback((value: string) => {
    form.setValue("policeStationState", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handlePoliceCityChange = useCallback((value: string) => {
    form.setValue("policeStationCity", value, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleImagesChange = useCallback((images: File[]) => {
    form.setValue("images", images, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  const handleBypassChange = useCallback((checked: boolean) => {
    form.setValue("bypassVerification", checked, { shouldValidate: true, shouldTouch: true })
  }, [form])
  
  
  // Reward inline hint replicating native step mismatch messaging
  const [rewardHint, setRewardHint] = useState<string>("")
  const computeRewardHint = useCallback((val: string) => {
    const v = (val ?? "").trim()
    if (!v) return ""
    if (!/^\d+(?:\.\d+)?$/.test(v)) {
      return "Please enter a valid value. Use numbers only (e.g., 100 or 100.50)."
    }
    const decimals = (v.split('.')[1] || '').length
    if (decimals > 2) {
      const n = Number(v)
      const down = Math.floor(n * 100) / 100
      const up = Math.ceil(n * 100) / 100
      return `Please enter a valid value. The two nearest valid values are ${down.toFixed(2)} and ${up.toFixed(2)}.`
    }
    return ""
  }, [])


  // Handle country change
  useEffect(() => {
    if (!watchedCountry) {
      setStates([])
      setCities([])
      form.setValue("state", "", { shouldValidate: true, shouldTouch: true })
      form.setValue("city", "", { shouldValidate: true, shouldTouch: true })
      form.trigger(["state", "city"]) 
      return
    }
    const newStates = CountriesStatesService.getStates(watchedCountry)
    setStates(newStates)
    setCities([])
    // Mark state/city as touched on cascade so required error surfaces inline
    form.setValue("state", "", { shouldValidate: true, shouldTouch: true })
    form.setValue("city", "", { shouldValidate: true, shouldTouch: true })
    // Ensure resolver runs cross-field rules and surfaces errors immediately
    form.trigger(["state", "city"]) 
  }, [watchedCountry, form])

  // Handle state change
  useEffect(() => {
    if (!watchedCountry || !watchedState) {
      setCities([])
      form.setValue("city", "", { shouldValidate: true, shouldTouch: true })
      form.trigger("city")
      return
    }
    const newCities = CountriesStatesService.getCities(watchedCountry, watchedState)
    setCities(newCities)
    form.setValue("city", "", { shouldValidate: true, shouldTouch: true })
    form.trigger("city")
  }, [watchedCountry, watchedState, form])

  // Handle police country change
  useEffect(() => {
    if (!watchedPoliceCountry) {
      setPoliceStates([])
      setPoliceCities([])
      form.setValue("policeStationState", "", { shouldValidate: true, shouldTouch: true })
      form.setValue("policeStationCity", "", { shouldValidate: true, shouldTouch: true })
      return
    }
    const newPoliceStates = CountriesStatesService.getStates(watchedPoliceCountry)
    setPoliceStates(newPoliceStates)
    setPoliceCities([])
    form.setValue("policeStationState", "", { shouldValidate: true, shouldTouch: true })
    form.setValue("policeStationCity", "", { shouldValidate: true, shouldTouch: true })
    form.trigger(["policeStationState", "policeStationCity"]) 
  }, [watchedPoliceCountry, form])

  // Handle police state change
  useEffect(() => {
    if (!watchedPoliceCountry || !watchedPoliceState) {
      setPoliceCities([])
      form.setValue("policeStationCity", "", { shouldValidate: true, shouldTouch: true })
      return
    }
    const newPoliceCities = CountriesStatesService.getCities(watchedPoliceCountry, watchedPoliceState)
    setPoliceCities(newPoliceCities)
    form.setValue("policeStationCity", "", { shouldValidate: true, shouldTouch: true })
    form.trigger("policeStationCity")
  }, [watchedPoliceCountry, watchedPoliceState, form])


  // Calculate form completion percentage
  const calculateProgress = () => {
    const fields = [
      'fullName', 'age', 'gender', 'contactNumber', 'status', 'dateMissingFound',
      'country', 'state', 'city', 'postalCode', 'images'
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
          // Send reward with currency code appended (e.g., "1000 INR")
          if (value !== undefined && value !== null && value !== "") {
            const currency = getCurrencyForCountry(values.country || "")
            formData.append(key, `${value} ${currency}`)
          }
        } else {
          // Send the value or default empty string for missing fields
          const fieldValue = (value !== undefined && value !== null && value !== "") ? value.toString() : ""
          // Backward-compat key mapping (ensure correct backend keys)
          if (key === 'postalCode') {
            formData.append('postalCode', fieldValue)
          } else if (key === 'policeStationPostalCode') {
            formData.append('policeStationPostalCode', fieldValue)
          } else {
            formData.append(key, fieldValue)
          }
        }
      })

      // User ID will be automatically extracted from Clerk auth context on backend

      // Add reportedBy based on user role
      const userRole = userProfile?.role || 'general_user'
      formData.append('reportedBy', userRole)

      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const response = await fetch(`${base}/auth/registerCase`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      
      if (data.status === true) {
        // Show success toast first
        showSuccess(data.message || "Case registered successfully!")
        
        // Stop the multi-step loader immediately
        setLoading(false)
        
        // Start our custom navigation state
        setIsNavigatingToCase(true)
        
        // Use React 18+ startTransition for navigation
        startTransition(() => {
          router.push(`/cases/${data.caseId}`)
        })
        
        return
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
      
      {/* Simple Navigation Loader - Next.js 15+ App Router */}
      {(isPending || isNavigatingToCase) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>
      )}

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

            <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.5 : 1 }}>
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
                      aria-invalid={shouldShowError("fullName")}
                    />
                    {shouldShowError("fullName") && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName?.message as any}</p>
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
                        aria-invalid={shouldShowError("age")}
                      />
                      {shouldShowError("age") && (
                        <p className="text-xs text-destructive">{form.formState.errors.age?.message as any}</p>
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
                      {shouldShowError("height") && (
                        <p className="text-xs text-destructive">{form.formState.errors.height?.message as any}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    {/* Mobile: Dropdown */}
                    <div className="block md:hidden">
                      <Select 
                        value={form.watch("gender")} 
                        onValueChange={handleGenderChange}
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
                        onValueChange={handleGenderChange}
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
                        countryCallingCodeEditable={false}
                      />
                      {shouldShowError("contactNumber") && (
                        <p className="text-xs text-destructive">{form.formState.errors.contactNumber?.message as any}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complexion">Complexion *</Label>
                      <Select value={form.watch("complexion") || ""} onValueChange={handleComplexionChange}>
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
                      {shouldShowError("complexion") && (
                        <p className="text-xs text-destructive">{form.formState.errors.complexion?.message as any}</p>
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
                    {shouldShowError("identificationMark") && (
                      <p className="text-xs text-destructive">{form.formState.errors.identificationMark?.message as any}</p>
                    )}
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
                      onValueChange={handleStatusChange}
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
                      {shouldShowError("dateMissingFound") && (
                        <p className="text-xs text-destructive">{form.formState.errors.dateMissingFound?.message as any}</p>
                      )}
                    </div>

                    {watchedStatus === "missing" && (
                      <div className="space-y-2">
                        <Label htmlFor="reward">Reward Amount</Label>
                        <Input 
                          id="reward" 
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter reward amount (e.g., 1000)" 
                          {...form.register("reward")}
                          aria-invalid={!!form.formState.errors.reward}
                          onChange={(e) => {
                            form.setValue("reward", e.target.value, { shouldValidate: true })
                            setRewardHint(computeRewardHint(e.target.value))
                          }}
                        />
                        {(shouldShowError("reward") || rewardHint) && (
                          <p className="text-xs text-destructive">{(form.formState.errors.reward?.message as any) || rewardHint}</p>
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
                    {shouldShowError("description") && (
                      <p className="text-xs text-destructive">{form.formState.errors.description?.message as any}</p>
                    )}
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
                      aria-invalid={shouldShowError("address")}
                    />
                    {shouldShowError("address") && (
                      <p className="text-xs text-destructive">{form.formState.errors.address?.message as any}</p>
                    )}
                  </div>

                  {/* Location grid matching onboarding layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Country *</Label>
                      <Select value={form.watch("country") || ""} onValueChange={handleCountryChange}>
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
                      {shouldShowError("country") && (
                        <p className="text-xs text-destructive">{form.formState.errors.country?.message as any}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={form.watch("state") || ""} onValueChange={handleStateChange} disabled={!states.length}>
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
                      {shouldShowError("state") && (
                        <p className="text-xs text-destructive">{form.formState.errors.state?.message as any}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label>City</Label>
                      <Select value={form.watch("city") || ""} onValueChange={handleCityChange} disabled={!cities.length}>
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
                      {shouldShowError("city") && (
                        <p className="text-xs text-destructive">{form.formState.errors.city?.message as any}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal code *</Label>
                      <Input 
                      id="postalCode" 
                        className="h-10 w-full"
                        placeholder="Enter postal code"
                      {...form.register("postalCode")}
                      aria-invalid={shouldShowError("postalCode")}
                      />
                    {shouldShowError("postalCode") && (
                      <p className="text-xs text-destructive">{form.formState.errors.postalCode?.message as any}</p>
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
                    {shouldShowError("landMark") && (
                      <p className="text-xs text-destructive">{form.formState.errors.landMark?.message as any}</p>
                    )}
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
                    onImagesChange={handleImagesChange}
                    error={form.formState.errors.images?.message}
                    maxImages={2}
                  />

                  {(user?.publicMetadata?.role === "police" || user?.publicMetadata?.role === "volunteer") && (
                    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/40">
                      <input
                        type="checkbox"
                        id="bypassVerification"
                        checked={form.watch("bypassVerification")}
                        onChange={(e) => handleBypassChange(e.target.checked)}
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
                  {/* Police Station Location (moved up) */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Police Station Location</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="policeStationCountry">Country *</Label>
                        <Select 
                          value={form.watch("policeStationCountry") || ""} 
                          onValueChange={handlePoliceCountryChange}
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
                        {shouldShowError("policeStationCountry") && (
                          <p className="text-xs text-destructive">{form.formState.errors.policeStationCountry?.message as any}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="policeStationState">State</Label>
                        <Select 
                          value={form.watch("policeStationState") || ""} 
                          onValueChange={handlePoliceStateChange}
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
                          onValueChange={handlePoliceCityChange}
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
                        <Label htmlFor="policeStationPostalCode">Postal Code *</Label>
                        <Input 
                          id="policeStationPostalCode" 
                          placeholder="Enter postal code" 
                          {...form.register("policeStationPostalCode")}
                          aria-invalid={shouldShowError("policeStationPostalCode")}
                          onChange={(e) => {
                            form.setValue("policeStationPostalCode", e.target.value, { shouldValidate: true, shouldTouch: true })
                            form.trigger("policeStationPostalCode")
                          }}
                        />
                        {shouldShowError("policeStationPostalCode") && (
                          <p className="text-xs text-destructive">{form.formState.errors.policeStationPostalCode?.message as any}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reference details (moved below) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="FIRNumber">Case Reference Number *</Label>
                      <Input 
                        id="FIRNumber" 
                        placeholder="Enter case reference number" 
                        {...form.register("FIRNumber")}
                        aria-invalid={shouldShowError("FIRNumber")}
                      />
                      {shouldShowError("FIRNumber") && (
                        <p className="text-xs text-destructive">{form.formState.errors.FIRNumber?.message as any}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policeStationName">Police Station Name *</Label>
                      <PoliceStationAutocomplete
                        id="policeStationName" 
                        value={form.watch("policeStationName") || ""}
                        selectedStationId={form.watch("policeStationId") || null}
                        onStationSelect={(station) => {
                          if (station) {
                            form.setValue("policeStationName", station.name, { shouldValidate: true })
                            form.setValue("policeStationId", station.id, { shouldValidate: true })
                            setSelectedPoliceStation(station)
                          } else {
                            form.setValue("policeStationId", "", { shouldValidate: true })
                            setSelectedPoliceStation(null)
                          }
                        }}
                        onInputChange={(value) => {
                          form.setValue("policeStationName", value, { shouldValidate: true })
                          if (selectedPoliceStation) {
                            form.setValue("policeStationId", "", { shouldValidate: true })
                            setSelectedPoliceStation(null)
                          }
                        }}
                        country={watchedPoliceCountry || ""}
                        state={watchedPoliceState || ""}
                        city={watchedPoliceCity || ""}
                        error={shouldShowError("policeStationName") ? (form.formState.errors.policeStationName?.message as string) : undefined}
                        required={watchedStatus === "missing"}
                        placeholder="Start typing to search police station..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="space-y-3 pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base cursor-pointer" 
                  disabled={submitting || loading || !formState.isValid}
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
