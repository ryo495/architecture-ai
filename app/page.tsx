"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  calculateVolume,
  type FloorInput,
  type VolumeInput,
} from "@/lib/volume";

const defaultFloors: FloorInput[] = [
  { id: "b1", label: "B1F", area: 0 },
  { id: "1f", label: "1F", area: 68 },
  { id: "2f", label: "2F", area: 62 },
  { id: "3f", label: "3F", area: 36 },
];

const defaultInput: VolumeInput = {
  projectName: "新規ボリューム検討",
  address: "東京都世田谷区",
  siteArea: 120,
  setbackArea: 0,
  designatedBcr: 60,
  bcrRelief: 0,
  designatedFar: 150,
  roadWidth: 4,
  roadFactor: 0.4,
  proposedBuildingArea: 68,
  farExemptArea: 0,
  proposedHeight: 8.9,
  heightLimit: 10,
  floors: defaultFloors,
};

type NumericKey = Exclude<
  keyof VolumeInput,
  "projectName" | "address" | "floors"
>;

type SelectedFile = {
  name: string;
  size: string;
  kind: string;
};

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 2,
});

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value * 100) / 100);
}

function formatArea(value: number) {
  return `${formatNumber(value)} ㎡`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${formatNumber(value * 100)}%`;
}

function NumericField({
  label,
  value,
  unit,
  min = 0,
  step = 0.1,
  note,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min?: number;
  step?: number;
  note?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
        <span>{unit}</span>
      </span>
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function Gauge({
  label,
  value,
  used,
  limit,
}: {
  label: string;
  value: number | null;
  used: string;
  limit: string;
}) {
  const percent = value === null ? 0 : Math.min(value * 100, 112);
  const tone =
    value !== null && value > 1
      ? "danger"
      : value !== null && value > 0.9
        ? "warn"
        : "ok";

  return (
    <div className="gauge-card">
      <div className="gauge-head">
        <span>{label}</span>
        <strong className={tone}>{formatPercent(value)}</strong>
      </div>
      <div className="gauge-track" aria-hidden="true">
        <span className={tone} style={{ width: `${percent}%` }} />
        <i />
      </div>
      <div className="gauge-foot">
        <span>計画 {used}</span>
        <span>上限 {limit}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState<VolumeInput>(defaultInput);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const result = useMemo(() => calculateVolume(input), [input]);

  const updateNumber = (key: NumericKey, value: number) => {
    setInput((current) => ({ ...current, [key]: value }));
    setReviewedAt(null);
  };

  const updateFloor = (id: string, area: number) => {
    setInput((current) => ({
      ...current,
      floors: current.floors.map((floor) =>
        floor.id === id ? { ...floor, area } : floor,
      ),
    }));
    setReviewedAt(null);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const accepted = files
      .filter((file) =>
        ["application/pdf", "image/png", "image/jpeg"].includes(file.type),
      )
      .filter((file) => file.size <= 20 * 1024 * 1024)
      .map((file) => ({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        kind: file.type === "application/pdf" ? "PDF" : "画像",
      }));
    setSelectedFiles(accepted);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setReviewedAt(
      new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    );
  };

  const reset = () => {
    setInput({
      ...defaultInput,
      floors: defaultFloors.map((floor) => ({ ...floor })),
    });
    setSelectedFiles([]);
    setReviewedAt(null);
  };

  const statusCopy = {
    safe: { eyebrow: "概算成立", title: "入力範囲では余裕あり" },
    attention: { eyebrow: "要精査", title: "上限に近い項目があります" },
    over: { eyebrow: "超過あり", title: "計画値の見直しが必要です" },
    incomplete: { eyebrow: "未確定", title: "判定に必要な入力が不足" },
  }[result.status];

  const maxFloorArea = Math.max(
    ...input.floors.map((floor) => floor.area),
    1,
  );

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="建築法規くん ホーム">
          <span className="brand-mark">法</span>
          <span>
            <strong>建築法規くん</strong>
            <small>法規・ボリュームチェック</small>
          </span>
        </a>
        <nav aria-label="主要機能">
          <a className="active" href="#volume">ボリューム確認</a>
          <span>法規チェック <i>準備中</i></span>
          <span>間取り条件整理 <i>準備中</i></span>
        </nav>
        <span className="mode-chip">精度優先モード</span>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="kicker">VOLUME STUDY / 01</p>
          <h1>まず、建てられる量を<br />数字で固める。</h1>
        </div>
        <p className="hero-note">
          面積と高さの概算をコードで計算。AIは図面の事実抽出に限定し、
          読み取れない条件を勝手に補いません。
        </p>
      </section>

      <form className="workspace" id="volume" onSubmit={handleSubmit}>
        <div className="input-column">
          <section className="panel project-panel">
            <SectionTitle number="01" eyebrow="PROJECT" title="案件情報" />
            <div className="two-columns">
              <label className="field">
                <span className="field-label">案件名</span>
                <input
                  type="text"
                  value={input.projectName}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      projectName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span className="field-label">所在地</span>
                <input
                  type="text"
                  value={input.address}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <SectionTitle number="02" eyebrow="SITE & CONTROL" title="敷地・法規条件" />
            <div className="field-grid">
              <NumericField label="登記・測量敷地面積" value={input.siteArea} unit="㎡" onChange={(value) => updateNumber("siteArea", value)} />
              <NumericField label="道路後退等の除外面積" value={input.setbackArea} unit="㎡" onChange={(value) => updateNumber("setbackArea", value)} />
              <NumericField label="指定建ぺい率" value={input.designatedBcr} unit="%" step={1} onChange={(value) => updateNumber("designatedBcr", value)} />
              <label className="field">
                <span className="field-label">建ぺい率緩和</span>
                <select value={input.bcrRelief} onChange={(event) => updateNumber("bcrRelief", Number(event.target.value))}>
                  <option value={0}>適用しない</option>
                  <option value={10}>+10%（根拠確認済み）</option>
                  <option value={20}>+20%（根拠確認済み）</option>
                </select>
                <small>角地・防火関連の適用条件は別途確認</small>
              </label>
              <NumericField label="指定容積率" value={input.designatedFar} unit="%" step={1} onChange={(value) => updateNumber("designatedFar", value)} />
              <NumericField label="前面道路幅員" value={input.roadWidth} unit="m" onChange={(value) => updateNumber("roadWidth", value)} />
              <label className="field">
                <span className="field-label">道路幅員による係数</span>
                <select value={input.roadFactor} onChange={(event) => updateNumber("roadFactor", Number(event.target.value))}>
                  <option value={0.4}>0.4（住居系）</option>
                  <option value={0.6}>0.6（その他）</option>
                </select>
                <small>特定道路等の緩和は未反映</small>
              </label>
              <NumericField label="絶対高さ等の上限" value={input.heightLimit} unit="m" onChange={(value) => updateNumber("heightLimit", value)} />
            </div>
          </section>

          <section className="panel">
            <SectionTitle number="03" eyebrow="PROPOSAL" title="計画ボリューム" />
            <div className="field-grid proposal-grid">
              <NumericField label="計画建築面積" value={input.proposedBuildingArea} unit="㎡" onChange={(value) => updateNumber("proposedBuildingArea", value)} />
              <NumericField label="容積対象外面積" value={input.farExemptArea} unit="㎡" note="車庫・地階等は適用条件を別途確認" onChange={(value) => updateNumber("farExemptArea", value)} />
              <NumericField label="計画最高高さ" value={input.proposedHeight} unit="m" onChange={(value) => updateNumber("proposedHeight", value)} />
            </div>
            <div className="floor-editor">
              <p>各階床面積</p>
              <div>
                {input.floors.map((floor) => (
                  <NumericField
                    key={floor.id}
                    label={floor.label}
                    value={floor.area}
                    unit="㎡"
                    onChange={(value) => updateFloor(floor.id, value)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="panel upload-panel">
            <SectionTitle number="04" eyebrow="DRAWINGS" title="図面資料" />
            <label className="drop-zone">
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={handleFiles} />
              <span className="upload-plus">＋</span>
              <strong>PDF・画像を選択</strong>
              <small>現在は端末内でファイル名のみ確認。外部送信・AI課金は行いません。</small>
            </label>
            <div className="analysis-config" aria-label="AI解析の現在の設定">
              <span>解析設定</span>
              <strong>高精細PDF</strong>
              <strong>事実抽出 → 矛盾検出</strong>
              <em>課金API：無効</em>
            </div>
            {selectedFiles.length > 0 ? (
              <ul className="file-list">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    <span>{file.kind}</span>
                    <strong>{file.name}</strong>
                    <small>{file.size}</small>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="form-actions">
            <button className="primary-button" type="submit">概算結果を確定</button>
            <button className="text-button" type="button" onClick={reset}>入力を初期化</button>
            {reviewedAt ? <span aria-live="polite">{reviewedAt} に再確認</span> : null}
          </div>
        </div>

        <aside className="result-column" aria-live="polite">
          <section className={`status-card ${result.status}`}>
            <div className="status-topline">
              <span>{statusCopy.eyebrow}</span>
              <i>概算 / 自動計算</i>
            </div>
            <h2>{statusCopy.title}</h2>
            <p>{input.projectName || "名称未設定"}</p>
          </section>

          <section className="result-panel">
            <div className="result-heading">
              <div>
                <p>QUICK RESULT</p>
                <h2>許容値との比較</h2>
              </div>
              <span>敷地有効面積<br /><strong>{formatArea(result.effectiveSiteArea)}</strong></span>
            </div>
            <div className="gauges">
              <Gauge label="建ぺい率" value={result.bcrUsage} used={formatArea(input.proposedBuildingArea)} limit={formatArea(result.maxBuildingArea)} />
              <Gauge label="容積率" value={result.farUsage} used={formatArea(result.farCountedArea)} limit={formatArea(result.maxFarArea)} />
              <Gauge label="高さ" value={result.heightUsage} used={`${formatNumber(input.proposedHeight)} m`} limit={`${formatNumber(input.heightLimit)} m`} />
            </div>
            <div className="allowance-grid">
              <Allowance label="建築面積余裕" value={formatArea(result.buildingAreaAllowance)} negative={result.buildingAreaAllowance < 0} />
              <Allowance label="容積対象面積余裕" value={formatArea(result.farAreaAllowance)} negative={result.farAreaAllowance < 0} />
              <Allowance label="高さ余裕" value={`${formatNumber(result.heightAllowance)} m`} negative={result.heightAllowance < 0} />
              <Allowance label="道路幅員制限後の容積率" value={`${formatNumber(result.effectiveFar)}%`} />
            </div>
          </section>

          <section className="result-panel massing-panel">
            <div className="result-heading">
              <div>
                <p>MASSING</p>
                <h2>面積比による積層イメージ</h2>
              </div>
            </div>
            <div className="massing-scene" aria-label="各階床面積を比率で表した概念図">
              <div className="massing-stack">
                {[...input.floors].reverse().map((floor) => {
                  if (floor.area <= 0) return null;
                  const width = 44 + (floor.area / maxFloorArea) * 46;
                  return (
                    <div className={floor.id === "b1" ? "floor-block basement" : "floor-block"} key={floor.id} style={{ width: `${width}%` }}>
                      <span>{floor.label}</span>
                      <strong>{formatArea(floor.area)}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="site-slab"><span>有効敷地 {formatArea(result.effectiveSiteArea)}</span></div>
              <div className="road-strip"><span>前面道路 {formatNumber(input.roadWidth)} m</span></div>
            </div>
            <p className="caption">斜線・天空率・方位・隣地高低差を反映した法規形状ではありません。</p>
          </section>

          <section className="result-panel warning-panel">
            <div className="result-heading">
              <div>
                <p>REVIEW NOTES</p>
                <h2>次に確認する項目</h2>
              </div>
              <span>{result.warnings.length} 件</span>
            </div>
            {result.warnings.length ? (
              <ol>
                {result.warnings.map((warning) => (
                  <li key={warning.code} className={warning.level}>
                    <span>{warning.level === "critical" ? "!" : warning.level === "caution" ? "△" : "i"}</span>
                    <div>
                      <strong>{warning.title}</strong>
                      <p>{warning.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-note">概算入力上の警告はありません。</p>
            )}
          </section>
        </aside>
      </form>

      <footer>
        <p>この結果は初期検討用です。確認申請上の最終判断は、最新法令・条例・行政協議・原図で再確認してください。</p>
        <span>Ryo Otsuka Architects / 建築法規くん PoC</span>
      </footer>
    </main>
  );
}

function SectionTitle({ number, eyebrow, title }: { number: string; eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <span>{number}</span>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function Allowance({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={negative ? "negative" : ""}>{value}</strong>
    </div>
  );
}
