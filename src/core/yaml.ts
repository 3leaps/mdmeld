import jsYaml from "js-yaml";

/** Serialize a value to YAML string. */
export function dump(value: unknown): string {
	return jsYaml.dump(value, {
		lineWidth: -1,
		noRefs: true,
		quotingType: '"',
		forceQuotes: false,
	});
}

/** Parse a YAML string. */
export function load(text: string): unknown {
	return jsYaml.load(text);
}
