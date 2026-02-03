import * as pdfjsLib from "./vendor/pdfjs/pdf.mjs";

const fileInput = document.getElementById("file-input");
const viewer = document.getElementById("viewer");
const status = document.getElementById("status");

pdfjsLib.GlobalWorkerOptions.workerSrc = "./vendor/pdfjs/pdf.worker.mjs";

function resetViewer() {
  viewer.innerHTML = "";
}

async function renderPage(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });

  const pageContainer = document.createElement("div");
  pageContainer.className = "page";
  pageContainer.style.width = `${viewport.width}px`;
  pageContainer.style.height = `${viewport.height}px`;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  pageContainer.appendChild(canvas);

  const textLayer = document.createElement("div");
  textLayer.className = "textLayer";
  pageContainer.appendChild(textLayer);

  viewer.appendChild(pageContainer);

  await page.render({ canvasContext: context, viewport }).promise;
  const textContent = await page.getTextContent();

  await pdfjsLib.renderTextLayer({
    textContent,
    container: textLayer,
    viewport,
    textDivs: []
  });
}

async function renderPdf(arrayBuffer) {
  resetViewer();
  status.textContent = "正在加载 PDF...";
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  status.textContent = `共 ${pdf.numPages} 页，正在渲染...`;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    await renderPage(pdf, pageNumber);
    status.textContent = `正在渲染第 ${pageNumber}/${pdf.numPages} 页`;
  }

  status.textContent = "渲染完成，可使用 Ctrl+Shift+F 搜索拼音";
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  status.textContent = `正在读取 ${file.name}...`;
  const buffer = await file.arrayBuffer();
  await renderPdf(buffer);
});
