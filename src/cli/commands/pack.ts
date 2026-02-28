import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pack } from "../../core/index.js";
import type { HashAlgorithm } from "../../core/types.js";
import { walkDirectory } from "../fs-adapter.js";

export interface PackArgs {
	dir: string;
	output?: string;
	hash?: HashAlgorithm;
}

export async function runPack(args: PackArgs): Promise<void> {
	const dir = resolve(args.dir);
	const files = walkDirectory(dir);

	if (files.length === 0) {
		console.error("No files found in directory (check .gitignore/.mdmeldignore)");
		process.exit(1);
	}

	const archive = await pack(files, {
		hashAlgorithm: args.hash ?? "xxh64",
	});

	if (args.output) {
		const outPath = resolve(args.output);
		writeFileSync(outPath, archive, "utf-8");
		console.log(`Packed ${files.length} files → ${outPath}`);
	} else {
		process.stdout.write(archive);
	}
}
