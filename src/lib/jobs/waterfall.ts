export interface JobRequirementsResult {
  requirementsText: string;
  sourceUrls: string[];
  tier: string;
}

async function tryGreenhouse(company: string): Promise<JobRequirementsResult | null> {
  try {
    const slug = company.toLowerCase().replace(/\s+/g, "");
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      jobs?: Array<{ title: string; content: string; absolute_url: string }>;
    };
    if (!data.jobs?.length) return null;
    const job = data.jobs[0];
    return {
      requirementsText: `${job.title}\n${job.content}`,
      sourceUrls: [job.absolute_url],
      tier: "greenhouse",
    };
  } catch {
    return null;
  }
}

async function tryLever(company: string): Promise<JobRequirementsResult | null> {
  try {
    const slug = company.toLowerCase().replace(/\s+/g, "");
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const jobs = (await res.json()) as Array<{
      text: string;
      descriptionPlain: string;
      hostedUrl: string;
    }>;
    if (!jobs.length) return null;
    const job = jobs[0];
    return {
      requirementsText: `${job.text}\n${job.descriptionPlain}`,
      sourceUrls: [job.hostedUrl],
      tier: "lever",
    };
  } catch {
    return null;
  }
}

function extractCompanyFromQuery(query: string): string | null {
  const atMatch = query.match(/\bat\s+([A-Za-z0-9&.\s]+?)(?:\?|$|,)/i);
  if (atMatch) return atMatch[1].trim();
  const forMatch = query.match(/for\s+([A-Za-z0-9&.\s]+?)(?:\?|$|,)/i);
  if (forMatch) return forMatch[1].trim();
  return null;
}

function isPastedJD(query: string): boolean {
  return query.length > 400 && /requirements|responsibilities|qualifications/i.test(query);
}

async function tryWebSearch(query: string): Promise<JobRequirementsResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AGENT_MODEL || "gpt-4.1",
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        input: `Find job requirements for: ${query}. Return a concise summary of required skills, qualifications, and responsibilities.`,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      output?: Array<{
        type: string;
        content?: Array<{ type: string; text?: string }>;
        action?: { sources?: Array<{ url: string }> };
      }>;
    };

    const textParts: string[] = [];
    const sourceUrls: string[] = [];

    for (const item of data.output || []) {
      if (item.type === "message" && item.content) {
        for (const block of item.content) {
          if (block.type === "output_text" && block.text) {
            textParts.push(block.text);
          }
        }
      }
      if (item.type === "web_search_call" && item.action?.sources) {
        for (const src of item.action.sources) {
          if (src.url) sourceUrls.push(src.url);
        }
      }
    }

    if (!textParts.length) return null;
    return {
      requirementsText: textParts.join("\n"),
      sourceUrls: [...new Set(sourceUrls)],
      tier: "web_search",
    };
  } catch {
    return null;
  }
}

export async function fetchJobRequirements(
  query: string,
): Promise<JobRequirementsResult> {
  if (isPastedJD(query)) {
    return {
      requirementsText: query,
      sourceUrls: [],
      tier: "pasted_jd",
    };
  }

  const company = extractCompanyFromQuery(query);

  if (company) {
    const greenhouse = await tryGreenhouse(company);
    if (greenhouse) return greenhouse;

    const lever = await tryLever(company);
    if (lever) return lever;
  }

  const web = await tryWebSearch(query);
  if (web) return web;

  return {
    requirementsText: `No external job posting found. Infer requirements from the query: ${query}`,
    sourceUrls: [],
    tier: "fallback",
  };
}
