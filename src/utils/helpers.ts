import * as XLSX from 'xlsx';
import { Letter, User } from '../types';

/**
 * Generate Auto Original No in standard format: KPN/DS/YYYY/MM/NNN
 */
export const generateOriginalNo = (dateStr: string, existingLetters: Letter[]): string => {
  const dateObj = dateStr ? new Date(dateStr) : new Date();
  const year = dateObj.getFullYear() || new Date().getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');

  // Filter letters with this year/month
  const prefix = `KPN/DS/${year}/${month}/`;
  const matching = existingLetters.filter(
    (l) => l.originalNo && l.originalNo.startsWith(prefix)
  );

  const nextSeq = matching.length + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
};

/**
 * Compress an image file or canvas to approximately ~240 KB target
 */
export const compressImageToTarget = async (
  source: HTMLCanvasElement | File,
  targetKb = 240
): Promise<{ dataUrl: string; sizeKb: number }> => {
  let canvas: HTMLCanvasElement;

  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    // It's a File
    canvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      img.onload = () => {
        const c = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1400;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(c);
        } else {
          reject(new Error('Canvas context error'));
        }
      };
      reader.readAsDataURL(source);
    });
  }

  // Iteratively adjust JPEG quality to fit under targetKb
  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

  while (sizeKb > targetKb && quality > 0.2) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
  }

  return { dataUrl, sizeKb };
};

/**
 * Export letters to genuine Excel (.xlsx) file with full requested columns
 */
export const exportLettersToExcel = (
  letters: Letter[],
  usersMap: Map<string, User>,
  fileNamePrefix = 'Letters_Register'
) => {
  const rows = letters.map((l, index) => {
    const forwardedNames = (l.forwardedTo || [])
      .map((uid) => usersMap.get(uid)?.Name || uid)
      .join(', ');

    return {
      'S.No': index + 1,
      'Original No': l.originalNo,
      'Registered Date': l.date,
      'Dispatched Date': l.dispatchedDate || l.date,
      'Post Type': l.letterType || 'Registered Post',
      'Registered Post No': l.registeredPostNo || '-',
      'Inward No': l.inwardNo,
      'From Whom': l.fromWhom,
      'Subject': l.subject,
      'Primary Division': l.division || '-',
      'Forwarded Divisions': (l.forwardedDivisions || []).join(', ') || '-',
      'Forwarded To (Officers)': forwardedNames || '-',
      'Action Status': l.action,
      'Reply / Notes': l.replyResponse || '-',
      'Registered By': l.registeredByName || l.registeredBy,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const columnWidths = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Original No
    { wch: 14 }, // Registered Date
    { wch: 14 }, // Dispatched Date
    { wch: 16 }, // Post Type
    { wch: 18 }, // Registered Post No
    { wch: 16 }, // Inward No
    { wch: 28 }, // From Whom
    { wch: 45 }, // Subject
    { wch: 22 }, // Division
    { wch: 25 }, // Forwarded Divisions
    { wch: 30 }, // Forwarded To
    { wch: 18 }, // Action Status
    { wch: 30 }, // Reply / Notes
    { wch: 24 }, // Registered By
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mail Register');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${todayStr}.xlsx`);
};

/**
 * Export letters to CSV file
 */
export const exportLettersToCsv = (
  letters: Letter[],
  usersMap: Map<string, User>,
  fileNamePrefix = 'Letters'
) => {
  const headers = [
    'OriginalNo',
    'DispatchedDate',
    'PostType',
    'RegisteredPostNo',
    'InwardNo',
    'FromWhom',
    'Subject',
    'Division',
    'ForwardedTo',
    'ActionStatus',
    'Reply',
  ];

  const csvRows: string[] = [headers.join(',')];

  letters.forEach((l) => {
    const forwardedNames = (l.forwardedTo || [])
      .map((uid) => usersMap.get(uid)?.Name || uid)
      .join('; ');

    const clean = (val: string | undefined | null) =>
      `"${String(val ?? '').replace(/"/g, '""')}"`;

    csvRows.push(
      [
        clean(l.originalNo),
        clean(l.dispatchedDate || l.date),
        clean(l.letterType || 'Registered Post'),
        clean(l.registeredPostNo || '-'),
        clean(l.inwardNo),
        clean(l.fromWhom),
        clean(l.subject),
        clean(l.division || '-'),
        clean(forwardedNames),
        clean(l.action),
        clean(l.replyResponse || ''),
      ].join(',')
    );
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Print Landscape Report with exact requested 10pt (10px) font size
 * Columns requested by user:
 * 1. # (Serial No)
 * 2. OriginalNo (கணினி இலக்கம்)
 * 3. DispatchedDate (அனுப்பிய திகதி)
 * 4. Post Type & RegisteredPostNo (இரண்டும் ஒரே பெட்டியில்)
 * 5. InwardNo (கடித இலக்கம்)
 * 6. FromWhom (அனுப்புனர்)
 * 7. Subject (விடயம்)
 * 8. ForwardedDivisions & ForwardedTo (இரண்டும் ஒரே பெட்டியில்)
 * 9. Sign (ஒப்பம்)
 */
export const printLandscapeReport = (
  title: string,
  letters: Letter[],
  usersMap: Map<string, User>
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to view and print the report.');
    return;
  }

  const rowsHtml = letters
    .map((l, index) => {
      const forwardedNames = (l.forwardedTo || [])
        .map((uid) => usersMap.get(uid)?.Name || uid)
        .join(', ');

      const divisionsList = (
        l.forwardedDivisions && l.forwardedDivisions.length > 0
          ? l.forwardedDivisions
          : [l.division]
      ).filter(Boolean);

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td style="font-weight: 700; font-family: monospace; white-space: nowrap; color: #0f172a;">${l.originalNo || '-'}</td>
          <td style="white-space: nowrap; text-align: center;">${l.dispatchedDate || l.date || '-'}</td>
          <td>
            <div style="font-weight: bold; color: #0f172a;">${l.letterType || 'Registered Post'}</div>
            ${
              l.registeredPostNo && l.registeredPostNo !== '-' && l.registeredPostNo !== '_'
                ? `<div style="font-size: 8.5pt; font-family: monospace; color: #1e3a8a; margin-top: 2px;">Reg No: ${l.registeredPostNo}</div>`
                : ''
            }
          </td>
          <td style="font-weight: 600; font-family: monospace; color: #0f172a;">${l.inwardNo || '-'}</td>
          <td>${l.fromWhom || '-'}</td>
          <td>
            <div>${l.subject || '-'}</div>
            ${l.fileNo ? `<div style="margin-top: 3px; font-size: 8.5pt; color: #065f46; font-weight: bold; font-family: monospace;">📁 File: ${l.fileNo}</div>` : ''}
          </td>
          <td>
            <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">🏢 ${divisionsList.join(', ') || l.division || '-'}</div>
            <div style="font-size: 8.5pt; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 2px; margin-top: 2px;">👤 ${forwardedNames || '—'}</div>
          </td>
          <td style="min-width: 65px; height: 32px; border-bottom: 1px dashed #94a3b8; text-align: center; vertical-align: bottom;"></td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - DS Office Mail Management</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 8mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt; /* Requested font size 10pt */
            color: #111;
            margin: 0;
            padding: 8px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .header h1 {
            font-size: 13pt;
            font-weight: bold;
            margin: 0;
            color: #0f172a;
          }
          .header h2 {
            font-size: 10.5pt;
            margin: 2px 0 0 0;
            color: #1e3a8a;
          }
          .meta {
            font-size: 9pt;
            color: #475569;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt; /* 10pt font size as requested */
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #64748b;
            padding: 5px 6px;
            vertical-align: top;
            word-wrap: break-word;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #0f172a;
            text-align: left;
            font-size: 9.5pt;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            color: #475569;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
          }
          .sign-area {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            font-size: 9.5pt;
          }
          .sign-box {
            text-align: center;
            width: 200px;
            border-top: 1px dashed #334155;
            padding-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="/vaharai_ds_logo_1789105296870.jpg" alt="Logo" style="width:48px; height:48px; border-radius:50%; object-fit:contain; border:1.5px solid #d97706;" onerror="this.style.display='none'" />
            <div>
              <h1>Divisional Secretariat - Koralaipattu North, Vaharai</h1>
              <h2>Postal Mail Registration & Dispatch Log (அஞ்சல் பதிவு & நடவடிக்கை அறிக்கை)</h2>
              <div class="meta">
                <strong>Report:</strong> ${title} &nbsp;|&nbsp; 
                <strong>Total Records:</strong> ${letters.length} &nbsp;|&nbsp; 
                <strong>Printed On:</strong> ${new Date().toLocaleString()}
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 9pt;">
            <span style="display:inline-block; border:1px solid #1e3a8a; border-radius:4px; padding:3px 8px; font-weight:bold; color:#1e3a8a;">
              OFFICIAL RECORD
            </span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 26px; text-align: center;">#</th>
              <th style="width: 140px;">Original No<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(கணினி இலக்கம்)</span></th>
              <th style="width: 80px; text-align: center;">Dispatched Date<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(அனுப்பிய திகதி)</span></th>
              <th style="width: 110px;">Post Type & Reg. Post No<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(தபால் வகை / பதிவு எண்)</span></th>
              <th style="width: 115px;">Inward No<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(கடித இலக்கம்)</span></th>
              <th style="width: 145px;">From Whom<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(அனுப்புனர்)</span></th>
              <th style="width: 215px;">Subject<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(விடயம்)</span></th>
              <th style="width: 180px;">Forwarded Divisions & Officers<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(பிரிவுகள் & உத்தியோகத்தர்கள்)</span></th>
              <th style="width: 65px; text-align: center;">Sign<br/><span style="font-size: 8pt; font-weight: normal; color: #475569;">(ஒப்பம்)</span></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sign-area">
          <div class="sign-box">
            Prepared By (Mail Officer)
          </div>
          <div class="sign-box">
            Subject Officer / Section Head
          </div>
          <div class="sign-box">
            Divisional Secretary / Assistant DS
          </div>
        </div>

        <div class="footer">
          <span>Koralaipattu North Vaharai DS Office &copy; ${new Date().getFullYear()}</span>
          <span>Official Register Log (A4 Landscape - Font 10pt)</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * WhatsApp share generator
 */
export const shareViaWhatsApp = (letter: Letter, usersMap: Map<string, User>) => {
  const forwardedNames = (letter.forwardedTo || [])
    .map((uid) => usersMap.get(uid)?.Name || uid)
    .join(', ');

  const text = `📬 *DS Office Mail Record*
*Original No:* ${letter.originalNo}
*Date:* ${letter.date}
*Dispatched Date:* ${letter.dispatchedDate || letter.date}
*Post Type:* ${letter.letterType} (${letter.registeredPostNo || '-'})
*Inward No:* ${letter.inwardNo}
*From Whom:* ${letter.fromWhom}
*Subject:* ${letter.subject}
*Division:* ${letter.division || 'General'}
*Forwarded To:* ${forwardedNames || 'N/A'}
*Status:* ${letter.action}
${letter.fileNo ? `*Filed File No:* ${letter.fileNo}\n` : ''}${letter.replyResponse ? `*Reply:* ${letter.replyResponse}` : ''}
--
_Koralaipattu North Vaharai DS Office_`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

/**
 * Email share generator
 */
export const shareViaEmail = (letter: Letter, usersMap: Map<string, User>) => {
  const forwardedNames = (letter.forwardedTo || [])
    .map((uid) => usersMap.get(uid)?.Name || uid)
    .join(', ');

  const subject = encodeURIComponent(`DS Office Mail: ${letter.originalNo} - ${letter.subject}`);
  const body = encodeURIComponent(`Dear Officer,

Please review the postal mail details below:

Original No: ${letter.originalNo}
Date Registered: ${letter.date}
Dispatched Date: ${letter.dispatchedDate || letter.date}
Post Type: ${letter.letterType}
Registered Post No: ${letter.registeredPostNo || '-'}
Inward No: ${letter.inwardNo}
From Whom: ${letter.fromWhom}
Subject: ${letter.subject}
Primary Division: ${letter.division || 'General'}
Forwarded To: ${forwardedNames || 'N/A'}
Status: ${letter.action}
Reply/Action Note: ${letter.replyResponse || 'Pending'}

Regards,
Mail Management System
Koralaipattu North Vaharai DS Office`);

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

/**
 * Download attached photo or document
 */
export const downloadLetterAttachment = (dataUrl: string, fileName: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * Backup full database to JSON
 */
export const downloadDataBackupJson = (letters: Letter[], users: User[]) => {
  const data = {
    exportDate: new Date().toISOString(),
    system: 'Koralaipattu North Vaharai DS Office Mail System',
    users,
    letters,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Vaharai_DS_Mail_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
