import Case from "../model/caseModel.js";
import { clerkClient } from "@clerk/express";
import { getPresignedGetUrl } from "../services/s3Service.js";
import { config } from "../config/config.js";

export const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Extract user role from Clerk public metadata
    let userRole = 'general_user';
    const auth = req.auth();
    if (auth?.userId) {
      try {
        const user = await clerkClient.users.getUser(auth.userId);
        userRole = user.publicMetadata?.role || 'general_user';
      } catch (error) {
        console.error('Failed to get user from Clerk:', error);
        userRole = 'general_user';
      }
    }
    

    const caseData = await Case.findById(id).select('-notifications').lean();
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Generate image URLs using country-based key prefix without extensions
    const imageUrls = [];
    try {
      const countryPath = (caseData.country || "India").replace(/\s+/g, '_').toLowerCase();
      for (let i = 1; i <= 2; i++) {
        const key = `${countryPath}/${caseData._id}_${i}`;
        try {
          const imageUrl = await getPresignedGetUrl(config.awsBucketName, key, 180);
          imageUrls.push(imageUrl);
        } catch (error) {
          // Ignore failures for missing images
        }
      }
    } catch (error) {
      // Ignore image URL generation errors
    }

    // Fetch similar cases if similarCaseIds exists
    let similarCases = [];
    if (caseData.similarCaseIds && caseData.similarCaseIds.length > 0) {
      const similarCasesData = await Case.find({
        _id: { $in: caseData.similarCaseIds }
      }).select('-notifications').lean();

      // Transform similar cases (same logic as AI search)
      similarCases = await Promise.all(similarCasesData.map(async (similarCase) => {
        // Generate image URLs for each similar case
        const similarImageUrls = [];
        try {
          const countryPath = (similarCase.country || "India").replace(/\s+/g, '_').toLowerCase();
          for (let i = 1; i <= 2; i++) {
            const key = `${countryPath}/${similarCase._id}_${i}`;
            try {
              const imageUrl = await getPresignedGetUrl(config.awsBucketName, key, 180);
              similarImageUrls.push(imageUrl);
            } catch (error) {
              // Ignore missing images
            }
          }
        } catch (error) {
          // Ignore image URL generation errors
        }

        return {
          _id: similarCase._id,
          fullName: similarCase.fullName,
          age: similarCase.age,
          gender: similarCase.gender,
          status: similarCase.status,
          city: similarCase.city,
          state: similarCase.state,
          country: similarCase.country,
          dateMissingFound: similarCase.dateMissingFound,
          reward: similarCase.reward,
          reportedBy: similarCase.reportedBy,
          imageUrls: similarImageUrls
        };
      }));
    }

    // Modify lastSearchedTime based on user role
    // General users get normal cooldown, police and NGO users get null (always enabled)
    const modifiedLastSearchedTime = (userRole === "general_user") 
      ? caseData.lastSearchedTime 
      : null;
    

    const transformed = {
      _id: caseData._id,
      fullName: caseData.fullName,
      status: caseData.status,
      dateMissingFound: caseData.dateMissingFound,
      description: caseData.description,
      reward: caseData.reward,
      imageUrls,
      lastSearchedTime: modifiedLastSearchedTime,
      age: caseData.age,
      gender: caseData.gender,
      city: caseData.city,
      state: caseData.state,
      country: caseData.country,
      contactNumber: caseData.contactNumber,
      similarCases,
      // Precomputed sections for direct rendering on the client
      sections: (() => {
        const sections = [];

        const toStr = (v) => (v == null ? undefined : String(v));
        const formatDate = (d) => {
          try {
            const dt = new Date(d);
            return dt.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
          } catch {
            return toStr(d);
          }
        };
        const formatDateTime = (d) => {
          try {
            const dt = new Date(d);
            return dt.toLocaleString('en-GB', {
              year: 'numeric', month: 'short', day: '2-digit',
              hour: '2-digit', minute: '2-digit', hour12: false
            });
          } catch {
            return toStr(d);
          }
        };

        // Personal Information
        const personalItems = [];
        if (caseData.age) personalItems.push({ label: 'Age', value: toStr(caseData.age) });
        if (caseData.gender) personalItems.push({ label: 'Gender', value: toStr(caseData.gender) });
        if (caseData.height) personalItems.push({ label: 'Height', value: toStr(caseData.height) });
        if (caseData.complexion) personalItems.push({ label: 'Complexion', value: toStr(caseData.complexion) });
        if (caseData.identificationMark) personalItems.push({ label: 'Identification Mark', value: toStr(caseData.identificationMark) });
        if (caseData.contactNumber) personalItems.push({ label: 'Contact Number', value: toStr(caseData.contactNumber) });
        if (personalItems.length) sections.push({ title: 'Personal Information', items: personalItems });

        // Case Details
        const caseDetailItems = [];
        if (caseData.status) caseDetailItems.push({ label: 'Status', value: String(caseData.status).charAt(0).toUpperCase() + String(caseData.status).slice(1) });
        if (caseData.dateMissingFound) {
          const statusDateLabel = caseData.status === 'missing' ? 'Last Seen On' : (caseData.status === 'found' ? 'Found On' : 'Status Date');
          caseDetailItems.push({ label: statusDateLabel, value: formatDate(caseData.dateMissingFound) });
        }
        if (caseData.reward) caseDetailItems.push({ label: 'Reward', value: toStr(caseData.reward) });
        if (caseData.reportedBy) caseDetailItems.push({ label: 'Reported By', value: String(caseData.reportedBy).charAt(0).toUpperCase() + String(caseData.reportedBy).slice(1) });
        if (typeof caseData.isAssigned === 'boolean') caseDetailItems.push({ label: 'Assigned', value: caseData.isAssigned ? 'Yes' : 'No' });
        if (caseData.addedBy) caseDetailItems.push({ label: 'Added By', value: toStr(caseData.addedBy) });
        if (caseDetailItems.length) sections.push({ title: 'Case Details', items: caseDetailItems });

        // Location
        const locationItems = [];
        if (caseData.city) locationItems.push({ label: 'City', value: toStr(caseData.city) });
        if (caseData.pincode) locationItems.push({ label: 'Pincode', value: toStr(caseData.pincode) });
        if (caseData.state) locationItems.push({ label: 'State', value: toStr(caseData.state) });
        if (caseData.country) locationItems.push({ label: 'Country', value: toStr(caseData.country) });
        if (caseData.landMark) locationItems.push({ label: 'Landmark', value: toStr(caseData.landMark) });
        if (locationItems.length) sections.push({ title: 'Location', items: locationItems });

        // Police Station
        const policeStationItems = [];
        if (caseData.FIRNumber) policeStationItems.push({ label: 'FIR Number', value: toStr(caseData.FIRNumber) });
        if (caseData.caseRegisterDate) policeStationItems.push({ label: 'Case Registered On', value: formatDate(caseData.caseRegisterDate) });
        if (caseData.policeStationName) policeStationItems.push({ label: 'Police Station Name', value: toStr(caseData.policeStationName) });
        if (caseData.policeStationCity) policeStationItems.push({ label: 'Police Station City', value: toStr(caseData.policeStationCity) });
        if (caseData.policeStationState) policeStationItems.push({ label: 'Police Station State', value: toStr(caseData.policeStationState) });
        if (caseData.policeStationCountry) policeStationItems.push({ label: 'Police Station Country', value: toStr(caseData.policeStationCountry) });
        if (policeStationItems.length) sections.push({ title: 'Police Station', items: policeStationItems });

        return sections;
      })(),
    };

    return res.status(200).json({ success: true, data: transformed });
  } catch (error) {
    console.error("Error fetching case by id:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch case", error: error.message });
  }
};


