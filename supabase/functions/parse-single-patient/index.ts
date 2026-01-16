import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatientSystems {
  neuro: string;
  cv: string;
  resp: string;
  renalGU: string;
  gi: string;
  endo: string;
  heme: string;
  infectious: string;
  skinLines: string;
  dispo: string;
}

interface ParsedPatient {
  name: string;
  bed: string;
  clinicalSummary: string;
  intervalEvents: string;
  imaging: string;
  labs: string;
  systems: PatientSystems;
}

/**
 * Preserve text exactly as provided - only convert CRLF to LF
 */
function preserveText(text: string): string {
  if (!text) return '';
  
  // Only normalize line endings, preserve everything else exactly
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a clinical data extraction assistant. Your task is to parse unstructured clinical notes and organize them into a structured format for a single patient.

CRITICAL FORMATTING RULES - PRESERVE EXACTLY:
1. COPY TEXT VERBATIM - do NOT rephrase, summarize, shorten, or modify ANY wording
2. PRESERVE EXACT FORMATTING:
   - Keep ALL original line breaks exactly as they appear (use \\n in JSON)
   - Keep ALL original spacing and indentation
   - Keep ALL bullet points, dashes, asterisks, and numbered lists exactly as written
   - Keep ALL blank lines between sections (use \\n\\n in JSON)
   - Keep ALL original punctuation and capitalization
3. Do NOT merge lines together - if the original has separate lines, keep them separate
4. Do NOT add any new formatting, headers, or structure that wasn't in the original
5. If text doesn't clearly fit a category, include it in clinicalSummary
6. Text can appear in MULTIPLE sections if it's relevant to multiple systems

EXTRACTION RULES:
1. Extract patient name if present (or leave empty if not found)
2. Extract bed/room number if present (or leave empty if not found)
3. Clinical Summary: Overall patient history, diagnoses, admission reason, and ANY text that doesn't fit other categories
4. Interval Events: Recent developments, overnight events, "what happened on rounds"
5. Imaging: Any imaging studies mentioned (CT, MRI, X-ray, Echo, etc.) - copy EXACTLY as written
6. Labs: Any laboratory values or trends mentioned - copy EXACTLY as written
7. Systems: Organize organ-system specific information - copy EXACTLY as written:
   - neuro: Neurological findings, mental status, sedation
   - cv: Cardiovascular - vitals, pressors, cardiac issues
   - resp: Respiratory - ventilator settings, oxygen, lung findings
   - renalGU: Renal/GU - creatinine, urine output, dialysis
   - gi: GI - diet, bowel function, liver, nutrition
   - endo: Endocrine - glucose, insulin, thyroid
   - heme: Hematology - blood counts, anticoagulation, transfusions
   - infectious: Infectious disease - antibiotics, cultures, fever
   - skinLines: Skin/Lines - wounds, IV access, drains
   - dispo: Disposition - discharge planning, goals of care

Return a JSON object with this exact structure:
{
  "name": "Patient Name or empty string",
  "bed": "Bed/Room number or empty string",
  "clinicalSummary": "EXACT text with original formatting preserved",
  "intervalEvents": "EXACT text with original formatting preserved",
  "imaging": "EXACT text or empty string",
  "labs": "EXACT text or empty string",
  "systems": {
    "neuro": "EXACT text or empty string",
    "cv": "EXACT text or empty string",
    "resp": "EXACT text or empty string",
    "renalGU": "EXACT text or empty string",
    "gi": "EXACT text or empty string",
    "endo": "EXACT text or empty string",
    "heme": "EXACT text or empty string",
    "infectious": "EXACT text or empty string",
    "skinLines": "EXACT text or empty string",
    "dispo": "EXACT text or empty string"
  }
}`;
    const userPrompt = `Parse the following clinical notes for a single patient. COPY THE TEXT EXACTLY - preserve all original formatting, line breaks, spacing, bullet points, and wording verbatim.

CLINICAL NOTES:
${content}`;

    console.log("Calling AI gateway for single patient parsing...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to process clinical notes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    let aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No response from AI service" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response received, parsing JSON...");

    // Extract JSON from response
    let jsonStr = aiContent;
    const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const startIdx = aiContent.indexOf('{');
      const endIdx = aiContent.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = aiContent.substring(startIdx, endIdx + 1);
      }
    }

    let parsedPatient: ParsedPatient;
    try {
      parsedPatient = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Attempting JSON repair...");
      
      // Try to repair common JSON issues
      let repaired = jsonStr
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
        .replace(/\t/g, '  ');
      
      try {
        parsedPatient = JSON.parse(repaired);
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Preserve text exactly as provided
    const cleanedPatient: ParsedPatient = {
      name: preserveText(parsedPatient.name || '').trim(),
      bed: preserveText(parsedPatient.bed || '').trim(),
      clinicalSummary: preserveText(parsedPatient.clinicalSummary || ''),
      intervalEvents: preserveText(parsedPatient.intervalEvents || ''),
      imaging: preserveText(parsedPatient.imaging || ''),
      labs: preserveText(parsedPatient.labs || ''),
      systems: {
        neuro: preserveText(parsedPatient.systems?.neuro || ''),
        cv: preserveText(parsedPatient.systems?.cv || ''),
        resp: preserveText(parsedPatient.systems?.resp || ''),
        renalGU: preserveText(parsedPatient.systems?.renalGU || ''),
        gi: preserveText(parsedPatient.systems?.gi || ''),
        endo: preserveText(parsedPatient.systems?.endo || ''),
        heme: preserveText(parsedPatient.systems?.heme || ''),
        infectious: preserveText(parsedPatient.systems?.infectious || ''),
        skinLines: preserveText(parsedPatient.systems?.skinLines || ''),
        dispo: preserveText(parsedPatient.systems?.dispo || ''),
      },
    };

    console.log("Successfully parsed patient data");

    return new Response(
      JSON.stringify({ patient: cleanedPatient }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in parse-single-patient:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
