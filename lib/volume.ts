export type FloorInput = {
  id: string;
  label: string;
  area: number;
};

export type VolumeInput = {
  projectName: string;
  address: string;
  siteArea: number;
  setbackArea: number;
  designatedBcr: number;
  bcrRelief: number;
  designatedFar: number;
  roadWidth: number;
  roadFactor: number;
  proposedBuildingArea: number;
  farExemptArea: number;
  proposedHeight: number;
  heightLimit: number;
  floors: FloorInput[];
};

export type WarningLevel = "critical" | "caution" | "info";

export type VolumeWarning = {
  code: string;
  level: WarningLevel;
  title: string;
  detail: string;
};

export type VolumeStatus = "safe" | "attention" | "over" | "incomplete";

export type VolumeResult = {
  effectiveSiteArea: number;
  effectiveBcr: number;
  roadLimitedFar: number | null;
  effectiveFar: number;
  maxBuildingArea: number;
  grossFloorArea: number;
  farCountedArea: number;
  maxFarArea: number;
  bcrUsage: number | null;
  farUsage: number | null;
  heightUsage: number | null;
  buildingAreaAllowance: number;
  farAreaAllowance: number;
  heightAllowance: number;
  warnings: VolumeWarning[];
  status: VolumeStatus;
};

const clampNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const ratio = (used: number, limit: number) =>
  limit > 0 ? used / limit : null;

export function calculateVolume(raw: VolumeInput): VolumeResult {
  const siteArea = clampNonNegative(raw.siteArea);
  const setbackArea = clampNonNegative(raw.setbackArea);
  const effectiveSiteArea = Math.max(0, siteArea - setbackArea);
  const effectiveBcr = Math.min(
    100,
    clampNonNegative(raw.designatedBcr) + clampNonNegative(raw.bcrRelief),
  );
  const designatedFar = clampNonNegative(raw.designatedFar);
  const roadWidth = clampNonNegative(raw.roadWidth);
  const roadFactor = clampNonNegative(raw.roadFactor);
  const roadLimitedFar =
    roadWidth > 0 && roadWidth < 12 ? roadWidth * roadFactor * 100 : null;
  const effectiveFar =
    roadLimitedFar === null
      ? designatedFar
      : Math.min(designatedFar, roadLimitedFar);
  const maxBuildingArea = effectiveSiteArea * (effectiveBcr / 100);
  const grossFloorArea = raw.floors.reduce(
    (total, floor) => total + clampNonNegative(floor.area),
    0,
  );
  const farExemptArea = clampNonNegative(raw.farExemptArea);
  const farCountedArea = Math.max(0, grossFloorArea - farExemptArea);
  const maxFarArea = effectiveSiteArea * (effectiveFar / 100);
  const proposedBuildingArea = clampNonNegative(raw.proposedBuildingArea);
  const proposedHeight = clampNonNegative(raw.proposedHeight);
  const heightLimit = clampNonNegative(raw.heightLimit);

  const bcrUsage = ratio(proposedBuildingArea, maxBuildingArea);
  const farUsage = ratio(farCountedArea, maxFarArea);
  const heightUsage = ratio(proposedHeight, heightLimit);
  const buildingAreaAllowance = maxBuildingArea - proposedBuildingArea;
  const farAreaAllowance = maxFarArea - farCountedArea;
  const heightAllowance = heightLimit - proposedHeight;
  const warnings: VolumeWarning[] = [];

  if (siteArea <= 0) {
    warnings.push({
      code: "site-area-missing",
      level: "critical",
      title: "敷地面積が未入力です",
      detail: "測量図・販売図面・登記情報のいずれを採用するかを明示してください。",
    });
  }

  if (setbackArea >= siteArea && siteArea > 0) {
    warnings.push({
      code: "setback-invalid",
      level: "critical",
      title: "道路後退等の除外面積が敷地面積以上です",
      detail: "敷地算定の対象範囲と入力単位を確認してください。",
    });
  }

  if (roadWidth <= 0) {
    warnings.push({
      code: "road-width-missing",
      level: "critical",
      title: "前面道路幅員が未入力です",
      detail: "道路種別・幅員・中心線・セットバックを確認するまで容積率を確定できません。",
    });
  } else if (roadWidth < 4) {
    warnings.push({
      code: "narrow-road",
      level: "caution",
      title: "前面道路幅員が4m未満です",
      detail: "法42条2項道路等の該当性と後退線を確認してください。",
    });
  }

  if (raw.bcrRelief > 0) {
    warnings.push({
      code: "bcr-relief",
      level: "caution",
      title: "建ぺい率緩和を計上しています",
      detail: "角地指定、防火地域、耐火性能など、選択した緩和の適用根拠を添付してください。",
    });
  }

  if (farExemptArea > grossFloorArea) {
    warnings.push({
      code: "far-exempt-invalid",
      level: "critical",
      title: "容積対象外面積が延べ面積を超えています",
      detail: "不算入対象の用途・位置・上限を再確認してください。",
    });
  } else if (farExemptArea > 0) {
    warnings.push({
      code: "far-exempt-review",
      level: "caution",
      title: "容積対象外面積を計上しています",
      detail: "地階住宅、車庫、備蓄倉庫等の個別条件と不算入上限を別途確認してください。",
    });
  }

  if (raw.address.trim().length === 0) {
    warnings.push({
      code: "address-missing",
      level: "caution",
      title: "所在地が未入力です",
      detail: "用途地域、高度地区、地区計画、自治体条例を取得できません。",
    });
  }

  if (bcrUsage !== null && bcrUsage > 1) {
    warnings.push({
      code: "bcr-over",
      level: "critical",
      title: "計画建築面積が概算上限を超えています",
      detail: `${Math.abs(buildingAreaAllowance).toFixed(2)}㎡の超過です。算定範囲と緩和適用を確認してください。`,
    });
  } else if (bcrUsage !== null && bcrUsage > 0.9) {
    warnings.push({
      code: "bcr-near",
      level: "caution",
      title: "建築面積が概算上限の90%を超えています",
      detail: "庇・バルコニー・外部階段など、建築面積へ算入される部分の余裕を確認してください。",
    });
  }

  if (farUsage !== null && farUsage > 1) {
    warnings.push({
      code: "far-over",
      level: "critical",
      title: "容積対象床面積が概算上限を超えています",
      detail: `${Math.abs(farAreaAllowance).toFixed(2)}㎡の超過です。道路幅員制限と不算入面積を確認してください。`,
    });
  } else if (farUsage !== null && farUsage > 0.9) {
    warnings.push({
      code: "far-near",
      level: "caution",
      title: "容積対象床面積が概算上限の90%を超えています",
      detail: "PS・収納・階段調整や面積算定誤差を吸収できる余裕を確認してください。",
    });
  }

  if (heightUsage !== null && heightUsage > 1) {
    warnings.push({
      code: "height-over",
      level: "critical",
      title: "計画高さが入力上限を超えています",
      detail: `${Math.abs(heightAllowance).toFixed(2)}mの超過です。平均地盤面と高さ算定点を確認してください。`,
    });
  } else if (heightUsage !== null && heightUsage > 0.9) {
    warnings.push({
      code: "height-near",
      level: "caution",
      title: "計画高さが入力上限の90%を超えています",
      detail: "平均地盤面、パラペット、設備、軒・棟高さの算定点を確認してください。",
    });
  }

  const coreMissing =
    siteArea <= 0 ||
    raw.designatedBcr <= 0 ||
    raw.designatedFar <= 0 ||
    roadWidth <= 0 ||
    proposedBuildingArea <= 0 ||
    grossFloorArea <= 0;
  const hasOver = [bcrUsage, farUsage, heightUsage].some(
    (value) => value !== null && value > 1,
  );
  const nearLimit = [bcrUsage, farUsage, heightUsage].some(
    (value) => value !== null && value > 0.9,
  );

  let status: VolumeStatus = "safe";
  if (coreMissing) status = "incomplete";
  else if (hasOver) status = "over";
  else if (nearLimit || warnings.some((warning) => warning.level === "caution")) {
    status = "attention";
  }

  return {
    effectiveSiteArea,
    effectiveBcr,
    roadLimitedFar,
    effectiveFar,
    maxBuildingArea,
    grossFloorArea,
    farCountedArea,
    maxFarArea,
    bcrUsage,
    farUsage,
    heightUsage,
    buildingAreaAllowance,
    farAreaAllowance,
    heightAllowance,
    warnings,
    status,
  };
}
