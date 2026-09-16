import { Letter, User } from '../types';

export function generateOriginalNo(dateStr: string, existingLetters: Letter[]): string {
  const cleanDate = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '');
  const prefix = `KPN-VHR-${cleanDate}`;
  const todaysLetters = existingLetters.filter(l => l.originalNo && l.originalNo.startsWith(prefix));
  const nextNum = todaysLetters.length + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

export function compressImageToTarget(
  source: HTMLCanvasElement | Blob | File,
  targetKb: number = 124
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement) => {
      let width = img.width;
      let height = img.height;

      // Max dimensions to constrain unneeded memory
      const maxDim = 1200;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Binary search quality to approach targetKb (~124KB)
      let minQ = 0.1;
      let maxQ = 0.95;
      let bestDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      let bestSizeKb = Math.round((bestDataUrl.length * 3) / 4 / 1024);

      for (let i = 0; i < 6; i++) {
        const midQ = (minQ + maxQ) / 2;
        const currentDataUrl = canvas.toDataURL('image/jpeg', midQ);
        const currentSizeKb = Math.round((currentDataUrl.length * 3) / 4 / 1024);

        if (Math.abs(currentSizeKb - targetKb) < Math.abs(bestSizeKb - targetKb)) {
          bestDataUrl = currentDataUrl;
          bestSizeKb = currentSizeKb;
        }

        if (currentSizeKb > targetKb) {
          maxQ = midQ;
        } else {
          minQ = midQ;
        }
      }

      resolve({ dataUrl: bestDataUrl, sizeKb: bestSizeKb });
    };

    if (source instanceof HTMLCanvasElement) {
      const img = new Image();
      img.onload = () => processImage(img);
      img.onerror = reject;
      img.src = source.toDataURL('image/jpeg', 0.9);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    }
  });
}

export function shareViaWhatsApp(letter: Letter, usersMap: Map<string, User>) {
  const forwardedNames = letter.forwardedTo
    .map(uid => usersMap.get(uid)?.Name || uid)
    .join(', ');

  const text = 
`📌 *கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம்*
*கடித மேலாண்மை அறிவித்தல்*
---------------------------------------
🔹 *Original No:* ${letter.originalNo}
🔹 *திகதி (Date):* ${letter.date}
🔹 *Inward No:* ${letter.inwardNo}
🔹 *அனுப்புநர் (From):* ${letter.fromWhom}
🔹 *விடயம் (Subject):* ${letter.subject}
🔹 *அனுப்பப்பட்டது (Forwarded to):* ${forwardedNames || 'குறிப்பிடப்படவில்லை'}
🔹 *நடவடிக்கை நிலை (Action):* ${letter.action}
---------------------------------------`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function shareViaEmail(letter: Letter, usersMap: Map<string, User>) {
  const forwardedNames = letter.forwardedTo
    .map(uid => usersMap.get(uid)?.Name || uid)
    .join(', ');

  const subject = `[கடித விபரம் - ${letter.originalNo}] ${letter.subject}`;
  const body = 
`கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலக கடித மேலாண்மை அமைப்பு

Original No: ${letter.originalNo}
Date: ${letter.date}
Inward No: ${letter.inwardNo}
From: ${letter.fromWhom}
Subject: ${letter.subject}
Forwarded To: ${forwardedNames}
Action: ${letter.action}
Reply & Response: ${letter.replyResponse || 'இல்லை'}
Registered By: ${letter.registeredByName}

----------------------------------------
இச்செய்தி கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலக கடித மேலாண்மை அமைப்பிலிருந்து உருவாக்கப்பட்டது.`;

  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank');
}

export function printLandscapeDateReport(dateStr: string, letters: Letter[], usersMap: Map<string, User>) {
  const printWindow = window.open('', '', 'width=1100,height=750');
  if (!printWindow) {
    alert('பாப்அப் விண்டோ தடுக்கப்பட்டுள்ளது. தயவுசெய்து Popups ஐ அனுமதிக்கவும்.');
    return;
  }

  const rowsHtml = letters.map((ltr, idx) => {
    const forwardedNames = ltr.forwardedTo
      .map(id => usersMap.get(id)?.Name || id)
      .join(', ');

    return `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="font-weight: bold; color: #0d47a1;">${ltr.originalNo}</td>
        <td>${ltr.date}</td>
        <td style="font-weight: bold;">${ltr.inwardNo}</td>
        <td>${ltr.fromWhom}</td>
        <td style="font-size: 13px;">${ltr.subject}</td>
        <td style="font-size: 12px;">${forwardedNames || '-'}</td>
        <td style="width: 140px; height: 48px; border: 1px solid #333;"></td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ta">
    <head>
      <meta charset="UTF-8">
      <title>கடிதப் பதிவு அறிக்கை - ${dateStr}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm 10mm 12mm 10mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Tamil', Arial, sans-serif;
          margin: 0;
          padding: 10px;
          color: #111;
          font-size: 13px;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px double #333;
          padding-bottom: 8px;
        }
        .header h2 {
          margin: 0 0 4px 0;
          font-size: 20px;
          color: #0d47a1;
        }
        .header h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          color: #374151;
        }
        .header p {
          margin: 0;
          font-size: 12px;
          color: #4b5563;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #4b5563;
          padding: 8px 6px;
          vertical-align: middle;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
          font-size: 12px;
          color: #111827;
        }
        .footer {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          font-size: 12px;
        }
        .sig-block {
          text-align: center;
          width: 200px;
          border-top: 1px dashed #333;
          padding-top: 6px;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 12px; background: #e0f2fe; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span>🖨️ A4 பக்கவாட்டில் (Landscape) அச்சிடத் தயாராக உள்ளது.</span>
        <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
          அச்சிடுக (Print)
        </button>
      </div>

      <div class="header" style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 14px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">
        <img src="${window.location.origin}/vaharai_logo.jpg" alt="வாகரை பிரதேச செயலக முத்திரை" style="height: 68px; width: 68px; object-fit: contain; border-radius: 50%;" />
        <div style="text-align: center;">
          <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #1e3a8a;">கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம்</h2>
          <h3 style="margin: 2px 0; font-size: 12px; font-weight: 600; color: #374151;">DIVISIONAL SECRETARIAT - KORALAIPATTU NORTH, VAKARAI</h3>
          <h4 style="margin: 3px 0; font-size: 13px; font-weight: 700; color: #111827;">கடித முகாமைத்துவ நாளாந்தப் பதிவு அறிக்கை (Daily Mail Registry)</h4>
          <p style="margin: 2px 0; font-size: 10.5px; color: #4b5563;"><b>திகதி:</b> ${dateStr} &nbsp;|&nbsp; <b>மொத்த கடிதங்கள்:</b> ${letters.length} &nbsp;|&nbsp; <b>அறிக்கை பெறப்பட்ட நேரம்:</b> ${new Date().toLocaleString('ta-LK')}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">இல</th>
            <th style="width: 130px;">Original No</th>
            <th style="width: 80px;">Date</th>
            <th style="width: 90px;">Inward No</th>
            <th style="width: 150px;">From whom</th>
            <th>SUBJECT (விடயம்)</th>
            <th style="width: 160px;">Forwarded to</th>
            <th style="width: 120px; text-align: center;">கையொப்பம் (Signature)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div class="sig-block">
          தயாரித்தவர்: கடிதப் பதிவாளர்
        </div>
        <div class="sig-block">
          சரிபார்த்தவர்: நிர்வாக உத்தியோகத்தர்
        </div>
        <div class="sig-block">
          பிரதேச செயலாளர்
        </div>
      </div>

      <script>
        window.onload = function() {
          // auto focus
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function downloadLetterAttachment(dataUrl: string, filename: string = 'Letter_Document.jpg') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportLettersToExcel(letters: Letter[], usersMap: Map<string, User>, filenameSuffix: string = 'Report') {
  const rows = letters.map((l, i) => {
    const forwardedNames = l.forwardedTo.map(uid => usersMap.get(uid)?.Name || uid).join(', ');
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${l.originalNo}</td>
        <td>${l.date}</td>
        <td>${l.inwardNo}</td>
        <td>${l.fromWhom}</td>
        <td>${l.subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        <td>${forwardedNames}</td>
        <td>${l.action}</td>
        <td>${(l.replyResponse || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        <td>${l.registeredByName}</td>
        <td>${l.handledByMega ? 'ஆம் (Mega கையாளப்பட்டது)' : 'இல்லை'}</td>
        <td></td>
      </tr>
    `;
  }).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>கடிதங்கள்</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        th { background-color: #0d47a1; color: white; font-weight: bold; border: 1px solid #333; padding: 6px; }
        td { border: 1px solid #ccc; padding: 5px; }
      </style>
    </head>
    <body>
      <h2>கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம் - கடிதப் பட்டியல்</h2>
      <p>திகதி: ${new Date().toLocaleDateString('ta-LK')} | மொத்த கடிதங்கள்: ${letters.length}</p>
      <table>
        <thead>
          <tr>
            <th>இல</th>
            <th>Original No</th>
            <th>Date</th>
            <th>Inward No</th>
            <th>From Whom (அனுப்புநர்)</th>
            <th>SUBJECT (விடயம்)</th>
            <th>Forwarded To (அனுப்பப்பட்டது)</th>
            <th>Action (நிலை)</th>
            <th>Reply & Response (பதில்)</th>
            <th>Registered By (பதிவாளர்)</th>
            <th>Mega Handled</th>
            <th>கையொப்பம் (Signature)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // UTF-8 BOM for Excel Tamil font support
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Vaharai_Letters_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportLettersToCsv(letters: Letter[], usersMap: Map<string, User>, filenameSuffix: string = 'Report') {
  const headers = ['#', 'Original No', 'Date', 'Inward No', 'From Whom', 'Subject', 'Forwarded To', 'Action', 'Reply/Response', 'Registered By'];
  const rows = letters.map((l, i) => {
    const forwardedNames = l.forwardedTo.map(uid => usersMap.get(uid)?.Name || uid).join('; ');
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    return [
      i + 1,
      escapeCsv(l.originalNo),
      escapeCsv(l.date),
      escapeCsv(l.inwardNo),
      escapeCsv(l.fromWhom),
      escapeCsv(l.subject),
      escapeCsv(forwardedNames),
      escapeCsv(l.action),
      escapeCsv(l.replyResponse || ''),
      escapeCsv(l.registeredByName),
    ].join(',');
  });

  const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Vaharai_Letters_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDataBackupJson(letters: Letter[], users: User[]) {
  const backup = {
    exportedAt: new Date().toISOString(),
    system: 'Koralaipattu North Vaharai Divisional Secretariat Letter Management',
    lettersCount: letters.length,
    usersCount: users.length,
    users: users.map(u => ({ ...u, Password: '***' })), // secure export
    letters: letters,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Vaharai_Letter_Management_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
