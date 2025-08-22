"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { ReportInfoPopup } from "./report-info-popup";

export function ReportInfoDemo() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Report Info Popup Demo</h1>
        <p className="text-muted-foreground">
          Click the button below to open the new Report Info popup with two options
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            New Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• Two radio button options: "Provide Details" and "Anonymous Report"</li>
            <li>• "Provide Details" shows: Name, Mobile Number, and Update Message</li>
            <li>• "Anonymous Report" shows: Only Update Message field</li>
            <li>• Form validation for required fields</li>
            <li>• Mobile number validation (10 digits)</li>
            <li>• API integration with loading states</li>
            <li>• Smooth animations and transitions</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={() => setIsPopupOpen(true)}
          size="lg"
          className="px-8"
        >
          <Info className="w-4 h-4 mr-2" />
          Report Info
        </Button>
      </div>

      <ReportInfoPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        caseId="demo-case-123"
      />
    </div>
  );
}
