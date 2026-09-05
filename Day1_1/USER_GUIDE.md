# 👥 Complete User Guide

## Medicine Warehouse Management System - Step-by-Step User Guide

---

## 🎯 Getting Started

### First Time Opening the Application

1. **Launch the application**
   - Open `medicine_warehouse.html` in your browser
   - Wait for dashboard to load
   - Allow any browser permissions if prompted

2. **Explore the Dashboard**
   - Review key statistics
   - Understand the layout
   - Familiarize with navigation menu

3. **Read Help Section (Optional)**
   - Click on "Help & Support" 
   - Review FAQ
   - Understand features

---

## 📊 Dashboard Overview

### Understanding Your Dashboard

The dashboard shows you four main statistics:

| Statistic | What It Means |
|-----------|---------------|
| **Total Medicines** | How many different medicines you have |
| **Total Stock Value** | Worth of all inventory combined |
| **Low Stock Items** | Medicines below 20 units (threshold) |
| **Total Orders** | Total number of all orders created |

### Dashboard Charts

**Stock Distribution Chart:**
- Shows medicines by category
- Pie chart visualization
- Click on segments for details

**Orders Trend Chart:**
- Monthly order patterns
- Line graph visualization
- Helps identify trends

### Quick Actions

Three feature boxes provide fast access to:
1. **Add Medicine** - Create new inventory item
2. **Create Order** - Process incoming/outgoing stock
3. **Low Stock** - View items needing attention

---

## 📦 Managing Your Inventory

### Adding a New Medicine

**Step-by-Step:**

1. Click **Inventory** in sidebar
2. Click **Add Medicine**
3. Fill in required fields (*):
   - **Medicine Name** * - Examples: Aspirin, Ibuprofen
   - **Category** * - Examples: Pain Relief, Fever Reducer
   - **Batch Number** * - Examples: B001, BATCH-2026-08
   - **Quantity** * - Current units in stock
   - **Unit Price** * - Cost per unit in dollars
   - **Expiry Date** * - Use calendar picker

4. Optional fields:
   - **Manufacturer** - Company name
   - **Description** - Additional details

5. Click **"Add Medicine"**
6. See success notification
7. Automatically redirected to inventory list

### Viewing Your Inventory

**Go to:** Inventory → All

**What You See:**
- Complete list of all medicines
- Medicine Name
- Category
- Batch Number
- Current Quantity
- Unit Price
- Total Value (Quantity × Price)
- Expiry Date
- Manufacturer
- Status indicator (✓ OK or ⚠️ Low)

**Interpreting Status:**
- **✓ OK** (Green) = Healthy stock level
- **⚠️ Low** (Red) = Below threshold (needs ordering)

### Searching Medicines

1. Go to **Inventory → All**
2. Use search box at top
3. Type medicine name, category, or batch
4. Results update instantly
5. Click **"Clear"** to reset search

### Monitoring Low Stock

**Go to:** Inventory → Low Stock Alert

**What This Shows:**
- All medicines with quantity < 20 units
- Current stock quantity
- Category
- Quick "Order Now" button

**What to Do:**
1. Review low stock items
2. Plan orders with suppliers
3. Click "Order Now" to create purchase order
4. Update quantities once received

### Tracking Expiry Dates

**Go to:** Inventory → Expiring Soon

**What This Shows:**
- Medicines expiring within 30 days
- Sorted by expiry date (urgent first)
- Days remaining counter
- Current stock quantity

**Interpreting Days Left:**
- **Red Zone**: 1-7 days (urgent)
- **Yellow Zone**: 8-14 days (monitor)
- **Green Zone**: 15-30 days (plan usage)

**Action Items:**
1. Use expiring items first
2. Mark for clearance if overstocked
3. Plan discounts if needed
4. Note expiry in records

---

## 📋 Managing Orders

### Understanding Order Types

**Stock IN Order:**
- Receiving medicines from supplier
- Increases inventory quantity
- Used for replenishment
- Requires supplier reference

**Stock OUT Order:**
- Dispensing medicines to customer/patient
- Decreases inventory quantity
- Prevents selling more than available
- Requires customer/recipient reference

### Creating a Stock IN Order (Receiving)

1. **Navigate:** Orders → Create Order
2. **Select:** Stock In (first option)
3. **Fill Details:**
   - Medicine: Select from dropdown
   - Quantity: Number of units received
   - Reference: Invoice/PO number (optional)
   - Supplier: Supplier name (optional)
   - Notes: Any receiving notes

4. **Create:** Click button
5. **Inventory Updates:** Automatically increases
6. **Confirmation:** See success message

### Creating a Stock OUT Order (Dispensing)

1. **Navigate:** Orders → Create Order
2. **Select:** Stock Out (second option)
3. **Fill Details:**
   - Medicine: Select from dropdown
   - Quantity: Must be ≤ current stock
   - Reference: Customer order/receipt (optional)
   - Customer: Customer name (optional)
   - Notes: Any dispensing notes

4. **Create:** Click button
5. **Validation:** System checks stock
6. **Inventory Updates:** Automatically decreases
7. **Confirmation:** See success message

### Viewing All Orders

**Go to:** Orders → All Orders

**What You See:**
- Date and time
- Medicine name
- Type (Stock In / Stock Out)
- Quantity processed
- Reference number
- Order status

**Filtering Orders:**

1. **By Type:**
   - Use dropdown: "All Types" / "Stock In" / "Stock Out"

2. **By Search:**
   - Search medicine name
   - Search reference number
   - Click "Clear" to reset

### Viewing Stock IN Orders

**Go to:** Orders → Stock In

**Shows:**
- All receiving orders
- Supplier information
- Quantities received
- Receipt references

### Viewing Stock OUT Orders

**Go to:** Orders → Stock Out

**Shows:**
- All dispensing orders
- Customer information
- Quantities dispensed
- Sale references

---

## 📈 Analyzing Your Business

### Dashboard Analytics

**Go to:** Analytics

**Key Metrics Shown:**
1. **Total Stock In** - Total units received (sum of all IN orders)
2. **Total Stock Out** - Total units dispensed (sum of all OUT orders)
3. **Average Stock Value** - Average inventory value
4. **Expiring Items** - Count expiring within 30 days

### Understanding Charts

**Inventory by Category Chart:**
- Shows distribution across categories
- Helps identify which categories dominate
- Visual percentage breakdown

**Top 5 Medicines by Value:**
- Ranked by total value (Quantity × Price)
- Identify high-value inventory
- Plan storage accordingly

**Bottom 5 Stock Items:**
- Lowest quantity items
- Plan reordering
- Identify slow movers

### Using Analytics Insights

**For Ordering:**
- See what's running low
- Plan supplier orders
- Predict demand

**For Storage:**
- Identify high-value items
- Plan security
- Optimize shelving

**For Business:**
- Understand inventory composition
- Forecast revenue
- Plan inventory budget

---

## 🏢 Managing Suppliers

### Adding a New Supplier

1. **Navigate:** Suppliers → All
2. **Click:** "Add Supplier" button
3. **Fill Required Fields:**
   - **Supplier Name** * - Company name
   - **Phone** * - Contact number

4. **Fill Optional Fields:**
   - Contact Person - Primary contact
   - Email - Company email
   - Address - Business address

5. **Save:** Click "Add Supplier"
6. **Confirmation:** Success message

### Viewing Suppliers

**Go to:** Suppliers → All

**What You See:**
- Supplier Name
- Contact Person
- Email Address
- Phone Number
- Business Address
- Delete option

### Searching Suppliers

1. Use search box at top
2. Type supplier name or email
3. Results filter instantly
4. Click "Clear" to reset

### Updating Supplier Info

Currently: Delete and re-add (or edit directly)

**Best Practice:**
- Keep supplier information current
- Update contact details regularly
- Remove inactive suppliers

---

## 📄 Generating Reports

### Quick Report Generation

1. **Navigate:** Reports
2. **See Options:**
   - Inventory Report
   - Orders Report
   - Expiring Items Report

3. **Click Any Box:** Report generates
4. **View Report:** Data displayed
5. **Options:**
   - Print (🖨️ Print button)
   - Download (📥 Download button)

### Custom Report Generation

1. **Navigate:** Reports
2. **Scroll to:** "Generate Custom Report"
3. **Select:**
   - Report Type: Inventory / Orders / Analytics
   - Date Range: Today / This Week / This Month / All Time

4. **Click:** "Generate Report"
5. **View:** Custom report displays
6. **Export:** Print or download

### Understanding Reports

**Inventory Report Shows:**
- All medicines
- Current quantities
- Unit prices
- Total stock value
- Expiry status

**Orders Report Shows:**
- All orders in date range
- Type (IN/OUT)
- Medicine details
- Reference numbers
- Quantities

**Analytics Report Shows:**
- Statistical summaries
- Category breakdowns
- Trends and patterns
- Stock distribution

### Using Reports

**For Management:**
- Share with stakeholders
- Review business health
- Identify trends

**For Planning:**
- Plan inventory levels
- Forecast purchases
- Set budgets

**For Compliance:**
- Audit trail
- Documentation
- Records keeping

---

## ⚙️ System Settings

### Configuring System Preferences

**Go to:** Settings

### General Settings

**Warehouse Name:**
- Set your warehouse/store name
- Used for identification
- Displays in reports

**Low Stock Threshold:**
- Default: 20 units
- Adjust based on your needs
- Affects low stock alerts
- Recommended: 20-30 units

**Currency Selection:**
- USD ($) - US Dollar
- EUR (€) - Euro
- GBP (£) - British Pound
- INR (₹) - Indian Rupee

### Data Management

**Export Data:**
1. Click "📥 Export Data"
2. JSON file downloads
3. Contains all data (medicines, orders, suppliers)
4. Use for backup
5. Can import later if needed

**Clear All Data:**
⚠️ Warning: This deletes everything!
1. Read confirmation message carefully
2. Only click if absolutely sure
3. Confirm with "Yes" button
4. All data permanently deleted

### Database Information

View current statistics:
- Total Medicines: Count of items
- Total Orders: Count of transactions
- Total Suppliers: Count of vendors

---

## 💡 Tips & Best Practices

### Daily Tips

- Check dashboard first thing in morning
- Review low stock alerts
- Process pending orders
- Update medicine information

### Weekly Tips

- Review analytics
- Check expiring medicines
- Plan supplier orders
- Generate weekly reports

### Monthly Tips

- Export data backup
- Review all suppliers
- Plan inventory goals
- Update settings

### Best Practices

1. **Use Batch Numbers Consistently**
   - Standard format (e.g., B001, B002)
   - Helps tracking
   - Aids auditing

2. **Keep References Updated**
   - Use meaningful reference numbers
   - Track invoices
   - Aids traceability

3. **Regular Backups**
   - Export data monthly
   - Store multiple copies
   - Protect against loss

4. **Accurate Pricing**
   - Keep prices current
   - Affects stock value
   - Impacts reports

5. **Monitor Expiry Dates**
   - Check frequently
   - Use FIFO method
   - Plan promotions

---

## 🆘 Common Tasks

### Task: I need to know my current inventory value
**Solution:** Go to Dashboard, see "Total Stock Value"

### Task: Some medicines are running low
**Solution:** Go to Inventory → Low Stock Alert

### Task: I received a shipment
**Solution:** Go to Orders → Create Order → Stock In

### Task: A customer wants to buy medicine
**Solution:** Go to Orders → Create Order → Stock Out

### Task: I need to find old orders
**Solution:** Go to Orders → All Orders, use search/filter

### Task: I want to report on this month
**Solution:** Go to Reports, select custom report, choose "This Month"

### Task: I need to back up my data
**Solution:** Go to Settings, click "Export Data"

### Task: I lost all my data
**Solution:** Go to Settings, "Clear All Data" (if possible), restore from backup JSON

---

## 📞 Getting Help

### In-Application Help

1. **Go to:** Help & Support
2. **Read:** FAQ section
3. **Contact:** Support information listed

### Troubleshooting

**Data Not Saving?**
- Check browser storage enabled
- Try refreshing page
- Try different browser

**Can't Create Order?**
- Ensure medicine selected
- Check quantity is positive
- Verify sufficient stock (for OUT)

**Charts Not Showing?**
- Refresh page
- Enable JavaScript
- Check browser compatibility

**Slow Performance?**
- Close other browser tabs
- Clear browser cache
- Export/import to clean data

---

## 🎓 Learning Path

### Beginner (Day 1)
1. Open application
2. View dashboard
3. Add 3-4 sample medicines
4. Create 2-3 sample orders
5. Explore Analytics

### Intermediate (Week 1)
1. Master all order types
2. Use search and filter
3. Generate reports
4. Add suppliers
5. Understand analytics

### Advanced (Month 1)
1. Optimize inventory levels
2. Plan supplier relationships
3. Analyze trends
4. Create backup strategy
5. Build KPIs

---

## 🚀 Next Steps

1. **Add your medicines** to inventory
2. **Set your low stock threshold** in settings
3. **Add suppliers** information
4. **Create sample orders** to test
5. **Generate reports** to see insights
6. **Export backup** for safety
7. **Explore all features** thoroughly

---

## ✅ Quick Reference

| Task | Path |
|------|------|
| Add Medicine | Inventory → Add Medicine |
| View All Medicines | Inventory → All |
| Check Low Stock | Inventory → Low Stock Alert |
| Check Expiring | Inventory → Expiring Soon |
| Create Order | Orders → Create Order |
| View Orders | Orders → All Orders |
| View Stock In | Orders → Stock In |
| View Stock Out | Orders → Stock Out |
| Analytics | Analytics |
| Add Supplier | Suppliers → Add Supplier |
| View Suppliers | Suppliers → All |
| Generate Reports | Reports |
| Settings | Settings |
| Help | Help & Support |

---

**Version**: 1.0.0  
**Last Updated**: August 2026  
**Status**: ✅ Production Ready

**Happy Warehouse Managing! 💊✨**
