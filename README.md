# 🍁 CrownBids - Canadian Government Contracts Platform

A full-stack web application for discovering and matching Canadian government contracts to your business. Features intelligent website analysis, real-time contract data, and smart matching algorithms.

## 🚀 Quick Start

### Option 1: Frontend Only (Demo Mode)
Just open `index.html` in your browser - uses client-side mock data.

### Option 2: Full Stack (Production Mode)

**1. Start the Backend API**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

**2. Open Frontend**
```bash
# Open index.html in browser, or serve it:
python -m http.server 8000
# Visit http://localhost:8000
```

**3. Update Frontend Config**
Edit `config.js` to point to your backend:
```javascript
API_BASE_URL: 'http://localhost:3001/api'
```

**See [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) for complete production setup guide**

## ✨ Smart Contract Matching with Website Analysis

**🤖 Powered by Intelligent Website Crawling**

This application automatically analyzes your company website to find the perfect government contracts for you! Simply enter your company URL, and our system will:
- 🕷️ **Crawl your website** to understand your business
- 🔍 **Extract keywords** from your services, products, and descriptions
- 🎯 **Match contracts** that align with your expertise
- ⭐ **Score each contract** from 0-100% relevance

## 📋 What Does This Application Do?

This application helps you:
- **🌐 Analyze your business** - Automatically crawls your website to understand what you do
- **🎯 Smart matching** - Intelligently matches you with relevant government contracts
- **📊 Browse** government contracts in an easy-to-read format with match scores
- **🔍 Search** contracts by title, description, department, or contract number
- **🎨 Filter** contracts by department and status (active/closed)
- **📈 Sort** contracts by date, value, or best match
- **📋 View** key information like contract value, closing dates, and match percentage

## 🎨 Customization & Branding

**Make it yours! Add your logo and brand colors:**

📘 **See [BRANDING.md](BRANDING.md) for complete customization guide**

- Add your company logo (PNG, SVG, JPG)
- Change colors to match your brand
- Customize text and titles
- Pre-made color themes included
- Easy CSS variables system

**Quick Customization:**
1. Add `logo.png` to root directory
2. Edit CSS variables in `styles.css`
3. Update title in `index.html`
4. Done! Fully branded application.

---

## 🚀 Deployment Options

### **🌐 Production Deployment (Recommended)**

**Deploy on your own custom domain with GitHub Pages:**

1. **See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide**
2. Set up takes 10-15 minutes
3. Free HTTPS, no hosting costs
4. Perfect for work computers (no installations)
5. Example: `https://contracts.yourcompany.com`

**Quick Start:**
- Enable GitHub Pages on branch `claude/contracts-browser-app-01CuFboAQz6TVdzkuuo4TqSM`
- Add your custom domain in GitHub settings
- Configure DNS CNAME record
- Done! Your site is live.

### **🧪 Local Development**

#### Option 1: Open Directly in Browser (Easiest)
1. Navigate to the project folder on your computer
2. Double-click on `index.html`
3. The application will open in your default web browser
4. Start browsing contracts!

#### Option 2: Using a Local Web Server
If you have Python installed:

```bash
# For Python 3
python -m http.server 8000

# For Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser and go to: `http://localhost:8000`

If you have Node.js installed:
```bash
# Install a simple server globally
npm install -g http-server

# Run the server
http-server
```

## 📁 Project Structure

```
CrownBids/
├── frontend/           # Client-side application
│   ├── index.html     # Main HTML file
│   ├── styles.css     # Styling and design
│   ├── app.js         # Frontend logic
│   ├── api-service.js # API integration
│   ├── utils.js       # Utility functions
│   └── config.js      # Configuration
├── backend/           # Server-side API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── config/        # Database config
│   │   └── server.js      # Express server
│   ├── package.json
│   └── README.md          # Backend documentation
├── PRODUCT_ROADMAP.md    # Development roadmap
└── README.md             # This file
```

## 🏗️ Architecture

### Frontend (Client-Side)
- **Framework**: Vanilla JavaScript (no dependencies)
- **Styling**: Custom CSS with design system
- **Features**: URL analysis, smart filtering, match scoring

### Backend (Server-Side) 🆕
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Features**:
  - Real contract data from buyandsell.gc.ca
  - Intelligent URL analysis with web scraping
  - Smart contract matching algorithm
  - RESTful API with caching

**See [backend/README.md](backend/README.md) for full backend documentation**

## ✨ Features

### Current Features
- ✅ **Smart URL Analysis**: Paste your company URL, get matched contracts
- ✅ **Real Contract Data**: Integrates with buyandsell.gc.ca API
- ✅ **Intelligent Matching**: AI-powered match scoring (0-98%)
- ✅ **Advanced Search**: Search across all contract fields
- ✅ **Category Filtering**: Security, Janitorial, Landscaping, Construction, IT, Consulting
- ✅ **Match Scores**: See how well each contract fits your business
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Beautiful UI**: Modern interface with scanning animations
- ✅ **Database Storage**: PostgreSQL for scalable data management
- ✅ **API Caching**: 1-hour cache for optimal performance

## 🔧 How to Customize

### Adding Your Own Contracts

1. Open `app.js` in any text editor
2. Find the `loadSampleData()` function (around line 30)
3. Add a new contract object to the array:

```javascript
{
    id: 16,  // Increment the ID
    title: "Your Contract Title",
    department: "Department Name",
    description: "Detailed description of the contract",
    value: 5000000,  // Value in dollars
    status: "active",  // or "closed"
    publishDate: "2024-12-01",  // Format: YYYY-MM-DD
    closeDate: "2025-02-01",
    contractNumber: "24-25-XX-1234",
    url: "https://buyandsell.gc.ca"
}
```

### Changing Colors and Styles

1. Open `styles.css`
2. Look for the color values (e.g., `#667eea`, `#764ba2`)
3. Replace them with your preferred colors

### Modifying the Layout

1. Open `index.html`
2. Edit the HTML structure as needed
3. The layout uses flexible CSS Grid and Flexbox, so it adapts automatically

## 🌐 Connecting to Real Government Data

### Future Enhancement: Canadian Open Data API

The Canadian government provides open data through several sources:

1. **Buy and Sell Portal**: https://buyandsell.gc.ca
2. **Open Government Portal**: https://open.canada.ca
3. **Government Electronic Directory Services (GEDS)**

### How to Integrate Real Data (Advanced)

To fetch real contract data, you would need to:

1. **Find an API**: Research Canadian government APIs that provide contract data
2. **Get API Access**: Some APIs require registration or API keys
3. **Modify `loadSampleData()`**: Replace sample data with API calls

Example structure:
```javascript
async loadRealData() {
    try {
        const response = await fetch('https://api-url-here');
        const data = await response.json();
        this.contracts = data.map(item => ({
            // Map API data to your contract format
        }));
    } catch (error) {
        console.error('Error loading data:', error);
    }
}
```

## 📚 Learning Resources

### Understanding the Code

**HTML (index.html)**
- Defines the structure of the page
- Contains the search bar, filters, and contract display area
- Uses semantic HTML5 elements

**CSS (styles.css)**
- Styles all visual elements
- Uses modern CSS features like Grid and Flexbox
- Includes responsive design for mobile devices

**JavaScript (app.js)**
- Handles all user interactions
- Manages data filtering, sorting, and searching
- Updates the page dynamically without refreshing

### Key Concepts You'll Learn
- DOM Manipulation (changing HTML with JavaScript)
- Event Handling (responding to clicks and input)
- Array Methods (filter, sort, map, reduce)
- CSS Grid and Flexbox for layouts
- Responsive Web Design

## 🎯 Next Steps for Beginners

1. **Experiment**: Try changing text, colors, or adding new filters
2. **Add Features**:
   - Add more filter options (e.g., filter by value range)
   - Add a "favorites" feature to save contracts
   - Export results to CSV or PDF
3. **Learn More**:
   - JavaScript on [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
   - CSS on [CSS-Tricks](https://css-tricks.com/)
   - HTML on [W3Schools](https://www.w3schools.com/html/)

## 🐛 Troubleshooting

**Problem**: Page doesn't load or looks broken
- **Solution**: Check that all three files (index.html, styles.css, app.js) are in the same folder

**Problem**: Search doesn't work
- **Solution**: Open browser console (F12) and check for JavaScript errors

**Problem**: Styling looks wrong
- **Solution**: Make sure styles.css is in the same directory as index.html

## 💡 Ideas for Enhancement

- [ ] Add date range filtering
- [ ] Implement contract value range slider
- [ ] Add export functionality (CSV, PDF)
- [ ] Create a "Save favorites" feature using localStorage
- [ ] Add charts and visualizations
- [ ] Integrate with real Canadian government APIs
- [ ] Add email alerts for new contracts
- [ ] Create a comparison feature for multiple contracts

## 📝 License

This is a learning project. Feel free to use, modify, and share!

## 🤝 Contributing

This is a beginner-friendly project! If you want to add features or fix bugs:
1. Make your changes
2. Test thoroughly
3. Document what you changed

## 📞 Support

If you're learning to code and have questions:
- Comment your code to help you remember what it does
- Use browser developer tools (F12) to debug
- Search for error messages online - you're not alone!

---

**Happy Coding! 🚀**

Built with ❤️ for Canadian government contract transparency
