# 🎨 Branding & Customization Guide

This guide will help you customize the Canadian Government Contracts Browser with your own logo, colors, and branding.

---

## 🖼️ Adding Your Logo

### **Quick Start**

1. **Prepare your logo:**
   - Recommended format: PNG with transparent background
   - Recommended size: 200-400px wide, proportional height
   - File formats supported: PNG, JPG, SVG, WebP

2. **Add logo to your repository:**
   - Place your logo file in the root directory
   - Name it `logo.png` (or update the filename in `index.html`)

3. **Update the code (if using different filename):**

**In `index.html` (line ~55):**
```html
<!-- Change logo.png to your filename -->
<img src="logo.png" alt="Company Logo" class="header-logo" id="headerLogo">
```

**Or use a custom filename:**
```html
<img src="my-company-logo.svg" alt="My Company" class="header-logo" id="headerLogo">
```

4. **That's it!** Your logo will appear automatically if the file exists.

---

## 🎨 Customizing Colors & Theme

The application uses CSS variables for easy color customization. All colors are defined at the top of `styles.css`.

### **Quick Color Change**

Open `styles.css` and find the `:root` section (lines 1-41). Change any color values:

```css
:root {
    /* PRIMARY BRAND COLORS - Change these to your brand colors */
    --primary-color: #d32f2f;          /* Main brand color */
    --primary-dark: #c62828;           /* Darker shade */
    --secondary-color: #667eea;        /* Accent color */
    --secondary-dark: #5568d3;         /* Darker accent */
    --accent-color: #764ba2;           /* Additional accent */

    /* HEADER COLORS */
    --header-gradient-start: #d32f2f;  /* Header left color */
    --header-gradient-end: #c62828;    /* Header right color */

    /* BODY BACKGROUND */
    --body-gradient-start: #667eea;    /* Page background left */
    --body-gradient-end: #764ba2;      /* Page background right */
}
```

### **Pre-Made Color Themes**

#### **Blue Professional Theme**
```css
--primary-color: #1976d2;
--primary-dark: #1565c0;
--secondary-color: #42a5f5;
--secondary-dark: #1e88e5;
--accent-color: #64b5f6;
--header-gradient-start: #1976d2;
--header-gradient-end: #1565c0;
--body-gradient-start: #42a5f5;
--body-gradient-end: #1976d2;
```

#### **Green Business Theme**
```css
--primary-color: #2e7d32;
--primary-dark: #1b5e20;
--secondary-color: #66bb6a;
--secondary-dark: #4caf50;
--accent-color: #81c784;
--header-gradient-start: #2e7d32;
--header-gradient-end: #1b5e20;
--body-gradient-start: #66bb6a;
--body-gradient-end: #2e7d32;
```

#### **Purple Tech Theme**
```css
--primary-color: #7b1fa2;
--primary-dark: #6a1b9a;
--secondary-color: #9c27b0;
--secondary-dark: #8e24aa;
--accent-color: #ab47bc;
--header-gradient-start: #7b1fa2;
--header-gradient-end: #6a1b9a;
--body-gradient-start: #9c27b0;
--body-gradient-end: #7b1fa2;
```

#### **Orange Energy Theme**
```css
--primary-color: #f57c00;
--primary-dark: #ef6c00;
--secondary-color: #ff9800;
--secondary-dark: #fb8c00;
--accent-color: #ffa726;
--header-gradient-start: #f57c00;
--header-gradient-end: #ef6c00;
--body-gradient-start: #ff9800;
--body-gradient-end: #f57c00;
```

---

## 📝 Customizing Text Content

### **Change Application Title**

**In `index.html` (line ~57):**
```html
<h1>🍁 Canadian Government Contracts Browser</h1>
```

**Change to:**
```html
<h1>🏢 Your Company - Contract Finder</h1>
```

### **Change Subtitle**

**In `index.html` (line ~58):**
```html
<p class="subtitle">Search and explore government procurement opportunities</p>
```

**Change to:**
```html
<p class="subtitle">Your custom tagline here</p>
```

### **Change Welcome Message**

**In `index.html` (line ~14):**
```html
<h2>👋 Welcome to Canadian Contracts Browser!</h2>
<p>Let's personalize your experience to find the perfect contracts for your business</p>
```

---

## 🎯 Complete Branding Example

Let's say your company is **"Acme Tech Solutions"** with blue branding.

### **Step 1: Add Logo**
1. Save your logo as `acme-logo.png`
2. Place it in the root directory
3. Update `index.html`:
```html
<img src="acme-logo.png" alt="Acme Tech Solutions" class="header-logo" id="headerLogo">
```

### **Step 2: Update Colors**
In `styles.css`:
```css
:root {
    --primary-color: #0066cc;
    --primary-dark: #0052a3;
    --secondary-color: #3399ff;
    --secondary-dark: #0073e6;
    --accent-color: #66b3ff;
    --header-gradient-start: #0066cc;
    --header-gradient-end: #0052a3;
    --body-gradient-start: #3399ff;
    --body-gradient-end: #0066cc;
}
```

### **Step 3: Update Text**
In `index.html`:
```html
<h1>Acme Tech Solutions - Contract Finder</h1>
<p class="subtitle">Helping you win government contracts</p>
```

**Result:** Fully branded application with your logo and colors! 🎉

---

## 🔧 Advanced Customization

### **Logo Size Adjustment**

If your logo is too large or small, adjust in `styles.css`:

```css
.header-logo {
    max-height: 60px;  /* Change to 80px, 100px, etc. */
    width: auto;
}
```

### **Solid Color Header (No Gradient)**

Replace gradient with solid color in `styles.css`:

```css
header {
    background: var(--primary-color);  /* Solid color instead of gradient */
}
```

### **Custom Fonts**

Add a custom font in `styles.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### **Remove Emoji from Title**

Simply delete `🍁` from the title in `index.html`:
```html
<h1>Canadian Government Contracts Browser</h1>
```

---

## 📱 Favicon (Browser Tab Icon)

Add your brand icon to the browser tab:

1. **Create a favicon:**
   - 32x32px or 64x64px PNG/ICO file
   - Name it `favicon.ico` or `favicon.png`

2. **Add to `index.html` in `<head>` section:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Company - Contract Finder</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <link rel="stylesheet" href="styles.css">
</head>
```

---

## 🎨 Color Variables Reference

Here's what each variable controls:

| Variable | Controls |
|----------|----------|
| `--primary-color` | Search button, primary buttons |
| `--primary-dark` | Button hover states |
| `--secondary-color` | Accent elements, links |
| `--header-gradient-start` | Header background (left) |
| `--header-gradient-end` | Header background (right) |
| `--body-gradient-start` | Page background (top) |
| `--body-gradient-end` | Page background (bottom) |
| `--text-primary` | Main text color |
| `--text-secondary` | Secondary text, descriptions |
| `--status-active-bg` | Active contract badge background |
| `--match-high-bg` | High match score background |

---

## ✅ Checklist for Complete Branding

- [ ] Logo added and displaying correctly
- [ ] Primary color updated to brand color
- [ ] Header gradient matches brand
- [ ] Application title updated
- [ ] Subtitle/tagline updated
- [ ] Favicon added
- [ ] Colors tested on mobile
- [ ] Screenshot taken for marketing
- [ ] Tested in different browsers

---

## 🚀 Deploy Your Branded Application

Once you've customized everything:

1. **Commit changes:**
```bash
git add logo.png styles.css index.html
git commit -m "Add company branding and logo"
git push
```

2. **Wait 1-2 minutes** for GitHub Pages to rebuild

3. **Visit your domain** and see your branded application!

---

## 💡 Pro Tips

✅ **Use SVG logos** for crisp display on all screen sizes
✅ **Test your colors** for sufficient contrast (accessibility)
✅ **Keep brand colors consistent** across header, buttons, accents
✅ **White logos** work best on colored header backgrounds
✅ **Transparent PNGs** look most professional
✅ **Mobile test** - check logo and colors on phone

---

## 🎯 Need Help?

- **Color Picker Tool**: https://coolors.co
- **Logo Maker**: https://www.canva.com
- **Favicon Generator**: https://favicon.io
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/

---

**Your branded application is ready to impress! 🎨✨**
