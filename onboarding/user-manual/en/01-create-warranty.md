# Manual: Create a Warranty

**Last updated:** October 26, 2025
**Owner:** Pro-Remorque Training Team
**Estimated time:** 5-7 minutes per warranty

---

## 🎯 Objective

Learn to create a complete warranty for a customer, from information entry to PDF contract generation.

---

## 📋 Prerequisites

- Active account with **Dealer** or **Admin** role
- Customer information available (name, email, phone)
- Trailer details (VIN mandatory)
- Warranty plan chosen by customer

---

## 📝 Detailed Steps

### Step 1: Access the Form
1. Log in to Pro-Remorque
2. In the sidebar menu, click **"Warranties"**
3. Click the red **"+ New Warranty"** button in top right

**💡 Tip:** Keyboard shortcut `Ctrl+N` (Windows) or `Cmd+N` (Mac)

---

### Step 2: Customer Information Section

Fill in all fields marked with an asterisk (*):

| Field | Description | Format | Example |
|-------|-------------|--------|---------|
| **First Name*** | Customer's first name | Text | John |
| **Last Name*** | Family name | Text | Smith |
| **Email*** | Valid email address | email@domain.com | john.smith@email.com |
| **Phone*** | Number with area code | (XXX) XXX-XXXX | (514) 555-1234 |
| **Address*** | Street and number | Text | 123 Main Street |
| **City*** | City | Text | Montreal |
| **Province*** | Canadian province | Selection | QC |
| **Postal Code*** | Canadian format | A1A 1A1 | H3B 2G7 |

**⚠️ Important:** Email must be unique in the system. If customer already exists, use search (magnifying glass) to find them.

---

### Step 3: Trailer Details Section

| Field | Description | Validation | Notes |
|-------|-------------|------------|-------|
| **VIN*** | Vehicle Identification Number | 17 alphanumeric characters | Example: 1HGBH41JXMN109186 |
| **Make*** | Manufacturer | Text or selection | Example: Gator Trailer, Big Tex |
| **Model*** | Specific model | Text | Example: 7x14 Enclosed |
| **Year*** | Manufacturing year | 1980-2025 | Example: 2024 |
| **Purchase Price*** | Amount paid | CAD Dollars | Example: 8500.00 |
| **Purchase Date*** | Transaction date | YYYY-MM-DD | Example: 2024-10-15 |
| **Mileage** | If applicable | Integer | Example: 5000 |

**🔍 VIN Validation:**
- Exactly 17 characters
- No letters I, O, Q (to avoid confusion with 1, 0)
- System automatically checks if VIN already exists

**❌ Common Error:** VIN already registered
**✓ Solution:** Check in "Warranties" if this VIN already has an active warranty. Contact support if legitimate duplicate.

---

### Step 4: Select Warranty Plan

1. Click the **"Warranty Plan"** dropdown
2. Three options available:
   - **12 months** - Basic warranty
   - **24 months** - Standard warranty (recommended)
   - **36 months** - Premium warranty

3. Base price displays automatically according to your pricing grid

**Typical Price Table (example):**

| Plan | Base Price | Coverage |
|------|------------|----------|
| 12 months | $299 | Major parts |
| 24 months | $499 | Major parts + axle |
| 36 months | $699 | Complete coverage |

---

### Step 5: Additional Options (optional)

Check desired options:

- ☐ **Tires and Rims** (+$150) - Covers punctures and rim damage
- ☐ **Batteries** (+$75) - Replacement if failure
- ☐ **Electrical System** (+$200) - Wiring, lights, connectors
- ☐ **Floor and Walls** (+$250) - Structural damage
- ☐ **Door and Locking** (+$100) - Mechanisms and hinges

**💰 Automatic Calculation:** Total updates in real-time.

---

### Step 6: Tax Verification

System automatically calculates taxes by province:

| Province | GST | PST/QST | Total Taxes |
|----------|-----|---------|-------------|
| QC | 5% | 9.975% | 14.975% |
| ON | 5% | 8% | 13% (HST) |
| AB | 5% | 0% | 5% |
| BC | 5% | 7% | 12% |
| Others | 5% | Variable | By province |

**✓ Verification:** Before continuing, confirm that:
- Customer province is correct
- Tax amount seems appropriate
- Final total is accepted by customer

---

### Step 7: Loyalty Program

If you've sold 10 or more warranties, you're entitled to **$2,000 credit**.

1. Check counter at top: "Available Credit: $XXX"
2. If credit > 0, check **"Apply loyalty credit"**
3. Enter amount to apply (max = available credit)
4. Total reduces instantly

**Example:**
- Total before credit: $649 (24-month plan)
- Credit applied: $100
- **Final total: $549**

---

### Step 8: Final Review

**Checklist before generation:**

- [ ] Valid and confirmed customer email
- [ ] Correct VIN (17 characters)
- [ ] Warranty plan selected
- [ ] Checked options match sale
- [ ] Taxes calculated correctly
- [ ] Loyalty credit applied if desired
- [ ] Total price accepted by customer

---

### Step 9: Generate Contract

1. Click **"Preview"** to see PDF before generation (recommended)
2. Verify all information in preview
3. If correct, click **"Generate Contract"**
4. Wait 5-10 seconds (progress bar)
5. PDF is created and ready to sign

**✅ Confirmation:** Green message "Contract generated successfully - #WARR-XXXXX"

---

### Step 10: Next Actions

After generation, three options display:

1. **📝 Sign now** → Launches electronic signature process
2. **📥 Download PDF** → Local save (unsigned)
3. **📧 Send to customer** → Automatic email with signature link

**Recommendation:** If customer is present → "Sign now"
If customer is remote → "Send to customer"

---

## 🎬 Screenshots

### Screenshot 1: Creation Form (empty)
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Arrows pointing to required fields (*)
```

### Screenshot 2: Plan Selection
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Highlighting the 3 plans with prices
```

### Screenshot 3: Tax Calculation and Total
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Red box around final total
```

### Screenshot 4: Generation Confirmation
```
[PLACEHOLDER: Screenshot 1280x720]
Annotation: Success message with warranty number
```

---

## ❗ Common Errors and Solutions

### Error: "Email already used"
**Cause:** Customer profile already exists with this email
**Solution:**
1. Use search icon (magnifying glass) next to email field
2. Type email to find customer
3. Click customer to auto-fill their information

---

### Error: "Invalid VIN - must contain 17 characters"
**Cause:** VIN too short, too long, or forbidden characters
**Solution:**
1. Count characters (must be exactly 17)
2. Remove spaces or dashes
3. Avoid letters I, O, Q
4. If real VIN has less than 17 characters, contact support

---

### Error: "VIN already registered"
**Cause:** Warranty already exists for this VIN
**Solution:**
1. Menu "Warranties" → Search by VIN
2. Check if warranty is active or expired
3. If expired, you can create new warranty
4. If active, contact support for special cases (ownership transfer)

---

### Error: "PDF not generating"
**Cause:** Missing required fields or server error
**Solution:**
1. Verify ALL fields with (*) are filled
2. Refresh page (Ctrl+R) and retry
3. Check your Internet connection
4. If problem persists after 3 attempts → support@proremorque.com

---

### Error: "Incorrect taxes"
**Cause:** Wrong province selected or outdated rate
**Solution:**
1. Verify province in customer info
2. Compare with tax table above
3. If amount truly incorrect → report to support with screenshot

---

## 🔗 Related Links

- [Sign a Contract](./02-electronic-signature.md)
- [Download and Send Warranties](./03-download-warranties.md)
- [Loyalty Program Details](./07-loyalty-program.md)
- [Warranties FAQ](../../en/faq.md#warranties)

---

## 📊 Expected Results

After following this guide, you should:

✅ Create a warranty in less than 7 minutes
✅ Understand tax calculation by province
✅ Know how to apply loyalty credit
✅ Generate a valid contract PDF
✅ Identify and correct common errors

---

## 📞 Support

Questions about this manual?
- Email: support@proremorque.com
- Phone: 1-800-XXX-XXXX
- Video guide: `onboarding/videos/01-create-warranty-en.mp4`
