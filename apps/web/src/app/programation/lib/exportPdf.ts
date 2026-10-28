import { jsPDF } from "jspdf";
import { ProgramItem } from "./types";
import { compressImage } from "./image";

const TEMPLATE_URL = "/template-coachin-bg.png";

// A4 portrait, in mm
const PAGE_W = 210;
const PAGE_H = 297;
// Writable area inside the CoachIn template frame
const ZONE_X = PAGE_W * 0.12;
const ZONE_W = PAGE_W * 0.76;
const ZONE_TOP = PAGE_H * 0.16;
const ZONE_BOTTOM = PAGE_H * 0.82;

const BLOCK_PAD = 3.5;
const BLOCK_GAP = 3.5;
const THUMB_SIZE = 18;
const THUMB_GAP = 4;

const PT_TO_MM = 0.3528;
const LINE_FACTOR = 1.25;

type RGB = [number, number, number];
const COLOR_NAVY: RGB = [13, 21, 40];
const COLOR_TEXT: RGB = [28, 35, 45];
const COLOR_GOLD: RGB = [201, 168, 76];

const lineHeight = (fontSize: number) => fontSize * PT_TO_MM * LINE_FACTOR;

async function tryCompress(src: string, options: Parameters<typeof compressImage>[1]) {
  try {
    return await compressImage(src, options);
  } catch {
    // A broken image must not block the export
    return null;
  }
}

function fileNameFor(programName: string) {
  const slug = programName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${slug || "programme"}.pdf`;
}

export async function exportProgramPdf(programName: string, items: ProgramItem[]) {
  const title = programName.trim() || "Programme";

  // 16-bit PNG template re-encoded as JPEG: jsPDF handles it reliably and it's lighter
  const [background, thumbs] = await Promise.all([
    tryCompress(TEMPLATE_URL, { maxSize: 1754, quality: 0.85 }),
    Promise.all(
      items.map((item) =>
        item.imageUrl ? tryCompress(item.imageUrl, { maxSize: 300, quality: 0.75, square: true }) : null,
      ),
    ),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setLineHeightFactor(LINE_FACTOR);

  let y = 0;

  const startPage = (isFirst: boolean) => {
    if (!isFirst) doc.addPage();
    if (background) doc.addImage(background, "JPEG", 0, 0, PAGE_W, PAGE_H, "template", "FAST");

    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...COLOR_NAVY);
    const heading = doc.splitTextToSize(isFirst ? title : `${title} (suite)`, ZONE_W) as string[];
    doc.text(heading, ZONE_X, ZONE_TOP, { baseline: "top" });
    y = ZONE_TOP + heading.length * lineHeight(20) + 4;
  };

  startPage(true);

  items.forEach((item, i) => {
    const thumb = thumbs[i];
    const textX = ZONE_X + BLOCK_PAD + (thumb ? THUMB_SIZE + THUMB_GAP : 0);
    const textW = ZONE_X + ZONE_W - BLOCK_PAD - textX;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const titleLines = doc.splitTextToSize(`${i + 1}. ${item.title}`, textW) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const descLines = item.description ? (doc.splitTextToSize(item.description, textW) as string[]) : [];

    const textH =
      titleLines.length * lineHeight(12) +
      descLines.length * lineHeight(9) +
      (item.videoUrl ? lineHeight(8.5) : 0) +
      lineHeight(9.5) +
      2;
    const blockH = BLOCK_PAD * 2 + Math.max(thumb ? THUMB_SIZE : 0, textH);

    if (y + blockH > ZONE_BOTTOM && y > ZONE_TOP + 15) startPage(false);

    doc.setDrawColor(...COLOR_GOLD);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(ZONE_X, y, ZONE_W, blockH, 2.5, 2.5, "FD");

    if (thumb) {
      doc.addImage(thumb, "JPEG", ZONE_X + BLOCK_PAD, y + BLOCK_PAD, THUMB_SIZE, THUMB_SIZE, undefined, "FAST");
    }

    let ty = y + BLOCK_PAD;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(titleLines, textX, ty, { baseline: "top" });
    ty += titleLines.length * lineHeight(12) + 1;

    if (descLines.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(descLines, textX, ty, { baseline: "top" });
      ty += descLines.length * lineHeight(9);
    }

    if (item.videoUrl) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_GOLD);
      // textWithLink places its clickable area assuming an alphabetic baseline, so shift by the ascent
      doc.textWithLink("Voir la démonstration vidéo", textX, ty + 8.5 * PT_TO_MM * 0.85, { url: item.videoUrl });
      ty += lineHeight(8.5);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`${item.sets} série${item.sets > 1 ? "s" : ""} × ${item.reps}`, textX, ty + 1, { baseline: "top" });

    y += blockH + BLOCK_GAP;
  });

  doc.save(fileNameFor(title));
}
