import { extractStructuredResume, processAndStoreResume } from "@/lib/resume";

describe("Resume Extraction & Mem0 Processing", () => {
  const sampleResume = `
    Alex Rivera
    Senior Full-Stack Engineer
    
    Summary:
    Over 5 years of experience architecting high-concurrency microservices, Next.js web applications, and distributed databases.
    
    Technical Skills:
    TypeScript, React, Next.js, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS, GraphQL
    
    Projects:
    - E-Commerce SaaS Platform: Developed multi-tenant checkout system using Next.js, Drizzle ORM, and Stripe.
    - Real-time Analytics Dashboard: Built streaming telemetry processor with WebSockets and Redis Pub/Sub.
    
    Experience:
    - Senior Backend Developer at TechCorp (2022 - Present): Led migration to Kubernetes and improved P99 latency by 40%.
    - Software Engineer at StartUp (2019 - 2022): Built REST APIs and automated CI/CD pipelines with GitHub Actions.
    
    Education:
    B.S. in Computer Science, University of California (2019)
    
    Interests:
    Distributed Systems, LLM Agent Architectures, Cloud Native Infrastructure
  `;

  it("extracts structured profile data and skills correctly from raw text", async () => {
    const extracted = await extractStructuredResume(sampleResume);

    expect(extracted).toBeDefined();
    expect(extracted.skills).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Next.js", "PostgreSQL", "Docker"])
    );
    expect(extracted.suggestedLevel).toBe("advanced");
    expect(extracted.summary).toBeTruthy();
  });

  it("processes and stores resume data into memories", async () => {
    const result = await processAndStoreResume("test-user-123", {
      text: sampleResume,
    });

    expect(result).toBeDefined();
    expect(result.structured.skills.length).toBeGreaterThan(0);
    expect(result.memoriesStored).toBeGreaterThan(0);
  });

  it("throws an error on empty resume text", async () => {
    await expect(
      processAndStoreResume("test-user-123", { text: "" })
    ).rejects.toThrow("No readable resume text");
  });

  it("redacts sensitive PII (phone, email, address) before processing", async () => {
    const resumeWithPii = `
      John Doe
      Email: john.doe.dev@gmail.com
      Phone: +1 (555) 234-5678
      Address: 742 Evergreen Terrace, Apt 4B, Springfield, OR 97477
      
      Professional Summary:
      Full stack engineer with deep experience building scalable TypeScript and Node.js applications.
      
      Technical Skills:
      TypeScript, React, Node.js, PostgreSQL, Docker, AWS
    `;

    const result = await processAndStoreResume("test-user-123", {
      text: resumeWithPii,
    });

    expect(result.rawText).not.toContain("john.doe.dev@gmail.com");
    expect(result.rawText).not.toContain("555) 234-5678");
    expect(result.rawText).not.toContain("742 Evergreen Terrace");
    expect(result.rawText).toContain("[REDACTED_EMAIL]");
    expect(result.rawText).toContain("[REDACTED_PHONE]");
  });

  it("rejects resume that lacks both skills and profile summary sections", async () => {
    const invalidResume = `
      Random Essay or Receipt
      Total Amount: $45.00
      Date: 2024-01-15
      Thank you for your business!
    `;

    await expect(
      processAndStoreResume("test-user-123", { text: invalidResume })
    ).rejects.toThrow(/Skills.*Profile Summary/i);
  });
});
