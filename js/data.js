/* =========================================================
   Scholarship Research Database
   data.js — enums, entity schemas, default DB, demo data

   This file defines *shape*, not behaviour. storage.js reads
   DEFAULT_DB and ENTITY_META; ui.js reads ENTITY_META to build
   forms and lists; app.js wires everything together.
   ========================================================= */

const ENUMS = {
  countryPriority: ["Researching", "Active", "Completed", "On Hold"],
  universityType: ["Public", "Private", "Research Institute", "Other"],
  researchAreas: [
    "Artificial Intelligence", "Machine Learning", "Computer Science",
    "Data Science", "Computer Vision", "NLP", "LLMs", "Healthcare AI",
    "IoT", "Robotics", "Responsible AI"
  ],
  degreeLevel: ["MSc", "MS", "MPhil", "PhD", "Other"],
  field: [
    "Computer Science", "Artificial Intelligence", "Machine Learning",
    "Data Science", "Computer Vision", "NLP", "LLMs", "Healthcare AI",
    "Biomedical AI", "IoT", "Robotics", "Other"
  ],
  fundingType: [
    "Government", "University", "Faculty", "Research Project",
    "External Organization", "Assistantship", "Fellowship", "Other"
  ],
  fundingStatus: [
    "Fully Funded", "Substantial Funding", "Tuition Waiver",
    "Partial Funding", "Unfunded", "Unknown"
  ],
  pakistaniEligible: ["Yes", "No", "Unclear", "Need Verification"],
  matchStatus: [
    "Meets Requirement", "Partially Meets", "Needs Verification",
    "Does Not Meet", "Not Applicable"
  ],
  applicationStatus: [
    "Researching", "Potential", "Preparing", "Ready to Apply", "Applied",
    "Interview", "Accepted", "Rejected", "Withdrawn", "Not Eligible"
  ],
  requirementLevel: ["Required", "Preferred", "Not specified"],
  technicalSkills: [
    "Programming", "Python", "C/C++", "Algorithms", "Data Structures",
    "Linear Algebra", "Calculus", "Probability", "Statistics",
    "Machine Learning", "Deep Learning", "Database Systems",
    "Computer Networks", "Other"
  ],
  documentTypes: [
    "Passport", "Degree Certificate", "Transcript", "CV", "SOP",
    "Motivation Letter", "Recommendation Letters", "Research Proposal",
    "English Certificate", "Portfolio", "GitHub", "Publications",
    "Writing Sample", "Other"
  ],
  documentStatus: ["Not Started", "Preparing", "Ready", "Submitted", "Not Required"],
  taskStatus: ["Pending", "In Progress", "Completed"]
};

/* ---------------------------------------------------------
   ENTITY_META
   Each entity: label, labelPlural, listFields (for table view),
   searchFields (for global search), fields (for the generic
   add/edit form), relations (parent id fields + which entity
   they point to, for dropdowns and cascading deletes).
   --------------------------------------------------------- */

const ENTITY_META = {

  regions: {
    label: "Region", labelPlural: "Regions",
    listFields: ["name", "description"],
    searchFields: ["name", "description", "notes"],
    relations: [],
    fields: [
      { key: "name", label: "Region", type: "region-picker", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },

  countries: {
    label: "Country", labelPlural: "Countries",
    listFields: ["name", "regionId", "priority"],
    searchFields: ["name", "notes", "countryCode"],
    relations: [{ key: "regionId", type: "regions", label: "Region" }],
    fields: [
      { key: "name", label: "Country", type: "country-picker", required: true },
      { key: "regionId", label: "Region", type: "select-relation", relation: "regions", required: true },
      { key: "countryCode", label: "Country code", type: "text", placeholder: "e.g. DE" },
      { key: "priority", label: "Priority", type: "select", options: ENUMS.countryPriority, default: "Researching" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },

  universities: {
    label: "University", labelPlural: "Universities",
    listFields: ["name", "countryId", "type"],
    searchFields: ["name", "city", "notes"],
    relations: [{ key: "countryId", type: "countries", label: "Country" }],
    fields: [
      { key: "name", label: "University name", type: "text", required: true },
      { key: "countryId", label: "Country", type: "select-relation", relation: "countries", required: true },
      { key: "city", label: "City", type: "text" },
      { key: "type", label: "University type", type: "select", options: ENUMS.universityType },
      { key: "researchAreas", label: "Research areas", type: "multiselect", options: ENUMS.researchAreas },
      { key: "officialWebsite", label: "Official website", type: "url" },
      { key: "admissionsWebsite", label: "Admissions website", type: "url" },
      { key: "scholarshipWebsite", label: "Scholarship website", type: "url" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },

  programmes: {
    label: "Programme", labelPlural: "Programmes",
    listFields: ["name", "universityId", "degreeLevel", "applicationDeadline"],
    searchFields: ["name", "specialization", "notes"],
    relations: [{ key: "universityId", type: "universities", label: "University" }],
    fields: [
      { key: "name", label: "Programme name", type: "text", required: true },
      { key: "universityId", label: "University", type: "select-relation", relation: "universities", required: true },
      { key: "degreeLevel", label: "Degree level", type: "select", options: ENUMS.degreeLevel, required: true },
      { key: "field", label: "Field", type: "select", options: ENUMS.field },
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "duration", label: "Duration", type: "text", placeholder: "e.g. 2 years" },
      { key: "language", label: "Language of instruction", type: "text" },
      { key: "programmeWebsite", label: "Programme website", type: "url" },
      { key: "applicationWebsite", label: "Application website", type: "url" },
      { key: "applicationDeadline", label: "Application deadline", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },

  scholarships: {
    label: "Scholarship", labelPlural: "Scholarships",
    listFields: ["name", "universityId", "fundingStatus", "applicationDeadline"],
    searchFields: ["name", "provider", "eligibility", "notes"],
    relations: [
      { key: "countryId", type: "countries", label: "Country" },
      { key: "universityId", type: "universities", label: "University" },
      { key: "programmeId", type: "programmes", label: "Programme" }
    ],
    fields: [
      { key: "name", label: "Scholarship name", type: "text", required: true },
      { key: "provider", label: "Provider", type: "text" },
      { key: "countryId", label: "Country", type: "select-relation", relation: "countries" },
      { key: "universityId", label: "University", type: "select-relation", relation: "universities" },
      { key: "programmeId", label: "Programme", type: "select-relation", relation: "programmes" },
      { key: "fundingType", label: "Funding type", type: "select", options: ENUMS.fundingType },
      { key: "fundingStatus", label: "Funding status", type: "select", options: ENUMS.fundingStatus, required: true, default: "Unknown",
        hint: "You must choose this deliberately — nothing here is inferred automatically." },

      { group: "Funding coverage" },
      { key: "funding.tuitionCoverage", label: "Tuition coverage", type: "checkbox" },
      { key: "funding.monthlyStipend", label: "Monthly stipend (amount, if known)", type: "text", placeholder: "e.g. 1200 EUR/month" },
      { key: "funding.accommodation", label: "Accommodation", type: "checkbox" },
      { key: "funding.healthInsurance", label: "Health insurance", type: "checkbox" },
      { key: "funding.travelAllowance", label: "Travel allowance", type: "checkbox" },
      { key: "funding.visaRelocation", label: "Visa / relocation support", type: "checkbox" },
      { key: "funding.researchFunding", label: "Research funding", type: "checkbox" },
      { key: "funding.fundingDuration", label: "Funding duration", type: "text", placeholder: "e.g. 2 years, renewable annually" },

      { group: "Application" },
      { key: "applicationDeadline", label: "Application deadline", type: "date" },
      { key: "scholarshipWebsite", label: "Scholarship website", type: "url" },
      { key: "applicationWebsite", label: "Application website", type: "url" },
      { key: "eligibility", label: "Eligibility (free text)", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },

      { group: "Pakistani eligibility" },
      { key: "pakistani.eligible", label: "Pakistani applicants eligible?", type: "select", options: ENUMS.pakistaniEligible },
      { key: "pakistani.nationalityRestrictions", label: "Nationality restrictions", type: "textarea" },
      { key: "pakistani.specificRequirements", label: "Pakistan-specific requirements", type: "textarea" },
      { key: "pakistani.hecRequirement", label: "HEC requirement", type: "text" },
      { key: "pakistani.embassyRequirement", label: "Embassy requirement", type: "text" },
      { key: "pakistani.notes", label: "Additional notes", type: "textarea" },

      { group: "Data quality" },
      { key: "sourceVerified", label: "Source verified", type: "checkbox" },
      { key: "lastVerifiedDate", label: "Last verified date", type: "date" },
      { key: "verificationNotes", label: "Verification notes", type: "textarea" }
    ]
  },

  notes: {
    label: "Note", labelPlural: "Research Notes",
    listFields: ["title", "dateAdded", "tags"],
    searchFields: ["title", "content", "tags"],
    relations: [
      { key: "regionId", type: "regions", label: "Region" },
      { key: "countryId", type: "countries", label: "Country" },
      { key: "universityId", type: "universities", label: "University" },
      { key: "programmeId", type: "programmes", label: "Programme" },
      { key: "scholarshipId", type: "scholarships", label: "Scholarship" }
    ],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "regionId", label: "Related region", type: "select-relation", relation: "regions" },
      { key: "countryId", label: "Related country", type: "select-relation", relation: "countries" },
      { key: "universityId", label: "Related university", type: "select-relation", relation: "universities" },
      { key: "programmeId", label: "Related programme", type: "select-relation", relation: "programmes" },
      { key: "scholarshipId", label: "Related scholarship", type: "select-relation", relation: "scholarships" },
      { key: "tags", label: "Tags (comma separated)", type: "tags" },
      { key: "content", label: "Content", type: "textarea-md", hint: "Basic formatting: **bold**, *italic*, and line breaks." },
      { key: "sourceLinks", label: "Source links (one per line)", type: "lines" }
    ]
  },

  tasks: {
    label: "Task", labelPlural: "Calendar Tasks",
    listFields: ["task", "deadline", "status"],
    searchFields: ["task", "notes"],
    relations: [{ key: "relatedScholarshipId", type: "scholarships", label: "Related scholarship" }],
    fields: [
      { key: "task", label: "Task", type: "text", required: true },
      { key: "deadline", label: "Deadline", type: "date" },
      { key: "relatedScholarshipId", label: "Related opportunity", type: "select-relation", relation: "scholarships" },
      { key: "status", label: "Status", type: "select", options: ENUMS.taskStatus, default: "Pending" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  }
};

/* ---------------------------------------------------------
   Default (empty) database shape
   --------------------------------------------------------- */

function createEmptyDatabase() {
  return {
    regions: [],
    countries: [],
    universities: [],
    programmes: [],
    scholarships: [],
    notes: [],
    tasks: [],
    settings: { seeded: false }
  };
}

/* ---------------------------------------------------------
   Reference geography — all 8 regions from the spec, each with
   a solid starting set of real countries. This is real data
   (not a placeholder), so it's seeded as demo: false and isn't
   touched by "Remove demo data" in Settings. Add any country
   this list is missing the normal way, via + Add Country.
   --------------------------------------------------------- */

const REFERENCE_REGIONS = [
  { name: "Europe", description: "European Union and non-EU European countries." },
  { name: "Asia", description: "East, South, and Southeast Asia." },
  { name: "Middle East", description: "West Asia and the Arabian Peninsula." },
  { name: "North America", description: "United States, Canada, and Mexico." },
  { name: "South America", description: "" },
  { name: "Africa", description: "" },
  { name: "Oceania", description: "Australia, New Zealand, and the Pacific." },
  { name: "Central Asia", description: "The five former Soviet Central Asian republics and the Caucasus." }
];

const REFERENCE_COUNTRIES = [
  // Europe
  { name: "Germany", region: "Europe", code: "DE" },
  { name: "France", region: "Europe", code: "FR" },
  { name: "United Kingdom", region: "Europe", code: "GB" },
  { name: "Netherlands", region: "Europe", code: "NL" },
  { name: "Italy", region: "Europe", code: "IT" },
  { name: "Spain", region: "Europe", code: "ES" },
  { name: "Sweden", region: "Europe", code: "SE" },
  { name: "Norway", region: "Europe", code: "NO" },
  { name: "Finland", region: "Europe", code: "FI" },
  { name: "Denmark", region: "Europe", code: "DK" },
  { name: "Switzerland", region: "Europe", code: "CH" },
  { name: "Austria", region: "Europe", code: "AT" },
  { name: "Belgium", region: "Europe", code: "BE" },
  { name: "Ireland", region: "Europe", code: "IE" },
  { name: "Poland", region: "Europe", code: "PL" },
  { name: "Portugal", region: "Europe", code: "PT" },
  { name: "Czechia", region: "Europe", code: "CZ" },
  { name: "Hungary", region: "Europe", code: "HU" },
  { name: "Greece", region: "Europe", code: "GR" },
  { name: "Romania", region: "Europe", code: "RO" },
  { name: "Bulgaria", region: "Europe", code: "BG" },
  { name: "Croatia", region: "Europe", code: "HR" },
  { name: "Slovenia", region: "Europe", code: "SI" },
  { name: "Slovakia", region: "Europe", code: "SK" },
  { name: "Estonia", region: "Europe", code: "EE" },
  { name: "Latvia", region: "Europe", code: "LV" },
  { name: "Lithuania", region: "Europe", code: "LT" },
  { name: "Iceland", region: "Europe", code: "IS" },
  { name: "Luxembourg", region: "Europe", code: "LU" },
  { name: "Ukraine", region: "Europe", code: "UA" },

  // Asia
  { name: "China", region: "Asia", code: "CN" },
  { name: "Japan", region: "Asia", code: "JP" },
  { name: "South Korea", region: "Asia", code: "KR" },
  { name: "India", region: "Asia", code: "IN" },
  { name: "Pakistan", region: "Asia", code: "PK" },
  { name: "Bangladesh", region: "Asia", code: "BD" },
  { name: "Sri Lanka", region: "Asia", code: "LK" },
  { name: "Nepal", region: "Asia", code: "NP" },
  { name: "Singapore", region: "Asia", code: "SG" },
  { name: "Malaysia", region: "Asia", code: "MY" },
  { name: "Indonesia", region: "Asia", code: "ID" },
  { name: "Thailand", region: "Asia", code: "TH" },
  { name: "Vietnam", region: "Asia", code: "VN" },
  { name: "Philippines", region: "Asia", code: "PH" },
  { name: "Taiwan", region: "Asia", code: "TW" },
  { name: "Hong Kong", region: "Asia", code: "HK" },

  // Middle East
  { name: "Saudi Arabia", region: "Middle East", code: "SA" },
  { name: "United Arab Emirates", region: "Middle East", code: "AE" },
  { name: "Qatar", region: "Middle East", code: "QA" },
  { name: "Turkey", region: "Middle East", code: "TR" },
  { name: "Israel", region: "Middle East", code: "IL" },
  { name: "Jordan", region: "Middle East", code: "JO" },
  { name: "Kuwait", region: "Middle East", code: "KW" },
  { name: "Oman", region: "Middle East", code: "OM" },
  { name: "Bahrain", region: "Middle East", code: "BH" },
  { name: "Lebanon", region: "Middle East", code: "LB" },
  { name: "Iran", region: "Middle East", code: "IR" },
  { name: "Iraq", region: "Middle East", code: "IQ" },

  // North America
  { name: "United States", region: "North America", code: "US" },
  { name: "Canada", region: "North America", code: "CA" },
  { name: "Mexico", region: "North America", code: "MX" },

  // South America
  { name: "Brazil", region: "South America", code: "BR" },
  { name: "Argentina", region: "South America", code: "AR" },
  { name: "Chile", region: "South America", code: "CL" },
  { name: "Colombia", region: "South America", code: "CO" },
  { name: "Peru", region: "South America", code: "PE" },
  { name: "Uruguay", region: "South America", code: "UY" },
  { name: "Ecuador", region: "South America", code: "EC" },

  // Africa
  { name: "South Africa", region: "Africa", code: "ZA" },
  { name: "Egypt", region: "Africa", code: "EG" },
  { name: "Nigeria", region: "Africa", code: "NG" },
  { name: "Kenya", region: "Africa", code: "KE" },
  { name: "Morocco", region: "Africa", code: "MA" },
  { name: "Ghana", region: "Africa", code: "GH" },
  { name: "Tunisia", region: "Africa", code: "TN" },
  { name: "Rwanda", region: "Africa", code: "RW" },
  { name: "Ethiopia", region: "Africa", code: "ET" },
  { name: "Tanzania", region: "Africa", code: "TZ" },

  // Oceania
  { name: "Australia", region: "Oceania", code: "AU" },
  { name: "New Zealand", region: "Oceania", code: "NZ" },
  { name: "Fiji", region: "Oceania", code: "FJ" },
  { name: "Papua New Guinea", region: "Oceania", code: "PG" },

  // Central Asia
  { name: "Kazakhstan", region: "Central Asia", code: "KZ" },
  { name: "Uzbekistan", region: "Central Asia", code: "UZ" },
  { name: "Kyrgyzstan", region: "Central Asia", code: "KG" },
  { name: "Tajikistan", region: "Central Asia", code: "TJ" },
  { name: "Turkmenistan", region: "Central Asia", code: "TM" },
  { name: "Azerbaijan", region: "Central Asia", code: "AZ" },
  { name: "Georgia", region: "Central Asia", code: "GE" },
  { name: "Armenia", region: "Central Asia", code: "AM" }
];

/* Local id generator — data.js loads before storage.js, so it
   can't use storage.js's genId() yet. Same format, own copy. */
function refId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/* ---------------------------------------------------------
   Initial seed: the real reference regions/countries above,
   plus one small, clearly labeled illustrative example chain
   (university → programme → scholarship) hung off the real
   Germany record, so you can see how the hierarchy links
   together without inventing a second, fake Germany.
   --------------------------------------------------------- */

function buildDemoData() {
  const now = new Date().toISOString();

  const regions = REFERENCE_REGIONS.map(r => ({
    id: refId("region"), name: r.name, description: r.description || "", notes: "",
    demo: false, createdAt: now, updatedAt: now
  }));
  const regionIdByName = {};
  regions.forEach(r => { regionIdByName[r.name] = r.id; });

  const countries = REFERENCE_COUNTRIES.map(c => ({
    id: refId("country"), name: c.name, regionId: regionIdByName[c.region] || "",
    countryCode: c.code || "", priority: "Researching", notes: "",
    demo: false, createdAt: now, updatedAt: now
  }));

  const germany = countries.find(c => c.name === "Germany");

  const university = {
    id: refId("uni"), name: "Example University", countryId: germany.id,
    city: "Berlin", type: "Public",
    researchAreas: ["Artificial Intelligence", "Machine Learning"],
    officialWebsite: "", admissionsWebsite: "", scholarshipWebsite: "",
    notes: "DEMO DATA — a placeholder university, not a real institution to apply to.",
    demo: true, createdAt: now, updatedAt: now
  };

  const programme = {
    id: refId("prog"), name: "Example MSc AI", universityId: university.id,
    degreeLevel: "MSc", field: "Artificial Intelligence", specialization: "",
    duration: "2 years", language: "English",
    programmeWebsite: "", applicationWebsite: "",
    applicationDeadline: "",
    notes: "DEMO DATA — shows how a programme links to a university.",
    demo: true, createdAt: now, updatedAt: now
  };

  const scholarship = {
    id: refId("schol"), name: "Example Scholarship", provider: "Example Foundation",
    countryId: germany.id, universityId: university.id, programmeId: programme.id,
    fundingType: "Government", fundingStatus: "Unknown",
    funding: {
      tuitionCoverage: false, monthlyStipend: "", accommodation: false,
      healthInsurance: false, travelAllowance: false, visaRelocation: false,
      researchFunding: false, fundingDuration: ""
    },
    applicationDeadline: "",
    scholarshipWebsite: "", applicationWebsite: "",
    eligibility: "DEMO DATA — this is not a real scholarship. Its funding status is deliberately left as Unknown rather than assumed.",
    notes: "Edit or delete this from Scholarships once you understand the layout.",
    pakistani: {
      eligible: "Need Verification", nationalityRestrictions: "", specificRequirements: "",
      hecRequirement: "", embassyRequirement: "", notes: ""
    },
    requirements: emptyRequirements(),
    documents: defaultDocuments(),
    myEligibility: emptyEligibility(),
    applicationStatus: "Researching",
    sourceVerified: false, lastVerifiedDate: "", verificationNotes: "",
    demo: true, createdAt: now, updatedAt: now
  };

  return {
    regions, countries, universities: [university],
    programmes: [programme], scholarships: [scholarship], notes: [], tasks: [],
    settings: { seeded: true }
  };
}

function emptyRequirements() {
  return {
    academic: {
      minDegree: "", requiredField: "", minGPA: "", requiredCredits: "",
      requiredCourses: "", degreeRecognition: "", graduationDateRequirement: ""
    },
    technical: [],
    english: {
      ieltsRequired: false, ieltsMin: "", toeflRequired: false, toeflMin: "",
      duolingoAccepted: false, moiAccepted: false, otherLanguage: ""
    },
    research: {
      researchExperience: false, publicationRequired: false, researchProposal: false,
      thesisRequired: false, supervisorRequired: false, supervisorContact: false,
      portfolioRequired: false, interview: false
    }
  };
}

function defaultDocuments() {
  return ENUMS.documentTypes.map(type => ({ type, status: "Not Started" }));
}

function emptyEligibility() {
  return {
    academicMatch: "Not Applicable", technicalMatch: "Not Applicable",
    englishMatch: "Not Applicable", researchMatch: "Not Applicable",
    experienceMatch: "Not Applicable", documentReadiness: "Not Applicable",
    personalNotes: ""
  };
}
