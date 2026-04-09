import Groq from "groq-sdk";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

function safeNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function getEnabledCriteria(jobPost) {
    const criteria = [];

    if (jobPost.Skills) criteria.push("skills");
    if (jobPost.Achievements) criteria.push("achievements");
    if (jobPost.Experience) criteria.push("experience");
    if (jobPost.ResumeQuality) criteria.push("resume quality");
    if (jobPost.Education) criteria.push("education");
    if (jobPost.Age) criteria.push("age");

    return criteria;
}

function computeTotalScore(result, enabledCriteria) {
    const values = [];

    if (enabledCriteria.includes("skills")) values.push(safeNumber(result.SkillScore));
    if (enabledCriteria.includes("achievements")) values.push(safeNumber(result.AchievementScore));
    if (enabledCriteria.includes("experience")) values.push(safeNumber(result.ExperienceScore));
    if (enabledCriteria.includes("resume quality")) values.push(safeNumber(result.ResumeQualityScore));
    if (enabledCriteria.includes("education")) values.push(safeNumber(result.EducationScore));
    if (enabledCriteria.includes("age")) values.push(safeNumber(result.AgeScore));

    const filtered = values.filter(v => v !== null);
    if (!filtered.length) return null;

    const total = filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
    return Math.round(total * 100) / 100;
}

async function extractResumeTextFromUrl(resumeUrl, fileName = "", mimeType = "") {
    if (!resumeUrl) {
        throw new Error("Missing resume URL.");
    }

    console.log("Fetching resume URL:", resumeUrl);
    console.log("File name:", fileName);
    console.log("Mime type:", mimeType);

    const response = await fetch(resumeUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch uploaded resume. HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Downloaded resume bytes:", buffer.length);

    const normalizedFileName = String(fileName || "").toLowerCase();
    const normalizedMimeType = String(mimeType || "").toLowerCase();

    const isPdf =
        normalizedMimeType.includes("pdf") ||
        normalizedFileName.endsWith(".pdf");

    const isDocx =
        normalizedMimeType.includes("word") ||
        normalizedMimeType.includes("document") ||
        normalizedFileName.endsWith(".docx");

    const isTxt =
        normalizedMimeType.includes("text/plain") ||
        normalizedFileName.endsWith(".txt");

    if (isPdf) {
        console.log("Parsing as PDF...");
        const parsed = await pdfParse(buffer);
        return String(parsed.text || "").trim();
    }

    if (isDocx) {
        console.log("Parsing as DOCX...");
        const parsed = await mammoth.extractRawText({ buffer });
        return String(parsed.value || "").trim();
    }

    if (isTxt) {
        console.log("Parsing as TXT...");
        return buffer.toString("utf-8").trim();
    }

    throw new Error("Unsupported resume format. Please upload PDF, DOCX, or TXT.");
}

export default async function handler(req, res) {
    try {
        console.log("resume-score invoked");

        if (req.method !== "POST") {
            return res.status(405).json({
                ok: false,
                error: "Method not allowed"
            });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                ok: false,
                error: "Missing GROQ_API_KEY"
            });
        }

        const {
            applicantName = "",
            resumeText = "",
            resumeUrl = "",
            fileName = "",
            mimeType = "",
            jobPost = {}
        } = req.body || {};

        console.log("Incoming payload keys:", Object.keys(req.body || {}));
        console.log("Job title:", jobPost?.JobTitle || null);
        console.log("Has resumeText:", Boolean(String(resumeText || "").trim()));
        console.log("Has resumeUrl:", Boolean(String(resumeUrl || "").trim()));

        if (!jobPost || typeof jobPost !== "object") {
            return res.status(400).json({
                ok: false,
                error: "Missing jobPost payload."
            });
        }

        if (!jobPost.JobTitle) {
            return res.status(400).json({
                ok: false,
                error: "jobPost.JobTitle is required."
            });
        }

        let finalResumeText = String(resumeText || "").trim();

        if (!finalResumeText && resumeUrl) {
            finalResumeText = await extractResumeTextFromUrl(resumeUrl, fileName, mimeType);
        }

        if (!finalResumeText) {
            return res.status(400).json({
                ok: false,
                error: "resumeText or resumeUrl is required."
            });
        }

        const enabledCriteria = getEnabledCriteria(jobPost);

        const prompt = `
You are an AI resume evaluator for APPL-AI.

Return ONLY valid JSON in this exact shape:
{
  "SkillScore": null,
  "ExperienceScore": null,
  "EducationScore": null,
  "AchievementScore": null,
  "AgeScore": null,
  "ResumeQualityScore": null,
  "ResumeOverview": "",
  "OverallAssessment": ""
}

Rules:
- Enabled scores must be integers from 0 to 100
- Disabled scores must be null
- Do not use markdown
- Do not use code fences
- Do not add extra keys
- Be strict but fair

Enabled criteria:
${enabledCriteria.join(", ") || "none"}

Job Post:
${JSON.stringify(jobPost, null, 2)}

Applicant Name:
${applicantName}

Resume Text:
${finalResumeText}
`;

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "Return only valid JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_completion_tokens: 1000,
            top_p: 1,
            stream: false
        });

        const content = completion.choices?.[0]?.message?.content || "";

        console.log("Groq raw content preview:", String(content).slice(0, 300));

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch {
            return res.status(500).json({
                ok: false,
                error: "Invalid JSON from AI",
                raw: content
            });
        }

        const normalized = {
            SkillScore: safeNumber(parsed.SkillScore),
            ExperienceScore: safeNumber(parsed.ExperienceScore),
            EducationScore: safeNumber(parsed.EducationScore),
            AchievementScore: safeNumber(parsed.AchievementScore),
            AgeScore: safeNumber(parsed.AgeScore),
            ResumeQualityScore: safeNumber(parsed.ResumeQualityScore),
            ResumeOverview: String(parsed.ResumeOverview || "").trim(),
            OverallAssessment: String(parsed.OverallAssessment || "").trim()
        };

        normalized.TotalScore = computeTotalScore(normalized, enabledCriteria);

        return res.status(200).json({
            ok: true,
            result: normalized,
            resumeText: finalResumeText
        });
    } catch (error) {
        console.error("resume-score.js crash:", error);
        console.error("resume-score.js stack:", error?.stack);

        return res.status(500).json({
            ok: false,
            error: error?.message || "Internal server error"
        });
    }
}