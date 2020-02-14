import chroma from 'chroma-js';
import * as Curves from 'lyft-coloralgorithm/src/curves';
import { hsluvToHex } from 'hsluv';


function distribute(value, rangeA, rangeB) {
	const [fromLow, fromHigh] = Array.from(rangeA);
	const [toLow, toHigh] = Array.from(rangeB);

	const result = toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));

	if (toLow < toHigh) {
		if (result < toLow) { return toLow }
		if (result > toHigh) { return toHigh }
	} else {
		if (result > toLow) { return toLow }
		if (result < toHigh) { return toHigh }
	}

	return result;
}


/**
 * Generate a color scale
 * @param {string} colorSpace // 'hsl', 'hsv' or 'hsluv'
 * @param {object} specs // set of specs for the current scale
 * @param {object} altSpecs // specs from an alternative scale for harmonization
 */
export default function(colorSpace, specs, altSpecs) {
	const refSpecs = altSpecs ? altSpecs : specs;

	function generateNumberOfSteps(curve, steps) {
		let array = [];

		for (const step in Array.from(Array(steps).keys())) {
			const value = curve(step / (steps - 1));
			array.push(value);
		}

		array.reverse();
		return array;
	}

	let lum_array = generateNumberOfSteps(Curves[specs.lum_curve], specs.steps);
	let sat_array = generateNumberOfSteps(Curves[refSpecs.sat_curve], specs.steps);
	let hue_array = generateNumberOfSteps(Curves[refSpecs.hue_curve], specs.steps);
	let lum_array_adjusted = [];
	let sat_array_adjusted = [];
	let hue_array_adjusted = [];

	for (const index in lum_array) {
		const step = lum_array[index];
		lum_array_adjusted.push(distribute(step, [0, 1], [refSpecs.lum_end * .01, refSpecs.lum_start *.01], true));
	}


	for (const index in sat_array) {
		const step = sat_array[index];
		let sat_step = distribute(step, [0, 1], [refSpecs.sat_start * .01, refSpecs.sat_end *.01], true);

		sat_step = sat_step * (refSpecs.sat_rate *.01);
		sat_array_adjusted.push(sat_step);
	}


	for (const index in hue_array) {
		const step = hue_array[index];
		hue_array_adjusted.push(distribute(step, [0,1], [specs.hue_start, specs.hue_end]));
	}


	sat_array_adjusted.reverse();
	hue_array_adjusted.reverse();

	lum_array = lum_array_adjusted;
	sat_array = sat_array_adjusted;
	hue_array = hue_array_adjusted;

	let colorMap = [];

	for (const index in lum_array) {

		const params = {
			hue: hue_array[index],
			saturation: sat_array[index],
			luminosity: lum_array[index],
		}

		if (params.saturation > 1) {params.saturation = 1}

		let h,
			s,
			l,
			color;

		h = params.hue;
		s = params.saturation;
		l = params.luminosity;

		const hsluv = [params.hue, params.saturation * 100, params.luminosity * 100];

		if (colorSpace === 'hsl') {
			color = chroma.hsl([params.hue, params.saturation, params.luminosity]);

		} else if (colorSpace === 'hsv') {
			color = chroma.hsv([params.hue, params.saturation, params.luminosity]);

		} else if (colorSpace === 'hsluv') {
			color = hsluvToHex(hsluv);
			h = hsluv[0];
			s = hsluv[1] / 100;
			l = hsluv[2] / 100;
		}

		const contrastWhite = chroma.contrast(color, 'white').toFixed(2);
		const contrastBlack = chroma.contrast(color, 'black').toFixed(2);

		let displayColor;
		if (contrastWhite >= 4.5) { displayColor = 'white' } else { displayColor = 'black' }

		const colorObj = {
			hex: chroma(color).hex(),
			hue: h,
			sat: s,
			lum: l,
			hsv: chroma(color).hsv(),
			hsl: chroma(color).hsl(),
			hsluv: hsluv,
			rgb: chroma(color).rgb(),
			hueRange: [specs.hue_start, specs.hue_end],
			steps:specs.steps,
			label:specs.modifier * index,
			contrastBlack:contrastBlack,
			contrastWhite:contrastWhite,
			displayColor:displayColor,
		};
		colorMap.push(colorObj);
	}

	return colorMap;
}
