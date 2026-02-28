import { parseArgs } from "node:util";

const USAGE = `mdmeld — pack directory trees into markdown archives

Usage:
  mdmeld pack <dir> [-o <file>] [--hash xxh64|sha256]
  mdmeld unpack <file> [-o <dir>]
  mdmeld finalize <file>
  mdmeld --help

Commands:
  pack       Pack a directory into an .mdmeld archive
  unpack     Unpack an .mdmeld archive to a directory
  finalize   Compute real hashes for HASH_PLACEHOLDER values
`;

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command || command === "--help" || command === "-h") {
		console.log(USAGE);
		process.exit(0);
	}

	const rest = args.slice(1);

	switch (command) {
		case "pack": {
			const { values, positionals } = parseArgs({
				args: rest,
				options: {
					output: { type: "string", short: "o" },
					hash: { type: "string" },
				},
				allowPositionals: true,
			});

			const dir = positionals[0];
			if (!dir) {
				console.error("Usage: mdmeld pack <dir> [-o <file>]");
				process.exit(1);
			}

			const { runPack } = await import("./commands/pack.js");
			await runPack({
				dir,
				output: values.output,
				hash: values.hash as "xxh64" | "sha256" | undefined,
			});
			break;
		}

		case "unpack": {
			const { values, positionals } = parseArgs({
				args: rest,
				options: {
					output: { type: "string", short: "o" },
				},
				allowPositionals: true,
			});

			const file = positionals[0];
			if (!file) {
				console.error("Usage: mdmeld unpack <file> [-o <dir>]");
				process.exit(1);
			}

			const { runUnpack } = await import("./commands/unpack.js");
			await runUnpack({ file, output: values.output });
			break;
		}

		case "finalize": {
			const { positionals } = parseArgs({
				args: rest,
				allowPositionals: true,
			});

			const file = positionals[0];
			if (!file) {
				console.error("Usage: mdmeld finalize <file>");
				process.exit(1);
			}

			const { runFinalize } = await import("./commands/finalize.js");
			await runFinalize({ file });
			break;
		}

		default:
			console.error(`Unknown command: ${command}`);
			console.log(USAGE);
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
