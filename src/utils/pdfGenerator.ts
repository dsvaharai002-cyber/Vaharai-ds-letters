import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Letter, LetterAction, User } from '../types';

export function downloadActionLettersPdf(
  actionType: LetterAction,
  letters: Letter[],
  usersMap: Map<string, User>
) {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFontSize(16);
    doc.text('Koralaipattu North Vaharai Divisional Secretariat', 14, 15);
    doc.setFontSize(12);
    doc.text(`Action Status Report: ${actionType}`, 14, 23);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Letters: ${letters.length}`, 14, 29);

    const tableData = letters.map((l, index) => {
      const forwarded = l.forwardedTo
        .map(u => usersMap.get(u)?.Name || u)
        .join(', ');

      return [
        (index + 1).toString(),
        l.originalNo || '',
        l.date || '',
        l.inwardNo || '',
        l.fromWhom || '',
        l.subject || '',
        forwarded || '-',
        l.replyResponse || '',
        '', // Empty signature column
      ];
    });

    autoTable(doc, {
      startY: 33,
      head: [
        [
          '#',
          'Original No',
          'Date',
          'Inward No',
          'From Whom',
          'Subject',
          'Forwarded To',
          'Reply / Response',
          'Signature',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 71, 161], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
        5: { cellWidth: 55 },
        6: { cellWidth: 40 },
        7: { cellWidth: 35 },
        8: { cellWidth: 20 }, // Blank signature
      },
    });

    const cleanName = actionType.replace(/\s+/g, '_');
    doc.save(`Vaharai_Letters_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('PDF generation error, falling back to print window:', err);
    // Fallback printable window
    openPrintWindowForAction(actionType, letters, usersMap);
  }
}

export function openPrintWindowForAction(
  actionType: LetterAction,
  letters: Letter[],
  usersMap: Map<string, User>
) {
  const printWindow = window.open('', '', 'width=1100,height=750');
  if (!printWindow) return;

  const rows = letters.map((l, i) => {
    const fNames = l.forwardedTo.map(u => usersMap.get(u)?.Name || u).join(', ');
    return `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td><b>${l.originalNo}</b></td>
        <td>${l.date}</td>
        <td><b>${l.inwardNo}</b></td>
        <td>${l.fromWhom}</td>
        <td>${l.subject}</td>
        <td>${fNames || '-'}</td>
        <td>${l.replyResponse || '-'}</td>
        <td style="width: 120px; border: 1px solid #333;"></td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${actionType} - கடிதங்களின் அறிக்கை</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: sans-serif; padding: 10px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #555; padding: 6px; text-align: left; }
        th { background: #f0f0f0; }
        .header { text-align: center; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம்</h2>
        <h3>கடிதங்களின் நிலை அறிக்கை: ${actionType}</h3>
        <p>மொத்த கடிதங்கள்: ${letters.length} | திகதி: ${new Date().toLocaleDateString('ta-LK')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Original No</th>
            <th>Date</th>
            <th>Inward No</th>
            <th>From Whom</th>
            <th>Subject</th>
            <th>Forwarded To</th>
            <th>Reply & Response</th>
            <th>கையொப்பம் (Signature)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <script>
        setTimeout(() => { window.print(); }, 400);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function downloadDateLettersPdf(
  dateStr: string,
  letters: Letter[],
  usersMap: Map<string, User>
) {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFontSize(16);
    doc.text('Koralaipattu North Vaharai Divisional Secretariat', 14, 15);
    doc.setFontSize(12);
    doc.text(`Daily Mail Registry - Date: ${dateStr}`, 14, 23);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString()} | Total Letters: ${letters.length}`, 14, 29);

    const tableData = letters.map((l, index) => {
      const forwarded = l.forwardedTo
        .map((u) => usersMap.get(u)?.Name || u)
        .join(', ');

      return [
        (index + 1).toString(),
        l.originalNo || '',
        l.date || '',
        l.inwardNo || '',
        l.fromWhom || '',
        l.subject || '',
        forwarded || '-',
        '', // Empty signature column
      ];
    });

    autoTable(doc, {
      startY: 33,
      head: [
        [
          '#',
          'Original No',
          'Date',
          'Inward No',
          'From Whom',
          'Subject',
          'Forwarded To',
          'Signature',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 71, 161], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 24 },
        3: { cellWidth: 28 },
        4: { cellWidth: 40 },
        5: { cellWidth: 65 },
        6: { cellWidth: 45 },
        7: { cellWidth: 25 },
      },
    });

    doc.save(`Vaharai_Letters_${dateStr}.pdf`);
  } catch (err) {
    console.error('Date PDF error:', err);
  }
}
