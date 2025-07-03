import { Inquiry } from '../types/Inquiry';

export const mockInquiries: Inquiry[] = [
  {
    id: 'P-2025-001',
    year: 2025,
    createdAt: new Date('2025-01-15T10:30:00Z'),
    name: 'Dr. Maria Santos',
    isApproved: true,
    affiliation: 'University of the Philippines Manila',
    designation: 'Research Professor',
    email: 'maria.santos@upm.edu.ph'
  },
  {
    id: 'P-2025-002',
    year: 2025,
    createdAt: new Date('2025-02-03T14:15:00Z'),
    name: 'Dr. John Chen',
    isApproved: false,
    affiliation: 'Ateneo de Manila University',
    designation: 'Associate Professor',
    email: 'j.chen@ateneo.edu'
  },
  {
    id: 'P-2025-003',
    year: 2025,
    createdAt: new Date('2025-02-18T09:45:00Z'),
    name: 'Dr. Sarah Williams',
    isApproved: true,
    affiliation: 'International Rice Research Institute',
    designation: 'Senior Research Scientist',
    email: 'sarah.williams@irri.org'
  },
  {
    id: 'P-2025-004',
    year: 2025,
    createdAt: new Date('2025-03-05T11:20:00Z'),
    name: 'Dr. Robert Kim',
    isApproved: true,
    affiliation: 'De La Salle University',
    designation: 'Department Head',
    email: 'robert.kim@dlsu.edu.ph'
  },
  {
    id: 'P-2025-005',
    year: 2025,
    createdAt: new Date('2025-03-22T16:30:00Z'),
    name: 'Dr. Elena Rodriguez',
    isApproved: false,
    affiliation: 'University of Santo Tomas',
    designation: 'Assistant Professor',
    email: 'elena.rodriguez@ust.edu.ph'
  },
  {
    id: 'P-2024-086',
    year: 2024,
    createdAt: new Date('2024-11-10T13:15:00Z'),
    name: 'Dr. Michael Thompson',
    isApproved: true,
    affiliation: 'Philippine General Hospital',
    designation: 'Chief of Genetics',
    email: 'michael.thompson@pgh.gov.ph'
  },
  {
    id: 'P-2024-087',
    year: 2024,
    createdAt: new Date('2024-12-01T08:30:00Z'),
    name: 'Dr. Lisa Chang',
    isApproved: true,
    affiliation: 'National Institute of Health',
    designation: 'Research Director',
    email: 'lisa.chang@nih.gov.ph'
  },
  {
    id: 'P-2025-006',
    year: 2025,
    createdAt: new Date('2025-04-10T12:45:00Z'),
    name: 'Dr. Ahmed Hassan',
    isApproved: false,
    affiliation: 'Asian Institute of Technology',
    designation: 'Postdoctoral Researcher',
    email: 'ahmed.hassan@ait.ac.th'
  },
  {
    id: 'P-2025-007',
    year: 2025,
    createdAt: new Date('2025-05-15T15:00:00Z'),
    name: 'Dr. Anna Kowalski',
    isApproved: true,
    affiliation: 'Manila Medical Center',
    designation: 'Clinical Geneticist',
    email: 'anna.kowalski@mmc.com.ph'
  },
  {
    id: 'P-2025-008',
    year: 2025,
    createdAt: new Date('2025-06-20T10:15:00Z'),
    name: 'Dr. Carlos Mendoza',
    isApproved: false,
    affiliation: 'University of the Philippines Los Baños',
    designation: 'Professor Emeritus',
    email: 'carlos.mendoza@uplb.edu.ph'
  }
];