import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dtuLogo from "../assest/dtu-logo.png";

const amountFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const currency = (value = 0) => {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? "-" : "";
  return `${sign}INR ${amountFormat.format(Math.abs(numeric))}`;
};

const dateOnly = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dateTime = (value) => {
  if (!value) return "-";

  const normalized = String(value).trim().replace(" ", "T").slice(0, 19);
  const localValue = new Date(`${normalized}Z`);
  if (Number.isNaN(localValue.getTime())) return String(value);

  return localValue.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const moneyCellStyle = { halign: "right" };

const ensureSpace = (doc, y, requiredHeight) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight > pageHeight - 40) {
    doc.addPage();
    return 48;
  }
  return y;
};

const buildCharts = (event) => {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const budget = Number(event?.metrics?.totalBudget || 0);
  const liability = Number(event?.metrics?.totalLiability || 0);
  const paid = Number(event?.metrics?.paid || 0);
  const pending = Number(event?.metrics?.pending || 0);

  // Left: donut chart for budget composition
  const cx = 150;
  const cy = 145;
  const outer = 78;
  const inner = 44;
  const donutParts = [
    { label: "Paid", value: Math.max(0, paid), color: "#16a34a" },
    { label: "Pending", value: Math.max(0, pending), color: "#eab308" },
    {
      label: "Unallocated",
      value: Math.max(0, budget - Math.max(liability, 0)),
      color: "#334155",
    },
  ];
  const donutTotal = donutParts.reduce((sum, p) => sum + p.value, 0) || 1;

  let angle = -Math.PI / 2;
  donutParts.forEach((part) => {
    const span = (part.value / donutTotal) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = part.color;
    ctx.arc(cx, cy, outer, angle, angle + span);
    ctx.closePath();
    ctx.fill();
    angle += span;
  });

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("Budget Mix", 95, 34);

  ctx.font = "11px sans-serif";
  donutParts.forEach((part, index) => {
    const y = 220 + index * 18;
    ctx.fillStyle = part.color;
    ctx.fillRect(60, y - 10, 10, 10);
    ctx.fillStyle = "#111827";
    ctx.fillText(`${part.label}: ${currency(part.value)}`, 78, y);
  });

  // Right: horizontal bars for top categories
  const categories = [...(event.categories || [])]
    .map((c) => ({ name: c.name || "-", allocated: Number(c.allocated || 0) }))
    .sort((a, b) => b.allocated - a.allocated)
    .slice(0, 5);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("Top Category Allocation", 430, 34);

  const maxAllocated = Math.max(1, ...categories.map((c) => c.allocated));
  categories.forEach((category, index) => {
    const y = 68 + index * 38;
    const width = (category.allocated / maxAllocated) * 310;

    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(520, y, 310, 14);

    ctx.fillStyle = "#2563eb";
    ctx.fillRect(520, y, width, 14);

    ctx.fillStyle = "#111827";
    ctx.font = "11px sans-serif";
    const trimmedName =
      category.name.length > 20
        ? `${category.name.slice(0, 20)}...`
        : category.name;
    ctx.fillText(trimmedName, 430, y + 11);
    ctx.fillText(currency(category.allocated), 835, y + 11);
  });

  return canvas.toDataURL("image/png");
};

const toDataUrl = (imageSrc) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Failed to load logo image"));
    image.src = imageSrc;
  });

export const downloadEventFinancialReport = async (event) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  doc.setFillColor(16, 24, 40);
  doc.rect(0, 0, pageWidth, 88, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Event Financial Statement", 40, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(event.name || "-", 40, 60);
  doc.text(`Generated: ${generatedAt}`, 40, 76);

  try {
    const logoDataUrl = await toDataUrl(dtuLogo);
    const logoWidth = 52;
    const logoHeight = 52;
    const logoX = pageWidth - 40 - logoWidth;
    const logoY = 18;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(
      logoX - 6,
      logoY - 6,
      logoWidth + 12,
      logoHeight + 12,
      6,
      6,
      "F",
    );
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
  } catch {
    // Keep PDF export functional even if logo loading fails.
  }

  doc.setTextColor(20, 20, 20);
  let y = 112;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [33, 84, 181], textColor: [255, 255, 255] },
    body: [
      ["Event Date", dateOnly(event.date)],
      [
        "Lifecycle Status",
        String(event.lifecycleStatus || event.status || "-"),
      ],
      ["Financial Health", String(event?.metrics?.status || "-")],
      ["Closed At", dateTime(event.closedAt)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 150 },
      1: { cellWidth: 350 },
    },
  });

  y = doc.lastAutoTable.finalY + 14;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [["Financial Summary", "Amount"]],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
    body: [
      ["Total Budget", currency(event?.metrics?.totalBudget)],
      ["Total Liability", currency(event?.metrics?.totalLiability)],
      ["Paid", currency(event?.metrics?.paid)],
      ["Pending", currency(event?.metrics?.pending)],
      ["Remaining", currency(event?.metrics?.remaining)],
    ],
    columnStyles: {
      0: { fontStyle: "bold" },
      1: moneyCellStyle,
    },
  });

  y = ensureSpace(doc, doc.lastAutoTable.finalY + 18, 220);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Financial Graphs", 40, y);

  const chartImage = buildCharts(event);
  if (chartImage) {
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(40, y + 10, pageWidth - 80, 186, 6, 6);
    doc.addImage(chartImage, "PNG", 46, y + 16, pageWidth - 92, 174);
    y = y + 206;
  } else {
    y = y + 16;
  }

  y = ensureSpace(doc, y + 12, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Funding Sources", 40, y);

  autoTable(doc, {
    startY: y + 8,
    theme: "grid",
    head: [["Source", "Current Amount", "Created At"]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
    body: (event.fundingSources || []).map((source) => [
      source.name || "-",
      currency(source.amount),
      dateTime(source.createdAt),
    ]),
    columnStyles: { 1: moneyCellStyle },
  });

  y = ensureSpace(doc, doc.lastAutoTable.finalY + 16, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Funding Activity", 40, y);

  let fundingActivityY = y + 8;
  const fundingSources = event.fundingSources || [];

  if (fundingSources.length === 0) {
    autoTable(doc, {
      startY: fundingActivityY,
      theme: "striped",
      head: [["Type", "Delta", "Resulting Amount", "Timestamp"]],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255] },
      body: [["-", "-", "-", "No activity"]],
      columnStyles: { 1: moneyCellStyle, 2: moneyCellStyle },
    });
  } else {
    fundingSources.forEach((source) => {
      fundingActivityY = ensureSpace(doc, fundingActivityY + 18, 130);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(`Source: ${source.name || "-"}`, 40, fundingActivityY);

      const sourceActivityRows = (source.appendEntries || []).map((entry) => [
        String(entry.action || "APPEND"),
        `${Number(entry.amount || 0) >= 0 ? "+" : "-"} ${currency(Math.abs(Number(entry.amount || 0)))}`,
        entry.newAmount == null ? "-" : currency(entry.newAmount),
        dateTime(entry.createdAt),
      ]);

      autoTable(doc, {
        startY: fundingActivityY + 6,
        theme: "striped",
        head: [["Type", "Delta", "Resulting Amount", "Timestamp"]],
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255] },
        body:
          sourceActivityRows.length > 0
            ? sourceActivityRows
            : [["-", "-", "-", "No activity"]],
        columnStyles: { 1: moneyCellStyle, 2: moneyCellStyle },
      });

      fundingActivityY = doc.lastAutoTable.finalY + 6;
    });
  }

  y = ensureSpace(doc, doc.lastAutoTable.finalY + 16, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Category Allocation", 40, y);

  autoTable(doc, {
    startY: y + 8,
    theme: "grid",
    head: [["Category", "Allocated", "Paid", "Pending", "Created At"]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255] },
    body: (event.categories || []).map((category) => {
      const allocated = Number(category.allocated || 0);
      const paid = Number(category.paid || 0);
      const pending = allocated - paid;

      return [
        category.name || "-",
        currency(allocated),
        currency(paid),
        currency(pending),
        dateTime(category.createdAt),
      ];
    }),
    columnStyles: { 1: moneyCellStyle, 2: moneyCellStyle, 3: moneyCellStyle },
  });

  const categoryPaidHistory = (event.categories || []).flatMap((category) =>
    (category.paidEntries || []).map((entry) => [
      category.name || "-",
      String(entry.action || "APPEND"),
      `${Number(entry.amount || 0) >= 0 ? "+" : "-"} ${currency(Math.abs(Number(entry.amount || 0)))}`,
      entry.newPaid == null ? "-" : currency(entry.newPaid),
      dateTime(entry.createdAt),
    ]),
  );

  y = ensureSpace(doc, doc.lastAutoTable.finalY + 16, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Category Paid Entries", 40, y);

  autoTable(doc, {
    startY: y + 8,
    theme: "striped",
    head: [["Category", "Type", "Paid Delta", "Resulting Paid", "Timestamp"]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
    body:
      categoryPaidHistory.length > 0
        ? categoryPaidHistory
        : [["-", "-", "-", "-", "No paid entries"]],
    columnStyles: { 2: moneyCellStyle, 3: moneyCellStyle },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "This statement is system-generated for internal budget monitoring and reconciliation.",
    40,
    pageHeight - 26,
  );

  const safeName = String(event.name || "event").replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safeName}_financial_statement.pdf`);
};
