$vui.config = {
    namespace: 'ui'
}
$vui.config.importMap = {
    "*": '/components/${path}${component}.html'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Docx setup & utils
const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    TextRun,
    ImageRun,
  } = window.docx;

function markdownToParagraphs(markdown) {
  const paragraphs = [];

  const lines = markdown.split("\n");

  let inCodeBlock = false;

  for (const line of lines) {

    // code block toggle
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: "Courier New",
            }),
          ],
        })
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;   // 1..6
      const text  = headingMatch[2];

      paragraphs.push(
        new Paragraph({
          text,
          heading: HeadingLevel[`HEADING_${level}`],
        })
      );
      continue;
    }

    // bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      paragraphs.push(new Paragraph({
        text: line.slice(2),
        bullet: { level: 0 },
      }));
      continue;
    }

    // empty line
    if (line.trim() === "") {
      paragraphs.push(new Paragraph(""));
      continue;
    }

    // inline formatting (**bold**, *italic*)
    paragraphs.push(new Paragraph({
      children: parseInline(line),
      style: "Normal"
    }));
  }

  return paragraphs;
}

function parseInline(text) {
  const runs = [];
  let buffer = "";
  let bold = false;
  let italic = false;

  for (let i = 0; i < text.length; i++) {

    if (text.startsWith("**", i)) {
      if (buffer) {
        runs.push(new TextRun({ text: buffer, bold, italics: italic }));
        buffer = "";
      }
      bold = !bold;
      i++;
      continue;
    }

    if (text[i] === "*") {
      if (buffer) {
        runs.push(new TextRun({ text: buffer, bold, italics: italic }));
        buffer = "";
      }
      italic = !italic;
      continue;
    }

    buffer += text[i];
  }

  if (buffer) {
    runs.push(new TextRun({ text: buffer, bold, italics: italic }));
  }

  return runs;
}

async function blobUrlToArrayBuffer(blobUrl) {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return await blob.arrayBuffer();
}

function getImageDimensions(blobUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

async function imageSectionToParagraph(section) {
  const buffer = await blobUrlToArrayBuffer(section.data);
  const { width, height } = await getImageDimensions(section.data);

  const targetWidth = 500;
  const ratio = height / width;
  const targetHeight = Math.round(targetWidth * ratio);

  return new Paragraph({
    alignment: "center",
    spacing: { before: 200, after: 200 },
    children: [
      new ImageRun({
        data: buffer,
        transformation: {
          width: targetWidth,
          height: targetHeight,
        },
      }),
    ],
  });
}

//async function drawioSectionToParagraph(section) {
//  const dataUrl = await exportDrawioXmlToPng(section.data);
//
//  // Laat de browser decoden
//  const buffer = await (await fetch(dataUrl)).arrayBuffer();
//
//  return new Paragraph({
//    alignment: "center",
//    children: [
//      new ImageRun({
//        data: buffer,
//        transformation: {
//          width: 600,
//          height: 400,
//        },
//      }),
//    ],
//  });
//}