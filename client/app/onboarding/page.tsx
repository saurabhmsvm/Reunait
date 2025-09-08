"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PhoneInput } from "@/components/ui/phone-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountriesStatesService } from "@/lib/countries-states"
import { useToast } from "@/contexts/toast-context"
import { Player } from "@lottiefiles/react-lottie-player"
import { Shield, Clock, CheckCircle2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

const schema = z
  .object({
    fullName: z.string().optional(),
    phoneNumber: z.string().min(8, "Enter a valid phone number"),
    governmentIdType: z.string().optional(),
    governmentIdNumber: z.string().optional(),
    orgName: z.string().optional(),
    role: z.enum(["general_user", "police", "NGO"]),
    gender: z.enum(["male", "female", "other"]),
    dateOfBirth: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    pincode: z.string().min(1, "Postal code is required"),
  })
  .superRefine((val, ctx) => {
    const gov = (val.governmentIdNumber || "").trim()
    if (val.role === "general_user") {
      if (!val.fullName || !val.fullName.trim()) ctx.addIssue({ path: ["fullName"], code: z.ZodIssueCode.custom, message: "Full name is required" })
      if (!val.governmentIdType || !val.governmentIdType.trim()) ctx.addIssue({ path: ["governmentIdType"], code: z.ZodIssueCode.custom, message: "Name of government issued ID is required" })
      if (!gov) ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: "Government-issued ID number is required" })
      if (gov && (!/^[A-Za-z0-9\- ]+$/.test(gov) || gov.length < 6 || gov.length > 30)) {
        ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: "Only letters, numbers, dashes, spaces (6–30 chars)" })
      }
      if (!val.dateOfBirth || !val.dateOfBirth.trim()) ctx.addIssue({ path: ["dateOfBirth"], code: z.ZodIssueCode.custom, message: "Date of birth is required" })
    }
    if (val.role !== "general_user") {
      if (!val.orgName || !val.orgName.trim()) ctx.addIssue({ path: ["orgName"], code: z.ZodIssueCode.custom, message: "Organization/Department is required" })
      if (!gov) ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: val.role === "police" ? "Police station code is required" : "Registration number is required" })
      if (gov && (!/^[A-Za-z0-9\- ]+$/.test(gov) || gov.length < 2 || gov.length > 30)) {
        ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: "Only letters, numbers, dashes, spaces (2–30 chars)" })
      }
    }

    // Conditional location requirements based on availability
    const selectedCountry = (val.country || "").trim()
    if (selectedCountry) {
      const availableStates = CountriesStatesService.getStates(selectedCountry)
      if (availableStates.length > 0) {
        if (!val.state || !val.state.trim()) {
          ctx.addIssue({ path: ["state"], code: z.ZodIssueCode.custom, message: "State is required" })
        }
      }
      const selectedState = (val.state || "").trim()
      if (selectedState) {
        const availableCities = CountriesStatesService.getCities(selectedCountry, selectedState)
        if (availableCities.length > 0) {
          if (!val.city || !val.city.trim()) {
            ctx.addIssue({ path: ["city"], code: z.ZodIssueCode.custom, message: "City is required" })
          }
        }
      }
    }
  })

type FormValues = z.infer<typeof schema>

export default function OnboardingPage() {
  const router = useRouter()
  const search = useSearchParams()
  const rawReturnTo = (search?.get("returnTo")
    || search?.get("returnBackUrl")
    || search?.get("redirect_url")
    || "/profile") as string
  const sanitizeReturnTo = (val: string): string => {
    try {
      const v = (val || "/profile").trim()
      if (!v.startsWith("/")) return "/profile"
      if (v === "/" || v === "/profile" || v.startsWith("/cases")) return v
      return "/profile"
    } catch {
      return "/profile"
    }
  }
  const returnTo = sanitizeReturnTo(rawReturnTo)
  const { getToken } = useAuth()
  const { showSuccess, showError } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(!!mq.matches)
    apply()
    mq.addEventListener?.("change", apply)
    return () => mq.removeEventListener?.("change", apply)
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      governmentIdType: "",
      governmentIdNumber: "",
      orgName: "",
      role: "general_user",
      gender: "male",
      dateOfBirth: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
    mode: "onChange",
  })

  // Reset the form to a fresh state when role changes and notify the user
  const prevRoleRef = React.useRef<FormValues["role"]>("general_user")
  React.useEffect(() => {
    const currentRole = form.watch("role")
    const prevRole = prevRoleRef.current
    if (!currentRole || prevRole === currentRole) return

    form.reset({
      fullName: "",
      phoneNumber: "",
      governmentIdType: "",
      governmentIdNumber: "",
      orgName: "",
      role: currentRole,
      gender: "male",
      dateOfBirth: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    })
    form.clearErrors()
    prevRoleRef.current = currentRole
    const roleLabel = currentRole === "NGO" ? "NGO" : currentRole === "police" ? "Police" : "General User"
    try { showSuccess(`Switched to ${roleLabel}. We've reset the fields for you.`) } catch {}
  }, [form.watch("role")])

  // Role-change side effects removed per request; keep user inputs as-is across role switches

  // Location selects state
  const [countries, setCountries] = React.useState<string[]>([])
  const [states, setStates] = React.useState<string[]>([])
  const [cities, setCities] = React.useState<string[]>([])

  React.useEffect(() => {
    const allCountries = CountriesStatesService.getCountries()
    setCountries(allCountries)
    setStates([])
    setCities([])
  }, [])

  React.useEffect(() => {
    const c = form.watch("country")
    if (!c) {
      setStates([])
      setCities([])
      form.setValue("state", "", { shouldValidate: true })
      form.setValue("city", "", { shouldValidate: true })
      return
    }
    const newStates = CountriesStatesService.getStates(c)
    setStates(newStates)
    setCities([])
    form.setValue("state", "", { shouldValidate: true })
    form.setValue("city", "", { shouldValidate: true })
  }, [form.watch("country")])

  React.useEffect(() => {
    const c = form.watch("country")
    const s = form.watch("state")
    if (!c || !s) {
      setCities([])
      form.setValue("city", "", { shouldValidate: true })
      return
    }
    const newCities = CountriesStatesService.getCities(c, s)
    setCities(newCities)
    form.setValue("city", "", { shouldValidate: true })
  }, [form.watch("country"), form.watch("state")])

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true)
      const token = await getToken()
      if (!token) {
        showError("Not authenticated. Please sign in again.")
        return
      }
      const role = values.role
      const trimmed = (v?: string) => (v || "").trim()
      const hasStates = values.country ? CountriesStatesService.getStates(values.country).length > 0 : false
      const hasCities = hasStates && values.state ? CountriesStatesService.getCities(values.country!, values.state!).length > 0 : false

      const payload: Record<string, any> = {
        role,
        phoneNumber: trimmed(values.phoneNumber) || undefined,
        address: trimmed(values.address) || undefined,
        country: trimmed(values.country) || undefined,
        pincode: trimmed(values.pincode) || undefined,
      }

      if (hasStates) payload.state = trimmed(values.state) || undefined
      if (hasCities) payload.city = trimmed(values.city) || undefined

      if (role === "general_user") {
        payload.fullName = trimmed(values.fullName) || undefined
        const idType = trimmed(values.governmentIdType)
        const idNum = trimmed(values.governmentIdNumber)
        payload.governmentIdNumber = idType && idNum ? `${idType}: ${idNum}` : idNum || undefined
        payload.gender = values.gender
        payload.dateOfBirth = trimmed(values.dateOfBirth) || undefined
      } else if (role === "police" || role === "NGO") {
        payload.fullName = trimmed(values.orgName) || undefined
        payload.governmentIdNumber = trimmed(values.governmentIdNumber) || undefined
      }

      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

      const base = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.3:3001"
      const res = await fetch(`${base}/api/users/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        showError(data?.message || "Failed to save profile. Try again.")
        return
      }
      showSuccess("Profile completed. Welcome!")
      router.push(returnTo)
    } catch (e: any) {
      showError("Unable to save profile. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // JIT provision user on mount so DB has a minimal record
  // before profile submission
  // Removed JIT call here; global OnboardingGate handles provisioning/redirect

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-10 lg:py-14 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
        {/* Left: Form */}
        <div className="lg:col-span-6 w-full max-w-[640px]">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 lg:p-8 shadow-sm">
            <div className="mb-5">
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Complete your profile</h1>
              <p className="text-sm lg:text-base text-muted-foreground mt-1">A few details help you report missing persons, share found leads, and track updates securely.</p>
              {/* Lottie visible on mobile and md; hidden on lg where desktop panel shows */}
              <div className="mt-4 block lg:hidden">
                <Player
                  src="/lotties/contact-us.json"
                  autoplay
                  loop
                  renderer="svg"
                  style={{ width: "100%", height: 180 }}
                  aria-label="Onboarding illustration"
                />
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Role first */}
            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup
                value={form.watch("role")}
                onValueChange={(v) => form.setValue("role", v as FormValues["role"], { shouldValidate: true })}
                className="flex flex-nowrap overflow-x-auto gap-2 sm:gap-4 lg:gap-8"
              >
                {(() => {
                  const role = form.watch("role")
                  const base = "flex items-center gap-2 border rounded-md px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm cursor-pointer transition-colors whitespace-nowrap"
                  const selected = (k: FormValues["role"]) => role === k ? "border-primary bg-accent/20" : "hover:bg-muted/50"
                  return (
                    <>
                      <Label className={`${base} ${selected("general_user")}`}>
                        <RadioGroupItem className="shrink-0 cursor-pointer" value="general_user" />
                        <span>General User</span>
                      </Label>
                      <Label className={`${base} ${selected("police")}`}>
                        <RadioGroupItem className="shrink-0 cursor-pointer" value="police" />
                        <span>Police</span>
                      </Label>
                      <Label className={`${base} ${selected("NGO")}`}>
                        <RadioGroupItem className="shrink-0 cursor-pointer" value="NGO" />
                        <span>NGO</span>
                      </Label>
                    </>
                  )
                })()}
              </RadioGroup>
            </div>

            {/* General User fields */}
            {form.watch("role") === "general_user" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" placeholder="Full name" {...form.register("fullName")}
                    aria-invalid={!!form.formState.errors.fullName}
                    aria-describedby="fullName-help"
                  />
                  {form.formState.errors.fullName && (
                    <p id="fullName-help" className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="governmentIdType">Name of government issued ID</Label>
                  <Input
                    id="governmentIdType"
                    placeholder="e.g., Passport, National ID"
                    className="h-10"
                    {...form.register("governmentIdType")}
                  />
                  {form.formState.errors.governmentIdType ? (
                    <p className="text-xs text-destructive">{form.formState.errors.governmentIdType.message as string}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tell us what the document is called.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="governmentIdNumber">Government issued ID number</Label>
                  <Input id="governmentIdNumber" placeholder="Government issued ID number" {...form.register("governmentIdNumber")}
                    aria-invalid={!!form.formState.errors.governmentIdNumber}
                    aria-describedby="govt-help"
                  />
                  {form.formState.errors.governmentIdNumber && (
                    <p id="govt-help" className="text-xs text-destructive">{form.formState.errors.governmentIdNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Phone number</Label>
                  <PhoneInput
                    value={form.watch("phoneNumber")}
                    onChange={(val: string) => form.setValue("phoneNumber", val, { shouldValidate: true })}
                    defaultCountry="IN"
                    autoPrefixDialCode
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-xs text-destructive">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup
                    value={form.watch("gender")}
                    onValueChange={(v) => form.setValue("gender", v as FormValues["gender"], { shouldValidate: true })}
                    className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8"
                  >
                    {(() => {
                      const g = form.watch("gender")
                      const base = "flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer transition-colors whitespace-nowrap"
                      const selected = (k: FormValues["gender"]) => g === k ? "border-primary bg-accent/20" : "hover:bg-muted/50"
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
                  {form.formState.errors.gender && (
                    <p className="text-xs text-destructive">{form.formState.errors.gender.message as string}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  {(() => {
                    const dob = form.watch("dateOfBirth")
                    const dobDate = dob ? new Date(dob) : undefined
                    return (
                      <DatePicker
                        date={dobDate}
                        onDateChange={(d) => {
                          if (!d) return form.setValue("dateOfBirth", "", { shouldValidate: true })
                          const yyyy = d.getFullYear()
                          const mm = String(d.getMonth() + 1).padStart(2, "0")
                          const dd = String(d.getDate()).padStart(2, "0")
                          form.setValue("dateOfBirth", `${yyyy}-${mm}-${dd}`, { shouldValidate: true })
                        }}
                        placeholder="Select date of birth"
                        captionLayout="dropdown"
                      />
                    )
                  })()}
                  {form.formState.errors.dateOfBirth && (
                    <p className="text-xs text-destructive">{form.formState.errors.dateOfBirth.message as string}</p>
                  )}
                </div>
              </>
            )}

            {/* Police fields */}
            {form.watch("role") === "police" && (
              <>
                <div className="space-y-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-5 w-1 rounded bg-primary" aria-hidden="true" />
                    <h2 className="text-base lg:text-lg font-semibold tracking-tight">Police Station Details</h2>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Provide your station information.</p>
                </div>
                <div className="mt-4 mb-10 h-px bg-border" />

                <div className="space-y-2">
                  <Label htmlFor="orgName">Name</Label>
                  <Input id="orgName" placeholder="Station name" {...form.register("orgName")}
                    aria-invalid={!!form.formState.errors.orgName}
                    aria-describedby="orgName-help"
                  />
                  {form.formState.errors.orgName && (
                    <p id="orgName-help" className="text-xs text-destructive">{form.formState.errors.orgName.message}</p>
                  )}
                </div>

                {/* governmentIdType intentionally omitted for Police */}

                <div className="space-y-2">
                  <Label htmlFor="governmentIdNumber">Station code</Label>
                  <Input id="governmentIdNumber" placeholder="Station code" {...form.register("governmentIdNumber")}
                    aria-invalid={!!form.formState.errors.governmentIdNumber}
                    aria-describedby="govt-help"
                  />
                  {form.formState.errors.governmentIdNumber ? (
                    <p id="govt-help" className="text-xs text-destructive">{form.formState.errors.governmentIdNumber.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Contact number</Label>
                  <PhoneInput
                    value={form.watch("phoneNumber")}
                    onChange={(val: string) => form.setValue("phoneNumber", val, { shouldValidate: true })}
                    defaultCountry="IN"
                    autoPrefixDialCode
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-xs text-destructive">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>
              </>
            )}

            {/* NGO fields */}
            {form.watch("role") === "NGO" && (
              <>
                <div className="space-y-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-5 w-1 rounded bg-primary" aria-hidden="true" />
                    <h2 className="text-base lg:text-lg font-semibold tracking-tight">NGO Details</h2>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Provide your organization information.</p>
                </div>
                <div className="mt-4 mb-10 h-px bg-border" />

                <div className="space-y-2">
                  <Label htmlFor="orgName">Name</Label>
                  <Input id="orgName" placeholder="Organization name" {...form.register("orgName")}
                    aria-invalid={!!form.formState.errors.orgName}
                    aria-describedby="orgName-help"
                  />
                  {form.formState.errors.orgName && (
                    <p id="orgName-help" className="text-xs text-destructive">{form.formState.errors.orgName.message}</p>
                  )}
                </div>

                {/* governmentIdType intentionally omitted for NGO */}

                <div className="space-y-2">
                  <Label htmlFor="governmentIdNumber">Registration number</Label>
                  <Input id="governmentIdNumber" placeholder="Registration number" {...form.register("governmentIdNumber")}
                    aria-invalid={!!form.formState.errors.governmentIdNumber}
                    aria-describedby="govt-help"
                  />
                  {form.formState.errors.governmentIdNumber ? (
                    <p id="govt-help" className="text-xs text-destructive">{form.formState.errors.governmentIdNumber.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Contact number</Label>
                  <PhoneInput
                    value={form.watch("phoneNumber")}
                    onChange={(val: string) => form.setValue("phoneNumber", val, { shouldValidate: true })}
                    defaultCountry="IN"
                    autoPrefixDialCode
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-xs text-destructive">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Optional details */}
            <div className="space-y-8 mt-6">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="House No, Building, Street, Area" {...form.register("address")}
                  aria-invalid={!!form.formState.errors.address}
                  aria-describedby="address-help"
                />
                {form.formState.errors.address && (
                  <p id="address-help" className="text-xs text-destructive">{form.formState.errors.address.message as string}</p>
                )}
              </div>

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
                    <p className="text-xs text-destructive">{form.formState.errors.country.message as string}</p>
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
                    <p className="text-xs text-destructive">{form.formState.errors.state.message as string}</p>
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
                    <p className="text-xs text-destructive">{form.formState.errors.city.message as string}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Postal code</Label>
                  <Input id="pincode" className="h-10 w-full" {...form.register("pincode")}
                    aria-invalid={!!form.formState.errors.pincode}
                    aria-describedby="pincode-help"
                  />
                  {form.formState.errors.pincode && (
                    <p id="pincode-help" className="text-xs text-destructive">{form.formState.errors.pincode.message as string}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <Button type="submit" className="w-full h-10 cursor-pointer" disabled={submitting || !form.formState.isValid}>
                {submitting ? "Saving..." : "Save and continue"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">We use this information only for identity verification and case matching. We never sell your data and share it only when you ask us to.</p>
            </div>
            </form>
            
          </div>
        </div>

        {/* Vertical separator (desktop) */}
        <div className="hidden lg:block lg:col-span-1" aria-hidden="true">
          <div className="sticky top-[70px] h-[calc(100vh-8rem)] w-[2px] mx-auto bg-gradient-to-b from-transparent via-border/60 to-transparent rounded-full" />
        </div>

        {/* Sticky right: Illustration & benefits (no footer overlap) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-20" style={{ height: "calc(100vh - 8rem)" }}>
            <div className="h-[55vh] max-h-[520px] flex items-center justify-center">
              <Player
                src="/lotties/contact-us.json"
                autoplay={!reduceMotion}
                loop={!reduceMotion}
                renderer="svg"
                style={{ width: "78%", height: "78%", maxWidth: 640, maxHeight: 480 }}
                aria-label="Onboarding illustration"
              />
            </div>
            <div className="pt-6 lg:pt-8">
              <h2 className="text-lg lg:text-2xl font-semibold tracking-tight bg-gradient-to-r from-primary to-foreground/70 bg-clip-text text-transparent">Why complete your profile?</h2>
              <div className="relative mt-4">
                <ol className="space-y-8 text-sm">
                  <li className="relative flex items-center pl-12 min-h-8">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-border/60 bg-gradient-to-br from-primary/15 to-accent/15">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </span>
                    <p className="text-muted-foreground">Better matches across related cases</p>
                  </li>
                  <li className="relative flex items-center pl-12 min-h-8">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-border/60 bg-gradient-to-br from-primary/15 to-accent/15">
                      <Clock className="h-4 w-4 text-primary" />
                    </span>
                    <p className="text-muted-foreground">Faster responses from volunteers and authorities</p>
                  </li>
                  <li className="relative flex items-center pl-12 min-h-8">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-border/60 bg-gradient-to-br from-primary/15 to-accent/15">
                      <Shield className="h-4 w-4 text-primary" />
                    </span>
                    <p className="text-muted-foreground">Your data stays private and protected</p>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



