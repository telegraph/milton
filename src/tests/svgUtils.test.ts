import { suite } from "uvu";
import * as assert from "uvu/assert";
import { parse } from "node-html-parser";
import { highPrecisionSvg } from "./sampleSvgs";
import {
  transformToValidId,
  replaceHttpWithHttps,
  reducePathPrecision,
} from "../frontend/svgUtils";

const SvgCleaner = suite("Svg cleaner");

SvgCleaner("should convert ids", () => {
  const expectedResult = "abc123";
  [
    "abc 123",
    "abc   123",
    "abc	123",
    "abc		123",
    "abc---123",
    "abc===123",
    "abc+++123",
    "abc```123",
    "abc...123",
    "abc{-}123",
  ].forEach((id) => assert.is(transformToValidId(id), expectedResult));
});

SvgCleaner("should replace http with https", () => {
  const inputStr = '<a href="http://example.com"></a>';
  const expectedResult = '<a href="https://example.com"></a>';
  assert.is(replaceHttpWithHttps(inputStr), expectedResult);
});

SvgCleaner("should reduce path precision", () => {
  const svgDom = parse(highPrecisionSvg);
  reducePathPrecision((svgDom as unknown) as SVGElement);
  const pathValues = svgDom.querySelector("path")?.getAttribute("d");
  const expectedResult = "M55 1.12Z";

  assert.is(pathValues, expectedResult);
});

SvgCleaner.run();
