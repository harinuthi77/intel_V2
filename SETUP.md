# 🚀 FORGE - Local Setup Guide

Complete guide to run FORGE locally on your machine.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Python 3.10+** installed
- **Node.js 18+** and **npm** installed
- **Git** installed
- **Anthropic API Key** (get from https://console.anthropic.com)

---

## 🛠️ Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/harinuthi77/intel_V2.git
cd intel_V2
```

Or if you already have it:
```bash
cd /path/to/intel_V2
git pull origin main
```

### 2. Checkout the Feature Branch

```bash
git checkout claude/ai-capabilities-comparison-011CUPYgdPVvCYT8PEh6KEQQ
```

### 3. Set Up Python Environment

**Option A: Using Virtual Environment (Recommended)**
```bash
# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Option B: Global Installation**
```bash
pip install -r requirements.txt
```

### 4. Install Playwright Browsers (Optional but Recommended)

```bash
playwright install chromium
```

> **Note:** If this fails with 403 errors, the agent can still run analytics, terminal, and code features without the browser.

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install --legacy-peer-deps
```

### 6. Build the Frontend

```bash
npm run build
```

This creates optimized production files in `frontend/dist/`

### 7. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cd ..  # Back to root directory
touch .env
```

Add your Anthropic API key:
```env
ANTHROPIC_API_KEY=your_api_key_here
```

Or export it:
```bash
export ANTHROPIC_API_KEY="your_api_key_here"
```

---

## 🎮 Running the Application

### Start the Server

From the root directory (`intel_V2/`):

```bash
python backend/server.py
```

You should see:
```
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🧪 Testing the Features

### 1. **Basic Web Automation**
```
Go to google.com
```

### 2. **Analytics (Beats Manus AI!)**
```
Go to Amazon, search for wireless headphones under $100, extract top 5 results, and analyze the prices with detailed statistics
```

### 3. **Terminal Execution**
```
Use the terminal to list files and show Python version
```

### 4. **Code Execution**
```
Write Python code to calculate fibonacci numbers up to 10 and execute it
```

### 5. **Multi-Tool Workflow**
```
Search Hacker News for top posts, save to JSON using Python, then show the file with terminal
```

---

## 🎨 UI Overview

### Layout
- **Left (20%)**: Sidebar with task info, timeline, and active tools
- **Right (80%)**: Main view with tabs

### View Tabs
- 🌐 **Browser** - Live web automation with screenshots
- 🖥️ **Terminal** - Command execution output
- 💻 **Code** - Python code execution viewer
- 📊 **Analytics** - Data insights dashboard

### Auto-Switching
The UI automatically switches tabs when:
- Terminal command runs → Terminal tab
- Code executes → Code tab
- Analytics performed → Analytics tab
- Browser action → Browser tab

---

## 📊 Analytics Features

When you run analytics, you'll see:

### **Summary Card**
- Total items analyzed
- Timestamp

### **Price Analysis**
- Min, Max, Mean, Median
- Standard deviation
- Price range

### **Key Insights**
- AI-generated insights
- Pattern detection
- Quality analysis

### **Recommendations**
- Best value identification
- Actionable advice
- Data quality notes

---

## 🔧 Troubleshooting

### Issue: ModuleNotFoundError

**Solution:**
```bash
# Make sure you're in the root directory
cd /path/to/intel_V2

# Run from root
python backend/server.py
```

### Issue: Port 8000 Already in Use

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or change port in backend/server.py
```

### Issue: Playwright Browser Not Installing

**Solution:**
This is okay! The agent works without browser for:
- ✅ Analytics
- ✅ Terminal execution
- ✅ Code execution

To use browser features, try:
```bash
# Alternative installation
python -m playwright install chromium --with-deps
```

### Issue: Frontend Not Building

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Issue: API Key Not Working

**Solution:**
1. Check your key at https://console.anthropic.com
2. Ensure it's properly set in `.env` or exported
3. Restart the server after setting the key

---

## 📁 Project Structure

```
intel_V2/
├── adaptive_agent.py          # Main agent with multi-tool support
├── computational_env.py       # Terminal & code execution
├── analytics_engine.py        # Advanced analytics (beats Manus!)
├── requirements.txt           # Python dependencies
├── backend/
│   └── server.py             # FastAPI server
├── frontend/
│   ├── src/
│   │   └── components/
│   │       └── ForgePlatform.jsx  # Main UI (20/80 split)
│   ├── dist/                 # Built frontend files
│   └── package.json
└── agent_learning.db         # Agent's learning database
```

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Install Python deps
pip install -r requirements.txt

# 2. Build frontend
cd frontend && npm install --legacy-peer-deps && npm run build && cd ..

# 3. Set API key
export ANTHROPIC_API_KEY="your_key_here"

# 4. Run server
python backend/server.py

# 5. Open browser
open http://localhost:8000
```

---

## 💡 Pro Tips

1. **Keep server running** - Leave it in a terminal tab
2. **Check timeline** - Watch the left sidebar for agent actions
3. **Switch tabs manually** - Click any tab to see different views
4. **Try complex tasks** - The agent handles multi-step workflows
5. **Check logs** - Server terminal shows detailed execution logs

---

## 🎯 What Makes FORGE Special

| Feature | Manus AI | FORGE |
|---------|----------|-------|
| Analytics | ⚠️ Weak | ✅✅✅ **Superior** |
| Web Browsing | ✅ Good | ✅ Excellent |
| Terminal | ✅ Yes | ✅ Yes |
| Code Execution | ✅ Yes | ✅ Yes |
| Statistical Analysis | ❌ No | ✅ Advanced |
| Data Visualization | ❌ No | ✅ Charts |
| Insights Generation | ❌ No | ✅ AI-Powered |
| Self-Learning | ❌ No | ✅ SQLite DB |
| Live UI | ✅ Yes | ✅ 20/80 Split |

**FORGE wins on analytics and matches Manus on everything else!** 🏆

---

## 📞 Need Help?

- **Issues**: https://github.com/harinuthi77/intel_V2/issues
- **Documentation**: Check the code comments
- **API Key**: https://console.anthropic.com

---

## 🔄 Updating

To get the latest changes:

```bash
git pull origin claude/ai-capabilities-comparison-011CUPYgdPVvCYT8PEh6KEQQ
pip install -r requirements.txt
cd frontend && npm install --legacy-peer-deps && npm run build && cd ..
```

---

**Happy Testing! 🚀**
