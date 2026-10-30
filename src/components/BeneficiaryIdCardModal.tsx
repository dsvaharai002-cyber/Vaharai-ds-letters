import React, { useEffect, useRef, useState } from 'react';
import { Beneficiary, GNDivision } from '../types';
import { renderBarcodeSvg, generateQrDataUrl } from '../utils/barcode';
import { translations, Language } from '../translations/i18n';

interface BeneficiaryIdCardModalProps {
  beneficiary: Beneficiary;
  division?: GNDivision;
  lang: Language;
  onClose: () => void;
}

export const BeneficiaryIdCardModal: React.FC<BeneficiaryIdCardModalProps> = ({
  beneficiary,
  division,
  lang,
  onClose,
}) => {
  const t = translations[lang];
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    if (barcodeRef.current && beneficiary.barcode) {
      renderBarcodeSvg(barcodeRef.current, beneficiary.barcode, {
        height: 48,
        displayValue: true,
        fontSize: 11,
      });
    }

    const famCode = beneficiary.familyCode || (beneficiary.householdNo ? `FAM-${beneficiary.householdNo.replace(/^HH-/, '')}` : `FAM-${beneficiary.divisionCode}-001`);
    const payload = beneficiary.familyQrPayload || `VHR-FAMILY|FAM:${famCode}|DIV:${beneficiary.divisionCode}|MEMBERS_LINKED`;
    generateQrDataUrl(payload).then((url) => {
      setQrSrc(url);
    });
  }, [beneficiary]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t.viewIdCard}
            </h3>
            <p className="text-xs text-slate-500">
              {beneficiary.nameTa} / {beneficiary.nameEn}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Printable Official ID Card */}
        <div id="printable-id-card" className="my-5 p-5 bg-gradient-to-br from-emerald-50 via-white to-slate-50 border-2 border-emerald-800 rounded-xl shadow-sm text-slate-800 relative overflow-hidden">
          {/* Subtle Security Micro-print line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-700 via-yellow-600 to-emerald-700"></div>

          {/* Card Header */}
          <div className="text-center pb-3 border-b border-emerald-700/30">
            <div className="text-[10px] tracking-wider font-semibold text-emerald-900 uppercase">
              Democratic Socialist Republic of Sri Lanka · இலங்கை சோசலிசக் குடியரசு
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம்
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Divisional Secretariat - Koralaipattu North, Vaharai
            </div>
            <div className="text-[10px] font-medium text-emerald-800 mt-0.5">
              பிரஜைகள் பதிவு & நலன்புரி அடையாள அட்டை / Citizen Beneficiary Card
            </div>
          </div>

          {/* Card Body */}
          <div className="grid grid-cols-3 gap-3 my-4 items-center">
            {/* Left: Avatar & QR */}
            <div className="col-span-1 flex flex-col items-center justify-center text-center border-r border-slate-200 pr-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-700 flex items-center justify-center text-emerald-800 text-xl font-bold shadow-inner">
                {beneficiary.gender === 'FEMALE' ? '👩' : '👨'}
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                {beneficiary.id}
              </span>
              {qrSrc && (
                <img
                  src={qrSrc}
                  alt="QR Code"
                  className="w-16 h-16 mt-2 border border-slate-300 p-0.5 rounded bg-white"
                />
              )}
            </div>

            {/* Right: Citizen Details */}
            <div className="col-span-2 text-xs space-y-1.5 pl-1">
              <div>
                <span className="text-[10px] text-slate-500 block">முழுப் பெயர் / Full Name:</span>
                <span className="font-bold text-slate-900 text-sm block leading-tight">{beneficiary.nameTa}</span>
                <span className="text-xs text-slate-700 font-medium block">{beneficiary.nameEn}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-500 block">NIC எண்:</span>
                  <span className="font-mono font-bold text-emerald-900 text-xs">{beneficiary.nic}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">பிறந்த திகதி / DOB:</span>
                  <span className="font-mono text-slate-700">{beneficiary.dob}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-500 block">GN பிரிவு:</span>
                  <span className="font-medium text-slate-800 text-[11px]">
                    {beneficiary.divisionCode} - {division?.nameTa || beneficiary.divisionCode}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">குடும்ப குறியீடு (Family Code):</span>
                  <span className="font-mono font-bold text-purple-900 text-[11px]">
                    {beneficiary.familyCode || beneficiary.householdNo}
                  </span>
                </div>
              </div>

              {/* Specialized Category Badges */}
              <div className="pt-1 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                {beneficiary.isPregnantMother && (
                  <span className="bg-pink-100 text-pink-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                    🤰 கர்ப்பிணித் தாய் ({beneficiary.pregnancyStageMonths || 6}வது மாதம்)
                  </span>
                )}
                {beneficiary.isPersonWithDisability && (
                  <span className="bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                    ♿ மாற்றுத்திறனாளி
                  </span>
                )}
                {beneficiary.isWomanHeadedHousehold && (
                  <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                    👩‍👧 பெண் தலைமைத்துவம்
                  </span>
                )}
                {beneficiary.isSamurdhiBeneficiary && (
                  <span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                    🌾 சமுர்த்தி பயனாளி
                  </span>
                )}
              </div>

              <div className="pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 block">நலன்புரி திட்டம் / Scheme:</span>
                <span className="inline-block bg-emerald-100 text-emerald-900 font-semibold px-2 py-0.5 rounded text-[10px] mt-0.5">
                  {beneficiary.welfareScheme}
                </span>
              </div>
            </div>
          </div>

          {/* Barcode Strip */}
          <div className="mt-3 pt-3 border-t border-emerald-700/30 flex flex-col items-center justify-center bg-white/70 py-2 rounded-lg">
            <svg ref={barcodeRef} className="max-w-[260px] h-[48px]"></svg>
          </div>

          {/* Card Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 text-[9px] text-slate-500 border-t border-slate-200">
            <div>
              <span>அலுவலக முத்திரை:</span>
              <div className="w-14 h-6 border border-dashed border-slate-300 rounded mt-0.5"></div>
            </div>
            <div className="text-right">
              <span>பிரதேச செயலாளர் / Official Sign</span>
              <div className="font-serif italic text-slate-700 mt-1">DS Koralaipattu North</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-4 no-print">
          <button
            onClick={handlePrint}
            className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>🖨️ {t.printIdCard}</span>
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
