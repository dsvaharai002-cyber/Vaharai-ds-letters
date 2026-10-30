import React, { useState } from 'react';
import { ServiceDefinition, User } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { 
  Settings2, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  Building2, 
  Hash, 
  UserCheck, 
  Info,
  Sparkles
} from 'lucide-react';

interface ServiceManagementViewProps {
  services: ServiceDefinition[];
  currentUser: User;
  lang: Language;
  onUpdateServices: (services: ServiceDefinition[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const ServiceManagementView: React.FC<ServiceManagementViewProps> = ({
  services,
  currentUser,
  lang,
  onUpdateServices,
  onAuditLog,
}) => {
  const t = translations[lang];
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDefinition | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formNameTa, setFormNameTa] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCounterNo, setFormCounterNo] = useState<number>(7);
  const [formPrefix, setFormPrefix] = useState('S');
  const [formOfficerTa, setFormOfficerTa] = useState('அட்மின் 01 (Admin 1)');
  const [formOfficerEn, setFormOfficerEn] = useState('Admin 1 (Administrative Officer 01)');
  const [formDescTa, setFormDescTa] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const officersList = [
    { ta: 'அட்மின் 01 (Admin 1 - நிர்வாக உத்தியோகத்தர் 01)', en: 'Admin 1 (Administrative Officer 01)' },
    { ta: 'அட்மின் 02 (Admin 2 - நிர்வாக உத்தியோகத்தர் 02)', en: 'Admin 2 (Administrative Officer 02)' },
    { ta: 'பிரதேச செயலாளர் / தலைமை நிர்வாகி (Super Admin)', en: 'Divisional Secretary (Super Admin)' },
    { ta: 'காணி பிரிவு உத்தியோகத்தர் (Land Officer)', en: 'Land Branch Officer' },
    { ta: 'கணக்காளர் / நிதிப் பிரிவு (Accountant / Finance)', en: 'Accountant / Finance Division' },
    { ta: 'அஸ்வெசும / சமூர்த்தி நலன்புரி உத்தியோகத்தர்', en: 'Aswesuma / Samurdhi Welfare Officer' },
    { ta: 'பிறப்பு / இறப்பு / விவாக பதிவாளர் (Civil Registrar)', en: 'Civil Registrar' },
    { ta: 'கிராம அலுவலர் (Grama Niladhari)', en: 'Grama Niladhari' },
    { ta: 'விவசாய அபிவிருத்தி உத்தியோகத்தர் (Agriculture Officer)', en: 'Agriculture Development Officer' },
    { ta: 'கடற்றொழில் பரிசோதகர் / உத்தியோகத்தர் (Fisheries Officer)', en: 'Fisheries Inspector / Officer' },
    { ta: 'சமூக சேவைகள் உத்தியோகத்தர் (Social Services Officer)', en: 'Social Services Officer' },
    { ta: 'திட்டமிடல் உத்தியோகத்தர் (Planning Officer)', en: 'Planning Officer' },
    { ta: 'ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)', en: 'Early Childhood Development Officer (ECDO)' },
    { ta: 'அங்கவீனர் / மாற்றுத்திறனாளிகள் பதிவாளர்', en: 'Disability Rights & Welfare Officer' },
    { ta: 'பெண் தலைமைத்துவ குடும்ப உத்தியோகத்தர்', en: 'Women Headed Household Officer' },
  ];

  const handleOpenAdd = () => {
    setFormCode(`CUSTOM_SRV_${Date.now().toString().slice(-4)}`);
    setFormNameTa('');
    setFormNameEn('');
    setFormCounterNo(7);
    setFormPrefix('N');
    setFormOfficerTa('அட்மின் 01 (Admin 1)');
    setFormOfficerEn('Admin 1 (Administrative Officer 01)');
    setFormDescTa('');
    setFormDescEn('');
    setFormIsActive(true);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (srv: ServiceDefinition) => {
    setEditingService(srv);
    setFormCode(srv.code);
    setFormNameTa(srv.nameTa);
    setFormNameEn(srv.nameEn);
    setFormCounterNo(srv.counterNo);
    setFormPrefix(srv.prefix);
    setFormOfficerTa(srv.defaultOfficerTa || 'அட்மின் 01 (Admin 1)');
    setFormOfficerEn(srv.defaultOfficerEn || 'Admin 1');
    setFormDescTa(srv.descriptionTa || '');
    setFormDescEn(srv.descriptionEn || '');
    setFormIsActive(srv.isActive);
    setFormError('');
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameTa.trim() || !formNameEn.trim()) {
      setFormError(lang === 'ta' ? 'சேவையின் தமிழ் மற்றும் ஆங்கிலப் பெயர்களை உள்ளிடவும்.' : 'Please enter both Tamil and English names.');
      return;
    }

    if (editingService) {
      // Edit existing
      const updated = services.map((s) => {
        if (s.id === editingService.id) {
          return {
            ...s,
            nameTa: formNameTa.trim(),
            nameEn: formNameEn.trim(),
            counterNo: Number(formCounterNo),
            prefix: formPrefix.trim().toUpperCase() || 'S',
            defaultOfficerTa: formOfficerTa,
            defaultOfficerEn: formOfficerEn,
            descriptionTa: formDescTa.trim() || undefined,
            descriptionEn: formDescEn.trim() || undefined,
            isActive: formIsActive,
          };
        }
        return s;
      });
      onUpdateServices(updated);
      onAuditLog('EDIT_SERVICE', `Updated service "${formNameTa.trim()}" (Code: ${editingService.code})`);
      setEditingService(null);
    } else {
      // Create new
      const codeClean = (formCode.trim().toUpperCase() || `SRV_${Date.now()}`).replace(/\s+/g, '_');
      const newService: ServiceDefinition = {
        id: `SRV-${Date.now()}`,
        code: codeClean,
        nameTa: formNameTa.trim(),
        nameEn: formNameEn.trim(),
        counterNo: Number(formCounterNo),
        prefix: formPrefix.trim().toUpperCase() || 'N',
        defaultOfficerTa: formOfficerTa,
        defaultOfficerEn: formOfficerEn,
        descriptionTa: formDescTa.trim() || undefined,
        descriptionEn: formDescEn.trim() || undefined,
        isActive: formIsActive,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [...services, newService];
      onUpdateServices(updated);
      onAuditLog('ADD_SERVICE', `Super Admin added new service "${newService.nameTa}" (Code: ${newService.code})`);
      setShowAddModal(false);
    }
  };

  const handleDeleteService = (srv: ServiceDefinition) => {
    const confirmMsg = lang === 'ta'
      ? `"${srv.nameTa}" சேவையை நிச்சயமாக நீக்க விரும்புகிறீர்களா?`
      : `Are you sure you want to delete service "${srv.nameEn}"?`;
    if (!window.confirm(confirmMsg)) return;

    const updated = services.filter((s) => s.id !== srv.id);
    onUpdateServices(updated);
    onAuditLog('DELETE_SERVICE', `Deleted service "${srv.nameTa}" (ID: ${srv.id})`);
  };

  const handleToggleActive = (srv: ServiceDefinition) => {
    const updated = services.map((s) => (s.id === srv.id ? { ...s, isActive: !s.isActive } : s));
    onUpdateServices(updated);
    onAuditLog('TOGGLE_SERVICE_STATUS', `Toggled active state for service "${srv.nameTa}" to ${!srv.isActive}`);
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    if (filterActive === 'ACTIVE' && !s.isActive) return false;
    if (filterActive === 'INACTIVE' && s.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        s.nameTa.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.defaultOfficerTa || '').toLowerCase().includes(q) ||
        (s.defaultOfficerEn || '').toLowerCase().includes(q) ||
        (s.prefix || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Settings2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.servicesTitle}
            </h2>
            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-full font-mono">
              {lang === 'ta' ? 'சுப்பர் அட்மின் அதிகாரம்' : 'Super Admin Power'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.servicesSubtitle}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewService}</span>
          </button>
        )}
      </div>

      {/* Info card for Super Admin authority */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-slate-900">
            {lang === 'ta' ? 'சுப்பர் அட்மின் புதிய சேவைகளை நிர்வகிக்கும் உரிமை' : 'Super Admin Custom Services Authority'}
          </div>
          <div className="text-slate-600 leading-relaxed">
            {lang === 'ta'
              ? 'இங்கு நீங்கள் புதிய சேவைகளை சேர்க்கலாம், கவுண்டர் இலக்கத்தை மாற்றலாம், பொறுப்பான அலுவலரை நிர்ணயிக்கலாம் மற்றும் தேவையான சேவைகளை எந்நேரமும் நீக்கலாம். புதிய சேவைகள் உடனே வரவேற்பக டோக்கன் முறைமையிலும் நேரலை திரையிலும் தோன்றும்.'
              : 'Add new public services, set counter numbers, appoint meeting officers, and remove services. All new services instantly appear on reception token generation and live display screens.'}
          </div>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ta' ? 'சேவை பெயர், குறியீடு அல்லது அலுவலர் தேடுக...' : 'Search service name, code, or officer...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterActive('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ta' ? 'அனைத்தும்' : 'All'} ({services.length})
          </button>
          <button
            onClick={() => setFilterActive('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === 'ACTIVE'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ta' ? 'செயலில் உள்ளவை' : 'Active'} ({services.filter((s) => s.isActive).length})
          </button>
          <button
            onClick={() => setFilterActive('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === 'INACTIVE'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ta' ? 'செயலற்றவை' : 'Inactive'} ({services.filter((s) => !s.isActive).length})
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">முன்னொட்டு / குறியீடு</th>
                <th className="py-3 px-3">சேவை பெயர் (தமிழ் / English)</th>
                <th className="py-3 px-3 text-center">கவுண்டர்</th>
                <th className="py-3 px-3">பொறுப்பான அலுவலர் (யாரை பார்க்க வேண்டும்)</th>
                <th className="py-3 px-3 text-center">நிலை</th>
                <th className="py-3 px-3 text-right">செயல்கள்</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Prefix & Code */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold flex items-center justify-center text-sm">
                          {srv.prefix}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-slate-800 text-[11px] block">
                            {srv.code}
                          </span>
                          {srv.isCustom ? (
                            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                              {t.customServiceBadge}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              {t.standardServiceBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 leading-snug">
                        {lang === 'ta' ? srv.nameTa : srv.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lang === 'ta' ? srv.nameEn : srv.nameTa}
                      </div>
                      {(srv.descriptionTa || srv.descriptionEn) && (
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">
                          {lang === 'ta' ? srv.descriptionTa : srv.descriptionEn}
                        </div>
                      )}
                    </td>

                    {/* Counter */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg text-xs">
                        {srv.counterNo}
                      </span>
                    </td>

                    {/* Default Officer */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-amber-900 bg-amber-50/80 border border-amber-200/60 px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1.5">
                        <span>👔</span>
                        <span>{lang === 'ta' ? srv.defaultOfficerTa : srv.defaultOfficerEn}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => isSuperAdmin && handleToggleActive(srv)}
                        disabled={!isSuperAdmin}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                          srv.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {srv.isActive ? <CheckCircle className="w-3 h-3 text-emerald-700" /> : <XCircle className="w-3 h-3 text-slate-500" />}
                        <span>{srv.isActive ? (lang === 'ta' ? 'செயலில்' : 'Active') : (lang === 'ta' ? 'செயலற்றது' : 'Inactive')}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(srv)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t.editService}
                          >
                            <Edit3 className="w-4 h-4 text-slate-700" />
                          </button>

                          <button
                            onClick={() => handleDeleteService(srv)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t.deleteService}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Service Modal */}
      {(showAddModal || editingService) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Settings2 className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingService ? t.editService : t.addNewService}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingService(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="mt-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              {/* Service Code & Prefix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.serviceCode} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. AGRI_SUBSIDY"
                    disabled={!!editingService && !editingService.isCustom}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.tokenPrefix} (1-3 எழுத்துக்கள்) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={formPrefix}
                    onChange={(e) => setFormPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. AG"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Service Names */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.serviceNameTa} *
                </label>
                <input
                  type="text"
                  required
                  value={formNameTa}
                  onChange={(e) => setFormNameTa(e.target.value)}
                  placeholder="எ.கா: விவசாய மானிய சேவை மற்றும் உரம்"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.serviceNameEn} *
                </label>
                <input
                  type="text"
                  required
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="e.g. Agricultural Subsidy & Fertilizer Aid"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                />
              </div>

              {/* Counter Number & Meeting Officer */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.counterNo} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={formCounterNo}
                    onChange={(e) => setFormCounterNo(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.defaultOfficer} (யாரை பார்க்க வேண்டும்) *
                  </label>
                  <select
                    value={formOfficerTa}
                    onChange={(e) => {
                      setFormOfficerTa(e.target.value);
                      const matched = officersList.find((o) => o.ta === e.target.value);
                      if (matched) setFormOfficerEn(matched.en);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  >
                    {officersList.map((off, idx) => (
                      <option key={idx} value={off.ta}>
                        {lang === 'ta' ? off.ta : off.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    {t.serviceDescriptionTa}
                  </label>
                  <textarea
                    rows={2}
                    value={formDescTa}
                    onChange={(e) => setFormDescTa(e.target.value)}
                    placeholder="சேவை பற்றிய விளக்கம் (தமிழ்)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    {t.serviceDescriptionEn}
                  </label>
                  <textarea
                    rows={2}
                    value={formDescEn}
                    onChange={(e) => setFormDescEn(e.target.value)}
                    placeholder="Service description (English)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{lang === 'ta' ? 'இந்த சேவையை பொதுமக்கள் பயன்பாட்டிற்கு உடனடியாக செயற்படுத்து' : 'Enable this service immediately for citizens'}</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
