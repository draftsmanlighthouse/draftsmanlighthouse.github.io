/**
 * Create a simple PDF from basic HTML content
 * Uses an iframe to completely isolate from page styles
 * @param {string} title - The title for the PDF
 * @param {string} content - The content (can be HTML string or plain text)
 * @param {string} filename - The name of the PDF file
 */
async function createSimplePDF(title, content, filename = 'document.pdf') {
  try {
    // Create an iframe to isolate from all page styles
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      height: 1200px;
      border: none;
    `;
    document.body.appendChild(iframe);

    // Get iframe document
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Write completely isolated HTML with NO external styles
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: #ffffff;
            color: #000000;
            padding: 40px;
            width: 800px;
          }
          h1 {
            font-size: 24px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 20px;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #000000;
            margin-bottom: 10px;
          }
          div {
            color: #000000;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${content}</div>
      </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for iframe to render
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get the body of the iframe
    const iframeBody = iframeDoc.body;

    // Convert iframe content to canvas
    const canvas = await html2canvas(iframeBody, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });

    // Remove iframe
    document.body.removeChild(iframe);

    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Access jsPDF from window object (handles both UMD and global)
    const { jsPDF } = window.jspdf || window;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error creating PDF:', error);
    return false;
  }
}

/**
 * Extract text content from an existing element and create PDF
 * @param {string} elementId - The ID of the element to extract from
 * @param {string} filename - The name of the PDF file
 */
async function exportElementToPDF(elementId, microDoc) {
  const element = document.getElementById(elementId);
  const filename = microDoc.json.name + ".pdf";
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Extract title (first h1, h2, or use a default)
  const title = microDoc.json.name;

  // Extract content - get inner HTML to preserve some structure
  let content = element.innerHTML;

  // Remove script tags
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all class attributes to avoid CSS references
  content = content.replace(/class="[^"]*"/g, '');

  // Remove all inline style attributes that might have oklch
  content = content.replace(/style="[^"]*oklch[^"]*"/g, '');

  // Create the PDF
  return createSimplePDF(title, content, filename);
}
