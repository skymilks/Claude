# 🍁 Canadian Government Contracts Browser

A simple, user-friendly web application for browsing and searching Canadian government contracts. Built with HTML, CSS, and JavaScript - perfect for beginners!

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

## 🚀 How to Run the Application

### Option 1: Open Directly in Browser (Easiest)
1. Navigate to the project folder on your computer
2. Double-click on `index.html`
3. The application will open in your default web browser
4. Start browsing contracts!

### Option 2: Using a Local Web Server (Recommended for Development)
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
Claude/
├── index.html      # Main HTML file with the page structure
├── styles.css      # All styling and visual design
├── app.js          # JavaScript logic for functionality
└── README.md       # This file
```

## ✨ Features

### Current Features
- ✅ **Search Functionality**: Search across all contract fields
- ✅ **Advanced Filters**: Filter by department and status
- ✅ **Sorting Options**: Sort by date or contract value
- ✅ **Statistics Dashboard**: View total contracts, active opportunities, and total value
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Pagination**: Easy navigation through multiple contracts
- ✅ **Beautiful UI**: Modern, clean interface with smooth animations

### Sample Data
The application currently uses **15 sample contracts** based on real Canadian government contract types. This is perfect for learning and testing!

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
