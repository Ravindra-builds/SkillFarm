export type ResumeExperienceItem = {
  role: string;
  company?: string;
  duration?: string;
  highlights?: string[];
};

export type ResumeEducationItem = {
  degree: string;
  institution?: string;
  year?: string;
};

export type ResumeProjectItem = {
  name: string;
  description: string;
  techStack?: string[];
};

export type StructuredResumeData = {
  name?: string;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  skills: string[];
  projects: ResumeProjectItem[];
  interests: string[];
  suggestedLevel: "beginner" | "intermediate" | "advanced";
  targetRole?: string;
};

export type ResumeParseResult = {
  rawText: string;
  structured: StructuredResumeData;
  memoriesStored: number;
};
