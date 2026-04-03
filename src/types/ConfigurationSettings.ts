export type PortalFeatureKey = "sampleForms" | "serviceReports" | "officialReceipts";

export interface PortalFeatureVisibility {
  sampleForms: boolean;
  serviceReports: boolean;
  officialReceipts: boolean;
}

export interface InquiryNotificationGroup {
  id: string;
  label: string;
  description?: string;
  serviceFilters: string[];
  recipients: string[];
  enabled?: boolean;
}

export interface ConfigurationSettings {
  portalFeatures: PortalFeatureVisibility;
  inquiryNotifications: InquiryNotificationGroup[];
}
