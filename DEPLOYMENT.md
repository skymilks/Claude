# 🚀 Deployment Guide - Custom Domain Setup

This guide will help you deploy the Canadian Government Contracts Browser on your own custom domain using GitHub Pages.

## ✅ What You'll Have

- **Your own domain**: e.g., `contracts.yourcompany.com`
- **HTTPS enabled**: Secure, professional
- **Zero hosting costs**: GitHub Pages is free
- **No installations needed**: Everything works in the browser
- **Automatic updates**: Push to GitHub, site updates automatically

---

## 📋 Prerequisites

1. A custom domain name (e.g., `yoursite.com` or `contracts.yoursite.com`)
2. Access to your domain's DNS settings
3. A GitHub account (free)
4. This repository: `skymilks/Claude`

---

## 🎯 Step-by-Step Setup

### **Step 1: Enable GitHub Pages**

1. Go to your repository: https://github.com/skymilks/Claude
2. Click **"Settings"** (top menu)
3. Scroll down the left sidebar and click **"Pages"**
4. Under **"Source"**:
   - Select branch: `claude/contracts-browser-app-01CuFboAQz6TVdzkuuo4TqSM`
   - Select folder: `/ (root)`
5. Click **"Save"**
6. Wait 1-2 minutes for GitHub to build your site

✅ **Your site is now live at**: `https://skymilks.github.io/Claude/`

---

### **Step 2: Add Your Custom Domain**

Still in the GitHub Pages settings:

1. Scroll to **"Custom domain"**
2. Enter your domain (e.g., `contracts.yourcompany.com`)
3. Click **"Save"**
4. ⚠️ **Don't close this page yet** - note the DNS instructions shown

---

### **Step 3: Configure DNS Settings**

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

#### **Option A: Subdomain (Recommended - e.g., contracts.yourcompany.com)**

Add a **CNAME record**:
```
Type:  CNAME
Name:  contracts (or whatever subdomain you want)
Value: skymilks.github.io
TTL:   3600 (or automatic)
```

#### **Option B: Root Domain (e.g., yourcompany.com)**

Add **A records** pointing to GitHub's IPs:
```
Type:  A
Name:  @ (or leave blank)
Value: 185.199.108.153
TTL:   3600

Type:  A
Name:  @ (or leave blank)
Value: 185.199.109.153
TTL:   3600

Type:  A
Name:  @ (or leave blank)
Value: 185.199.110.153
TTL:   3600

Type:  A
Name:  @ (or leave blank)
Value: 185.199.111.153
TTL:   3600
```

**Also add a CNAME for www:**
```
Type:  CNAME
Name:  www
Value: skymilks.github.io
TTL:   3600
```

---

### **Step 4: Wait for DNS Propagation**

- DNS changes can take **5 minutes to 48 hours** (usually 10-30 minutes)
- Check status: https://www.whatsmydns.net/
- Enter your domain and check if it points to GitHub

---

### **Step 5: Enable HTTPS**

Back in GitHub Pages settings:

1. Once DNS is verified (green checkmark appears)
2. Check **"Enforce HTTPS"**
3. Wait a few minutes for SSL certificate to generate

✅ **Done!** Your site is now live at `https://yourdomain.com`

---

## 🔧 Common DNS Provider Instructions

### **GoDaddy**
1. Log in → My Products → DNS
2. Click "Add" under Records
3. Select CNAME, enter details above
4. Save

### **Namecheap**
1. Log in → Domain List → Manage
2. Advanced DNS tab
3. Add New Record → CNAME
4. Enter details, save

### **Cloudflare**
1. Log in → Select domain
2. DNS tab → Add record
3. Type: CNAME, enter details
4. Ensure proxy is **OFF** (gray cloud) for GitHub Pages
5. Save

### **Google Domains**
1. Log in → My domains → Manage
2. DNS tab → Custom records
3. Add CNAME record with details above
4. Save

---

## 🎨 Branding Your Domain

Once deployed, your site will:
- Show your custom domain in the browser
- Work on mobile, tablet, desktop
- Be searchable by Google (if you want)
- Load fast with GitHub's CDN

---

## 🧪 Testing Your Deployment

Once DNS propagates, test these features:

1. **Onboarding**: Enter a real company website
2. **Website Crawling**: Should analyze the site and extract keywords
3. **Contract Matching**: Should show relevance scores
4. **Sorting**: Try "Best Match First"
5. **Filtering**: Test department and status filters
6. **Search**: Search for keywords
7. **Mobile**: Open on your phone - should work perfectly

---

## 🔄 Updating Your Site

To update the application:

1. Push changes to branch: `claude/contracts-browser-app-01CuFboAQz6TVdzkuuo4TqSM`
2. GitHub automatically rebuilds (1-2 minutes)
3. Refresh your domain - changes appear!

No FTP, no server management, no deployments to configure!

---

## 🆘 Troubleshooting

### **"Site not loading" or "404"**
- DNS not propagated yet - wait longer
- Check DNS settings are correct
- Try incognito/private browsing
- Clear browser cache

### **"Not Secure" warning**
- HTTPS not enabled yet
- Wait for SSL certificate (up to 24 hours)
- Ensure "Enforce HTTPS" is checked in GitHub

### **Website crawling not working**
- CORS proxies might be blocked
- Try different websites
- Use the manual description field as backup
- Check browser console (F12) for errors

### **Custom domain not saving in GitHub**
- Commit CNAME file to repository (see below)
- Ensure DNS is configured correctly
- Wait for DNS verification

---

## 📄 Adding CNAME File (If Needed)

If your custom domain keeps disappearing, create a CNAME file:

1. In repository root, create file named `CNAME` (no extension)
2. Contents: Just your domain, e.g., `contracts.yourcompany.com`
3. Commit and push to your branch

This tells GitHub to remember your custom domain.

---

## 💡 Pro Tips

1. **Use a subdomain** (contracts.yourcompany.com) - easier to set up
2. **Cloudflare DNS** - Fastest propagation (often under 5 minutes)
3. **Test first** with the GitHub URL before adding custom domain
4. **Bookmark** your site for easy access
5. **Share** with colleagues - they can use it too!

---

## 🎯 What Makes This Production-Ready

✅ **No server required** - All processing in browser
✅ **No database** - Uses localStorage
✅ **No API keys** - Pure frontend
✅ **No installations** - Just a URL
✅ **CORS handling** - Multiple proxy fallbacks
✅ **Mobile responsive** - Works on all devices
✅ **Fast loading** - GitHub's CDN
✅ **HTTPS secure** - Free SSL certificate

---

## 🌟 You're All Set!

Your Canadian Government Contracts Browser is now:
- ✅ Deployed on your custom domain
- ✅ Accessible from anywhere
- ✅ Working on work computers (no installations)
- ✅ Automatically crawling websites
- ✅ Matching contracts intelligently
- ✅ Production-ready and professional

**Example URL**: `https://contracts.yourcompany.com`

Need help? Check the DNS verification or open an issue on GitHub!
