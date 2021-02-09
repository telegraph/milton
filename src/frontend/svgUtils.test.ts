import { suite } from "uvu";
import * as assert from "uvu/assert";
import { parse } from "node-html-parser";
import { replaceHttpWithHttps, reducePathPrecision } from "./svgUtils";

export const svgSample = `
  <svg
    width="241"
    height="247"
    viewBox="0 0 241 247"
    fill="none"
    xmlns="https://www.w3.org/2000/svg"
    preserveAspectRatio="xMinYMin meet"
  >
    <g id="output">
        <path
          id="Vector 1"
          d="M55 1.123456789Z"
          stroke="black"
        ></path>
    </g>
  </svg>
`;

const SvgCleaner = suite("svgUtils.js");

// SvgCleaner("transformToValidId", () => {
//   const expectedResult = "abc123";
//   [
//     "abc 123",
//     "abc   123",
//     "abc	123",
//     "abc		123",
//     "abc---123",
//     "abc===123",
//     "abc+++123",
//     "abc```123",
//     "abc...123",
//     "abc{-}123",
//   ].forEach((id) => assert.is(transformToValidId(id), expectedResult));
// });

SvgCleaner("replaceHttpWithHttps", () => {
  const inputStr = '<a href="http://example.com"></a>';
  const expectedResult = '<a href="https://example.com"></a>';
  assert.is(replaceHttpWithHttps(inputStr), expectedResult);
});

SvgCleaner("reducePathPrecision", () => {
  const svgDom = parse(svgSample);
  reducePathPrecision((svgDom as unknown) as SVGElement);
  const pathValues = svgDom.querySelector("path")?.getAttribute("d");
  const expectedResult = "M55 1.12Z";

  assert.is(pathValues, expectedResult);
});

SvgCleaner.run();
