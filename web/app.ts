import { pack } from "@core/index";
import type { VirtualFile } from "@core/types";
import { pickFolder, readDroppedItems } from "./folder-reader";

const $ = (sel: string) => document.querySelector(sel)!;

// State
let loadedFiles: VirtualFile[] = [];
let archiveOutput = "";

// Elements
const dropZone = $(".drop-zone") as HTMLElement;
const browseBtn = $(".browse-btn") as HTMLButtonElement;
const fileList = $(".file-list") as HTMLElement;
const fileCount = $(".file-count") as HTMLElement;
const packBtn = $(".pack-btn") as HTMLButtonElement;
const outputSection = $(".output-section") as HTMLElement;
const outputArea = $(".output-area") as HTMLTextAreaElement;
const copyBtn = $(".copy-btn") as HTMLButtonElement;
const downloadBtn = $(".download-btn") as HTMLButtonElement;
const statusBar = $(".status-bar") as HTMLElement;

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setStatus(msg: string) {
	statusBar.textContent = msg;
}

function setFiles(files: VirtualFile[]) {
	loadedFiles = files;
	const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);

	fileCount.textContent = `${files.length} files · ${formatBytes(totalSize)}`;
	fileList.innerHTML = files
		.map((f) => `<div class="file-entry">${f.path}</div>`)
		.join("");

	dropZone.classList.add("has-files");
	packBtn.disabled = files.length === 0;
	outputSection.classList.remove("visible");
	setStatus(`Loaded ${files.length} files`);
}

// Browse button
browseBtn.addEventListener("click", async () => {
	try {
		const files = await pickFolder();
		if (files.length > 0) setFiles(files);
	} catch (e: any) {
		setStatus(`Error: ${e.message}`);
	}
});

// Drag and drop
dropZone.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
	dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", async (e) => {
	e.preventDefault();
	dropZone.classList.remove("drag-over");

	if (!e.dataTransfer) return;
	try {
		setStatus("Reading files...");
		const files = await readDroppedItems(e.dataTransfer);
		if (files.length > 0) setFiles(files);
		else setStatus("No files found in dropped item");
	} catch (err: any) {
		setStatus(`Error: ${err.message}`);
	}
});

// Pack
packBtn.addEventListener("click", async () => {
	if (loadedFiles.length === 0) return;

	packBtn.disabled = true;
	packBtn.textContent = "Packing...";
	setStatus("Packing archive...");

	try {
		const start = performance.now();
		archiveOutput = await pack(loadedFiles);
		const elapsed = (performance.now() - start).toFixed(0);

		outputArea.value = archiveOutput;
		outputSection.classList.add("visible");

		const lines = archiveOutput.split("\n").length;
		setStatus(
			`Packed ${loadedFiles.length} files → ${lines} lines · ${formatBytes(archiveOutput.length)} · ${elapsed}ms`,
		);
	} catch (err: any) {
		setStatus(`Pack error: ${err.message}`);
	} finally {
		packBtn.disabled = false;
		packBtn.textContent = "Pack";
	}
});

// Copy
copyBtn.addEventListener("click", async () => {
	try {
		await navigator.clipboard.writeText(archiveOutput);
		const original = copyBtn.textContent;
		copyBtn.textContent = "Copied";
		setTimeout(() => {
			copyBtn.textContent = original;
		}, 1500);
	} catch {
		// Fallback
		outputArea.select();
		document.execCommand("copy");
	}
});

// Download
downloadBtn.addEventListener("click", () => {
	const blob = new Blob([archiveOutput], { type: "text/markdown" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "archive.mdmeld";
	a.click();
	URL.revokeObjectURL(url);
});
