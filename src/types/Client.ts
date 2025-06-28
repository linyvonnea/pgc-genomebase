export interface Client {
  id: string;
  name: string;
  email: string;
  institution: string;
  designation: string;
  sex: "Male" | "Female" | "Other";
  mobileNumber: string;
  mailingAddress: string;
  createdAt: Date;
}