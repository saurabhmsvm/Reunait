"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";


interface ReportInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  onSuccess?: () => void;
}

export function ReportInfoPopup({ isOpen, onClose, caseId, onSuccess }: ReportInfoPopupProps) {
  const [message, setMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [reportType, setReportType] = useState("detailed");
  const [phoneError, setPhoneError] = useState("");
  const { showError, showSuccess } = useToast();

  const MAX_CHARACTERS = 500;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    // Clear previous errors
    setPhoneError("");
    
    // Validate phone number if detailed report type is selected
    if (reportType === "detailed") {
      if (!phoneNumber.trim()) {
        setPhoneError('Please enter your phone number.');
        return;
      }
      
      // Combine country code and phone number
      const fullPhoneNumber = countryCode + phoneNumber.trim();
      const cleanPhone = fullPhoneNumber.replace(/[\s\-\(\)\.]/g, '');
      
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        setPhoneError('Please enter a valid phone number.');
        return;
      }
      if (!/^[\d\+]+$/.test(cleanPhone)) {
        setPhoneError('Please enter a valid phone number.');
        return;
      }
    }
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          type: reportType,
          message: message.trim(),
          phoneNumber: reportType === "detailed" ? (countryCode + phoneNumber.trim()) : undefined
        }),
      });

      if (response.ok) {
        // Clear all fields
        setMessage("");
        setPhoneNumber("");
        setCountryCode("+91");
        setReportType("detailed");
        setPhoneError("");
        
        // Close the popup
        onClose();
        
        // Call success callback to show toast
        onSuccess?.();
      } else {
        showError('Failed to submit. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      showError('Something went wrong. Please try again.');
    }
  };

  const handleClose = () => {
    setMessage("");
    setPhoneNumber("");
    setCountryCode("+91");
    setReportType("detailed");
    setPhoneError("");
    onClose();
  };

  return (
    <>
             <Dialog open={isOpen} onOpenChange={handleClose}>
                                                             <DialogContent 
              className="
                w-[95vw] max-w-[480px] 
                h-[95vh] sm:h-[90vh]
                mx-auto my-auto
                p-0
                overflow-hidden
                flex flex-col
                bg-white/95 dark:bg-gray-900/95
                backdrop-blur-xl
                border-0
                shadow-2xl
                rounded-2xl
              "
            >
                                                                       <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Share Information
            </DialogTitle>
          </DialogHeader>
        
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 overflow-y-auto pb-28">
                         <div className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 leading-relaxed">
               {reportType === "detailed" 
                 ? "Share what you know about this case. Your contact information will be shared with investigators for follow-up."
                 : "Share what you know about this case. Your identity will remain completely anonymous."
               }
             </div>
          
                     {/* Report Type Selection */}
                       <div className="space-y-2 sm:space-y-3 flex-shrink-0">
              <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Report Type</Label>
              <RadioGroup value={reportType} onValueChange={setReportType} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="detailed" id="detailed" className="text-blue-600" />
                 <Label htmlFor="detailed" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100">
                   Provide Details
                 </Label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="anonymous" id="anonymous" className="text-blue-600" />
                 <Label htmlFor="anonymous" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100">
                   Anonymous
                 </Label>
               </div>
             </RadioGroup>
           </div>
          
                               {/* Phone Number Field - Only show for detailed reports */}
                       {reportType === "detailed" && (
              <div className="space-y-2 flex-shrink-0">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Contact Information <span className="text-red-500 font-bold">*</span>
                </Label>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                   <Input
                    id="countryCode"
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="+91"
                    className="text-sm w-full sm:w-24 flex-shrink-0 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setPhoneNumber(value);
                    }}
                    placeholder="Phone number"
                    className="text-sm w-full border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  />
               </div>
               
               {phoneError && (
                 <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                   <span className="text-red-500">⚠</span>
                   {phoneError}
                 </div>
               )}
             </div>
           )}
          
                     {/* Message Field */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="message" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Your Information
            </Label>
            <div className="relative">
              <Textarea
                id="message"
                value={message}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_CHARACTERS) {
                    setMessage(value);
                  }
                }}
                placeholder="Describe what you know about this case, any relevant details, or information that might help investigators..."
                className="
                  w-full min-h-[120px] sm:min-h-[150px] max-h-[200px] sm:max-h-[250px] 
                  resize-none 
                  text-sm
                  leading-relaxed
                  p-3
                  border-gray-300 dark:border-gray-600
                  focus:border-blue-500 focus:ring-blue-500
                  rounded-lg
                "
                style={{ 
                  boxSizing: 'border-box',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
                maxLength={MAX_CHARACTERS}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 w-full mt-2">
              <span>Be as detailed as possible</span>
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{message.length}/{MAX_CHARACTERS}</span>
            </div>
          </div>
          </div>
          
          {/* Fixed footer actions */}
          <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-gray-900/95 flex items-center justify-end space-x-2 sm:space-x-3 px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 flex-shrink-0 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClose}
              className="
                min-w-[80px] sm:min-w-[100px]
                h-10 sm:h-11
                text-sm font-medium
                px-4 sm:px-6
                cursor-pointer
                border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800
                transition-colors
              "
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleSubmit} 
              disabled={!message.trim() || (reportType === "detailed" && !phoneNumber.trim())}
              className="
                min-w-[80px] sm:min-w-[100px]
                h-10 sm:h-11
                text-sm font-medium
                px-4 sm:px-6
                cursor-pointer
                bg-primary hover:bg-primary/90
                text-primary-foreground
                transition-all duration-150
                hover:shadow-sm
                disabled:bg-muted disabled:text-muted-foreground
              "
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      </>
    );
  }