// src/mock/mockInquiries.ts

import { Inquiry } from '../types/Inquiry';

export const mockInquiries: Inquiry[] = [
  {
    id: 'I-2025-001',
    createdAt: new Date('2025-01-15T10:30:00Z'),
    name: 'Dr. Maria Santos',
    status: 'Approved Client',
    isApproved: true,
    affiliation: 'University of the Philippines Manila',
    designation: 'Research Professor',
    email: 'maria.santos@upm.edu.ph'
  },
  {
    id: 'I-2025-002',
    createdAt: new Date('2025-02-03T14:15:00Z'),
    name: 'Dr. John Chen',
    status: 'Pending',
    isApproved: false,
    affiliation: 'Ateneo de Manila University',
    designation: 'Associate Professor',
    email: 'j.chen@ateneo.edu'
  },
  {
    id: 'I-2025-003',
    createdAt: new Date('2025-02-18T09:45:00Z'),
    name: 'Dr. Sarah Williams',
    status: 'Quotation Only',
    isApproved: false,
    affiliation: 'International Rice Research Institute',
    designation: 'Senior Research Scientist',
    email: 'sarah.williams@irri.org'
  },
  {
    id: 'I-2025-004',
    createdAt: new Date('2025-03-05T11:20:00Z'),
    name: 'Dr. Robert Kim',
    status: 'Approved Client',
    isApproved: true,
    affiliation: 'De La Salle University',
    designation: 'Department Head',
    email: 'robert.kim@dlsu.edu.ph'
  },
  {
    id: 'I-2025-005',
    createdAt: new Date('2025-03-22T16:30:00Z'),
    name: 'Dr. Elena Rodriguez',
    status: 'Pending',
    isApproved: false,
    affiliation: 'University of Santo Tomas',
    designation: 'Assistant Professor',
    email: 'elena.rodriguez@ust.edu.ph'
  },
  {
    id: 'I-2024-086',
    createdAt: new Date('2024-11-10T13:15:00Z'),
    name: 'Dr. Michael Thompson',
    status: 'Approved Client',
    isApproved: true,
    affiliation: 'Philippine General Hospital',
    designation: 'Chief of Genetics',
    email: 'michael.thompson@pgh.gov.ph'
  },
  {
    id: 'I-2024-087',
    createdAt: new Date('2024-12-01T08:30:00Z'),
    name: 'Dr. Lisa Chang',
    status: 'Quotation Only',
    isApproved: false,
    affiliation: 'National Institute of Health',
    designation: 'Research Director',
    email: 'lisa.chang@nih.gov.ph'
  },
  {
    id: 'I-2025-006',
    createdAt: new Date('2025-04-10T12:45:00Z'),
    name: 'Dr. Ahmed Hassan',
    status: 'Pending',
    isApproved: false,
    affiliation: 'Asian Institute of Technology',
    designation: 'Postdoctoral Researcher',
    email: 'ahmed.hassan@ait.ac.th'
  },
  {
    id: 'I-2025-007',
    createdAt: new Date('2025-05-15T15:00:00Z'),
    name: 'Dr. Anna Kowalski',
    status: 'Approved Client',
    isApproved: true,
    affiliation: 'Manila Medical Center',
    designation: 'Clinical Geneticist',
    email: 'anna.kowalski@mmc.com.ph'
  },
  {
    id: 'I-2025-008',
    createdAt: new Date('2025-06-20T10:15:00Z'),
    name: 'Dr. Carlos Mendoza',
    status: 'Quotation Only',
    isApproved: false,
    affiliation: 'University of the Philippines Los Baños',
    designation: 'Professor Emeritus',
    email: 'carlos.mendoza@uplb.edu.ph'
  }
];
export function getMockInquiryDetailsById(id: string) {
  return mockInquiries.find((inq) => inq.id === id);
}