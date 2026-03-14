/**
 * Inquiry Actions - Server-side functions for managing inquiries
 * 
 * This file contains Next.js server actions that handle CRUD operations
 * for user inquiries. These functions run on the server and interact with
 * Firestore database to create, read, update, and delete inquiry records.
 * 
 * Key Features:
 * - Creates inquiries from form submissions
 * - Sends automated emails via Firebase extensions
 * - Handles different service types (laboratory, research, training)
 * - Provides admin functions for inquiry management
 * - Automatic cache revalidation for data consistency
 */

'use server'

import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import { InquiryFormData } from "@/schemas/inquirySchema";
import { AdminInquiryData } from "@/schemas/adminInquirySchema";
import { logActivity } from "@/services/activityLogService";
import { initializeQuotationThread, addThreadMessage } from "@/services/quotationThreadService";

const BIOINFO_OPTION_LABELS: Record<string, string> = {
  "whole-genome-assembly": "Whole Genome Assembly",
  "metabarcoding-downstream": "Metabarcoding with Downstream Analysis",
  "metabarcoding-preprocessing": "Metabarcoding with Pre-processing Only",
  "transcriptomics": "Transcriptomics (QC to Annotation)",
  "phylogenetics": "Phylogenetics (1 Marker)",
  "whole-genome-assembly-annotation": "Whole Genome Assembly and Annotation",
  // Legacy support
  "dna-extraction": "DNA Extraction",
  "quantification": "Quantification",
  "library-preparation": "Library Preparation",
  "sequencing": "Sequencing",
  "bioinformatics-analysis": "Bioinformatics Analysis",
  "genome-assembly": "Whole Genome Assembly",
  "metabarcoding": "Metabarcoding with Downstream Analysis",
  "pre-processing": "Metabarcoding with Pre-processing Only",
  "assembly-annotation": "Whole Genome Assembly and Annotation",
};

const formatBioinfoOption = (option: string): string => {
  return (
    BIOINFO_OPTION_LABELS[option] ||
    option
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

const formatWorkflowType = (workflowType?: string): string => {
  if (!workflowType) return "";
  if (workflowType === "complete-bioinfo") {
    return "Complete molecular workflow with Bioinformatics Analysis";
  }
  if (workflowType === "complete") {
    return "Complete Molecular workflow only (DNA Extraction to Sequencing)";
  }
  if (workflowType === "individual") {
    return "Individual Assay";
  }
  return workflowType
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatServiceType = (serviceType: string): string => {
  return serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
};

const formatSpecies = (species?: string, otherSpecies?: string): string => {
  if (!species) return "";
  const speciesLabel = species
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return otherSpecies ? `${speciesLabel} (${otherSpecies})` : speciesLabel;
};

/**
 * Test function to validate email system configuration
 * This function helps diagnose email delivery issues by creating a simple test email
 */
export async function testEmailSystem() {
  try {
    console.log("=== EMAIL TEST: Starting email system test ===");
    
    // Check Firebase connection
    console.log("EMAIL TEST: Firebase DB:", db ? "Connected" : "Disconnected");
    
    // Create test email with both simple and template formats
    const testInquiryId = "TEST-" + Date.now();
    const testEmailData = {
      to: ["merlito.dayon@gmail.com"],
      inquiryId: testInquiryId, // Add at root level for easy searching
      message: {
        subject: "PGC Email System Test",
        text: "This is a test email from the PGC email system.",
        html: "<p><strong>PGC Email System Test</strong></p><p>This is a test email to verify email functionality.</p>"
      },
      template: {
        name: "inquiry-laboratory", // Using existing template
        data: {
          inquiryId: testInquiryId,
          name: "Test User",
          affiliation: "Test Institution", 
          designation: "Test Role",
          email: "test@example.com",
          service: "laboratory",
          workflows: "DNA extraction",
          additionalInfo: "This is a test email to verify email functionality"
        }
      }
    };

    console.log("EMAIL TEST: Test email structure:", {
      recipient: testEmailData.to,
      inquiryId: testEmailData.inquiryId,
      hasSubject: !!testEmailData.message.subject,
      hasTemplate: !!testEmailData.template,
      templateName: testEmailData.template.name,
      dataKeys: Object.keys(testEmailData.template.data)
    });

    console.log("EMAIL TEST: Creating test email document...");
    
    const mailCollection = collection(db, "mail");
    console.log("EMAIL TEST: Mail collection reference created");
    
    const emailDocRef = await addDoc(mailCollection, testEmailData);
    
    console.log("✅ EMAIL TEST SUCCESS: Test email document created!");
    console.log("Test Email Document ID:", emailDocRef.id);
    console.log("Test Email Document Path:", emailDocRef.path);
    
    // Immediately verify the document exists in Firestore
    try {
      const verifyDoc = await getDoc(emailDocRef);
      if (verifyDoc.exists()) {
        const docData = verifyDoc.data();
        console.log("✅ VERIFICATION: Document confirmed in Firestore!");
        console.log("Document data keys:", Object.keys(docData));
        console.log("Document inquiryId:", docData.inquiryId);
        console.log("Document to:", docData.to);
      } else {
        console.error("❌ VERIFICATION FAILED: Document not found in Firestore immediately after creation!");
      }
    } catch (verifyError) {
      console.error("❌ VERIFICATION ERROR:", verifyError);
    }
    
    return { 
      success: true, 
      emailDocId: emailDocRef.id,
      message: "Test email successfully created in Firestore 'mail' collection. Check Firebase Console for processing status." 
    };
    
  } catch (error) {
    console.error("❌ EMAIL TEST FAILED:", error);
    console.error("Test error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code || "No code",
      stack: error instanceof Error ? error.stack : "No stack trace"
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Email system test failed. Check Firebase configuration, extensions, and console logs for details." 
    };
  }
}

/**
 * Creates a new inquiry from user form submission
 * 
 * This function processes form data, transforms it for database storage,
 * saves it to Firestore, and triggers automated email notifications.
 */
export async function createInquiryAction(inquiryData: InquiryFormData) {
  try {
    // Check Firebase configuration first
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("Firebase project ID not found in environment variables");
      throw new Error("Firebase configuration error");
    }

    // Transform the form data to match the expected database structure
    // This ensures all required fields are present with proper defaults
    const currentDate = new Date();
    const transformedData = {
      // Core inquiry information
      name: inquiryData.name,
      affiliation: inquiryData.affiliation,
      designation: inquiryData.designation,
      email: inquiryData.email,
      
      // New Service Selection Fields
      species: inquiryData.species || null,
      otherSpecies: inquiryData.otherSpecies || null,
      researchOverview: inquiryData.researchOverview || null,
      methodologyFileUrl: inquiryData.methodologyFileUrl || null,
      sampleCount: inquiryData.sampleCount || null,
      workflowType: inquiryData.workflowType || null,
      bioinfoOptions: inquiryData.bioinfoOptions || [],
      individualAssayDetails: inquiryData.individualAssayDetails || null,
      
      // Retail Sales specific fields
      retailItems: inquiryData.retailItems || [],
      retailItemDetails: inquiryData.retailItemDetails || {},
      
      // Service-specific fields (legacy - will be null for non-applicable services)
      // Laboratory Service fields
      workflows: inquiryData.workflows || [],
      additionalInfo: inquiryData.additionalInfo || null, 
      // Research service specific fields
      projectBackground: inquiryData.projectBackground || null, 
      projectBudget: inquiryData.projectBudget || null, 
      molecularServicesBudget: inquiryData.molecularServicesBudget || null,
      plannedSampleCount: inquiryData.plannedSampleCount || null,
      // Training service specific fields
      specificTrainingNeed: inquiryData.specificTrainingNeed || null,
      targetTrainingDate: inquiryData.targetTrainingDate || null,
      numberOfParticipants: inquiryData.numberOfParticipants || null,
      
      // System fields with defaults
      createdAt: serverTimestamp(),       // Firestore server timestamp
      status: 'Pending',                  // Default status for new inquiries
      isApproved: false,                  // Default approval status
      serviceType: inquiryData.service,   // Store the service type for reference
      haveSubmitted: false                // Track if user has submitted client-project form
    };

    // Add the inquiry document to the Firestore 'inquiries' collection
    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Log the inquiry creation to activity logs
    await logActivity({
      userId: inquiryData.email || 'anonymous',
      userEmail: inquiryData.email || 'anonymous',
      userName: inquiryData.name,
      userRole: 'client',
      action: 'CREATE',
      entityType: 'inquiry',
      entityId: docRef.id,
      entityName: inquiryData.name,
      description: `New inquiry request submitted by ${inquiryData.name} (${inquiryData.service})`,
      changesAfter: transformedData,
    });

    // Initialize quotation thread for this inquiry and send a welcome message
    try {
      await initializeQuotationThread(docRef.id);
      
      // Send the automated welcome message from PGC Visayas Admin
      await addThreadMessage({
        threadId: docRef.id,
        content: "Welcome to PGC Visayas! 👋 Your inquiry has been received. You can use this chat to ask questions about your quotation or clarify your research requirements.",
        senderId: "pgc-admin",
        senderName: "PGC Visayas Admin",
        senderRole: "admin",
        type: "text",
        isRead: false
      });
    } catch (threadError) {
      console.error(`⚠️ Failed to initialize quotation thread for inquiry ${docRef.id}:`, threadError);
      // Non-fatal — the thread will be auto-created on first message if this fails
    }

    // Preparation for email notification using Firebase Trigger Email extension
    // Template ID corresponds to service type for different email formats
    //NOTE: templates for email can be changed in the 'templates' collection in firebase
    const templateId = `inquiry-${inquiryData.service}`;
    
    // Create base template data that applies to all service types
    let templateData: Record<string, any> = {
      inquiryId: docRef.id, 
      name: inquiryData.name,
      affiliation: inquiryData.affiliation,
      designation: inquiryData.designation,
      email: inquiryData.email || '',
      service: inquiryData.service
    };

    // Add service-specific data to email template based on inquiry type
    if (['laboratory', 'bioinformatics', 'equipment', 'retail'].includes(inquiryData.service)) {
      // Laboratory services: include new comprehensive fields
      templateData.species = inquiryData.species || '';
      templateData.otherSpecies = inquiryData.otherSpecies || '';
      templateData.researchOverview = inquiryData.researchOverview || '';
      templateData.methodologyFileUrl = inquiryData.methodologyFileUrl || '';
      templateData.sampleCount = inquiryData.sampleCount?.toString() || '';
      templateData.workflowType = formatWorkflowType(inquiryData.workflowType) || '';
      templateData.bioinfoOptions = Array.isArray(inquiryData.bioinfoOptions)
        ? inquiryData.bioinfoOptions.map(formatBioinfoOption).join(', ')
        : '';
      templateData.individualAssayDetails = inquiryData.individualAssayDetails || '';
      // Retail items formatting for template
      if (inquiryData.service === 'retail' && inquiryData.retailItems && inquiryData.retailItems.length > 0) {
        templateData.retailItemsFormatted = inquiryData.retailItems.map(item => {
          const amount = inquiryData.retailItemDetails?.[item];
          return amount ? `${item} (${amount})` : item;
        }).join(', ');
      }
      // Legacy fields for backward compatibility
      templateData.workflows = Array.isArray(inquiryData.workflows) 
        ? inquiryData.workflows.join(', ') 
        : inquiryData.workflows || '';
      templateData.additionalInfo = inquiryData.additionalInfo || '';
    } else if (inquiryData.service === 'research') {
      // Research service: include collaboration overview and planning fields
      templateData.researchOverview = inquiryData.researchOverview || '';
      templateData.molecularServicesBudget = inquiryData.molecularServicesBudget || '';
      templateData.plannedSampleCount = inquiryData.plannedSampleCount || '';
      // Legacy fields kept for backward compatibility with old templates
      templateData.projectBackground = inquiryData.projectBackground || '';
      templateData.projectBudget = inquiryData.projectBudget || '';
    } else if (inquiryData.service === 'training') {
      // Training service: include training-specific details
      templateData.specificTrainingNeed = inquiryData.specificTrainingNeed || '';
      templateData.targetTrainingDate = inquiryData.targetTrainingDate || '';
      templateData.numberOfParticipants = inquiryData.numberOfParticipants?.toString() || '';
    }

    // === EMAIL NOTIFICATION SYSTEM ===
    // Create email document for Firebase Trigger Email extension
    // This document triggers Firebase extension to send email notifications
    
    console.log("=== EMAIL DEBUG: Starting email creation process ===");
    console.log("Inquiry ID:", docRef.id);
    console.log("Template ID:", templateId);
    console.log("Template Data:", templateData);
    console.log("Firebase DB instance:", db ? "Connected" : "Not Connected");
    
    // Configure recipients for internal notification
    const emailRecipients = Array.from(
      new Set([
        "madayon1@up.edu.ph",
      ])
    );
    
    // Add sequencing team and extra recipient for equipment inquiries
    if (inquiryData.service === 'equipment') {
      emailRecipients.push("sequencing.pgc.upvisayas@up.edu.ph");
    }
    
    // Add Bioinformatics specialist if service type matches
    if (inquiryData.service === 'bioinformatics') {
      emailRecipients.push("bioinfo.pgc.upvisayas@up.edu.ph");
    }
    
    console.log("EMAIL DEBUG: Creating email for recipients:", emailRecipients.join(", "));
    
    // Create a comprehensive HTML email body
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.5;">
        <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e40af; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            New ${formatServiceType(inquiryData.service)} Inquiry
          </h2>
          
          <div style="margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${inquiryData.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${inquiryData.email}</p>
            <p style="margin: 5px 0;"><strong>Affiliation:</strong> ${inquiryData.affiliation}</p>
            <p style="margin: 5px 0;"><strong>Designation:</strong> ${inquiryData.designation}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #1e40af;">Service Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; width: 140px; color: #64748b;">Service Type:</td>
                <td style="padding: 4px 0;">${formatServiceType(inquiryData.service)}</td>
              </tr>
              ${inquiryData.species ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Species:</td>
                <td style="padding: 4px 0;">${formatSpecies(inquiryData.species, inquiryData.otherSpecies || undefined)}</td>
              </tr>` : ''}
              ${inquiryData.sampleCount ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Sample Count:</td>
                <td style="padding: 4px 0;">${inquiryData.sampleCount}</td>
              </tr>` : ''}
              ${inquiryData.workflowType ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Workflow:</td>
                <td style="padding: 4px 0;">${formatWorkflowType(inquiryData.workflowType)}</td>
              </tr>` : ''}
              ${inquiryData.bioinfoOptions && inquiryData.bioinfoOptions.length > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Bioinformatics Analysis:</td>
                <td style="padding: 4px 0;">${inquiryData.bioinfoOptions.map(formatBioinfoOption).join(', ')}</td>
              </tr>` : ''}
              ${inquiryData.individualAssayDetails ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Equipment/Workflow:</td>
                <td style="padding: 4px 0;">${inquiryData.individualAssayDetails}</td>
              </tr>` : ''}
              ${inquiryData.service === 'retail' && inquiryData.retailItems && inquiryData.retailItems.length > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Retail Items:</td>
                <td style="padding: 4px 0;">
                  <ul style="margin: 0; padding-left: 20px;">
                    ${inquiryData.retailItems.map(item => {
                      const amount = inquiryData.retailItemDetails?.[item];
                      return `<li style="margin-bottom: 2px;">${item}${amount ? `: <strong>${amount}</strong>` : ''}</li>`;
                    }).join('')}
                  </ul>
                </td>
              </tr>` : ''}
              ${inquiryData.service === 'research' && inquiryData.molecularServicesBudget ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Budget for Molecular Services:</td>
                <td style="padding: 4px 0;">${inquiryData.molecularServicesBudget}</td>
              </tr>` : ''}
              ${inquiryData.service === 'research' && inquiryData.plannedSampleCount ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Planned Sample Count:</td>
                <td style="padding: 4px 0;">${inquiryData.plannedSampleCount}</td>
              </tr>` : ''}
            </table>
            
            ${inquiryData.researchOverview ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; color: #64748b; font-size: 13px;"><strong>Research Overview:</strong></p>
              <p style="margin: 4px 0; font-size: 14px;">${inquiryData.researchOverview}</p>
            </div>` : ''}
            
            ${inquiryData.methodologyFileUrl ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0;"><a href="${inquiryData.methodologyFileUrl}" style="color: #1e40af; text-decoration: underline; font-weight: 600;">View Uploaded Methodology</a></p>
            </div>` : ''}
          </div>
          
          <div style="margin-top: 20px;">
            <a href="https://pgc-genomebase.vercel.app/admin/inquiry" style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600; font-size: 14px;">Review in Admin Panel</a>
          </div>

          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            <p style="margin: 2px 0;">Inquiry ID: ${docRef.id}</p>
            <p style="margin: 2px 0;">Submitted: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;
    
    // Create email text version
    const emailText = `
New ${formatServiceType(inquiryData.service)} Inquiry

Contact Information:
Name: ${inquiryData.name}
Email: ${inquiryData.email}
Affiliation: ${inquiryData.affiliation}
Designation: ${inquiryData.designation}

Service Type: ${formatServiceType(inquiryData.service)}
${inquiryData.species ? `Species: ${formatSpecies(inquiryData.species, inquiryData.otherSpecies || undefined)}\n` : ''}
${inquiryData.sampleCount ? `Sample Count: ${inquiryData.sampleCount}\n` : ''}
${inquiryData.workflowType ? `Workflow: ${formatWorkflowType(inquiryData.workflowType)}\n` : ''}
${inquiryData.bioinfoOptions && inquiryData.bioinfoOptions.length > 0 ? `Bioinformatics Analysis: ${inquiryData.bioinfoOptions.map(formatBioinfoOption).join(', ')}\n` : ''}
${inquiryData.researchOverview ? `Research Overview: ${inquiryData.researchOverview}\n` : ''}
${inquiryData.service === 'research' && inquiryData.molecularServicesBudget ? `Budget for Molecular Services: ${inquiryData.molecularServicesBudget}\n` : ''}
${inquiryData.service === 'research' && inquiryData.plannedSampleCount ? `Planned Sample Count: ${inquiryData.plannedSampleCount}\n` : ''}
${inquiryData.methodologyFileUrl ? `Methodology File: ${inquiryData.methodologyFileUrl}\n` : ''}
${inquiryData.individualAssayDetails ? `Individual Assay Details: ${inquiryData.individualAssayDetails}\n` : ''}
${inquiryData.service === 'retail' && inquiryData.retailItems && inquiryData.retailItems.length > 0 ? `Retail Items: \n${inquiryData.retailItems.map(item => `- ${item}${inquiryData.retailItemDetails?.[item] ? `: ${inquiryData.retailItemDetails?.[item]}` : ''}`).join('\n')}\n` : ''}
${inquiryData.workflows && inquiryData.workflows.length > 0 ? `Workflows: ${Array.isArray(inquiryData.workflows) ? inquiryData.workflows.join(', ') : inquiryData.workflows}\n` : ''}
${inquiryData.additionalInfo ? `Additional Info: ${inquiryData.additionalInfo}\n` : ''}
${inquiryData.projectBackground ? `Project Background: ${inquiryData.projectBackground}\n` : ''}
${inquiryData.projectBudget ? `Project Budget: ${inquiryData.projectBudget}\n` : ''}
${inquiryData.specificTrainingNeed ? `Training Need: ${inquiryData.specificTrainingNeed}\n` : ''}
${inquiryData.targetTrainingDate ? `Training Date: ${inquiryData.targetTrainingDate}\n` : ''}
${inquiryData.numberOfParticipants ? `Participants: ${inquiryData.numberOfParticipants}\n` : ''}

Inquiry ID: ${docRef.id}
Submitted: ${new Date().toLocaleString()}
    `.trim();
    
    // Create email document with simplified structure for better compatibility
    const emailData = {
      to: emailRecipients,
      inquiryId: docRef.id, // Root level for easy searching
      message: {
        subject: `New ${inquiryData.service.charAt(0).toUpperCase() + inquiryData.service.slice(1)} Inquiry from ${inquiryData.name}`,
        text: emailText,
        html: emailHtml
      }
    };

    console.log("EMAIL DEBUG: Email document structure:", {
      recipients: emailData.to,
      inquiryId: emailData.inquiryId,
      hasSubject: !!emailData.message.subject,
      subjectLength: emailData.message.subject.length,
      htmlLength: emailData.message.html.length,
      textLength: emailData.message.text.length
    });

    // Attempt to create email document with enhanced error handling
    let emailDocumentCreated = false;
    let emailDocId = "";
    
    try {
      console.log("EMAIL DEBUG: Attempting to create email document...");
      console.log("EMAIL DEBUG: Firestore DB check:", {
        isDbDefined: !!db,
        dbType: typeof db,
        hasCollection: typeof collection === 'function',
        hasAddDoc: typeof addDoc === 'function'
      });
      
      // Check if Firestore connection is working
      const mailCollection = collection(db, "mail");
      console.log("EMAIL DEBUG: Mail collection reference created successfully");
      
      // Log the exact data being sent
      console.log("EMAIL DEBUG: Email data to be sent:", JSON.stringify({
        to: emailData.to,
        inquiryId: emailData.inquiryId,
        hasMessage: !!emailData.message,
        messageKeys: Object.keys(emailData.message)
      }, null, 2));
      
  console.log("EMAIL DEBUG: Creating email for recipients:", emailData.to.join(", "));
    
    // Create the email document
    console.log("EMAIL DEBUG: Calling addDoc...");
    const emailDocRef = await addDoc(mailCollection, emailData);
    emailDocumentCreated = true;
    emailDocId = emailDocRef.id;
    
    console.log("✅ EMAIL SUCCESS: Email document created!");
    console.log("Email Document ID:", emailDocRef.id);
    console.log("Email Document Path:", emailDocRef.path);
    console.log("Email Document Full Path:", `mail/${emailDocRef.id}`);

    // === CLIENT CONFIRMATION EMAIL ===
    // Send automated confirmation email to the client with credentials
    try {
      if (inquiryData.email) {
        console.log("EMAIL DEBUG: Creating client confirmation email for:", inquiryData.email);
        
        const clientEmailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
            <div style="background-color: #ffffff; padding: 0; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: left;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Inquiry Received - PGC Visayas</h1>
              </div>

              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 20px 0; font-size: 16px;">Dear <strong>${inquiryData.name}</strong>,</p>
                <p style="margin: 0 0 24px 0;">Thank you for reaching out to <strong>PGC Visayas</strong> for your research needs. Our team will be reviewing your inquiry and will get back to you as soon as possible.</p>
                
                <!-- Next Steps Card -->
                <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border-left: 4px solid #1e40af; margin: 24px 0;">
                  <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 700;">Next Steps</h3>
                  <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">Monitor your request status and view quotations via the Client Portal.</p>
                  <p style="margin: 0;"><a href="https://pgc-genomebase.vercel.app/portal" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px; transition: background-color 0.2s;">Access Client Portal</a></p>
                </div>

                <!-- Credentials Info -->
                <div style="margin: 24px 0; padding: 16px 0; border-top: 1px solid #f1f5f9;">
                  <h4 style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Temporary Access Credentials</h4>
                  <p style="margin: 6px 0; font-size: 15px;"><strong style="color: #475569; width: 80px; display: inline-block;">Email:</strong> <span style="color: #1e40af; text-decoration: none;">${inquiryData.email}</span></p>
                  <p style="margin: 6px 0; font-size: 15px;"><strong style="color: #475569; width: 80px; display: inline-block;">Password:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; color: #334155;">${docRef.id}</code></p>
                </div>

                <p style="margin: 32px 0 24px 0; font-size: 15px;">One of our researchers will contact you shortly if additional information is needed. Should you have any immediate questions, feel free to reply through this email.</p>
                
                <!-- Sign-off -->
                <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-top: 32px;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Yours in utilizing OMICS for a better Philippines,</p>
                  <p style="margin: 4px 0 0 0; color: #1e40af; font-weight: 700; font-size: 16px;">Philippine Genome Center Visayas</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated message. Please do not reply directly to this email.</p>
              </div>
            </div>
          </div>
        `;

        const clientEmailText = `
Inquiry Received - PGC Visayas

Dear ${inquiryData.name},

Thank you for reaching out to PGC Visayas for your research needs. Our team will be reviewing your inquiry and will get back to you as soon as possible.

NEXT STEPS:
You may monitor the status of your request and view your quotation once available through our Client Portal: https://pgc-genomebase.vercel.app/portal

TEMPORARY ACCESS CREDENTIALS:
Email: ${inquiryData.email}
Temporary Password: ${docRef.id}

One of our researchers will contact you shortly if additional information is needed. Should you have any immediate questions, feel free to reply through this email.

Yours in utilizing OMICS for a better Philippines,
Philippine Genome Center Visayas
        `.trim();

        const clientEmailData = {
          to: [inquiryData.email],
          inquiryId: docRef.id,
          message: {
            subject: "Inquiry Received: PGC Visayas",
            text: clientEmailText,
            html: clientEmailHtml
          }
        };

        await addDoc(mailCollection, clientEmailData);
        console.log("✅ EMAIL SUCCESS: Client confirmation email sent to:", inquiryData.email);
      } else {
        console.log("⚠️ EMAIL WARNING: No client email provided, skipping confirmation email");
      }
    } catch (clientEmailError) {
      console.error("❌ CLIENT EMAIL FAILED:", clientEmailError);
      // Continue execution even if client email fails
    }
    
    // Immediately verify the document exists in Firestore
    console.log("EMAIL DEBUG: Starting immediate verification...");
    try {
      const verifyDoc = await getDoc(emailDocRef);
      if (verifyDoc.exists()) {
        const docData = verifyDoc.data();
        console.log("✅ VERIFICATION SUCCESS: Email document confirmed in Firestore!");
        console.log("Verified data:", {
          inquiryId: docData.inquiryId,
          recipients: docData.to,
            hasMessage: !!docData.message,
            subject: docData.message?.subject
          });
        } else {
          console.error("❌ VERIFICATION FAILED: Email document not found immediately after creation!");
          console.error("Expected document at:", `mail/${emailDocRef.id}`);
        }
      } catch (verifyError) {
        console.error("❌ VERIFICATION ERROR:", verifyError);
        console.error("Verify error details:", {
          name: verifyError instanceof Error ? verifyError.name : "Unknown",
          message: verifyError instanceof Error ? verifyError.message : String(verifyError)
        });
      }
      
      // Enhanced status checking with better error handling
      setTimeout(async () => {
        try {
          console.log("EMAIL DEBUG: Checking email document status after 5 seconds...");
          const emailDoc = await getDoc(doc(db, "mail", emailDocRef.id));
          
          if (emailDoc.exists()) {
            const emailStatus = emailDoc.data();
            console.log("EMAIL STATUS AFTER 5s:", JSON.stringify(emailStatus, null, 2));
            
            // Check for delivery status
            if (emailStatus.delivery) {
              if (emailStatus.delivery.state === 'SUCCESS') {
                console.log("✅ EMAIL DELIVERED: Email sent successfully!");
              } else if (emailStatus.delivery.state === 'ERROR') {
                console.error("❌ EMAIL DELIVERY FAILED:", emailStatus.delivery.error);
              } else {
                console.log("📧 EMAIL PENDING: Email state:", emailStatus.delivery.state);
              }
            } else {
              console.log("⏳ EMAIL PENDING: No delivery status yet (still processing)");
            }
          } else {
            console.log("⚠️ EMAIL WARNING: Email document no longer exists (may have been processed and deleted by extension)");
          }
        } catch (checkError) {
          console.error("EMAIL DEBUG ERROR: Could not check email status:", checkError);
        }
      }, 5000);
      
    } catch (emailError) {
      console.error("❌ EMAIL CREATION FAILED:", emailError);
      console.error("Error type:", typeof emailError);
      console.error("Error constructor:", emailError?.constructor?.name);
      console.error("Full error object:", JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)));
      console.error("Error details:", {
        name: emailError instanceof Error ? emailError.name : "Unknown",
        message: emailError instanceof Error ? emailError.message : String(emailError),
        code: (emailError as any)?.code || "No code",
        stack: emailError instanceof Error ? emailError.stack : "No stack trace"
      });
      
      // Log additional debugging information
      console.log("EMAIL DEBUG: Failure context:", {
        hasDB: !!db,
        dbType: typeof db,
        hasCollection: typeof collection === 'function',
        hasAddDoc: typeof addDoc === 'function',
        emailDataSize: JSON.stringify(emailData).length,
        emailDataKeys: Object.keys(emailData),
        timestamp: new Date().toISOString(),
        inquiryIdExists: !!docRef.id
      });
      
      // Don't throw error - allow inquiry creation to continue
      console.log("EMAIL DEBUG: Continuing with inquiry creation despite email failure");
      
      // Return inquiry success but note email failure
      revalidatePath('/admin/inquiry');
      return { 
        success: true, 
        inquiryId: docRef.id,
        emailSent: false,
        message: "Inquiry submitted successfully, but email notification failed. Admin will be notified manually.",
        error: emailError instanceof Error ? emailError.message : String(emailError)
      };
    }
    
    console.log("=== EMAIL DEBUG: Email process completed ===");
    console.log("Email document created:", emailDocumentCreated);
    console.log("Email document ID:", emailDocId);
    
    // Revalidate the admin inquiry page cache to show new data immediately
    // This ensures the admin sees the new inquiry without page refresh
    revalidatePath('/admin/inquiry');
    
    return { 
      success: true, 
      inquiryId: docRef.id,
      emailSent: emailDocumentCreated,
      emailDocId: emailDocId,
      message: emailDocumentCreated 
        ? `Inquiry submitted successfully! Email notification sent to ${emailRecipients}. Email ID: ${emailDocId}`
        : "Inquiry submitted successfully, but email notification may not have been sent."
    };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    // Include the error message in the thrown error for Toast notification 
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create inquiry: ${errorMessage}`);
  }
}

/**
 * Creates a new inquiry directly from admin interface
 * 
 * This function allows administrators to manually create inquiry records
 * without going through the public form submission process.
 * 
 * Note: This creates a minimal inquiry record with default values for
 * service-specific fields since it's created by admin, not user submission.
 */
export async function createAdminInquiryAction(data: AdminInquiryData, userInfo?: { name: string; email: string }) {
  try {
    // Transform admin data to database format with defaults for service fields
    const transformedData = {
      // Core fields from admin form
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client', // Auto-approve if status is 'Approved Client'
      createdAt: serverTimestamp(),
      haveSubmitted: false,
      
      // Default values for service-specific fields since this is admin-created
      workflows: [], 
      additionalInfo: null,
      projectBackground: null,
      projectBudget: null,
      specificTrainingNeed: null,
      targetTrainingDate: null,
      numberOfParticipants: null,
      serviceType: null 
    };

    // Add the inquiry document to Firestore
    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "CREATE",
      entityType: "inquiry",
      entityId: docRef.id,
      entityName: data.name,
      description: `Created inquiry for ${data.name}`,
      changesAfter: transformedData,
    });
    
    // Revalidate the admin inquiry page to show the new entry
    revalidatePath('/admin/inquiry');
    
    return { success: true, inquiryId: docRef.id };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}

/**
 * Updates an existing inquiry record
 * 
 * This function allows administrators to modify inquiry details,
 * including status changes and approval status updates.
 * 
 * Note: Only updates core fields that can be modified by admin.
 * Service-specific fields are preserved from original submission.
 */
export async function updateInquiryAction(
  id: string,
  data: AdminInquiryData,
  userInfo?: { name: string; email: string }
) {
  try {
    // Create reference to the specific inquiry document
    const docRef = doc(db, "inquiries", id);
    
    // Get old data for logging
    const oldDoc = await getDoc(docRef);
    const oldData = oldDoc.exists() ? oldDoc.data() : null;
    
    const updateData: any = {
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client',
    };
    
    // Update only the editable fields
    await updateDoc(docRef, updateData);

    // If "Service Not Offered" and send email is checked, trigger email via Firestore mail collection
    if (data.status === 'Service Not Offered' && data.sendStatusEmail !== false) {
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header with Logo -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">PGC Visayas</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Update Regarding Your Inquiry</p>
          </div>

          <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Dear <strong>${data.name}</strong>,</p>
            
            <p style="margin: 0 0 20px 0;">Thank you for submitting your inquiry to <strong>PGC Visayas</strong>.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: 500;">Status: Service Not Offered</p>
              <p style="margin: 8px 0 0 0; color: #b91c1c; font-size: 14px;">
                Unfortunately, the requested services are currently unavailable at our facility, and the project requirements fall outside our specific scope of expertise.
              </p>
            </div>

            ${data.remarks ? `
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin: 0 0 8px 0;">Additional Remarks</h3>
              <div style="background-color: #f8fafc; padding: 16px; border: 1px solid #f1f5f9; border-radius: 8px; color: #475569; font-style: italic;">
                "${data.remarks}"
              </div>
            </div>
            ` : ''}

            <p style="margin: 0 0 20px 0;">If you require additional information, kindly review our <strong><a href="https://pgc-genomebase.vercel.app/faqs" style="color: #2563eb; text-decoration: none;">FAQs</a></strong>, or you can message us through the <strong><a href="https://pgc-genomebase.vercel.app/portal" style="color: #2563eb; text-decoration: none;">client portal chat box</a></strong>.</p>
            
            <p style="margin: 0 0 32px 0;">We appreciate your interest in working with us and wish you the best of luck in finding the right facility to support your research needs.</p>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Yours in utilizing OMICS for a better Philippines,</p>
              <p style="margin: 4px 0 0 0; color: #1e40af; font-weight: 700; font-size: 16px;">Philippine Genome Center Visayas</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      `;

      const mailDocRef = doc(collection(db, "mail"));
      await setDoc(mailDocRef, {
        to: data.email,
        message: {
          subject: "Update Regarding Your Inquiry",
          html: emailHtml,
        },
        metadata: {
          inquiryId: id,
          type: "service-not-offered",
          remarks: data.remarks || ""
        },
        createdAt: serverTimestamp(),
      });
    }
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "UPDATE",
      entityType: "inquiry",
      entityId: id,
      entityName: data.name,
      description: `Updated inquiry for ${data.name}${data.status === 'Service Not Offered' ? ' - Service Not Offered' : ''}`,
      changesBefore: oldData || undefined,
      changesAfter: { ...oldData, ...updateData },
      changedFields: Object.keys(updateData),
    });
    
    // Revalidate the admin inquiry page to reflect changes
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error updating inquiry:", error);
    throw new Error('Failed to update inquiry');
  }
}

/**
 * Deletes an inquiry record from the database
 * 
 * This function permanently removes an inquiry document from Firestore.
 * Use with caution as this operation cannot be undone.
 * 
 */
export async function deleteInquiryAction(id: string, userInfo?: { name: string; email: string }) {
  try {
    // Create reference to the specific inquiry document
    const docRef = doc(db, "inquiries", id);
    
    // Get data before deletion for logging
    const docSnap = await getDoc(docRef);
    const inquiryData = docSnap.exists() ? docSnap.data() : null;
    
    // Permanently delete the document from Firestore
    await deleteDoc(docRef);
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "DELETE",
      entityType: "inquiry",
      entityId: id,
      entityName: inquiryData?.name || "Unknown",
      description: `Deleted inquiry for ${inquiryData?.name || id}`,
      changesBefore: inquiryData || undefined,
    });
    
    // Revalidate the admin inquiry page to remove the deleted entry
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    throw new Error('Failed to delete inquiry');
  }
}