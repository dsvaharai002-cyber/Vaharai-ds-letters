import React, { useState, useMemo } from 'react';
import {
  LandRecord,
  LandType,
  LandPermitStatus,
  GNDivision,
  User,
} from '../types';
import { Language, translations } from '../translations/i18n';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Printer,
  Compass,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  QrCode,
  Download,
  Upload,
} from 'lucide-react';
import { generateQrDataUrl } from '../utils/barcode';
import { clearAllLandRecordsPermanently, recordDeletedId, saveLandRecords } from '../services/storage';

interface LandManagementViewProps {
  landRecords: LandRecord[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateLandRecords: (items: LandRecord[]) => void;
  onAuditLog: (action: string, details: string) => void;
  onNavigateToCsv?: () => void;
}

export const LandManagementView: React.FC<LandManagementViewProps> = ({
  landRecords,
  divisions,
  currentUser,
  lang,
  onUpdateLandRecords,
  onAuditLog,
  onNavigateToCsv,
}) => {
  const t = translations[lang];

  // Role permissions
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isLandOfficer = currentUser.role === 'LAND_OFFICER';
  const canEdit = isSuperAdmin || isLandOfficer || currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination State (Requirement 03)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [editingRecord, setEditingRecord] = useState<LandRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<LandRecord | null>(null);
  const [viewingQrDataUrl, setViewingQrDataUrl] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<Partial<LandRecord>>({
    divisionCode: '211',
    landType: 'CROWN_PERMIT',
    permitStatus: 'PERMIT_ISSUED',
    extent: '0A-1R-00P',
    annualTaxStatus: 'PAID',
    boundaries: { north: '', south: '', east: '', west: '' },
  });

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return landRecords.filter((r) => {
      if (selectedDivision !== 'ALL' && r.divisionCode !== selectedDivision) return false;
      if (selectedType !== 'ALL' && r.landType !== selectedType) return false;
      if (selectedStatus !== 'ALL' && r.permitStatus !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPermit = r.permitNo?.toLowerCase().includes(q);
        const matchLot = r.lotNo?.toLowerCase().includes(q);
        const matchPlan = r.planNo?.toLowerCase().includes(q);
        const matchNic = r.ownerNic?.toLowerCase().includes(q);
        const matchNameTa = r.ownerNameTa?.toLowerCase().includes(q);
        const matchNameEn = r.ownerNameEn?.toLowerCase().includes(q);
        const matchFam = r.familyCode?.toLowerCase().includes(q);
        return matchPermit || matchLot || matchPlan || matchNic || matchNameTa || matchNameEn || matchFam;
      }
      return true;
    });
  }, [landRecords, selectedDivision, selectedType, selectedStatus, searchQuery]);

  // Paginated dataset
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    if (pageSize === 'ALL') return filteredRecords;
    const start = (effectivePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, effectivePage, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const total = landRecords.length;
    const granted = landRecords.filter((r) => r.permitStatus === 'PERMIT_ISSUED').length;
    const pending = landRecords.filter((r) => r.permitStatus === 'PENDING_APPROVAL').length;
    const disputes = landRecords.filter((r) => r.permitStatus === 'IN_DISPUTE').length;
    const taxDue = landRecords.filter((r) => r.annualTaxStatus === 'DUE').length;
    return { total, granted, pending, disputes, taxDue };
  }, [landRecords]);

  // Open Add Record
  const handleOpenAdd = () => {
    setIsNewRecord(true);
    const div = '211';
    const seq = String(landRecords.length + 1).padStart(3, '0');
    setFormData({
      id: `LND-${div}-${new Date().getFullYear()}-${seq}`,
      permitNo: `LDO/${div}/${new Date().getFullYear()}/${seq}`,
      lotNo: `${landRecords.length + 1}`,
      planNo: `BCO/VHR/${new Date().getFullYear()}/${seq}`,
      extent: '0A-1R-00P',
      landType: 'CROWN_PERMIT',
      divisionCode: div,
      ownerNic: '',
      ownerNameTa: '',
      ownerNameEn: '',
      ownerPhone: '',
      familyCode: `FAM-${div}-001`,
      permitStatus: 'PERMIT_ISSUED',
      issueDate: new Date().toISOString().slice(0, 10),
      annualTaxStatus: 'PAID',
      boundaries: {
        north: 'வீதி (Public Road)',
        south: '',
        east: '',
        west: '',
      },
      notes: '',
    });
    setEditingRecord({} as LandRecord);
  };

  // Open Edit Record
  const handleOpenEdit = (rec: LandRecord) => {
    setIsNewRecord(false);
    setFormData({
      ...rec,
      boundaries: rec.boundaries || { north: '', south: '', east: '', west: '' },
    });
    setEditingRecord(rec);
  };

  // Save Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.permitNo || !formData.ownerNic || !formData.ownerNameTa) {
      alert(lang === 'ta' ? 'தயவுசெய்து அனுமதி இலக்கம், உரிமையாளர் NIC மற்றும் பெயரை உள்ளிடவும்.' : 'Please enter Permit No, Owner NIC and Name.');
      return;
    }

    const divisionCode = formData.divisionCode || '211';
    const id = formData.id || `LND-${divisionCode}-${new Date().getFullYear()}-${String(landRecords.length + 1).padStart(3, '0')}`;

    const updatedItem: LandRecord = {
      id,
      permitNo: formData.permitNo.trim(),
      lotNo: formData.lotNo?.trim() || '1',
      planNo: formData.planNo?.trim() || `BCO/VHR/${new Date().getFullYear()}/001`,
      extent: formData.extent?.trim() || '0A-1R-00P',
      landType: (formData.landType as LandType) || 'CROWN_PERMIT',
      divisionCode,
      ownerNic: formData.ownerNic.trim(),
      ownerNameTa: formData.ownerNameTa.trim(),
      ownerNameEn: formData.ownerNameEn?.trim() || formData.ownerNameTa.trim(),
      ownerPhone: formData.ownerPhone?.trim() || '',
      familyCode: formData.familyCode?.trim().toUpperCase() || `FAM-${divisionCode}-001`,
      permitStatus: (formData.permitStatus as LandPermitStatus) || 'PERMIT_ISSUED',
      issueDate: formData.issueDate || new Date().toISOString().slice(0, 10),
      annualTaxStatus: formData.annualTaxStatus || 'PAID',
      boundaries: formData.boundaries || { north: '', south: '', east: '', west: '' },
      notes: formData.notes?.trim() || '',
      createdAt: isNewRecord ? new Date().toISOString() : formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: LandRecord[];
    if (isNewRecord) {
      updatedList = [updatedItem, ...landRecords];
      onAuditLog('CREATE_LAND_RECORD', `Registered land permit ${updatedItem.permitNo} for ${updatedItem.ownerNameTa} (${updatedItem.ownerNic})`);
    } else {
      updatedList = landRecords.map((r) => (r.id === updatedItem.id ? updatedItem : r));
      onAuditLog('UPDATE_LAND_RECORD', `Updated land permit ${updatedItem.permitNo}`);
    }

    onUpdateLandRecords(updatedList);
    setEditingRecord(null);
  };

  // Super Admin: Wipe all land records permanently
  const handleClearAllLandRecords = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து காணி விபரங்களையும் அழிக்க சுப்பர் அட்மின் அனுமதி தேவை.' : 'Super Admin permission required to wipe land records.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? 'எச்சரிக்கை: பதிவுசெய்யப்பட்ட அனைத்து காணி விபரங்களையும் நிரந்தரமாக அழிக்க விரும்புகிறீர்களா? இந்நடவடிக்கையை மீளப்பெற முடியாது.'
        : 'WARNING: Are you sure you want to permanently delete all land records?'
    );
    if (!confirmed) return;

    const code = window.prompt(
      lang === 'ta'
        ? 'நிரந்தரமாக அழிக்க "DELETE" அல்லது "அழி" என தட்டச்சு செய்க:'
        : 'Type "DELETE" to confirm permanent deletion:'
    );
    if (code !== 'DELETE' && code !== 'அழி') {
      alert(lang === 'ta' ? 'உறுதிப்படுத்தல் சொல் பொருந்தவில்லை. நடவடிக்கை ரத்து செய்யப்பட்டது.' : 'Confirmation text did not match. Aborted.');
      return;
    }

    landRecords.forEach((r) => recordDeletedId(r.id, r.ownerNic));
    clearAllLandRecordsPermanently();
    onUpdateLandRecords([]);
    onAuditLog('CLEAR_ALL_LAND_RECORDS', `Super Admin ${currentUser.name} wiped all land records.`);
    alert(lang === 'ta' ? 'அனைத்து காணி விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All land records have been wiped.');
  };

  // Delete Record
  const handleDeleteRecord = (rec: LandRecord) => {
    if (!canEdit) return;
    const confirmMsg = lang === 'ta'
      ? `காணி அனுமதிப்பத்திரம் ${rec.permitNo} (${rec.ownerNameTa}) நிச்சயமாக நிரந்தரமாக நீக்கப்பட வேண்டுமா?`
      : `Are you sure you want to permanently delete land permit ${rec.permitNo}?`;
    if (!window.confirm(confirmMsg)) return;

    recordDeletedId(rec.id, rec.ownerNic);
    const updated = landRecords.filter((r) => r.id !== rec.id);
    saveLandRecords(updated);
    onUpdateLandRecords(updated);
    onAuditLog('DELETE_LAND_RECORD', `Deleted land permit ${rec.permitNo} (${rec.ownerNic})`);
  };

  // Open View Dossier Modal
  const handleOpenView = async (rec: LandRecord) => {
    setViewingRecord(rec);
    try {
      const qrPayload = `VHR-LAND|PERMIT:${rec.permitNo}|LOT:${rec.lotNo}|NIC:${rec.ownerNic}|DIV:${rec.divisionCode}`;
      const url = await generateQrDataUrl(qrPayload);
      setViewingQrDataUrl(url);
    } catch {
      setViewingQrDataUrl('');
    }
  };

  // Print Dossier
  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl text-xl shadow-xs">🌾</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t.landTitle}
              </h2>
              <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded font-mono">
                {isLandOfficer ? 'காணி உத்தியோகத்தர் அலகு' : 'Land Branch Dossier'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.landSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToCsv && (
            <button
              onClick={onNavigateToCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === 'ta' ? 'காணி CSV அப்லோட்' : 'Upload Land CSV'}</span>
            </button>
          )}

          {isSuperAdmin && landRecords.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllLandRecords}
              className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title={lang === 'ta' ? 'அனைத்து காணி விபரங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Wipe all land records'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'ta' ? 'அனைத்து காணிகளையும் அழி' : 'Clear All Land'}</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addLandRecord}</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
            {lang === 'ta' ? 'மொத்த காணிகள்' : 'Total Permits'}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white p-3.5 border border-emerald-200 rounded-xl shadow-2xs bg-emerald-50/20">
          <div className="text-[10px] uppercase font-bold text-emerald-700 font-mono">
            {lang === 'ta' ? 'அனுமதி வழங்கப்பட்டவை' : 'Permits Granted'}
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{stats.granted}</div>
        </div>

        <div className="bg-white p-3.5 border border-amber-200 rounded-xl shadow-2xs bg-amber-50/20">
          <div className="text-[10px] uppercase font-bold text-amber-700 font-mono">
            {lang === 'ta' ? 'அனுமதிக்கு நிலுவை' : 'Pending Approval'}
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">{stats.pending}</div>
        </div>

        <div className="bg-white p-3.5 border border-rose-200 rounded-xl shadow-2xs bg-rose-50/20">
          <div className="text-[10px] uppercase font-bold text-rose-700 font-mono">
            {lang === 'ta' ? 'காணி பிணக்குகள்' : 'Disputed Lands'}
          </div>
          <div className="text-xl font-extrabold text-rose-900 mt-1">{stats.disputes}</div>
        </div>

        <div className="bg-white p-3.5 border border-purple-200 rounded-xl shadow-2xs bg-purple-50/20 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-purple-700 font-mono">
            {lang === 'ta' ? 'வரி நிலுவை' : 'Tax Due'}
          </div>
          <div className="text-xl font-extrabold text-purple-900 mt-1">{stats.taxDue}</div>
        </div>
      </div>

      {/* Multi-Parameter Search & Filters */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={lang === 'ta' ? 'அனுமதி எண், துண்டு எண், உரிமையாளர் NIC, பெயர், குடும்ப QR...' : 'Search Permit No, Lot, NIC, Owner Name, Family Code...'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
            />
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">🗺️ {t.allDivisions}</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>
          </div>

          {/* Land Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
            >
              <option value="ALL">🌾 {t.landType}: {t.allDivisions}</option>
              <option value="CROWN_PERMIT">அரச அனுமதிப்பத்திர காணி (LDO Permit)</option>
              <option value="AGRICULTURAL">விவசாய காணி (Agricultural)</option>
              <option value="RESIDENTIAL">குடியிருப்பு காணி (Residential)</option>
              <option value="PADDY_FIELD">நன்செய் வயல் காணி (Paddy Field)</option>
              <option value="COMMERCIAL">வர்த்தக காணி (Commercial)</option>
              <option value="DISPUTED_LAND">பிணக்குக்குரிய காணி (Disputed)</option>
            </select>
          </div>
        </div>

        {/* Second Row: Status Filter & Pagination Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1">
              {t.permitStatus}:
            </span>
            {[
              { id: 'ALL', labelTa: 'அனைத்தும்', labelEn: 'All' },
              { id: 'PERMIT_ISSUED', labelTa: 'அனுமதி வழங்கப்பட்டது', labelEn: 'Permit Issued' },
              { id: 'PENDING_APPROVAL', labelTa: 'நிலுவை', labelEn: 'Pending' },
              { id: 'IN_DISPUTE', labelTa: 'பிணக்கு', labelEn: 'In Dispute' },
              { id: 'SETTLEMENT_STAGE', labelTa: 'கச்சேரி தீர்வு', labelEn: 'Settlement' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lang === 'ta' ? tab.labelTa : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Page Size Selector (Requirement 03) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {t.perPage}:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">{t.allRecords}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Land Records Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider font-mono">
              {filteredRecords.length} {t.records}
            </span>
            {pageSize !== 'ALL' && (
              <span className="text-[11px] text-slate-500">
                ({t.showingRecords} {Math.min(filteredRecords.length, (effectivePage - 1) * pageSize + 1)} - {Math.min(filteredRecords.length, effectivePage * pageSize)} {t.ofTotal} {filteredRecords.length})
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[11px]">
            {lang === 'ta' ? 'அனைத்து காணிகளுக்கும் LDO இலக்கம் & எல்லை விபரங்கள் உண்டு' : 'All plots have official LDO permits and boundaries'}
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">{t.permitNo}</th>
                <th className="py-3 px-3">{t.lotNo} / {t.planNo}</th>
                <th className="py-3 px-3">{t.extent}</th>
                <th className="py-3 px-3">{t.landType}</th>
                <th className="py-3 px-3">{t.division}</th>
                <th className="py-3 px-3">{t.ownerNic} / {lang === 'ta' ? 'பெயர்' : 'Owner'}</th>
                <th className="py-3 px-3">{t.permitStatus}</th>
                <th className="py-3 px-3">{t.annualTaxStatus}</th>
                <th className="py-3 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    {t.noData}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Permit No */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="text-emerald-950 font-bold">{r.permitNo}</div>
                        {r.familyCode && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[9px] font-mono">
                            {r.familyCode}
                          </span>
                        )}
                      </td>

                      {/* Lot No & Plan No */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">Lot: {r.lotNo}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Plan: {r.planNo}</div>
                      </td>

                      {/* Extent */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {r.extent}
                      </td>

                      {/* Land Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.landType === 'CROWN_PERMIT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : r.landType === 'AGRICULTURAL'
                            ? 'bg-lime-50 text-lime-800 border-lime-200'
                            : r.landType === 'PADDY_FIELD'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : r.landType === 'DISPUTED_LAND'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {r.landType.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Division */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">{r.divisionCode}</span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          ({divisions.find((d) => d.code === r.divisionCode)?.nameTa || r.divisionCode})
                        </span>
                      </td>

                      {/* Owner NIC & Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 leading-tight">{r.ownerNameTa}</div>
                        <div className="text-[11px] text-slate-500">{r.ownerNameEn}</div>
                        <div className="font-mono font-bold text-emerald-950 text-[10px] mt-0.5">{r.ownerNic}</div>
                      </td>

                      {/* Permit Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.permitStatus === 'PERMIT_ISSUED'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : r.permitStatus === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : r.permitStatus === 'IN_DISPUTE'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-purple-100 text-purple-900 border-purple-300'
                        }`}>
                          {r.permitStatus === 'PERMIT_ISSUED' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{r.permitStatus.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Tax Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.annualTaxStatus === 'PAID'
                            ? 'bg-slate-100 text-slate-700'
                            : r.annualTaxStatus === 'DUE'
                            ? 'bg-purple-100 text-purple-900 font-extrabold'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.annualTaxStatus || 'PAID'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenView(r)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title={lang === 'ta' ? 'அனுமதிப்பத்திர அட்டை & எல்லைகள் பார்க்க' : 'View permit card & boundaries'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(r)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                                title={t.editRecord}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(r)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                title={t.deleteRecord}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Requirement 03) */}
        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="text-slate-600 font-medium">
              {t.showingRecords} {Math.min(filteredRecords.length, (effectivePage - 1) * pageSize + 1)} - {Math.min(filteredRecords.length, effectivePage * pageSize)} {t.ofTotal} {filteredRecords.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={effectivePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold"
              >
                ← {t.prevPage}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        effectivePage === p
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                type="button"
                disabled={effectivePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold"
              >
                {t.nextPage} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Land Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-lg">🌾</span>
                <h3 className="text-base font-bold text-slate-900">
                  {isNewRecord ? t.addLandRecord : t.editLandRecord}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Permit No */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.permitNo} *</label>
                  <input
                    type="text"
                    required
                    value={formData.permitNo || ''}
                    onChange={(e) => setFormData({ ...formData, permitNo: e.target.value })}
                    placeholder="e.g. LDO/211/2026/042"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Division */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.division} *</label>
                  <select
                    value={formData.divisionCode || '211'}
                    onChange={(e) => setFormData({ ...formData, divisionCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lot No */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.lotNo}</label>
                  <input
                    type="text"
                    value={formData.lotNo || ''}
                    onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
                    placeholder="e.g. 14-B"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Plan No */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.planNo}</label>
                  <input
                    type="text"
                    value={formData.planNo || ''}
                    onChange={(e) => setFormData({ ...formData, planNo: e.target.value })}
                    placeholder="e.g. BCO/VHR/2024/118"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>

                {/* Land Extent */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.extent} (A-R-P)</label>
                  <input
                    type="text"
                    value={formData.extent || ''}
                    onChange={(e) => setFormData({ ...formData, extent: e.target.value })}
                    placeholder="e.g. 0A-1R-20P or 1 Acre"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-bold"
                  />
                </div>

                {/* Land Type */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.landType}</label>
                  <select
                    value={formData.landType || 'CROWN_PERMIT'}
                    onChange={(e) => setFormData({ ...formData, landType: e.target.value as LandType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="CROWN_PERMIT">அரச அனுமதிப்பத்திர காணி (Crown LDO)</option>
                    <option value="AGRICULTURAL">விவசாய காணி (Agricultural)</option>
                    <option value="RESIDENTIAL">குடியிருப்பு காணி (Residential)</option>
                    <option value="PADDY_FIELD">நன்செய் வயல் (Paddy Field)</option>
                    <option value="COMMERCIAL">வர்த்தக காணி (Commercial)</option>
                    <option value="DISPUTED_LAND">பிணக்குக்குரிய காணி (Disputed)</option>
                  </select>
                </div>

                {/* Owner NIC */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.ownerNic} *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerNic || ''}
                    onChange={(e) => setFormData({ ...formData, ownerNic: e.target.value })}
                    placeholder="e.g. 891902697V"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Family Code */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.familyCodeLabel}</label>
                  <input
                    type="text"
                    value={formData.familyCode || ''}
                    onChange={(e) => setFormData({ ...formData, familyCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. FAM-211-042"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Owner Name Tamil */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.ownerNameTa} *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerNameTa || ''}
                    onChange={(e) => setFormData({ ...formData, ownerNameTa: e.target.value })}
                    placeholder="e.g. சின்னப்பு விஜயகுமார்"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-medium"
                  />
                </div>

                {/* Owner Name English */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.ownerNameEn}</label>
                  <input
                    type="text"
                    value={formData.ownerNameEn || ''}
                    onChange={(e) => setFormData({ ...formData, ownerNameEn: e.target.value })}
                    placeholder="e.g. SINNAPPU VIJAYAKUMAR"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.phone}</label>
                  <input
                    type="text"
                    value={formData.ownerPhone || ''}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    placeholder="e.g. 0760539158"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>

                {/* Permit Status */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.permitStatus}</label>
                  <select
                    value={formData.permitStatus || 'PERMIT_ISSUED'}
                    onChange={(e) => setFormData({ ...formData, permitStatus: e.target.value as LandPermitStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="PERMIT_ISSUED">அனுமதி வழங்கப்பட்டது (Permit Issued)</option>
                    <option value="PENDING_APPROVAL">அனுமதிக்கு நிலுவை (Pending Approval)</option>
                    <option value="IN_DISPUTE">காணி பிணக்கு (In Dispute)</option>
                    <option value="SETTLEMENT_STAGE">காணி கச்சேரி தீர்வு (Settlement Stage)</option>
                    <option value="CANCELLED">ரத்து செய்யப்பட்டது (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Boundaries Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t.boundaries} (Four Boundaries)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">{t.northBoundary}</label>
                    <input
                      type="text"
                      value={formData.boundaries?.north || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          boundaries: { ...formData.boundaries!, north: e.target.value },
                        })
                      }
                      placeholder="e.g. வீதி (Public Road)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">{t.southBoundary}</label>
                    <input
                      type="text"
                      value={formData.boundaries?.south || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          boundaries: { ...formData.boundaries!, south: e.target.value },
                        })
                      }
                      placeholder="e.g. முருகேசு காணி"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">{t.eastBoundary}</label>
                    <input
                      type="text"
                      value={formData.boundaries?.east || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          boundaries: { ...formData.boundaries!, east: e.target.value },
                        })
                      }
                      placeholder="e.g. வாய்க்கால் (Canal)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">{t.westBoundary}</label>
                    <input
                      type="text"
                      value={formData.boundaries?.west || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          boundaries: { ...formData.boundaries!, west: e.target.value },
                        })
                      }
                      placeholder="e.g. அரச காணி (Crown Land)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">{lang === 'ta' ? 'குறிப்புகள் / தீர்மானங்கள்' : 'Notes / Decisions'}</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="காணி விபரங்கள், எல்லை அளவீடு, வரி விபரங்கள்..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Land Permit Dossier View Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-lg">📜</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.viewLandPermit}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Koralaipattu North (Vaharai) Divisional Secretariat
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Printable Permit Area */}
            <div id="land-permit-card" className="p-4 border-2 border-emerald-800 rounded-xl bg-amber-50/20 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-4 pb-2 border-b border-emerald-800/30">
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {t.appTitle}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-900">
                    காணி கிளை அனுமதிப்பத்திர ஆவணம் (Land Permit Dossier)
                  </div>
                </div>
                {viewingQrDataUrl && (
                  <img src={viewingQrDataUrl} alt="Land QR" className="w-16 h-16 border rounded bg-white p-0.5" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Permit Number:</span>
                  <span className="font-bold text-emerald-950 text-sm">{viewingRecord.permitNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">GN Division:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.divisionCode} ({divisions.find((d) => d.code === viewingRecord.divisionCode)?.nameTa})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Lot No / Plan:</span>
                  <span className="font-bold text-slate-900">Lot {viewingRecord.lotNo} (Plan {viewingRecord.planNo})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Extent (A-R-P):</span>
                  <span className="font-bold text-slate-900">{viewingRecord.extent}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Owner Details:</span>
                <div className="font-bold text-slate-900 text-sm">{viewingRecord.ownerNameTa}</div>
                <div className="text-[11px] text-slate-600">{viewingRecord.ownerNameEn}</div>
                <div className="font-mono text-emerald-900 font-bold mt-0.5">NIC: {viewingRecord.ownerNic} | Phone: {viewingRecord.ownerPhone || 'N/A'}</div>
              </div>

              {/* Boundaries Box */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 text-[11px]">
                <div className="font-bold text-slate-700 flex items-center gap-1 font-mono text-[10px] uppercase">
                  <Compass className="w-3 h-3 text-emerald-600" />
                  <span>Official Boundaries (நான்கு எல்லைகள்):</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-slate-700">
                  <div><b>North (வடக்கு):</b> {viewingRecord.boundaries?.north || '-'}</div>
                  <div><b>South (தெற்கு):</b> {viewingRecord.boundaries?.south || '-'}</div>
                  <div><b>East (கிழக்கு):</b> {viewingRecord.boundaries?.east || '-'}</div>
                  <div><b>West (மேற்கு):</b> {viewingRecord.boundaries?.west || '-'}</div>
                </div>
              </div>

              {viewingRecord.notes && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <b>{lang === 'ta' ? 'குறிப்புகள்:' : 'Notes:'}</b> {viewingRecord.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-mono">
                ID: {viewingRecord.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.print}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
