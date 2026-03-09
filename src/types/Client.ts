export interface Client {
  cid?: string;
  name?: string;
  email?: string;
  affiliation?: string;
  designation?: string;
  sex?: "M" | "F" | "Other" | "";
  phoneNumber?: string;
  affiliationAddress?: string;
  pid?: string[];
  createdAt?: string |Date;
  haveSubmitted?: boolean;
  isContactPerson?: boolean;
  year?: number
}