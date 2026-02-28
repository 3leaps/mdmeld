import type { VirtualFile } from "@core/types";

/**
 * Read files from a dropped/selected folder into VirtualFile[].
 * Uses File System Access API when available, falls back to webkitdirectory input.
 */

/** Read via the File System Access API (showDirectoryPicker) */
export async function pickFolder(): Promise<VirtualFile[]> {
	if ("showDirectoryPicker" in window) {
		try {
			const handle = await (window as any).showDirectoryPicker();
			return readDirectoryHandle(handle, "");
		} catch (e: any) {
			if (e.name === "AbortError") return [];
			throw e;
		}
	}
	// Fallback: trigger the hidden file input
	return pickFolderFallback();
}

async function readDirectoryHandle(
	dirHandle: FileSystemDirectoryHandle,
	prefix: string,
): Promise<VirtualFile[]> {
	const files: VirtualFile[] = [];

	for await (const entry of (dirHandle as any).values()) {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.kind === "file") {
			const fileHandle = entry as FileSystemFileHandle;
			const file = await fileHandle.getFile();
			const buffer = await file.arrayBuffer();
			files.push({ path, content: new Uint8Array(buffer) });
		} else if (entry.kind === "directory") {
			// Skip common ignored directories
			if (isIgnored(entry.name)) continue;
			const sub = await readDirectoryHandle(entry as FileSystemDirectoryHandle, path);
			files.push(...sub);
		}
	}

	return files.sort((a, b) => a.path.localeCompare(b.path));
}

/** Fallback using <input webkitdirectory> */
function pickFolderFallback(): Promise<VirtualFile[]> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		(input as any).webkitdirectory = true;
		input.multiple = true;

		input.addEventListener("change", async () => {
			const fileList = input.files;
			if (!fileList || fileList.length === 0) {
				resolve([]);
				return;
			}

			const files: VirtualFile[] = [];

			for (let i = 0; i < fileList.length; i++) {
				const file = fileList[i]!;
				// webkitRelativePath gives "folder/sub/file.txt"
				const relPath = file.webkitRelativePath;
				// Strip the top-level folder name
				const parts = relPath.split("/");
				const path = parts.slice(1).join("/");

				if (isIgnoredPath(path)) continue;

				const buffer = await file.arrayBuffer();
				files.push({ path, content: new Uint8Array(buffer) });
			}

			resolve(files.sort((a, b) => a.path.localeCompare(b.path)));
		});

		input.click();
	});
}

/** Read files from a drop event */
export async function readDroppedItems(dataTransfer: DataTransfer): Promise<VirtualFile[]> {
	// Try File System Access API first
	if (dataTransfer.items && dataTransfer.items[0]?.getAsFileSystemHandle) {
		try {
			const handle = await (dataTransfer.items[0] as any).getAsFileSystemHandle();
			if (handle.kind === "directory") {
				return readDirectoryHandle(handle, "");
			}
		} catch {
			// fall through
		}
	}

	// Fallback: webkitGetAsEntry
	if (dataTransfer.items && dataTransfer.items[0]?.webkitGetAsEntry) {
		const entry = dataTransfer.items[0].webkitGetAsEntry();
		if (entry?.isDirectory) {
			return readEntry(entry as FileSystemDirectoryEntry, "");
		}
	}

	return [];
}

async function readEntry(
	entry: FileSystemDirectoryEntry,
	prefix: string,
): Promise<VirtualFile[]> {
	const files: VirtualFile[] = [];
	const reader = entry.createReader();

	const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
		reader.readEntries(resolve as any, reject);
	});

	for (const child of entries) {
		const path = prefix ? `${prefix}/${child.name}` : child.name;

		if (child.isFile) {
			const file = await new Promise<File>((resolve, reject) => {
				(child as FileSystemFileEntry).file(resolve, reject);
			});
			const buffer = await file.arrayBuffer();
			files.push({ path, content: new Uint8Array(buffer) });
		} else if (child.isDirectory) {
			if (isIgnored(child.name)) continue;
			const sub = await readEntry(child as FileSystemDirectoryEntry, path);
			files.push(...sub);
		}
	}

	return files.sort((a, b) => a.path.localeCompare(b.path));
}

const IGNORED_DIRS = new Set([
	".git",
	"node_modules",
	".DS_Store",
	"dist",
	"build",
	".next",
	".cache",
	"__pycache__",
	".venv",
	"venv",
]);

function isIgnored(name: string): boolean {
	return IGNORED_DIRS.has(name);
}

function isIgnoredPath(path: string): boolean {
	return path.split("/").some((part) => IGNORED_DIRS.has(part));
}
