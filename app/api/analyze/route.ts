import { NextResponse } from "next/server";
import {
  VOLUME_ANALYSIS_PROMPT,
  VOLUME_ANALYSIS_SCHEMA,
} from "@/lib/ai/volume-analysis";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export async function GET() {
  return NextResponse.json({
    enabled:
      process.env.ENABLE_PAID_AI === "true" &&
      Boolean(process.env.OPENAI_API_KEY),
    mode: "accuracy-first",
    detail: "high",
    billing_guard: "ENABLE_PAID_AI must be explicitly set to true",
  });
}

export async function POST(request: Request) {
  if (
    process.env.ENABLE_PAID_AI !== "true" ||
    !process.env.OPENAI_API_KEY
  ) {
    return NextResponse.json(
      {
        code: "AI_DISABLED",
        message:
          "AI図面解析は無効です。課金APIを有効化するまではファイルを外部送信しません。",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const caseInput = formData.get("caseInput");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { code: "FILE_REQUIRED", message: "PDFまたは画像を選択してください。" },
      { status: 400 },
    );
  }

  if (!ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        code: "FILE_REJECTED",
        message: "PDF・PNG・JPEGのいずれか、20MB以下で指定してください。",
      },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  const fileData = `data:${file.type};base64,${bytes}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      instructions: VOLUME_ANALYSIS_PROMPT,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: file.name,
              file_data: fileData,
              detail: "high",
            },
            {
              type: "input_text",
              text: `<case_input>${typeof caseInput === "string" ? caseInput : "未入力"}</case_input>`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "volume_document_facts",
          strict: true,
          schema: VOLUME_ANALYSIS_SCHEMA,
        },
      },
      max_output_tokens: 6000,
    }),
  });

  const raw = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      {
        code: "AI_REQUEST_FAILED",
        message: "図面解析を完了できませんでした。設定とファイルを確認してください。",
      },
      { status: 502 },
    );
  }

  const outputText = raw.output
    ?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) =>
      item.content ?? [],
    )
    .find((item: { type?: string }) => item.type === "output_text")?.text;

  if (!outputText) {
    return NextResponse.json(
      { code: "EMPTY_AI_OUTPUT", message: "解析結果が空でした。" },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(JSON.parse(outputText));
  } catch {
    return NextResponse.json(
      { code: "INVALID_AI_OUTPUT", message: "解析結果の形式が不正です。" },
      { status: 502 },
    );
  }
}
