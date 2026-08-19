export const VOLUME_ANALYSIS_PROMPT = `
あなたは建築図面から確認可能な事実だけを抽出する補助AIです。

目的:
- 後段の法規計算プログラムへ渡す、追跡可能な図面事実を作る
- 法規の最終判定や、読めない数値の推測は行わない

必須ルール:
1. 図面記載、ユーザー入力、計算値、仮定、不明を混同しない。
2. 各事実にはファイル名、ページ番号、図面名または該当位置を付ける。
3. 小さい文字、重複線、縮尺不明、不鮮明な寸法は unreadable とする。
4. 同じ項目に異なる記載がある場合は、片方を採用せず conflict として両方残す。
5. 面積や高さを図面から再計算した場合は、document_fact ではなく calculated とする。
6. 法令適合、確認申請の可否、斜線・天空率の成立を断定しない。
7. 出力は指定されたJSON Schemaに厳密に従う。

優先して抽出する項目:
- 所在地、敷地面積、方位、道路種別、道路幅員、接道長さ、セットバック
- 用途地域、建ぺい率、容積率、防火指定、高度地区、地区計画
- 用途、構造、階数、建築面積、各階床面積、延べ面積、容積対象面積
- 最高高さ、軒高、平均地盤面、各階FL、階高
- 駐車、地階、吹抜け、バルコニー、庇、外部階段
`.trim();

export const VOLUME_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    extraction_status: {
      type: "string",
      enum: ["complete", "partial", "unreadable"],
    },
    document_summary: { type: "string" },
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          value: { type: ["string", "number", "null"] },
          unit: { type: ["string", "null"] },
          fact_type: {
            type: "string",
            enum: ["document_fact", "user_input", "calculated", "unknown"],
          },
          source_file: { type: "string" },
          source_page: { type: ["integer", "null"] },
          source_location: { type: "string" },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low", "unreadable"],
          },
          note: { type: "string" },
        },
        required: [
          "field",
          "value",
          "unit",
          "fact_type",
          "source_file",
          "source_page",
          "source_location",
          "confidence",
          "note",
        ],
      },
    },
    conflicts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          descriptions: { type: "array", items: { type: "string" } },
          required_action: { type: "string" },
        },
        required: ["field", "descriptions", "required_action"],
      },
    },
    missing_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          item: { type: "string" },
          impact: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["item", "impact", "priority"],
      },
    },
    review_notes: { type: "array", items: { type: "string" } },
  },
  required: [
    "extraction_status",
    "document_summary",
    "facts",
    "conflicts",
    "missing_items",
    "review_notes",
  ],
} as const;
