async function injectData(part) {
  const statusEl = document.getElementById("status");
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);

    if (data.type !== "ETHIODV_AUTOFILL_V1") {
      statusEl.textContent = "Error: Clipboard does not contain a valid EthioDV payload. Click 'Copy Extension Payload' in Filing Station first.";
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url || !tab.url.includes("dvprogram.state.gov")) {
      statusEl.textContent = "Notice: Please switch to your open dvprogram.state.gov tab before clicking Auto-Fill.";
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autoFillOfficialPortal,
      args: [data, part]
    });

    statusEl.textContent = `✓ Injected ${data.reference} (${part})! Upload photo & solve CAPTCHA.`;
  } catch (err) {
    statusEl.textContent = "Clipboard error: Please click 'Copy Extension Payload' in EthioDV Filing Station first.";
  }
}

document.getElementById("fillPart1").addEventListener("click", () => injectData("PART1"));
document.getElementById("fillPart2").addEventListener("click", () => injectData("PART2"));

/**
 * Runs directly inside dvprogram.state.gov DOM
 */
function autoFillOfficialPortal(payload, part) {
  const setVal = (selectorSuffix, value) => {
    if (value === undefined || value === null) return;
    const el = document.querySelector(`[id$="${selectorSuffix}"]`) || document.querySelector(`[name$="${selectorSuffix}"]`);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setCheck = (selectorSuffix, checked) => {
    const el = document.querySelector(`[id$="${selectorSuffix}"]`) || document.querySelector(`[name$="${selectorSuffix}"]`);
    if (!el) return;
    if (el.checked !== Boolean(checked)) {
      el.click();
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const setSelectByText = (selectorSuffix, textMatch) => {
    if (!textMatch) return;
    const el = document.querySelector(`[id$="${selectorSuffix}"]`) || document.querySelector(`[name$="${selectorSuffix}"]`);
    if (!el || !el.options) return;
    const cleanMatch = String(textMatch).toLowerCase().trim();
    for (let i = 0; i < el.options.length; i++) {
      if (el.options[i].text.toLowerCase().includes(cleanMatch) || el.options[i].value.toLowerCase() === cleanMatch) {
        el.selectedIndex = i;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }
    }
  };

  if (part === "PART1") {
    const p = payload.primary;
    if (!p) return;

    // 1. Name
    setVal("txtLastName", p.lastName);
    setVal("txtFirstName", p.firstName);
    setCheck("cbxMiddleName", p.noMiddleName);
    if (!p.noMiddleName && p.middleName) {
      setVal("txtMiddleName", p.middleName);
    }

    // 2. Gender
    const g = String(p.gender).toUpperCase();
    if (g === "M" || g === "MALE") setCheck("rblGender_0", true);
    if (g === "F" || g === "FEMALE") setCheck("rblGender_1", true);

    // 3. Birth Date
    setVal("txtMonthOfBirth", String(p.birthMonth).padStart(2, "0"));
    setVal("txtDayOfBirth", String(p.birthDay).padStart(2, "0"));
    setVal("txtYearOfBirth", String(p.birthYear));

    // 4. City Where You Were Born
    setCheck("cbxBirthCity", p.birthCityUnknown);
    if (!p.birthCityUnknown && p.birthCity) {
      setVal("txtBirthCity", p.birthCity);
    }

    // 5. Country Where You Were Born
    setSelectByText("drpBirthCountry", p.birthCountry || "Ethiopia");

    // 6. Country of Eligibility
    if (p.isClaimingAlternateChargeability) {
      setCheck("rblEligibility_1", true);
      if (p.chargeabilityCountry) {
        setSelectByText("drpEligibilityCountry", p.chargeabilityCountry);
      }
    } else {
      setCheck("rblEligibility_0", true);
    }

    // 8. Mailing Address
    if (p.inCareOf) setVal("txtInCareOf", p.inCareOf);
    setVal("txtAddress1", p.addressLine1);
    if (p.addressLine2) setVal("txtAddress2", p.addressLine2);
    setVal("txtCity", p.city);
    setVal("txtDistrict", p.district);
    setCheck("cbxZipCode", p.noPostalCode);
    if (!p.noPostalCode && p.postalCode) {
      setVal("txtZipCode", p.postalCode);
    }
    setSelectByText("drpCountry", p.country || "Ethiopia");

    // 9. Country Where You Live Today
    setSelectByText("drpLiveCountry", p.liveCountry || "Ethiopia");

    // 10. Phone Number
    if (p.phone) setVal("txtPhoneNumber", p.phone);

    // 11. Email Address
    if (p.email) {
      setVal("txtEmailAddress", p.email);
      setVal("txtConfirmEmailAddress", p.email);
    }

    // 12. Education Level Mapping
    const eduMap = {
      PRIMARY_ONLY: "rblEducation_0",
      HIGH_SCHOOL_NO_DEGREE: "rblEducation_1",
      HIGH_SCHOOL_DEGREE: "rblEducation_2",
      VOCATIONAL_SCHOOL: "rblEducation_3",
      SOME_UNIVERSITY: "rblEducation_4",
      UNIVERSITY_DEGREE: "rblEducation_5",
      SOME_GRADUATE: "rblEducation_6",
      MASTERS_DEGREE: "rblEducation_7",
      SOME_DOCTORATE: "rblEducation_8",
      DOCTORATE_DEGREE: "rblEducation_9",
    };
    if (eduMap[p.educationLevel]) {
      setCheck(eduMap[p.educationLevel], true);
    }

    // 13. Marital Status Mapping
    const maritalMap = {
      UNMARRIED: "rblMaritalStatus_0",
      MARRIED_NON_US_CITIZEN: "rblMaritalStatus_1",
      MARRIED_US_CITIZEN: "rblMaritalStatus_2",
      DIVORCED: "rblMaritalStatus_3",
      WIDOWED: "rblMaritalStatus_4",
      LEGALLY_SEPARATED: "rblMaritalStatus_5",
    };
    if (maritalMap[p.maritalStatus]) {
      setCheck(maritalMap[p.maritalStatus], true);
    }

    // 14. Number of Children
    setVal("txtNumChildren", String(p.childrenCount || "0"));
  }

  if (part === "PART2") {
    // Spouse Section
    if (payload.spouse) {
      const s = payload.spouse;
      setVal("formSpouse_qName_txtLastName", s.lastName);
      setVal("formSpouse_qName_txtFirstName", s.firstName);
      setCheck("formSpouse_qName_cbxMiddleName", Boolean(s.noMiddleName));
      if (!s.noMiddleName && s.middleName) {
        setVal("formSpouse_qName_txtMiddleName", s.middleName);
      }
      setVal("formSpouse_qBirthDate_txtMonthOfBirth", String(s.birthMonth).padStart(2, "0"));
      setVal("formSpouse_qBirthDate_txtDayOfBirth", String(s.birthDay).padStart(2, "0"));
      setVal("formSpouse_qBirthDate_txtYearOfBirth", String(s.birthYear));

      const sg = String(s.gender).toUpperCase();
      if (sg === "M" || sg === "MALE") setCheck("formSpouse_qGender_rblGender_0", true);
      if (sg === "F" || sg === "FEMALE") setCheck("formSpouse_qGender_rblGender_1", true);

      setCheck("formSpouse_qBirthCity_cbxBirthCity", Boolean(s.birthCityUnknown));
      if (!s.birthCityUnknown && s.birthCity) {
        setVal("formSpouse_qBirthCity_txtBirthCity", s.birthCity);
      }
      setSelectByText("formSpouse_qBirthCountry_drpBirthCountry", s.birthCountry || "Ethiopia");
    }

    // Children Section
    if (Array.isArray(payload.children)) {
      payload.children.forEach((child, idx) => {
        const prefix = `Child${idx + 1}`;
        setVal(`${prefix}_qName_txtLastName`, child.lastName);
        setVal(`${prefix}_qName_txtFirstName`, child.firstName);
        setCheck(`${prefix}_qName_cbxMiddleName`, Boolean(child.noMiddleName));
        if (!child.noMiddleName && child.middleName) {
          setVal(`${prefix}_qName_txtMiddleName`, child.middleName);
        }

        const bMonth = child.birthMonth || child.birthDate?.month;
        const bDay = child.birthDay || child.birthDate?.day;
        const bYear = child.birthYear || child.birthDate?.year;

        if (bMonth) setVal(`${prefix}_qBirthDate_txtMonthOfBirth`, String(bMonth).padStart(2, "0"));
        if (bDay) setVal(`${prefix}_qBirthDate_txtDayOfBirth`, String(bDay).padStart(2, "0"));
        if (bYear) setVal(`${prefix}_qBirthDate_txtYearOfBirth`, String(bYear));

        const cg = String(child.gender).toUpperCase();
        if (cg === "M" || cg === "MALE") setCheck(`${prefix}_qGender_rblGender_0`, true);
        if (cg === "F" || cg === "FEMALE") setCheck(`${prefix}_qGender_rblGender_1`, true);

        setCheck(`${prefix}_qBirthCity_cbxBirthCity`, Boolean(child.birthCityUnknown || child.isBirthCityUnknown));
        const cCity = child.birthCity;
        if (cCity) setVal(`${prefix}_qBirthCity_txtBirthCity`, cCity);
        setSelectByText(`${prefix}_qBirthCountry_drpBirthCountry`, child.birthCountry || "Ethiopia");
      });
    }
  }
}
