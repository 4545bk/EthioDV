import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { apiRequest } from '../services/api.js';
import PhotoUploadCrop from '../components/PhotoUploadCrop.jsx';
import { ArrowLeft, ArrowRight, Save, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function FormWizardPage({ onNavigate, entryId }) {
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Primary Entrant State
  const [primary, setPrimary] = useState({
    name: { lastName: '', firstName: '', middleName: '', hasNoMiddleName: false },
    gender: 'M',
    birthDate: { year: 1995, month: 1, day: 1 },
    birthCity: '',
    isBirthCityUnknown: false,
    birthCountry: 'Ethiopia',
    eligibilityCountry: 'Ethiopia',
    isClaimingAlternateChargeability: false,
    chargeabilityExplanation: '',
    photoKey: '',
    mailingAddress: {
      inCareOf: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      districtProvince: '',
      postalCode: '',
      hasNoPostalCode: true,
      country: 'Ethiopia',
    },
    residenceCountry: 'Ethiopia',
    phone: '',
    email: '',
    educationLevel: 'HIGH_SCHOOL_DEGREE',
    maritalStatus: 'UNMARRIED',
    childrenCount: 0,
  });

  // Derivatives
  const [spouse, setSpouse] = useState({
    name: { lastName: '', firstName: '', middleName: '', hasNoMiddleName: false },
    gender: 'F',
    birthDate: { year: 1997, month: 1, day: 1 },
    birthCity: '',
    birthCountry: 'Ethiopia',
    photoKey: '',
  });

  const [children, setChildren] = useState([]);

  // Load existing entry draft
  useEffect(() => {
    if (!entryId) return;

    apiRequest(`/entries/${entryId}`)
      .then((res) => {
        if (res.success && res.data.formData) {
          const d = res.data.formData;
          if (d.primary) setPrimary((prev) => ({ ...prev, ...d.primary }));
          if (d.spouse) setSpouse((prev) => ({ ...prev, ...d.spouse }));
          if (d.children) setChildren(d.children);
        }
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  }, [entryId]);

  // Auto-save draft
  const handleSaveDraft = async (silent = false) => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      const res = await apiRequest(`/entries/${entryId}/draft`, {
        method: 'PUT',
        body: JSON.stringify({
          primary,
          spouse: primary.maritalStatus === 'MARRIED_NON_US_CITIZEN' ? spouse : undefined,
          children: primary.childrenCount > 0 ? children : [],
        }),
      });

      if (!silent) {
        setSaveMessage('ረቂቅ በተሳካ ሁኔታ ተቀምጧል / Draft saved!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Auto-save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Step Navigation
  const handleNext = async () => {
    await handleSaveDraft(true);
    setCurrentStep((s) => Math.min(6, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Form Submit
  const handleSubmitForm = async () => {
    if (!primary.photoKey) {
      setErrorMessage('እባክዎ መጀመሪያ የእርስዎን ፎቶግራፍ ያስገቡ / Principal photograph is required.');
      setCurrentStep(2);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      // Save draft first
      await handleSaveDraft(true);

      // Submit entry
      const res = await apiRequest(`/entries/${entryId}/submit`, { method: 'POST' });
      if (res.success) {
        onNavigate('payment', { entryId });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Child Helper
  const handleAddChild = () => {
    setChildren([
      ...children,
      {
        name: { lastName: primary.name.lastName, firstName: '', middleName: '', hasNoMiddleName: false },
        gender: 'M',
        birthDate: { year: 2018, month: 1, day: 1 },
        birthCity: '',
        birthCountry: 'Ethiopia',
        photoKey: '',
      },
    ]);
    setPrimary((p) => ({ ...p, childrenCount: children.length + 1 }));
  };

  const handleRemoveChild = (index) => {
    const updated = children.filter((_, i) => i !== index);
    setChildren(updated);
    setPrimary((p) => ({ ...p, childrenCount: updated.length }));
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>ቅጹ በመጫን ላይ ነው...</div>;
  }

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      {/* Header and Stepper Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => onNavigate('dashboard')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
          <ArrowLeft size={14} /> ማመልከቻዎቼ / Back
        </button>

        <button onClick={() => handleSaveDraft(false)} disabled={isSaving} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
          <Save size={14} /> {isSaving ? 'በማስቀመጥ ላይ...' : t('saveDraft')}
        </button>
      </div>

      {saveMessage && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={15} /> {saveMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {/* Aspio Numbered Stepper Wizard Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {[
            { step: 1, label: t('stepBio') },
            { step: 2, label: t('stepPhoto') },
            { step: 3, label: t('stepAddress') },
            { step: 4, label: t('stepEducation') },
            { step: 5, label: t('stepDerivatives') },
            { step: 6, label: t('stepReview') },
          ].map((item, index) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;

            return (
              <div
                key={item.step}
                style={{
                  textAlign: 'center',
                  flex: 1,
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 2,
                }}
                onClick={() => setCurrentStep(item.step)}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    margin: '0 auto 8px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    background: isActive
                      ? 'var(--primary-600)'
                      : isCompleted
                      ? 'var(--success)'
                      : 'var(--bg-input)',
                    color: isActive || isCompleted ? '#ffffff' : 'var(--text-subtle)',
                    border: isActive
                      ? '2px solid var(--primary-600)'
                      : isCompleted
                      ? '2px solid var(--success)'
                      : '1.5px solid var(--border-subtle)',
                    boxShadow: isActive
                      ? '0 0 0 4px rgba(124, 58, 237, 0.22), 0 4px 12px rgba(124, 58, 237, 0.35)'
                      : 'none',
                    transition: 'all var(--transition-normal)',
                  }}
                >
                  {isCompleted ? '✓' : item.step}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                    transition: 'color var(--transition-fast)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 2px',
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Biographical Information */}
      {currentStep === 1 && (
        <div className="card animate-fade-in">
          <h3 style={{ fontSize: 18, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            ክፍል 1: መሰረታዊ መረጃ / Primary Entrant Information
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('lastName')} *</label>
              <input
                type="text"
                required
                placeholder="e.g. GIZAW"
                value={primary.name.lastName}
                onChange={(e) => setPrimary({ ...primary, name: { ...primary.name, lastName: e.target.value.toUpperCase() } })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('firstName')} *</label>
              <input
                type="text"
                required
                placeholder="e.g. BIRUH"
                value={primary.name.firstName}
                onChange={(e) => setPrimary({ ...primary, name: { ...primary.name, firstName: e.target.value.toUpperCase() } })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">{t('middleName')}</label>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={primary.name.hasNoMiddleName}
                  onChange={(e) => setPrimary({ ...primary, name: { ...primary.name, hasNoMiddleName: e.target.checked, middleName: e.target.checked ? '' : primary.name.middleName } })}
                />
                {t('noMiddleName')}
              </label>
            </div>
            <input
              type="text"
              disabled={primary.name.hasNoMiddleName}
              placeholder="e.g. ABEBE"
              value={primary.name.middleName}
              onChange={(e) => setPrimary({ ...primary, name: { ...primary.name, middleName: e.target.value.toUpperCase() } })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('gender')} *</label>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="gender"
                  value="M"
                  checked={primary.gender === 'M'}
                  onChange={(e) => setPrimary({ ...primary, gender: e.target.value })}
                />
                {t('male')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="gender"
                  value="F"
                  checked={primary.gender === 'F'}
                  onChange={(e) => setPrimary({ ...primary, gender: e.target.value })}
                />
                {t('female')}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('birthDate')} *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ቀን (Day)</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={primary.birthDate.day}
                  onChange={(e) => setPrimary({ ...primary, birthDate: { ...primary.birthDate, day: parseInt(e.target.value, 10) } })}
                  className="form-input"
                />
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ወር (Month)</span>
                <select
                  value={primary.birthDate.month}
                  onChange={(e) => setPrimary({ ...primary, birthDate: { ...primary.birthDate, month: parseInt(e.target.value, 10) } })}
                  className="form-select"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ዓመት (Year)</span>
                <input
                  type="number"
                  min="1940"
                  max="2008"
                  value={primary.birthDate.year}
                  onChange={(e) => setPrimary({ ...primary, birthDate: { ...primary.birthDate, year: parseInt(e.target.value, 10) } })}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">{t('birthCity')} *</label>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={primary.isBirthCityUnknown}
                  onChange={(e) => setPrimary({ ...primary, isBirthCityUnknown: e.target.checked, birthCity: e.target.checked ? 'UNKNOWN' : '' })}
                />
                {t('birthCityUnknown')}
              </label>
            </div>
            <input
              type="text"
              disabled={primary.isBirthCityUnknown}
              placeholder="e.g. ADDIS ABABA or HAWASSA"
              value={primary.birthCity}
              onChange={(e) => setPrimary({ ...primary, birthCity: e.target.value.toUpperCase() })}
              className="form-input"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Photograph Upload & Crop */}
      {currentStep === 2 && (
        <div className="card animate-fade-in">
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>ክፍል 2: ፎቶግራፍ / Entrant Photograph</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('photoTip')} የኛ ሲስተም ፎቶዎን በቀጥታ ወደ 600x600 ፒክሰል ያስተካክላል።
          </p>

          <PhotoUploadCrop
            label="የዋናው አመልካች ፎቶ (Principal Photo)"
            existingPhotoKey={primary.photoKey}
            onPhotoUploaded={(key) => setPrimary({ ...primary, photoKey: key })}
          />
        </div>
      )}

      {/* STEP 3: Mailing Address & Contact */}
      {currentStep === 3 && (
        <div className="card animate-fade-in">
          <h3 style={{ fontSize: 18, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            ክፍል 3: አድራሻና የመገናኛ መረጃ / Mailing Address & Contact
          </h3>

          <div className="form-group">
            <label className="form-label">የመኖሪያ አድራሻ (Address Line 1) *</label>
            <input
              type="text"
              placeholder="e.g. BOLE SUBCITY, WOREDA 03, HOUSE 124"
              value={primary.mailingAddress.addressLine1}
              onChange={(e) => setPrimary({ ...primary, mailingAddress: { ...primary.mailingAddress, addressLine1: e.target.value.toUpperCase() } })}
              className="form-input"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">ከተማ (City/Town) *</label>
              <input
                type="text"
                placeholder="ADDIS ABABA"
                value={primary.mailingAddress.city}
                onChange={(e) => setPrimary({ ...primary, mailingAddress: { ...primary.mailingAddress, city: e.target.value.toUpperCase() } })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">ክፍለ ከተማ / ዞን (District / Province)</label>
              <input
                type="text"
                placeholder="BOLE"
                value={primary.mailingAddress.districtProvince}
                onChange={(e) => setPrimary({ ...primary, mailingAddress: { ...primary.mailingAddress, districtProvince: e.target.value.toUpperCase() } })}
                className="form-input"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">ስልክ ቁጥር (Phone Number)</label>
              <input
                type="tel"
                placeholder="+251911234567"
                value={primary.phone}
                onChange={(e) => setPrimary({ ...primary, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">ኢሜይል አድራሻ (Email Address) *</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={primary.email}
                onChange={(e) => setPrimary({ ...primary, email: e.target.value.toLowerCase() })}
                className="form-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Education & Marital Status */}
      {currentStep === 4 && (
        <div className="card animate-fade-in">
          <h3 style={{ fontSize: 18, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            ክፍል 4: ትምህርትና ጋብቻ / Education & Marital Status
          </h3>

          <div className="form-group">
            <label className="form-label">{t('educationLevel')} *</label>
            <select
              value={primary.educationLevel}
              onChange={(e) => setPrimary({ ...primary, educationLevel: e.target.value })}
              className="form-select"
            >
              <option value="HIGH_SCHOOL_DEGREE">የሁለተኛ ደረጃ ትምህርት ያጠናቀቀ (12ኛ ክፍል) / High School Degree</option>
              <option value="VOCATIONAL_SCHOOL">የሙያ ትምህርት (Vocational School / TVET)</option>
              <option value="SOME_UNIVERSITY">የዩኒቨርሲቲ ተማሪ (Some University Courses)</option>
              <option value="UNIVERSITY_DEGREE">የመጀመሪያ ዲግሪ (University Degree)</option>
              <option value="MASTERS_DEGREE">ማስተርስ ዲግሪ (Master's Degree)</option>
              <option value="DOCTORATE_DEGREE">ዶክትሬት (Doctorate Degree)</option>
              <option value="HIGH_SCHOOL_NO_DEGREE">12ኛ ክፍል ያላጠናቀቀ (High School, No Degree)</option>
              <option value="PRIMARY_ONLY">የመጀመሪያ ደረጃ ብቻ (Primary School Only)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('maritalStatus')} *</label>
            <select
              value={primary.maritalStatus}
              onChange={(e) => setPrimary({ ...primary, maritalStatus: e.target.value })}
              className="form-select"
            >
              <option value="UNMARRIED">ያላገባ / ያላገባች (Unmarried)</option>
              <option value="MARRIED_NON_US_CITIZEN">ያገባ / ያገባች (ባለቤቴ አሜሪካዊ ዜጋ አይደለችም/አይደለም)</option>
              <option value="MARRIED_US_CITIZEN">ያገባ / ያገባች (ባለቤቴ አሜሪካዊ ዜጋ ነው/ናት)</option>
              <option value="DIVORCED">የፈታ / የፈታች (Divorced)</option>
              <option value="WIDOWED">የትዳር አጋር የሞተበት/ባት (Widowed)</option>
              <option value="LEGALLY_SEPARATED">በፍርድ ቤት የተለየ (Legally Separated)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('childrenCount')}</label>
            <input
              type="number"
              min="0"
              max="20"
              value={primary.childrenCount}
              onChange={(e) => setPrimary({ ...primary, childrenCount: parseInt(e.target.value || '0', 10) })}
              className="form-input"
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              እድሜያቸው ከ 21 ዓመት በታች የሆኑ ያላገቡ ልጆችዎን በሙሉ ማካተት ግዴታ ነው።
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: Derivatives (Spouse & Children) */}
      {currentStep === 5 && (
        <div className="card animate-fade-in">
          <h3 style={{ fontSize: 18, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            ክፍል 5: የቤተሰብ መረጃ (የትዳር አጋርና ልጆች) / Derivatives
          </h3>

          {/* Conditional Spouse Section */}
          {primary.maritalStatus === 'MARRIED_NON_US_CITIZEN' ? (
            <div style={{ marginBottom: 30, background: 'rgba(15, 23, 42, 0.5)', padding: 18, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: 16, color: '#38bdf8', marginBottom: 14 }}>የባለቤት መረጃ / Spouse Information</h4>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">የባለቤት የአያት ስም (Last Name) *</label>
                  <input
                    type="text"
                    value={spouse.name.lastName}
                    onChange={(e) => setSpouse({ ...spouse, name: { ...spouse.name, lastName: e.target.value.toUpperCase() } })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">የባለቤት የመጀመሪያ ስም (First Name) *</label>
                  <input
                    type="text"
                    value={spouse.name.firstName}
                    onChange={(e) => setSpouse({ ...spouse, name: { ...spouse.name, firstName: e.target.value.toUpperCase() } })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">የትውልድ ከተማ (Birth City)</label>
                <input
                  type="text"
                  value={spouse.birthCity}
                  onChange={(e) => setSpouse({ ...spouse, birthCity: e.target.value.toUpperCase() })}
                  className="form-input"
                />
              </div>

              <PhotoUploadCrop
                label="የባለቤት ፎቶ (Spouse Photo 600x600)"
                existingPhotoKey={spouse.photoKey}
                onPhotoUploaded={(key) => setSpouse({ ...spouse, photoKey: key })}
              />
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              ያላገባ / የተፋታ መርጠዋል፤ የትዳር አጋር መረጃ አያስፈልግም።
            </p>
          )}

          {/* Children Section */}
          {primary.childrenCount > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ fontSize: 16, color: '#2dd4bf' }}>የልጆች ዝርዝር ({children.length})</h4>
                <button type="button" onClick={handleAddChild} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  <Plus size={14} /> ልጅ ጨምር
                </button>
              </div>

              {children.map((child, idx) => (
                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <strong>ልጅ #{idx + 1}</strong>
                    <button type="button" onClick={() => handleRemoveChild(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} /> አስወግድ
                    </button>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">ስም (First Name)</label>
                      <input
                        type="text"
                        value={child.name.firstName}
                        onChange={(e) => {
                          const updated = [...children];
                          updated[idx].name.firstName = e.target.value.toUpperCase();
                          setChildren(updated);
                        }}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">የአያት ስም (Last Name)</label>
                      <input
                        type="text"
                        value={child.name.lastName}
                        onChange={(e) => {
                          const updated = [...children];
                          updated[idx].name.lastName = e.target.value.toUpperCase();
                          setChildren(updated);
                        }}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <PhotoUploadCrop
                    label={`የልጅ #${idx + 1} ፎቶ (Child Photo 600x600)`}
                    existingPhotoKey={child.photoKey}
                    onPhotoUploaded={(key) => {
                      const updated = [...children];
                      updated[idx].photoKey = key;
                      setChildren(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>የልጆች ብዛት 0 ነው።</p>
          )}
        </div>
      )}

      {/* STEP 6: Review & Final Submit */}
      {currentStep === 6 && (
        <div className="card animate-fade-in">
          <h3 style={{ fontSize: 18, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            ክፍል 6: ማጠቃለያና ማረጋገጫ / Review & Final Confirmation
          </h3>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 18, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ሙሉ ስም:</span>
                <p style={{ fontWeight: 600 }}>{primary.name.firstName} {primary.name.middleName} {primary.name.lastName}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ጾታና ልደት:</span>
                <p style={{ fontWeight: 600 }}>{primary.gender === 'M' ? 'ወንድ' : 'ሴት'} | {primary.birthDate.day}/{primary.birthDate.month}/{primary.birthDate.year}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>የትውልድ ከተማ:</span>
                <p style={{ fontWeight: 600 }}>{primary.birthCity || 'N/A'}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ትምህርት:</span>
                <p style={{ fontWeight: 600 }}>{primary.educationLevel}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ጋብቻና ልጆች:</span>
                <p style={{ fontWeight: 600 }}>{primary.maritalStatus} | {primary.childrenCount} ልጆች</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ፎቶግራፍ:</span>
                <p style={{ fontWeight: 600, color: primary.photoKey ? '#10b981' : '#ef4444' }}>
                  {primary.photoKey ? '✓ ተያይዟል (Verified)' : '✗ አልተያያዘም'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: 16, borderRadius: 8, marginBottom: 24, fontSize: 13, lineHeight: 1.5 }}>
            <strong>የአመልካች ቃል መግቢያ / Applicant Declaration:</strong><br />
            በዚህ ቅጽ ላይ ያስገባኋቸው መረጃዎች በሙሉ ትክክለኛና እውነተኛ መሆናቸውን አረጋግጣለሁ። የሀሰት መረጃ ወይም ያልተሟላ የቤተሰብ ዝርዝር ማስገባት በስቴት ዲፓርትመንት ህግ መሰረት ከሎተሪው እንደሚያስወግድ ተረድቻለሁ።
          </div>

          <button
            type="button"
            onClick={handleSubmitForm}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 0', fontSize: 16 }}
          >
            {isSaving ? 'በማስገባት ላይ...' : t('submitForm')}
          </button>
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="btn btn-secondary"
        >
          <ArrowLeft size={16} /> {t('prevStep')}
        </button>

        {currentStep < 6 && (
          <button type="button" onClick={handleNext} className="btn btn-primary">
            {t('nextStep')} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
