import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { inflate } from "pako";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Dekodues base64 i pavarur (pa Buffer/atob) -> Uint8Array.
const base64ToBytes = (b64: string): Uint8Array => {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = B64.indexOf(clean[i + 2]);
    const c3 = B64.indexOf(clean[i + 3]);
    const n = (c0 << 18) | (c1 << 12) | ((c2 & 63) << 6) | (c3 & 63);
    if (p < len) out[p++] = (n >> 16) & 0xff;
    if (c2 !== -1 && p < len) out[p++] = (n >> 8) & 0xff;
    if (c3 !== -1 && p < len) out[p++] = n & 0xff;
  }
  return out;
};

const bytesToLatin1 = (bytes: Uint8Array): string => {
  let s = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return s;
};

const decodeXmlEntities = (s: string): string =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

// ---- TXT ----
export const extractTxt = (localPath: string) =>
  FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.UTF8 });

// ---- DOCX (zip -> word/document.xml) ----
export const extractDocx = async (localPath: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.Base64 });
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Skedari DOCX nuk përmban word/document.xml.");
  const xml = await file.async("string");
  let s = xml
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/?>/g, "\n")
    .replace(/<\/w:p>/g, "\n");
  s = s.replace(/<[^>]+>/g, ""); // hiq të gjitha etiketat, mbetet teksti i <w:t>
  return decodeXmlEntities(s).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};

// ---- PDF (best-effort, pa DOM): inflate FlateDecode + nxjerr tekstin nga Tj/TJ ----
const decodePdfLiteral = (raw: string): string => {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (c === "\\") {
      const n = raw[i + 1];
      if (n === "n") { out += "\n"; i += 1; }
      else if (n === "r") { out += "\r"; i += 1; }
      else if (n === "t") { out += "\t"; i += 1; }
      else if (n === "(" || n === ")" || n === "\\") { out += n; i += 1; }
      else if (n >= "0" && n <= "7") {
        const oct = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/);
        if (oct) { out += String.fromCharCode(parseInt(oct[0], 8)); i += oct[0].length; }
      } else { out += n; i += 1; }
    } else {
      out += c;
    }
  }
  return out;
};

const decodePdfHex = (hex: string): string => {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  return out;
};

const extractTextFromContentStream = (content: string): string => {
  let out = "";
  // TJ arrays: [(a) -10 (b)] TJ  -> bashko copat
  const tjArray = /\[((?:[^\[\]]|\\.)*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = tjArray.exec(content))) {
    const inner = m[1];
    const pieces = inner.match(/\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>/g) || [];
    for (const p of pieces) {
      out += p[0] === "(" ? decodePdfLiteral(p.slice(1, -1)) : decodePdfHex(p.slice(1, -1));
    }
    out += " ";
  }
  // Tj operatorë të vetëm: (string) Tj  ose  <hex> Tj
  const tj = /(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*Tj/g;
  while ((m = tj.exec(content))) {
    const p = m[1];
    out += (p[0] === "(" ? decodePdfLiteral(p.slice(1, -1)) : decodePdfHex(p.slice(1, -1))) + " ";
  }
  return out;
};

export const extractPdf = async (localPath: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(base64);
  const raw = bytesToLatin1(bytes);
  let out = "";
  const streamRe = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    let content: string | null = null;
    try {
      content = bytesToLatin1(inflate(bytes.subarray(start, end)));
    } catch {
      content = raw.slice(start, end); // ndoshta i pakompresuar
    }
    if (content) out += extractTextFromContentStream(content);
    streamRe.lastIndex = end;
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
};

export type ExtractResult = { text: string; ok: boolean };

export const extractText = async (localPath: string, fileType: string): Promise<ExtractResult> => {
  try {
    if (fileType === "txt" || fileType === "md" || fileType === "text") return { text: await extractTxt(localPath), ok: true };
    if (fileType === "docx") return { text: await extractDocx(localPath), ok: true };
    if (fileType === "pdf") {
      const text = await extractPdf(localPath);
      return { text, ok: text.trim().length > 0 };
    }
    return { text: "", ok: false };
  } catch {
    return { text: "", ok: false };
  }
};
