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
});
