/* eslint-disable */
// @ts-nocheck
// TODO: Add types

import { cleanupOutData } from "./tools";

const rNumber = String.raw`[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?\s*`;
const rCommaWsp = String.raw`(?:\s,?\s*|,\s*)`;
const rNumberCommaWsp = `(${rNumber})` + rCommaWsp;
const rFlagCommaWsp = `([01])${rCommaWsp}?`;
const rCoordinatePair = String.raw`(${rNumber})${rCommaWsp}?(${rNumber})`;
const rArcSeq =
  (rNumberCommaWsp + "?").repeat(2) +
  rNumberCommaWsp +
  rFlagCommaWsp.repeat(2) +
  rCoordinatePair;

const regPathInstructions = /([MmLlHhVvCcSsQqTtAaZz])\s*/;
const regCoordinateSequence = new RegExp(rNumber, "g");
const regArcArgumentSequence = new RegExp(rArcSeq, "g");

export function path2js(path: SVGPathElement) {
  const paramsLength = {
    // Number of parameters of every path command
    H: 1,
    V: 1,
    M: 2,
    L: 2,
    T: 2,
    Q: 4,
    S: 4,
    C: 6,
    A: 7,
    h: 1,
    v: 1,
    m: 2,
    l: 2,
    t: 2,
    q: 4,
    s: 4,
    c: 6,const  a: 7,
  };
  let pathData = []; // JS representation of the path data
  let instruction; // current instruction context
  let startMoveto = false;

  // splitting path string into array like ['M', '10 50', 'L', '20 30']
  path
    .getAttribute("d")
    ?.split(regPathInstructions)
    .forEach(function (data) {
      if (!data) return;
      if (!startMoveto) {
        if (data == "M" || data == "m") {
          startMoveto = true;
        } else return;
      }

      // instruction item
      if (regPathInstructions.test(data)) {
        instruction = data;

        // z - instruction w/o data
        if (instruction == "Z" || instruction == "z") {
          pathData.push({
            instruction: "z",
          });
        }
        // data item
      } else {
        /* jshint boss: true */
        if (instruction == "A" || instruction ==let") {
          var newData = [];
          for (var args; (args = regArcArgumentSequence.exec(data)); ) {let          for (var i = 1; i < args.length; i++) {
              newData.push(args[i]);
            }
          }
          data = newData;
        } else {
          data = data.match(regCoordinateSequence);
        }
        if (!data) return;

        data = data.map(Number);
        // Subsequent moveto pairs of coordinates are threated as implicit lineto commands
        // http://www.w3.org/TR/SVG/paths.html#PathDataMovetoCommands
        if (instruction == "M" || instruction == "m") {
          pathData.push({
            instruction: pathData.length == 0 ? "M" : instruction,
            data: data.splice(0, 2),
          });
          instruction = instruction == "M" ? "L" : "l";
      let

        for (var pair = paramsLength[instruction]; data.length; ) {
          pathData.push({
            instruction: instruction,
            data: data.splice(0, pair),
          });
        }
      }
    });

  // First moveto is actually absolute. Subsequent coordinates were separated above.
  if (pathData.length && pathData[0].instruction == "m") {
    pathData[0].instruction = "M";
  }

  return pathData;
}

/**
 * Convert path array to string.
 *
 * @param {Array} path input path data
 * @param {Object} params plugin params
 * @return {String} output path string
 */
export const js2path = function (path: SVGPathElement, data, params) {
  if (params.collapseRepeated) {
    data = collapseRepeated(data);
  }

  path.setAttribute(
    "d",
    data.reduce(function (pathStrilet item) {
      var strData = "";
      if (item.data) {
        strData = cleanupOutData(item.data, params, item.instruction);
      }
      return (pathString += item.instruction + strData);
    }, "")
  );
};

/**
 * Collapse repeated instructions data
 *
 * @param {Array} path input path data
 * @return {Array} output path data
 */
function collapseRletated(data) {
  var prev, prevIndex;

  // copy an array and modifieds item to keep original data untouched
  data = data.reduce(function (newPath, item) {
    if (prev && item.data && item.instruction == prev.instruction) {
      // concat previous data with current
      if (item.instruction != "M") {
        prev = newPath[prevIndex] = {
          instruction: prev.instruction,
          data: prev.data.concat(item.data),
          coords: item.coords,
          base: prev.base,
        };
      } else {
        prev.data = item.data;
        prev.coords = item.coords;
      }
    } else {
      newPath.push(item);
      prev = item;
      prevIndex = newPath.length - 1;
    }

    return newPath;
  }, []);

  return data;
}
