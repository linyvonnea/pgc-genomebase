"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HelpCircle, Microscope, CreditCard, Droplets, Clock, BarChart4, Globe } from "lucide-react";

const faqData = [
  {
    category: "Part 1: General Services & Project Planning",
    icon: <Microscope className="w-5 h-5 text-blue-600" />,
    questions: [
      {
        q: "What services does PGC Visayas offer?",
        a: "We provide a wide range of genomic-based services to support your research, including:\n\n• DNA and RNA extraction\n• Polymerase Chain Reaction (PCR) & RT-PCR for gene expression and quantification\n• Nucleic Acid Quantification\n• Capillary Sequencing\n• Library preparation for next-generation sequencing (NGS)\n• Whole genome sequencing (WGS)\n• Amplicon sequencing (e.g., 16S, ITS, and targeted genes)\n• Metagenomics/Metabarcoding sequencing using Environmental DNA (eDNA)\n• Transcriptomics (RNA-Seq)\n• Bioinformatics Analysis and Data Interpretation\n• Custom research-based sequencing services\n• Training and workshops (based on specific demand/application)\n• Equipment Use (exclusive to University of the Philippines system researchers)"
      },
      {
        q: "Can you help design and budget our research project?",
        a: "Yes! We provide technical advice and assistance for experimental design and budgeting completely free of charge. Whether you are planning a small thesis project using targeted molecular assays or tackling a massive genomics application, our team can advise on study design, assay selection, sequencing depth, and analysis pipelines. We highly recommend our free technical consultation for student theses, small molecular projects, grant proposal development, and large-scale genome projects."
      },
      {
        q: "Do you provide training or workshops?",
        a: "Yes. PGC Visayas conducts customized training workshops on genomics techniques, sequencing workflows, and bioinformatics analysis based on schedule and demand. You can reach out to us via the client portal to discuss your specific training needs."
      }
    ]
  },
  {
    category: "Part 2: Inquiries, Pricing & Payment",
    icon: <CreditCard className="w-5 h-5 text-blue-600" />,
    questions: [
      {
        q: "How do I avail of your services?",
        a: "To get started, simply submit your inquiry through the official PGC Visayas Client Portal. Providing comprehensive details about your research objectives and scope of collaboration will allow our team to evaluate your project and cater to your needs much faster."
      },
      {
        q: "How much do your services cost?",
        a: "Because every project is unique, pricing depends on several factors:\n• Service type\n• Number of samples\n• Sequencing platform and depth\n• Bioinformatics requirements\n\nOnce you submit your inquiry through our Client Portal, our team will evaluate your project and issue an official quotation."
      },
      {
        q: "What are your payment terms and accepted payment options?",
        a: "We accept payments via Bank Transfer, bank deposits, and LDDAP-ADA (for government agencies). Standard institutional checks may also be accepted. Payment terms typically depend on the project size:\n\n• Standard services: Payment is usually processed upon the issuance of a Statement of Account/Billing.\n• Large or funded projects: Payment milestones can be outlined in a formal Memorandum of Agreement (MOA).\n\nPlease discuss your specific funding or institutional requirements with us during the consultation phase so we can accommodate your procurement process."
      }
    ]
  },
  {
    category: "Part 3: Sample Preparation & Submission",
    icon: <Droplets className="w-5 h-5 text-blue-600" />,
    questions: [
      {
        q: "Do you accept walk-in laboratory use and sample submissions?",
        a: "No, we do not accept walk-ins. To ensure the highest quality of service and safety, all laboratory users and projects must undergo review and approval before scheduling any laboratory use or sample drop-offs."
      },
      {
        q: "What are your sample requirements?",
        a: "Requirements vary depending on the specific application or assay. For detailed criteria, please refer to our official Sample Submission Requirements document. Please review these guidelines carefully, as projects cannot proceed if samples do not meet the required criteria."
      },
      {
        q: "How should I package and transport my samples?",
        a: "Maintaining sample integrity is crucial. Samples must be packed securely and shipped following proper cold-chain protocols (e.g., on dry ice or ice packs, depending on your sample type). Detailed shipping and packaging instructions are included in our Sample Submission Requirements."
      },
      {
        q: "Do you handle pathogen or regulated biological samples?",
        a: "Yes, but we exclusively handle Biosafety Level 2 (BSL-2) biological samples. All sample submissions must strictly comply with national regulations, and you must secure and provide all relevant permits and ethical clearances (e.g. NCBP, PAWB, Institutional Biosafety Committee (IBC), ethics review) prior to submission."
      }
    ]
  },
  {
    category: "Part 4: Laboratory Processing & Timelines",
    icon: <Clock className="w-5 h-5 text-blue-600" />,
    questions: [
      {
        q: "Do you perform quality control (QC) on submitted samples?",
        a: "Yes. PGC Visayas performs strict internal quality control before and between assays. If your samples do not meet the required quality thresholds, we will notify you immediately. Please note that additional fees may apply if re-extraction, repeat QC, or troubleshooting is required."
      },
      {
        q: "How long does it take to complete a service or assay?",
        a: "Turnaround times are highly dependent on your specific project and are primarily determined by:\n• Type of service: Different assays have different standard processing times.\n• Sample volume: Larger batches require a longer processing window.\n• Sample quality: Samples needing extra preparation or troubleshooting can extend the timeline."
      },
      {
        q: "What happens if a molecular assay or sequencing run fails?",
        a: "We do everything we can to ensure successful results. In the rare event that an assay fails due to a technical issue within PGC Visayas, we will repeat the process at no additional cost. However, if the failure is caused by poor initial sample quality, you have the option to resubmit a fresh sample, but reprocessing fees will apply for the new run."
      }
    ]
  },
  {
    category: "Part 5: Data Delivery, Bioinformatics & Ownership",
    icon: <BarChart4 className="w-5 h-5 text-blue-600" />,
    questions: [
      {
        q: "Do you provide bioinformatics analysis?",
        a: "Yes, our team offers comprehensive bioinformatics services, including:\n• Quality filtering and trimming\n• Genome assembly and annotation\n• Variant calling\n• Taxonomic classification (for metagenomics)\n• Phylogenetic analysis\n\n(Custom analysis pipelines can also be discussed during your technical consultation.)"
      },
      {
        q: "What format will the data be delivered in?",
        a: "Depending on your requested services, you will typically receive:\n• Raw sequencing files (FASTQ format)\n• Processed files (e.g., BAM, VCF, assembled contigs)\n• A comprehensive Service Report with summary QC data\n• Detailed Analysis Reports (if bioinformatics services were requested)"
      },
      {
        q: "How long do you retain my data?",
        a: "PGC Visayas retains client data on our servers for a limited time (typically 1 to 3 months) after project completion. We highly encourage clients to download and securely back up all data files immediately upon receipt."
      },
      {
        q: "Who owns the generated data?",
        a: "You do! The client retains full ownership of all generated data unless otherwise stated in a formal collaboration agreement. PGC Visayas maintains strict confidentiality and adheres to institutional data governance policies."
      },
      {
        q: "How do we acknowledge PGC Visayas in publications?",
        a: "We love seeing your research published! Please ensure PGC Visayas is properly acknowledged in any presentations, reports, or publications resulting from our services.\n\nStandard phrasing: “Sequencing and/or molecular services were provided by the Philippine Genome Center Visayas.”\n\nFor collaborative work: Authorship and specific acknowledgments should be discussed early in the project planning phase."
      }
    ]
  },
  {
    category: "Part 6: Collaborations",
    icon: <Globe className="w-5 h-5 text-blue-600" />,
    questions: [
      {
        q: "Do you accept international collaborations?",
        a: "Yes! We proudly support both local and international collaborations. These are subject to regulatory compliance, biosafety regulations, and the establishment of Material Transfer Agreements (MTAs) when necessary."
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header Section */}
      <div className="bg-blue-600 text-white py-16 mb-12 shadow-inner">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Frequently Asked Questions (FAQs)
          </h1>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="grid gap-8">
          {faqData.map((section, idx) => (
            <Card key={idx} className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    {section.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-800">
                    {section.category}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <Accordion type="single" collapsible className="w-full">
                  {section.questions.map((item, qIdx) => (
                    <AccordionItem 
                      key={qIdx} 
                      value={`item-${idx}-${qIdx}`}
                      className="border-b last:border-0 px-6"
                    >
                      <AccordionTrigger className="text-left font-semibold text-slate-700 hover:text-blue-600 hover:no-underline py-5 text-base transition-colors">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-relaxed whitespace-pre-line text-sm pb-6">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Footer */}
        <div className="mt-16 text-center bg-white p-8 rounded-2xl border shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            If you couldn't find the answer you were looking for, our team is here to help with your technical inquiries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/inquire" 
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
            >
              Submit an Inquiry
            </a>
            <a 
              href="mailto:pgcvisayas@up.edu.ph" 
              className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
