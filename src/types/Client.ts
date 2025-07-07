export interface Client {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  designation: string;
  sex: "Male" | "Female" | "Other";
  mobileNumber: string;
  affiliationAddress: string;
  cid: string;
  createdAt: Date;
}