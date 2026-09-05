# 💊 Medicine Warehouse Management System

A modern, professional, and fully-functional **Medicine Warehouse Management System** built with HTML, CSS, and JavaScript. This system provides comprehensive inventory management, order tracking, analytics, and reporting features for pharmaceutical warehouses.

## 🌟 Features

### 📊 Dashboard
- Real-time inventory statistics
- Stock value overview
- Low stock alerts
- Order count tracking
- Interactive charts and visualizations
- Quick action buttons

### 📦 Inventory Management
- Add new medicines with detailed information
- View complete inventory list
- Search and filter medicines
- Edit medicine details
- Low stock alerts (< 20 units)
- Expiring soon warnings (30-day window)
- Track batch numbers and manufacturers

### 📋 Order Management
- Create stock IN orders (receiving from suppliers)
- Create stock OUT orders (dispensing to customers)
- Automatic inventory updates
- Reference/invoice tracking
- Order history and search
- Stock in/out separated views

### 📈 Analytics & Reports
- Category distribution charts
- Orders trend analysis
- Top medicines by value
- Bottom stock items tracking
- Inventory by category analysis
- Stock in/out statistics
- Custom report generation

### 🏢 Supplier Management
- Add and manage suppliers
- Store contact information
- Email and phone tracking
- Address management
- Supplier search and filtering

### 📄 Reports & Export
- Inventory reports
- Order reports
- Expiring items reports
- Data export to JSON
- Print-friendly formats

### ⚙️ Settings & Configuration
- Warehouse name customization
- Low stock threshold adjustment
- Currency selection
- Data management (export/import)
- Database information

## 🚀 Quick Start

### Installation

1. **Download the file:**
   ```
   medicine_warehouse.html
   ```

2. **Open in browser:**
   - Simply double-click the file, or
   - Open with your preferred web browser

3. **No server required:**
   - Runs entirely in the browser
   - Data stored locally using browser storage

### Online Access

If running a local server:
```
http://localhost:8000/medicine_warehouse.html
```

## 📖 User Guide

### Adding a Medicine

1. Navigate to **Inventory → Add Medicine**
2. Fill in required fields:
   - Medicine Name
   - Category
   - Batch Number
   - Quantity
   - Unit Price
   - Expiry Date
3. Click **"Add Medicine"**

### Creating Orders

1. Go to **Orders → Create Order**
2. Choose order type:
   - **Stock In**: Receiving from supplier
   - **Stock Out**: Dispensing to customer
3. Select medicine and quantity
4. Add reference number and notes
5. Click **"Create Order"**

### Monitoring Stock

- Check **Low Stock Alert** for items below threshold
- View **Expiring Soon** for medicines near expiry
- Use **Analytics** for detailed inventory insights

### Managing Suppliers

1. Navigate to **Suppliers**
2. Click **"Add Supplier"**
3. Enter supplier details
4. Save and manage supplier information

### Generating Reports

1. Go to **Reports**
2. Choose report type (Inventory, Orders, Analytics)
3. Select date range
4. Click **"Generate Report"**
5. Print or download as needed

## 🎨 UI/UX Features

- **Modern Design**: Premium indigo/purple color scheme with professional styling
- **Smooth Animations**: Micro-interactions and smooth transitions throughout
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Interactive Charts**: Chart.js visualizations for data analysis
- **Toast Notifications**: Beautiful notification system
- **Glassmorphism**: Modern card designs with subtle effects
- **Accessibility**: Proper color contrast and semantic HTML
- **Dark/Light Modes**: Theme support (future enhancement)

## 💾 Data Storage

- **Local Storage**: All data stored in browser's localStorage
- **Automatic Saving**: Data saved after every action
- **Data Persistence**: Information retained across sessions
- **Export/Import**: Download data as JSON for backup

## 🔧 Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js v3.9.1
- **Storage**: Browser localStorage API
- **Responsive**: CSS Grid and Flexbox

## 📱 Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Key Sections

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview of all metrics and quick actions |
| **Inventory** | Manage medicines and track stock levels |
| **Orders** | Create and track in/out orders |
| **Analytics** | View detailed insights and statistics |
| **Suppliers** | Manage supplier information |
| **Reports** | Generate and export reports |
| **Settings** | Configure system preferences |
| **Help** | FAQ and support information |

## ⚠️ Low Stock Management

- Default threshold: 20 units
- Configurable in Settings
- Automatic alerts on dashboard
- Dedicated low stock page
- Visual indicators throughout system

## 📅 Expiry Tracking

- Monitors medicines expiring within 30 days
- Color-coded warnings
- Days-to-expiry counter
- Sorted by expiry date

## 🔄 Order Processing

**Stock IN Orders:**
- Increase inventory quantity
- Track supplier reference
- Record receiving date/time
- Add receiving notes

**Stock OUT Orders:**
- Decrease inventory quantity
- Prevent over-selling (validation)
- Track customer/recipient
- Record dispensing date/time

## 📊 Analytics Insights

- **Top Medicines**: Ranked by total stock value
- **Bottom Stock**: Items with lowest inventory
- **Category Distribution**: Visual breakdown by category
- **Order Trends**: Monthly order analysis
- **Stock Value**: Total and average calculations

## 🛡️ Data Security

- **Local Storage**: Data stays on your device
- **No Cloud Sync**: No external server connection
- **Browser Protection**: Respects browser's storage policies
- **Manual Export**: Full data export capability

## ⌨️ Keyboard Shortcuts

- Navigate between sections using sidebar
- Search within tables with Ctrl+F
- Export data anytime from Settings

## 🎓 Best Practices

1. **Regular Backups**: Export data periodically
2. **Low Stock Updates**: Adjust threshold based on your needs
3. **Supplier Info**: Keep supplier contacts updated
4. **Order Documentation**: Add notes for traceability
5. **Regular Audits**: Review analytics monthly

## 🐛 Troubleshooting

**Data not saving?**
- Check browser's localStorage settings
- Clear cache and try again
- Try a different browser

**Charts not displaying?**
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

**Slow performance?**
- Clear old data in Settings
- Close other browser tabs
- Use a modern browser

## 📝 Sample Data

To test the system, add sample medicines:
- **Aspirin** - Pain Relief - Batch: B001 - 100 units - $0.50
- **Ibuprofen** - Anti-inflammatory - Batch: B002 - 50 units - $1.00
- **Paracetamol** - Fever Reducer - Batch: B003 - 150 units - $0.30

## 🚀 Future Enhancements

- [ ] Dark mode toggle
- [ ] Multi-user support with authentication
- [ ] Cloud sync with Firebase
- [ ] Mobile app version
- [ ] Barcode scanning
- [ ] Advanced filtering and sorting
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Real-time collaboration

## 📞 Support & Feedback

**Questions or Issues?**
- Check the Help section in the app
- Review FAQ documentation
- Export and share data for support

## 📄 License

This Medicine Warehouse Management System is provided as-is for pharmaceutical warehouse management purposes.

## 👨‍💻 Development

**Created with:**
- Modern web technologies
- Professional UI/UX design
- Responsive architecture
- Best practices implementation

## 🎉 Thank You!

Thank you for using Medicine Warehouse Management System. We hope it makes your inventory management easier and more efficient!

---

**Version**: 1.0.0  
**Last Updated**: August 2026  
**Status**: ✅ Production Ready
