import assert from "node:assert/strict";
import test from "node:test";
import { calculateVolume, type VolumeInput } from "../lib/volume.ts";

const base: VolumeInput = {
  projectName: "test",
  address: "東京都世田谷区",
  siteArea: 100,
  setbackArea: 0,
  designatedBcr: 60,
  bcrRelief: 0,
  designatedFar: 200,
  roadWidth: 4,
  roadFactor: 0.4,
  proposedBuildingArea: 55,
  farExemptArea: 0,
  proposedHeight: 9,
  heightLimit: 10,
  floors: [
    { id: "1f", label: "1F", area: 55 },
    { id: "2f", label: "2F", area: 55 },
  ],
};

test("前面道路幅員による容積率制限を指定容積率と比較する", () => {
  const result = calculateVolume(base);
  assert.equal(result.roadLimitedFar, 160);
  assert.equal(result.effectiveFar, 160);
  assert.equal(result.maxFarArea, 160);
  assert.equal(result.status, "attention");
});

test("道路後退面積を敷地面積から除外する", () => {
  const result = calculateVolume({ ...base, setbackArea: 5 });
  assert.equal(result.effectiveSiteArea, 95);
  assert.equal(result.maxBuildingArea, 57);
  assert.equal(result.maxFarArea, 152);
});

test("建ぺい率超過を危険判定する", () => {
  const result = calculateVolume({ ...base, proposedBuildingArea: 61 });
  assert.equal(result.status, "over");
  assert.ok(result.warnings.some((warning) => warning.code === "bcr-over"));
});

test("容積対象外面積を延べ面積から控除する", () => {
  const result = calculateVolume({ ...base, farExemptArea: 10 });
  assert.equal(result.grossFloorArea, 110);
  assert.equal(result.farCountedArea, 100);
});
