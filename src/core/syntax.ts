/** Map file extensions to markdown code fence language identifiers. */
const EXT_TO_SYNTAX: Record<string, string> = {
	// Web
	".html": "html",
	".htm": "html",
	".css": "css",
	".js": "javascript",
	".mjs": "javascript",
	".cjs": "javascript",
	".jsx": "jsx",
	".ts": "typescript",
	".tsx": "tsx",
	".mts": "typescript",
	".cts": "typescript",
	".vue": "vue",
	".svelte": "svelte",
	".astro": "astro",

	// Data
	".json": "json",
	".jsonc": "jsonc",
	".yaml": "yaml",
	".yml": "yaml",
	".toml": "toml",
	".xml": "xml",
	".csv": "csv",
	".graphql": "graphql",
	".gql": "graphql",

	// Config
	".env": "dotenv",
	".ini": "ini",
	".conf": "conf",
	".cfg": "ini",

	// Shell
	".sh": "bash",
	".bash": "bash",
	".zsh": "zsh",
	".fish": "fish",
	".ps1": "powershell",
	".bat": "batch",
	".cmd": "batch",

	// Systems
	".c": "c",
	".h": "c",
	".cpp": "cpp",
	".cc": "cpp",
	".cxx": "cpp",
	".hpp": "cpp",
	".rs": "rust",
	".go": "go",
	".java": "java",
	".kt": "kotlin",
	".kts": "kotlin",
	".swift": "swift",
	".cs": "csharp",
	".fs": "fsharp",
	".zig": "zig",

	// Scripting
	".py": "python",
	".rb": "ruby",
	".php": "php",
	".pl": "perl",
	".lua": "lua",
	".r": "r",
	".R": "r",
	".jl": "julia",
	".ex": "elixir",
	".exs": "elixir",
	".erl": "erlang",
	".clj": "clojure",
	".scala": "scala",
	".dart": "dart",

	// Markup / Docs
	".md": "markdown",
	".mdx": "mdx",
	".rst": "rst",
	".tex": "latex",
	".typ": "typst",

	// DevOps
	".dockerfile": "dockerfile",
	".tf": "terraform",
	".hcl": "hcl",
	".nix": "nix",

	// SQL
	".sql": "sql",

	// Misc
	".diff": "diff",
	".patch": "diff",
	".prisma": "prisma",
	".proto": "protobuf",
	".wasm": "wasm",
	".lock": "text",
	".log": "text",
	".txt": "text",
};

/** Well-known filenames that map to a syntax */
const NAME_TO_SYNTAX: Record<string, string> = {
	Dockerfile: "dockerfile",
	Makefile: "makefile",
	Containerfile: "dockerfile",
	Justfile: "makefile",
	Vagrantfile: "ruby",
	Gemfile: "ruby",
	Rakefile: "ruby",
	".gitignore": "gitignore",
	".gitattributes": "gitattributes",
	".editorconfig": "editorconfig",
	".prettierrc": "json",
	".eslintrc": "json",
};

/** Get the syntax language identifier for a file path. Defaults to "text" per spec. */
export function getSyntax(filePath: string): string {
	// Check full filename first
	const fileName = filePath.split("/").pop() ?? "";
	const byName = NAME_TO_SYNTAX[fileName];
	if (byName) return byName;

	// Then check extension
	const dotIdx = fileName.lastIndexOf(".");
	if (dotIdx === -1) return "text";
	const ext = fileName.slice(dotIdx).toLowerCase();
	return EXT_TO_SYNTAX[ext] ?? "text";
}
