import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { unpack } from "../../core/index.js";

export interface UnpackArgs {
	file: string;
	output?: string;
}

export async function runUnpack(args: UnpackArgs): Promise<void> {
	const filePath = resolve(args.file);
	const content = readFileSync(filePath, "utf-8");
	const outputDir = resolve(args.output ?? ".");

	const result = await unpack(content);

	for (const file of result.files) {
		const outPath = join(outputDir, file.path);
		mkdirSync(dirname(outPath), { recursive: true });
		writeFileSync(outPath, file.content);
	}

	console.log(`Unpacked ${result.files.length} files → ${outputDir}`);
}
